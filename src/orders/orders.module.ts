import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { Rider } from '../riders/entities/rider.entity';
import { MenuItem } from '../menu_items/entities/menu_item.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { OrderItem } from '../order_items/entities/order_item.entity';
import { Message } from '../messages/entities/message.entity';
import { Customer } from '../customers/entities/customer.entity';
import { OrderGateway } from '../websockets/gateways/order.gateway';
import { OrderItemsModule } from '../order_items/order_items.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Rider,
      MenuItem,
      Restaurant,
      OrderItem,
      Message,
      Customer,
    ]),
    OrderItemsModule,
  ],
  providers: [OrderService, OrderGateway],
  controllers: [OrdersController],
  exports: [OrderService],
})
export class OrdersModule {}
