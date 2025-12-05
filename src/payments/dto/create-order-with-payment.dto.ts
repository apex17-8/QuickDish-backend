import {
  IsNumber,
  IsString,
  IsEmail,
  IsOptional,
  IsUrl,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsNumber()
  @IsNotEmpty()
  menu_item_id: number;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsOptional()
  @IsString()
  special_instructions?: string;
}

export class CreateOrderWithPaymentDto {
  @IsNumber()
  @IsNotEmpty()
  customer_id: number;

  @IsNumber()
  @IsNotEmpty()
  restaurant_id: number;

  @IsString()
  @IsNotEmpty()
  delivery_address: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  delivery_latitude?: number;

  @IsOptional()
  @IsNumber()
  delivery_longitude?: number;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsUrl()
  @IsNotEmpty()
  callback_url: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
