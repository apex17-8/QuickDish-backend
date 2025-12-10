// src/rider-requests/dto/remove-rider.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class RemoveRiderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
