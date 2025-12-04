// payments/payments.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Client calls this before redirect to Paystack
  @Post('initialize')
  initialize(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.initializePayment(dto);
  }

  // Paystack callback hits this endpoint
  @Get('verify')
  verify(@Query('reference') reference: string) {
    return this.paymentsService.verifyTransaction(reference);
  }

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get('user/:id')
  findUserPayments(@Param('id') id: number) {
    return this.paymentsService.findUserPayments(id);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.paymentsService.remove(id);
  }
}
