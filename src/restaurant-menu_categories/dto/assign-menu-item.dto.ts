// src/restaurant-menu_categories/dto/assign-menu-item.dto.ts
import { IsInt } from 'class-validator';

export class AssignMenuItemDto {
  @IsInt()
  menuItemId: number;
}
