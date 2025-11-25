import { Module } from '@nestjs/common';
import { OrderStateHistoryService } from './order_state_history.service';
import { OrderStateHistoryController } from './order_state_history.controller';

@Module({
  controllers: [OrderStateHistoryController],
  providers: [OrderStateHistoryService],
})
export class OrderStateHistoryModule {}
