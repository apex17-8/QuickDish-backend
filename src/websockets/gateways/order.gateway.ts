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
import { Logger, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentStatus, OrderStatus } from '../../orders/entities/order.entity';

export type OrderEventPayload =
  | { orderId: number; type: 'riderAssigned'; riderId: number }
  | { orderId: number; type: 'statusUpdate'; status: string }
  | { orderId: number; type: 'orderRated'; rating: number; feedback?: string }
  | { orderId: number; type: 'orderDelivered' }
  | { orderId: number; type: 'chatCleared' }
  | { orderId: number; type: 'paymentUpdate'; paymentStatus: PaymentStatus };

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/orders',
})
@Injectable()
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrderGateway.name);
  private userSockets = new Map<number, string>(); // userId -> socketId

  constructor(private eventEmitter: EventEmitter2) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId;
    if (userId) {
      const id = parseInt(userId as string);
      this.userSockets.set(id, client.id);
      this.logger.log(`User ${id} connected to orders namespace`);

      // Join user to their personal room
      await client.join(`user:${userId}`);

      // Join based on role if provided
      const role = client.handshake.query.role;
      if (role) {
        await client.join(`${role}:${userId}`);
      }
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        this.logger.log(`User ${userId} disconnected from orders namespace`);
        break;
      }
    }
  }

  @SubscribeMessage('joinOrderRoom')
  async handleJoinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ) {
    await client.join(`order_${data.orderId}`);
    await client.join(`order:${data.orderId}`);
    this.logger.log(`Client ${client.id} joined order room ${data.orderId}`);
    return { ok: true, room: `order_${data.orderId}` };
  }

  @SubscribeMessage('leaveOrderRoom')
  async handleLeaveOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ) {
    await client.leave(`order_${data.orderId}`);
    await client.leave(`order:${data.orderId}`);
    return { ok: true };
  }

  @SubscribeMessage('requestOrderUpdate')
  handleRequestOrderUpdate(
    @MessageBody() data: { orderId: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Request order update from service
    this.eventEmitter.emit('order.update.requested', {
      orderId: data.orderId,
      socketId: client.id,
    });
    return { success: true };
  }

  broadcastOrderUpdate(payload: OrderEventPayload) {
    const room = `order_${payload.orderId}`;

    switch (payload.type) {
      case 'riderAssigned':
        this.server.to(room).emit('riderAssigned', {
          ...payload,
          timestamp: new Date(),
        });
        this.eventEmitter.emit('order.rider.assigned', {
          orderId: payload.orderId,
          riderId: payload.riderId,
          timestamp: new Date(),
        });
        break;

      case 'statusUpdate':
        this.server.to(room).emit('orderStatusUpdated', {
          ...payload,
          timestamp: new Date(),
        });
        this.eventEmitter.emit('order.status.updated', {
          orderId: payload.orderId,
          status: payload.status,
          timestamp: new Date(),
        });
        break;

      case 'orderRated':
        this.server.to(room).emit('orderRated', {
          ...payload,
          timestamp: new Date(),
        });
        this.eventEmitter.emit('order.rated', {
          orderId: payload.orderId,
          rating: payload.rating,
          feedback: payload.feedback,
          timestamp: new Date(),
        });
        break;

      case 'orderDelivered':
        this.server.to(room).emit('orderDelivered', {
          ...payload,
          timestamp: new Date(),
        });
        this.eventEmitter.emit('order.delivered', {
          orderId: payload.orderId,
          deliveredAt: new Date(),
        });
        break;

      case 'chatCleared':
        this.server.to(room).emit('chatCleared', {
          ...payload,
          timestamp: new Date(),
        });
        break;

      case 'paymentUpdate':
        this.server.to(room).emit('paymentUpdated', {
          ...payload,
          timestamp: new Date(),
        });
        this.eventEmitter.emit('order.payment.updated', {
          orderId: payload.orderId,
          paymentStatus: payload.paymentStatus,
          timestamp: new Date(),
        });
        break;
    }

    this.logger.log(
      `Broadcast order update: ${payload.type} for order ${payload.orderId}`,
    );
  }

  // Event Listeners
  @OnEvent('order.created')
  handleOrderCreated(payload: {
    orderId: number;
    customerId: number;
    restaurantId: number;
    status: OrderStatus;
    totalPrice: number;
  }) {
    // Notify restaurant
    this.server.to(`restaurant:${payload.restaurantId}`).emit('newOrder', {
      ...payload,
      timestamp: new Date(),
    });

    // Notify customer
    const customerSocketId = this.userSockets.get(payload.customerId);
    if (customerSocketId) {
      this.server.to(customerSocketId).emit('orderCreated', {
        ...payload,
        timestamp: new Date(),
      });
    }

    this.logger.log(`Order ${payload.orderId} created`);
  }

  @OnEvent('order.payment.completed')
  handlePaymentCompleted(payload: {
    orderId: number;
    amount: number;
    timestamp: Date;
  }) {
    this.server
      .to(`order_${payload.orderId}`)
      .emit('paymentCompleted', payload);
  }

  // Helper method to send to specific user
  sendToUser(userId: number, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, {
        ...data,
        timestamp: new Date(),
      });
    }
  }

  // Helper to broadcast to all in order room
  broadcastToOrder(orderId: number, event: string, data: any) {
    this.server.to(`order_${orderId}`).emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }
}
