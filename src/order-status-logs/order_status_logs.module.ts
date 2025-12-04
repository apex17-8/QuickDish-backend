import { Module } from '@nestjs/common';
import { OrderStatusLogsService } from './order_status_logs.service';
import { OrderStatusLogsController } from './order_status_logs.controller';

@Module({
  controllers: [OrderStatusLogsController],
  providers: [OrderStatusLogsService],
})
export class OrderStatusLogsModule {}
