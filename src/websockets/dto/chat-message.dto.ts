import { IsInt, IsString, IsOptional } from 'class-validator';

export class ChatMessageDto {
  @IsInt()
  fromUserId: number;

  @IsInt()
  toUserId: number;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  metadata?: string; // e.g. image url, location data
}
