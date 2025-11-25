import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { OrderItemsService } from './order_items.service';
import { CreateOrderItemDto } from './dto/create-order_item.dto';
import { UpdateOrderItemDto } from './dto/update-order_item.dto';
import { OrderItem } from './entities/order_item.entity';

@Controller('order-items')
export class OrderItemsController {
  constructor(private readonly orderItemsService: OrderItemsService) {}

  @Post()
  create(@Body() createOrderItemDto: CreateOrderItemDto): Promise<OrderItem> {
    return this.orderItemsService.create(createOrderItemDto);
  }

  @Post('bulk/:orderId')
  createBulk(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() items: CreateOrderItemDto[],
  ): Promise<OrderItem[]> {
    return this.orderItemsService.createBulk(orderId, items);
  }

  @Get()
  findAll(): Promise<OrderItem[]> {
    return this.orderItemsService.findAll();
  }

  @Get('order/:orderId')
  findByOrder(@Param('orderId', ParseIntPipe) orderId: number): Promise<OrderItem[]> {
    return this.orderItemsService.findByOrder(orderId);
  }

  @Get('order/:orderId/summary')
  getOrderSummary(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.orderItemsService.getOrderSummary(orderId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<OrderItem> {
    return this.orderItemsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderItemDto: UpdateOrderItemDto,
  ): Promise<OrderItem> {
    return this.orderItemsService.update(id, updateOrderItemDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.orderItemsService.remove(id);
  }
}