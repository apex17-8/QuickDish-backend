import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  customer_confirmed?: boolean;

  @IsOptional()
  @IsBoolean()
  rider_confirmed?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  customer_rating?: number;

  @IsOptional()
  @IsString()
  customer_feedback?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  delivery_latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  delivery_longitude?: number;
}
