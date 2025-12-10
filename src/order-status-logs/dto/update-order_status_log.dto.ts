import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderStatusLogDto } from './create-order_status_log.dto';

export class UpdateOrderStatusLogDto extends PartialType(
  CreateOrderStatusLogDto,
) {}
