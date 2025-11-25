import { Module } from '@nestjs/common';
import { AnalyticsDailyService } from './analytics_daily.service';
import { AnalyticsDailyController } from './analytics_daily.controller';

@Module({
  controllers: [AnalyticsDailyController],
  providers: [AnalyticsDailyService],
})
export class AnalyticsDailyModule {}
