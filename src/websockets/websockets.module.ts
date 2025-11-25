import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderTrackingGateway } from './gateways/order-tracking.gateway';
import { ChatGateway } from './gateways/chat.gateway';
import { OrderTrackingService } from './services/order-tracking.service';
import { Order } from '../orders/entities/order.entity';
import { Rider } from '../riders/entities/rider.entity';
import { User } from '../users/entities/user.entity';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Rider, User]),
    MessagesModule, // Add this to use MessagesService
  ],
  providers: [OrderTrackingGateway, ChatGateway, OrderTrackingService],
})
export class WebsocketsModule {}
