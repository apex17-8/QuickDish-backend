import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRiderLocationDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  @IsOptional()
  address?: string | null;
}
