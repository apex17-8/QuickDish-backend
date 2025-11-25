import { Injectable, NotFoundException } from '@nestjs/common';
import { SendMessageDto } from '../dto/send-message.dto'; 
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async saveMessage(data: SendMessageDto) {
    const sender = await this.userRepo.findOne({
      where: { user_id: data.senderId },
    });

    if (!sender) throw new NotFoundException('Sender not found');

    return {
      senderId: sender.user_id,
      message: data.message,
      timestamp: new Date(),
      orderId: data.orderId,
    };
  }
}
