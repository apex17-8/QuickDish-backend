// orders/dto/create-order-with-payment.dto.ts
import {
  IsNumber,
  IsString,
  IsEmail,
  IsOptional,
  IsUrl,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from '../../order_items/dto/create-order_item.dto';

export class CreateOrderWithPaymentDto {
  @IsNumber()
  customer_id: number;

  @IsNumber()
  restaurant_id: number;

  @IsString()
  delivery_address: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsEmail()
  email: string;

  @IsNumber()
  amount: number;

  @IsUrl()
  callback_url: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
