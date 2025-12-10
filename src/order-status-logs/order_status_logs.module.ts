import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderStatusLogsService } from './order_status_logs.service';
import { OrderStatusLogsController } from './order_status_logs.controller';
import { OrderStatusLog } from './entities/order-status-log.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrderStatusLog, Order, User])],
  controllers: [OrderStatusLogsController],
  providers: [OrderStatusLogsService],
  exports: [OrderStatusLogsService],
})
export class OrderStatusLogsModule {}
