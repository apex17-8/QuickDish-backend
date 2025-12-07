import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * Send Message
   */
  @Post()
  sendMessage(
    @Body()
    body: {
      orderId: number;
      senderId: number;
      senderType: 'customer' | 'rider';
      content: string;
    },
  ) {
    return this.messagesService.createMessage(
      body.orderId,
      body.senderId,
      body.senderType,
      body.content,
    );
  }

  /**
   * Get all chat messages in an order
   */
  @Get(':orderId')
  getOrderMessages(@Param('orderId') orderId: number) {
    return this.messagesService.getMessagesForOrder(orderId);
  }

  /**
   * Mark messages in an order as read by a user
   */
  @Patch(':orderId/read')
  markMessagesAsRead(
    @Param('orderId') orderId: number,
    @Body('userId') userId: number,
  ) {
    return this.messagesService.markMessagesAsRead(orderId, userId);
  }

  /**
   * Get unread message count for a user in an order
   */
  @Get(':orderId/unread/:userId')
  getUnreadCount(
    @Param('orderId') orderId: number,
    @Param('userId') userId: number,
  ) {
    return this.messagesService.getUnreadCount(orderId, userId);
  }
}
