// src/restaurant-menu_categories/dto/update-restaurant-menu-category.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class UpdateRestaurantMenuCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
