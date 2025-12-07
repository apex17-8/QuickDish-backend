import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { OrderStatusLogsService } from './order_status_logs.service';
import { CreateOrderStatusLogDto } from './dto/create-order_status_log.dto';
import { UpdateOrderStatusLogDto } from './dto/update-order_status_log.dto';

@Controller('order-status-logs')
export class OrderStatusLogsController {
  constructor(
    private readonly orderStatusLogsService: OrderStatusLogsService,
  ) {}

  @Post()
  create(@Body() createOrderStatusLogDto: CreateOrderStatusLogDto) {
    return this.orderStatusLogsService.create(createOrderStatusLogDto);
  }

  @Get()
  findAll() {
    return this.orderStatusLogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderStatusLogsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOrderStatusLogDto: UpdateOrderStatusLogDto,
  ) {
    return this.orderStatusLogsService.update(+id, updateOrderStatusLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderStatusLogsService.remove(+id);
  }
}
