import { IsInt, IsNumber, IsPositive, IsString, IsOptional } from 'class-validator';

export class CreateOrderItemDto {
  @IsInt()
  @IsPositive()
  order_id: number;

  @IsInt()
  @IsPositive()
  menu_item_id: number;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  special_instructions?: string;
}
