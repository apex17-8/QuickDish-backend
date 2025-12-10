import { Module, forwardRef } from '@nestjs/common';
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
import { OrderStatusLog } from '../order-status-logs/entities/order-status-log.entity';
import { User } from '../users/entities/user.entity';
import { OrderGateway } from '../websockets/gateways/order.gateway';
import { OrderTrackingGateway } from '../websockets/gateways/order-tracking.gateway';
import { OrderItemsModule } from '../order_items/order_items.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrderTrackingService } from '../websockets/services/order-tracking.service';
import { OrderStatusLogsModule } from '../order-status-logs/order_status_logs.module';

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
      OrderStatusLog,
      User,
    ]),
    OrderItemsModule,
    forwardRef(() => PaymentsModule),
    OrderStatusLogsModule,
  ],
  providers: [
    OrderService,
    OrderGateway,
    OrderTrackingGateway,
    OrderTrackingService,
  ],
  controllers: [OrdersController],
  exports: [OrderService],
})
export class OrdersModule {}
