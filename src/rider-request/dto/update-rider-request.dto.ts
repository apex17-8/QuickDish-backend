// src/rider-requests/dto/update-rider-request.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateRiderRequestDto } from './create-rider-request.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { RiderRequestStatus } from '../entities/rider-request.entity';

export class UpdateRiderRequestDto extends PartialType(CreateRiderRequestDto) {
  @IsOptional()
  @IsEnum(RiderRequestStatus)
  status?: RiderRequestStatus;

  @IsOptional()
  @IsString()
  rejection_reason?: string;

  @IsOptional()
  @IsString()
  suspension_reason?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
