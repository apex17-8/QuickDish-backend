import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OrderTrackingService } from '../services/order-tracking.service';
import { RiderLocationDto } from '../dto/rider-location.dto';

@WebSocketGateway({
  cors: true,
})
export class OrderTrackingGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly trackingService: OrderTrackingService) {}

  @SubscribeMessage('joinOrderRoom')
  joinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ) {
    client.join(`order_${data.orderId}`);
    return { message: `Joined order room ${data.orderId}` };
  }

  @SubscribeMessage('updateRiderLocation')
  async updateRiderLocation(
    @MessageBody() body: RiderLocationDto,
  ) {
    const updated = await this.trackingService.updateLocation(body);

    // broadcast to everyone tracking this order
    this.server.to(`order_${body.orderId}`).emit('locationUpdated', updated);
  }

  @SubscribeMessage('updateOrderStatus')
  async updateStatus(
    @MessageBody() data: { orderId: number; status: string },
  ) {
    const updated = await this.trackingService.updateStatus(
      data.orderId,
      data.status,
    );

    this.server.to(`order_${data.orderId}`).emit('orderStatusUpdated', updated);
  }
}
