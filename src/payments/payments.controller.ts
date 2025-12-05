import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Initialize payment
  @Post('initialize')
  initialize(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.initializePayment(dto);
  }

  // Verify payment
  @Get('verify')
  verify(@Query('reference') reference: string) {
    return this.paymentsService.verifyTransaction(reference);
  }

  // Get all payments
  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  // Get payment by ID
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }

  // Get payment by reference
  @Get('reference/:reference')
  findByReference(@Param('reference') reference: string) {
    return this.paymentsService.findByReference(reference);
  }

  // Get user payments
  @Get('user/:userId')
  findUserPayments(@Param('userId', ParseIntPipe) userId: number) {
    return this.paymentsService.findUserPayments(userId);
  }

  // Get order payments
  @Get('order/:orderId')
  findOrderPayments(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.findOrderPayments(orderId);
  }

  // Update payment
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(id, dto);
  }

  // Delete payment
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.remove(id);
  }

  // Initiate refund
  @Post(':id/refund')
  initiateRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.paymentsService.initiateRefund(id, reason);
  }

  // Get payment stats - FIXED: Use DefaultValuePipe
  @Get('stats/daily')
  getDailyRevenue(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.paymentsService.getDailyRevenue(days);
  }

  // Get payment status
  @Get(':id/status')
  getPaymentStatus(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.getPaymentStatus(id);
  }

  // Check if order can be paid
  @Get('order/:orderId/can-pay')
  canMakePayment(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.canMakePayment(orderId);
  }

  // Cancel pending payment
  @Post(':id/cancel')
  cancelPendingPayment(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.cancelPendingPayment(id);
  }

  // Get payment statistics with optional date range
  @Get('stats/overview')
  getPaymentStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.paymentsService.getPaymentStats(start, end);
  }

  // Get payment by order
  @Get('by-order/:orderId')
  getPaymentByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.getPaymentByOrder(orderId);
  }

  // Validate payment reference
  @Get('validate/:reference')
  validateReference(@Param('reference') reference: string) {
    return this.paymentsService.validatePaymentReference(reference);
  }
}
