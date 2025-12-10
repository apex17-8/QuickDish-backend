// src/restaurants/dto/create-restaurant.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsNumber,
} from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Pizza Palace' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '123 Main St, Nairobi' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: '+254712345678' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Italian', required: false })
  @IsOptional()
  @IsString()
  cuisine?: string;

  @ApiProperty({
    example: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  logo_url?: string;

  @ApiProperty({ example: '$$', required: false })
  @IsOptional()
  @IsString()
  price_range?: string;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  delivery_fee?: number;

  @ApiProperty({ example: 30, required: false })
  @IsOptional()
  @IsNumber()
  estimated_delivery_time?: number;

  @ApiProperty({ example: 'Delicious Italian pizzas', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsString()
  is_active?: string = 'true';
}
