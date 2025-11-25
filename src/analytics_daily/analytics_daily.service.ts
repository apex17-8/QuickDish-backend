import { Injectable } from '@nestjs/common';
import { CreateAnalyticsDailyDto } from './dto/create-analytics_daily.dto';
import { UpdateAnalyticsDailyDto } from './dto/update-analytics_daily.dto';

@Injectable()
export class AnalyticsDailyService {
  create(createAnalyticsDailyDto: CreateAnalyticsDailyDto) {
    return 'This action adds a new analyticsDaily';
  }

  findAll() {
    return `This action returns all analyticsDaily`;
  }

  findOne(id: number) {
    return `This action returns a #${id} analyticsDaily`;
  }

  update(id: number, updateAnalyticsDailyDto: UpdateAnalyticsDailyDto) {
    return `This action updates a #${id} analyticsDaily`;
  }

  remove(id: number) {
    return `This action removes a #${id} analyticsDaily`;
  }
}
