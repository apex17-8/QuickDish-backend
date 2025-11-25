import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../../orders/entities/order.entity';

export class OrderEventDto {
  @IsInt()
  orderId: number;

  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
