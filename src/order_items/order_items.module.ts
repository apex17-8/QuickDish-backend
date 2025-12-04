import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemsService } from './order_items.service';
import { OrderItemsController } from './order_items.controller';
import { OrderItem } from './entities/order_item.entity';
import { Order } from '../orders/entities/order.entity';
import { MenuItem } from '../menu_items/entities/menu_item.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity'; // Add this

@Module({
  imports: [TypeOrmModule.forFeature([OrderItem, Order, MenuItem, Restaurant])],
  providers: [OrderItemsService],
  controllers: [OrderItemsController],
  exports: [OrderItemsService],
})
export class OrderItemsModule {}
