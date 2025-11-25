// src/menu_items/dto/create-menu-item.dto.ts
import { IsString, IsNumber, IsOptional, IsInt, Min } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  restaurantId: number;

  @IsInt()
  categoryId: number;
}
