import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderItemDto } from './create-order_item.dto';
import { IsInt, IsPositive, IsOptional, IsString } from 'class-validator';

export class UpdateOrderItemDto extends PartialType(CreateOrderItemDto) {
  @IsOptional()
  @IsInt()
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @IsString()
  special_instructions?: string;
}
