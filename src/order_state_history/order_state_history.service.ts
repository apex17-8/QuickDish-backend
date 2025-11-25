import { Injectable } from '@nestjs/common';
import { CreateOrderStateHistoryDto } from './dto/create-order_state_history.dto';
import { UpdateOrderStateHistoryDto } from './dto/update-order_state_history.dto';

@Injectable()
export class OrderStateHistoryService {
  create(createOrderStateHistoryDto: CreateOrderStateHistoryDto) {
    return 'This action adds a new orderStateHistory';
  }

  findAll() {
    return `This action returns all orderStateHistory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} orderStateHistory`;
  }

  update(id: number, updateOrderStateHistoryDto: UpdateOrderStateHistoryDto) {
    return `This action updates a #${id} orderStateHistory`;
  }

  remove(id: number) {
    return `This action removes a #${id} orderStateHistory`;
  }
}
