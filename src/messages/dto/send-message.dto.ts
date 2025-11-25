import { IsNotEmpty, IsNumber, IsString, IsIn } from 'class-validator';

export class SendMessageDto {
  @IsNumber()
  @IsNotEmpty()
  orderId: number;

  @IsNumber()
  @IsNotEmpty()
  senderId: number;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsIn(['customer', 'rider'])
  @IsNotEmpty()
  senderType: 'customer' | 'rider';
}
