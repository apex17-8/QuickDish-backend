import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';

export class UpdateMessageDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsIn(['customer', 'rider'])
  @IsOptional()
  sender_type?: 'customer' | 'rider';

  @IsBoolean()
  @IsOptional()
  is_read?: boolean;
}
