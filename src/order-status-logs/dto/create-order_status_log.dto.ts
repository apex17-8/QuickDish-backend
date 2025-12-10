// src/order-status-logs/dto/create-order_status_log.dto.ts
import { IsInt, IsOptional, IsString, IsEnum } from 'class-validator';
import { OrderStatus } from '../../orders/entities/order.entity';

export class CreateOrderStatusLogDto {
  @IsInt()
  order_id: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  from_status?: OrderStatus | null;

  @IsEnum(OrderStatus)
  to_status: OrderStatus;

  @IsOptional()
  @IsInt()
  changed_by_user_id?: number;

  @IsOptional()
  @IsString()
  changed_by_role?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}