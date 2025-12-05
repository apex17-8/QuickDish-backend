import { IsOptional, IsNumber, IsString, Min } from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  loyalty_points?: number;

  @IsOptional()
  @IsString()
  default_address?: string;

  @IsOptional()
  preferences?: any;
}
