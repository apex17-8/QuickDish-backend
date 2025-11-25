import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OrderService } from '../../orders/orders.service';
import { OrderEventDto } from '../dto/order-event.dto';

@WebSocketGateway({ cors: true, namespace: '/order-status' })
export class OrderStatusGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(private readonly ordersService: OrderService) {}

  afterInit(server: Server) {
    // console.log('OrderStatusGateway ready');
  }

  /**
   * A backend service (or admin panel) can emit status changes through socket to notify interested clients.
   * Clients can join rooms like order:{orderId} to listen to their order updates.
   */
  @SubscribeMessage('subscribeOrder')
  handleSubscribeOrder(
    @MessageBody() payload: { orderId: number },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`order:${payload.orderId}`);
    return { ok: true, joined: `order:${payload.orderId}` };
  }

  @SubscribeMessage('unsubscribeOrder')
  handleUnsubscribeOrder(
    @MessageBody() payload: { orderId: number },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`order:${payload.orderId}`);
    return { ok: true, left: `order:${payload.orderId}` };
  }

  /**
   * Internal or admin client emits 'orderStatusUpdate' with { orderId, status, note? }
   * Gateway will broadcast to order room and optionally update DB.
   */
  @SubscribeMessage('orderStatusUpdate')
  async handleOrderStatusUpdate(@MessageBody() payload: OrderEventDto) {
    // optional: persist status to DB using OrdersService
    try {
      await this.ordersService.updateStatus(payload.orderId, payload.status);
    } catch (err) {
      // ignore or log; still broadcast attempt
    }

    // broadcast to clients subscribed to the order
    this.server.to(`order:${payload.orderId}`).emit('orderStatus', {
      orderId: payload.orderId,
      status: payload.status,
      note: payload.note ?? null,
      timestamp: new Date(),
    });

    // broadcast to restaurant/rider rooms if desired
    this.server.emit('orderStatusGlobal', {
      orderId: payload.orderId,
      status: payload.status,
    });

    return { ok: true };
  }
}
