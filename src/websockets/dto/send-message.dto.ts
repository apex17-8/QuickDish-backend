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
  message: string;

  @IsIn(['customer', 'rider'])
  @IsNotEmpty()
  senderType: 'customer' | 'rider';

  // Defined a getter for 'content' as an alias for 'message'
  get content(): string {
    return this.message;
  }
}
