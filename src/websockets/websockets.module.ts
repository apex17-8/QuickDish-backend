import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrderGateway } from './gateways/order.gateway';
import { OrderTrackingGateway } from './gateways/order-tracking.gateway';
import { ChatGateway } from './gateways/chat.gateway';
import { OrderTrackingService } from './services/order-tracking.service';
import { ChatService } from './services/chat.service';
import { Message } from '../messages/entities/message.entity';
import { Order } from '../orders/entities/order.entity';
import { Rider } from '../riders/entities/rider.entity';
import { User } from '../users/entities/user.entity';
import { MessagesModule } from '../messages/messages.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Order, Rider, User]),
    EventEmitterModule,
    MessagesModule,
    forwardRef(() => OrdersModule),
  ],
  providers: [
    OrderGateway,
    OrderTrackingGateway,
    ChatGateway,
    OrderTrackingService,
    ChatService,
  ],
  exports: [
    OrderGateway,
    OrderTrackingGateway,
    ChatGateway,
    OrderTrackingService,
    ChatService,
  ],
})
export class WebsocketsModule {}
