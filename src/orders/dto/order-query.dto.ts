import { IsOptional, IsEnum, IsInt, IsDateString } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';
import { Type } from 'class-transformer';

export class OrderQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customer_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  restaurant_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  rider_id?: number;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 10;
}