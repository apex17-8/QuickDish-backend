// payments/dto/create-payment.dto.ts
import { IsNumber, IsString, IsEmail, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  user_id: number;

  @IsNumber()
  order_id: number;

  @IsEmail()
  email: string;

  @IsNumber()
  amount: number;

  @IsString()
  callback_url: string;

  @IsOptional()
  metadata?: any;
}

export interface VerifyResponse {
  status: boolean;
  data: any;
}

export interface FetchTransactionResponse {
  status: boolean;
  data: any;
}
