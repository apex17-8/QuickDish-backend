import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from '../../messages/messages.service';
import { SendMessageDto } from '../dto/send-message.dto';

interface OnlineUser {
  userId: number;
  userType: 'customer' | 'rider';
  socketId: string;
  orderIds: number[];
}

@WebSocketGateway({
  cors: true,
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track online users
  private onlineUsers = new Map<number, OnlineUser>();

  constructor(private readonly messagesService: MessagesService) {}

  handleConnection(client: Socket) {
    console.log(`Chat client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Remove user from online users
    this.removeUserBySocketId(client.id);
    console.log(`Chat client disconnected: ${client.id}`);
  }

  /**
   * Join chat room for an order
   */
  @SubscribeMessage('joinChat')
  async joinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      orderId: number;
      userId: number;
      userType: 'customer' | 'rider';
    },
  ) {
    const { orderId, userId, userType } = data;

    // Join the room
    await client.join(`chat_${orderId}`);

    // Track user as online
    this.addOnlineUser(userId, userType, client.id, orderId);

    // Send chat history
    const messages = await this.messagesService.getMessagesForOrder(orderId);

    // Mark messages as read for this user
    await this.messagesService.markMessagesAsRead(orderId, userId);

    // Notify others that user joined
    client.to(`chat_${orderId}`).emit('userJoined', {
      userId,
      userType,
      orderId,
    });

    return {
      message: `Joined chat room for order ${orderId}`,
      history: messages,
    };
  }

  /**
   * Leave chat room
   */
  @SubscribeMessage('leaveChat')
  async leaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number; userId: number },
  ) {
    const { orderId, userId } = data;

    await client.leave(`chat_${orderId}`);
    this.removeUserFromOrder(userId, orderId);

    // Notify others that user left
    client.to(`chat_${orderId}`).emit('userLeft', {
      userId,
      orderId,
    });

    return { message: `Left chat room for order ${orderId}` };
  }

  /**
   * Send message in order chat - UPDATED to use correct properties
   */
  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SendMessageDto,
  ) {
    try {
      // Use body.message (from your actual DTO) instead of body.content
      const savedMessage = await this.messagesService.createMessage(
        body.orderId,
        body.senderId,
        body.senderType || this.determineSenderType(body.senderId), // Fallback if senderType not provided
        body.message, // Using 'message' from your actual DTO
      );

      // Broadcast to all users in the chat room
      this.server.to(`chat_${body.orderId}`).emit('newMessage', savedMessage);

      // Notify about unread messages
      await this.notifyUnreadCount(body.orderId);

      return { success: true, message: savedMessage };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  /**
   * Mark messages as read
   */
  @SubscribeMessage('markMessagesAsRead')
  async markMessagesAsRead(
    @MessageBody() data: { orderId: number; userId: number },
  ) {
    const { orderId, userId } = data;

    await this.messagesService.markMessagesAsRead(orderId, userId);

    // Notify about updated unread count
    await this.notifyUnreadCount(orderId);

    return { success: true };
  }

  /**
   * Get unread message count
   */
  @SubscribeMessage('getUnreadCount')
  async getUnreadCount(
    @MessageBody() data: { orderId: number; userId: number },
  ) {
    const count = await this.messagesService.getUnreadCount(
      data.orderId,
      data.userId,
    );

    return { unreadCount: count };
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('typingStart')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { orderId: number; userId: number; userType: 'customer' | 'rider' },
  ) {
    client.to(`chat_${data.orderId}`).emit('userTyping', {
      userId: data.userId,
      userType: data.userType,
      isTyping: true,
    });
  }

  @SubscribeMessage('typingStop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { orderId: number; userId: number; userType: 'customer' | 'rider' },
  ) {
    client.to(`chat_${data.orderId}`).emit('userTyping', {
      userId: data.userId,
      userType: data.userType,
      isTyping: false,
    });
  }

  /**
   * Get online users in a chat room
   */
  @SubscribeMessage('getOnlineUsers')
  getOnlineUsers(@MessageBody() data: { orderId: number }) {
    const onlineUsers = this.getOnlineUsersInOrder(data.orderId);
    return { onlineUsers };
  }

  /**
   * Get chat history for an order
   */
  @SubscribeMessage('getChatHistory')
  async getChatHistory(@MessageBody() data: { orderId: number }) {
    const messages = await this.messagesService.getMessagesForOrder(
      data.orderId,
    );
    return { success: true, messages };
  }

  /**
   * Delete all messages in an order (admin/cleanup)
   */
  @SubscribeMessage('clearChat')
  async clearChat(@MessageBody() data: { orderId: number }) {
    try {
      await this.messagesService.deleteMessagesForOrder(data.orderId);
      this.server.to(`chat_${data.orderId}`).emit('chatCleared', {
        orderId: data.orderId,
        clearedAt: new Date(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error clearing chat:', error);
      return { success: false, error: 'Failed to clear chat' };
    }
  }

  // Helper methods
  private addOnlineUser(
    userId: number,
    userType: 'customer' | 'rider',
    socketId: string,
    orderId: number,
  ) {
    const existingUser = this.onlineUsers.get(userId);

    if (existingUser) {
      // User already online, add order to their list
      if (!existingUser.orderIds.includes(orderId)) {
        existingUser.orderIds.push(orderId);
      }
    } else {
      // New online user
      this.onlineUsers.set(userId, {
        userId,
        userType,
        socketId,
        orderIds: [orderId],
      });
    }

    console.log(`User ${userId} (${userType}) joined order ${orderId} chat`);
  }

  private removeUserFromOrder(userId: number, orderId: number) {
    const user = this.onlineUsers.get(userId);
    if (user) {
      user.orderIds = user.orderIds.filter((id) => id !== orderId);
      if (user.orderIds.length === 0) {
        this.onlineUsers.delete(userId);
      }
    }

    console.log(`User ${userId} left order ${orderId} chat`);
  }

  private removeUserBySocketId(socketId: string) {
    for (const [userId, user] of this.onlineUsers.entries()) {
      if (user.socketId === socketId) {
        this.onlineUsers.delete(userId);
        console.log(`User ${userId} disconnected from chat`);
        break;
      }
    }
  }

  private getOnlineUsersInOrder(orderId: number): OnlineUser[] {
    return Array.from(this.onlineUsers.values()).filter((user) =>
      user.orderIds.includes(orderId),
    );
  }

  private async notifyUnreadCount(orderId: number) {
    const onlineUsers = this.getOnlineUsersInOrder(orderId);

    for (const user of onlineUsers) {
      const unreadCount = await this.messagesService.getUnreadCount(
        orderId,
        user.userId,
      );

      // Send unread count to specific user
      this.server.to(user.socketId).emit('unreadCountUpdate', {
        orderId,
        unreadCount,
      });
    }
  }

  /**
   * Determine sender type if not provided (fallback method)
   */
  private determineSenderType(senderId: number): 'customer' | 'rider' {
    // You might want to implement logic to determine if sender is customer or rider
    // For now, return a default or implement your user type detection logic
    console.log(`Sender type not provided for user ${senderId}, using default`);
    return 'customer'; // Default fallback
  }

  /**
   * Get all active chat rooms (for debugging/admin)
   */
  @SubscribeMessage('getActiveChats')
  getActiveChats() {
    const activeChats = new Set<number>();

    for (const user of this.onlineUsers.values()) {
      user.orderIds.forEach((orderId) => activeChats.add(orderId));
    }

    return {
      activeChats: Array.from(activeChats),
      totalOnlineUsers: this.onlineUsers.size,
    };
  }
}
