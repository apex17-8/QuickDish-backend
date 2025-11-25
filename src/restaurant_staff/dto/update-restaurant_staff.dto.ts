// src/restaurant_staff/dto/update-restaurant-staff.dto.ts
import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateRestaurantStaffDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
