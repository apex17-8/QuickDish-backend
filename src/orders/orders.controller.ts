import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { OrderService } from './orders.service';
import { OrderStatus } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AssignRiderDto } from './dto/assign-order.dto';
import { UpdateOrderStatusLogDto } from './../order_status_logs/dto/update-order_status_log.dto';
import { SubmitRatingDto } from './dto/submit-rating.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  getAll(@Query() query: OrderQueryDto) {
    return this.orderService.findAll(query);
  }

  @Get('stats')
  getStats(
    @Query('restaurant_id', new DefaultValuePipe(0), ParseIntPipe)
    restaurantId: number,
  ) {
    return this.orderService.getOrderStats(restaurantId || undefined);
  }

  @Get('revenue')
  getRevenueStats(
    @Query('restaurant_id', new DefaultValuePipe(0), ParseIntPipe)
    restaurantId: number,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.orderService.getRevenueStats(restaurantId || undefined, days);
  }

  @Get(':orderId')
  getOne(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.orderService.findOne(orderId);
  }

  @Get(':orderId/details')
  getOrderWithDetails(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.orderService.findOrderWithDetails(orderId);
  }

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.createOrderWithItems(createOrderDto);
  }

  @Get('customer/:customerId')
  findByCustomer(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.orderService.findByCustomer(customerId);
  }

  @Get('restaurant/:restaurantId')
  findByRestaurant(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.orderService.findByRestaurant(restaurantId);
  }

  @Get('rider/:riderId')
  findByRider(@Param('riderId', ParseIntPipe) riderId: number) {
    return this.orderService.findByRider(riderId);
  }

  @Get('restaurant/:restaurantId/pending')
  findPendingForRestaurant(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
  ) {
    return this.orderService.findPendingForRestaurant(restaurantId);
  }

  @Get('ready')
  findReadyOrders() {
    return this.orderService.findReadyOrders();
  }

  @Patch(':orderId/assign-rider')
  assignRider(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() assignRiderDto: AssignRiderDto,
  ) {
    return this.orderService.assignRider(orderId, assignRiderDto.rider_id);
  }

  @Patch(':orderId/status')
  updateStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.orderService.updateStatus(orderId, updateStatusDto.status);
  }

  @Patch(':orderId')
  update(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.orderService.update(orderId, updateOrderDto);
  }

  @Post(':orderId/recalculate-total')
  calculateTotal(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.orderService.calculateTotal(orderId);
  }

  @Patch(':orderId/confirm-customer')
  confirmCustomer(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.orderService.confirmDeliveredByCustomer(orderId);
  }

  @Patch(':orderId/confirm-rider')
  confirmRider(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.orderService.confirmDeliveredByRider(orderId);
  }

  @Post(':orderId/rate')
  submitRating(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() submitRatingDto: SubmitRatingDto,
  ) {
    return this.orderService.submitRating(
      orderId,
      submitRatingDto.rating,
      submitRatingDto.feedback,
    );
  }

  @Patch(':orderId/cancel')
  cancelOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() cancelOrderDto: CancelOrderDto,
  ) {
    return this.orderService.cancelOrder(orderId, cancelOrderDto.reason);
  }

  @Delete(':orderId')
  remove(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.orderService.remove(orderId);
  }
}
