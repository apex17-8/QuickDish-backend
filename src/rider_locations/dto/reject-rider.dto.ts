import { IsOptional, IsString } from 'class-validator';

export class RejectRiderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
