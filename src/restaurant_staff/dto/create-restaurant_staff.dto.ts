// src/restaurant_staff/dto/create-restaurant-staff.dto.ts
import { IsString, IsInt, IsOptional, IsEmail } from 'class-validator';

export class CreateRestaurantStaffDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  staffrole: string; // e.g., cook, waiter

  @IsInt()
  restaurantId: number;

  @IsOptional()
  @IsString()
  phone?: string;
}
