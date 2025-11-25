import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from '../../order_items/dto/create-order_item.dto';

export class CreateOrderDto {
  @IsInt()
  @IsNotEmpty()
  customer_id: number;

  @IsInt()
  @IsNotEmpty()
  restaurant_id: number;

  @IsString()
  @IsNotEmpty()
  delivery_address: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

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
