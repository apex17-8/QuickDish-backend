// src/restaurant-menu_categories/dto/create-restaurant-menu-category.dto.ts
import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateRestaurantMenuCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  restaurantId: number; // links to the restaurant
}
