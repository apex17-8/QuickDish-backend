import { PartialType } from '@nestjs/mapped-types';
import { CreateAnalyticsDailyDto } from './create-analytics_daily.dto';

export class UpdateAnalyticsDailyDto extends PartialType(CreateAnalyticsDailyDto) {}
