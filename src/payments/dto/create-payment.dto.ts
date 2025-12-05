import {
  IsNumber,
  IsString,
  IsEmail,
  IsOptional,
  IsUrl,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  user_id: number;

  @IsNumber()
  order_id: number;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsUrl()
  callback_url?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  metadata?: any;
}

export interface VerifyResponse {
  status: boolean;
  message: string;
  data: any;
}

export interface FetchTransactionResponse {
  status: boolean;
  message: string;
  data: any;
}
