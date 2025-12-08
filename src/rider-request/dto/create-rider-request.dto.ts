// src/rider-requests/dto/create-rider-request.dto.ts
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateRiderRequestDto {
  @IsNumber()
  rider_id: number;

  @IsNumber()
  restaurant_id: number;

  @IsOptional()
  @IsString()
  message?: string;
}
