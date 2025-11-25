import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrderStateHistoryService } from './order_state_history.service';
import { CreateOrderStateHistoryDto } from './dto/create-order_state_history.dto';
import { UpdateOrderStateHistoryDto } from './dto/update-order_state_history.dto';

@Controller('order-state-history')
export class OrderStateHistoryController {
  constructor(private readonly orderStateHistoryService: OrderStateHistoryService) {}

  @Post()
  create(@Body() createOrderStateHistoryDto: CreateOrderStateHistoryDto) {
    return this.orderStateHistoryService.create(createOrderStateHistoryDto);
  }

  @Get()
  findAll() {
    return this.orderStateHistoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderStateHistoryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderStateHistoryDto: UpdateOrderStateHistoryDto) {
    return this.orderStateHistoryService.update(+id, updateOrderStateHistoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderStateHistoryService.remove(+id);
  }
}
