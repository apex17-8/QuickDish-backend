import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RiderLocationUpdateDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  timestamp?: number; // unix ms
}
