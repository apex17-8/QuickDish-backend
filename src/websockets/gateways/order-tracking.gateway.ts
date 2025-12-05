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
import { Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderTrackingService } from '../services/order-tracking.service';
import { RiderLocationDto } from '../dto/rider-location.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/tracking',
})
export class OrderTrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrderTrackingGateway.name);
  private riderSockets = new Map<number, string>(); // riderId -> socketId
  private orderSubscribers = new Map<number, Set<string>>(); // orderId -> socketIds

  constructor(
    private readonly trackingService: OrderTrackingService,
    private eventEmitter: EventEmitter2,
  ) {}

  async handleConnection(client: Socket) {
    const riderId = client.handshake.query.riderId;
    if (riderId) {
      const id = parseInt(riderId as string);
      this.riderSockets.set(id, client.id);
      this.logger.log(`Rider ${id} connected to tracking namespace`);
      await client.join(`rider:${riderId}`);
    }
  }

  handleDisconnect(client: Socket) {
    for (const [riderId, socketId] of this.riderSockets.entries()) {
      if (socketId === client.id) {
        this.riderSockets.delete(riderId);
        this.logger.log(
          `Rider ${riderId} disconnected from tracking namespace`,
        );
        break;
      }
    }

    // Remove from order subscribers
    for (const [orderId, socketIds] of this.orderSubscribers.entries()) {
      if (socketIds.has(client.id)) {
        socketIds.delete(client.id);
        if (socketIds.size === 0) {
          this.orderSubscribers.delete(orderId);
        }
      }
    }
  }

  @SubscribeMessage('joinOrderRoom')
  async joinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ) {
    await client.join(`order_${data.orderId}`);

    // Track subscribers
    if (!this.orderSubscribers.has(data.orderId)) {
      this.orderSubscribers.set(data.orderId, new Set());
    }
    this.orderSubscribers.get(data.orderId)?.add(client.id);

    this.logger.log(`Client ${client.id} joined order room ${data.orderId}`);
    return { message: `Joined order room ${data.orderId}` };
  }

  @SubscribeMessage('updateRiderLocation')
  async updateRiderLocation(@MessageBody() body: RiderLocationDto) {
    try {
      const updated = await this.trackingService.updateLocation(body);

      // Broadcast to everyone tracking this order
      this.server.to(`order_${body.orderId}`).emit('locationUpdated', {
        ...updated,
        timestamp: new Date(),
      });

      // Emit event for other services
      this.eventEmitter.emit('rider.location.updated', {
        riderId: body.riderId,
        orderId: body.orderId,
        latitude: body.lat,
        longitude: body.lng,
        timestamp: new Date(),
      });

      return { success: true, location: updated };
    } catch (error) {
      this.logger.error('Failed to update rider location:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('updateOrderStatus')
  async updateStatus(@MessageBody() data: { orderId: number; status: string }) {
    try {
      const updated = await this.trackingService.updateStatus(
        data.orderId,
        data.status,
      );

      this.server.to(`order_${data.orderId}`).emit('orderStatusUpdated', {
        ...updated,
        timestamp: new Date(),
      });

      return { success: true, order: updated };
    } catch (error) {
      this.logger.error('Failed to update order status:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('subscribeToOrder')
  async handleSubscribeToOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number; userId: number },
  ) {
    await client.join(`order:${data.orderId}`);
    await client.join(`user:${data.userId}:orders`);

    if (!this.orderSubscribers.has(data.orderId)) {
      this.orderSubscribers.set(data.orderId, new Set());
    }
    this.orderSubscribers.get(data.orderId)?.add(client.id);

    this.logger.log(`User ${data.userId} subscribed to order ${data.orderId}`);
    return { success: true, orderId: data.orderId };
  }

  @OnEvent('order.status.updated')
  handleOrderStatusUpdated(payload: {
    orderId: number;
    status: string;
    previousStatus?: string;
  }) {
    this.server.to(`order_${payload.orderId}`).emit('orderStatusUpdated', {
      ...payload,
      timestamp: new Date(),
    });
  }

  @OnEvent('rider.location.updated')
  handleRiderLocationUpdate(payload: {
    riderId: number;
    orderId: number;
    latitude: number;
    longitude: number;
    timestamp: Date;
  }) {
    this.server.to(`order_${payload.orderId}`).emit('riderLocation', payload);
  }

  @OnEvent('order.delivery.started')
  handleDeliveryStarted(payload: {
    orderId: number;
    riderId: number;
    startedAt: Date;
  }) {
    this.server.to(`order_${payload.orderId}`).emit('deliveryStarted', payload);

    // Notify rider
    const riderSocketId = this.riderSockets.get(payload.riderId);
    if (riderSocketId) {
      this.server.to(riderSocketId).emit('deliveryAssigned', payload);
    }
  }

  // Helper method to send to specific rider
  sendToRider(riderId: number, event: string, data: any) {
    const socketId = this.riderSockets.get(riderId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  // Get all sockets subscribed to an order
  getOrderSubscribers(orderId: number): Set<string> {
    return this.orderSubscribers.get(orderId) || new Set();
  }
}
