import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AnalyticsDailyService } from './analytics_daily.service';
import { CreateAnalyticsDailyDto } from './dto/create-analytics_daily.dto';
import { UpdateAnalyticsDailyDto } from './dto/update-analytics_daily.dto';

@Controller('analytics-daily')
export class AnalyticsDailyController {
  constructor(private readonly analyticsDailyService: AnalyticsDailyService) {}

  @Post()
  create(@Body() createAnalyticsDailyDto: CreateAnalyticsDailyDto) {
    return this.analyticsDailyService.create(createAnalyticsDailyDto);
  }

  @Get()
  findAll() {
    return this.analyticsDailyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.analyticsDailyService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAnalyticsDailyDto: UpdateAnalyticsDailyDto) {
    return this.analyticsDailyService.update(+id, updateAnalyticsDailyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.analyticsDailyService.remove(+id);
  }
}
