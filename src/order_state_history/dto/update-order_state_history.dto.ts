import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderStateHistoryDto } from './create-order_state_history.dto';

export class UpdateOrderStateHistoryDto extends PartialType(CreateOrderStateHistoryDto) {}
