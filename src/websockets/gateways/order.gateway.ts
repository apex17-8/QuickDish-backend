// src/websockets/order.gateway.ts
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
import { Injectable } from '@nestjs/common';
import { PaymentStatus } from 'src/orders/entities/order.entity';
export type OrderEventPayload =
  | { orderId: number; type: 'riderAssigned'; riderId: number }
  | { orderId: number; type: 'statusUpdate'; status: string }
  | { orderId: number; type: 'orderRated'; rating: number; feedback?: string }
  | { orderId: number; type: 'orderDelivered' }
  | { orderId: number; type: 'chatCleared' }
  | { orderId: number; type: 'paymentUpdate'; paymentStatus: PaymentStatus };
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/orders',
})
@Injectable()
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('Client connected', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected', client.id);
  }

  @SubscribeMessage('joinOrderRoom')
  async handleJoinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ) {
    await client.join(`order_${data.orderId}`);
    return { ok: true };
  }

  @SubscribeMessage('leaveOrderRoom')
  async handleLeaveOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ) {
    await client.leave(`order_${data.orderId}`);
    return { ok: true };
  }

  broadcastOrderUpdate(payload: OrderEventPayload) {
    const room = `order_${payload.orderId}`;
    switch (payload.type) {
      case 'riderAssigned':
        this.server.to(room).emit('riderAssigned', payload);
        break;
      case 'statusUpdate':
        this.server.to(room).emit('orderStatusUpdated', payload);
        break;
      case 'orderRated':
        this.server.to(room).emit('orderRated', payload);
        break;
      case 'orderDelivered':
        this.server.to(room).emit('orderDelivered', payload);
        break;
      case 'chatCleared':
        this.server.to(room).emit('chatCleared', payload);
        break;
    }
  }
}
