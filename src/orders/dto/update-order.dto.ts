import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @IsOptional()
  @IsString()
  notes?: string;

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
