import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentDto } from './create-payment.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import {
  PaymentStatus,
  PaymentMethod,
  PaymentGateway,
} from '../entities/payment.entity';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentGateway)
  gateway?: PaymentGateway;

  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  @IsString()
  failure_reason?: string;

  @IsOptional()
  @IsString()
  refund_reason?: string;

  @IsOptional()
  @IsString()
  gateway_response?: string;

  @IsOptional()
  metadata?: any;
}
