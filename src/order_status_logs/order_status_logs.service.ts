import { Injectable } from '@nestjs/common';
import { CreateOrderStatusLogDto } from './dto/create-order_status_log.dto';
import { UpdateOrderStatusLogDto } from './dto/update-order_status_log.dto';

@Injectable()
export class OrderStatusLogsService {
  create(createOrderStatusLogDto: CreateOrderStatusLogDto) {
    return 'This action adds a new orderStatusLog';
  }

  findAll() {
    return `This action returns all orderStatusLogs`;
  }

  findOne(id: number) {
    return `This action returns a #${id} orderStatusLog`;
  }

  update(id: number, updateOrderStatusLogDto: UpdateOrderStatusLogDto) {
    return `This action updates a #${id} orderStatusLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} orderStatusLog`;
  }
}
