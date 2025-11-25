// src/menu_items/dto/update-menu-item.dto.ts
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
