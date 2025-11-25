import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { Repository, Not } from 'typeorm';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  /**
   * Send message
   */
  async createMessage(
    orderId: number,
    senderId: number,
    senderType: 'customer' | 'rider',
    content: string,
  ) {
    const message = this.messageRepository.create({
      order: { order_id: orderId },
      sender: { user_id: senderId },
      sender_type: senderType,
      content,
      is_read: false,
    });

    return this.messageRepository.save(message);
  }

  /**
   * Get chat history for an order
   */
  async getMessagesForOrder(orderId: number) {
    return this.messageRepository.find({
      where: { order: { order_id: orderId } },
      relations: ['sender'],
      order: { sent_at: 'ASC' },
    });
  }

  /**
   * Soft delete all messages in an order
   */
  async deleteMessagesForOrder(orderId: number) {
    return this.messageRepository.softDelete({
      order: { order_id: orderId },
    });
  }

  /**
   * Mark all messages in an order as read by a user
   */
  async markMessagesAsRead(orderId: number, userId: number) {
    await this.messageRepository.update(
      {
        order: { order_id: orderId },
        sender: { user_id: Not(userId) }, // only messages NOT sent by this user
        is_read: false,
      },
      {
        is_read: true,
      },
    );
  }

  /**
   * Get unread count for a user in an order
   */
  async getUnreadCount(orderId: number, userId: number): Promise<number> {
    return this.messageRepository.count({
      where: {
        order: { order_id: orderId },
        sender: { user_id: Not(userId) },
        is_read: false,
      },
    });
  }

  /**
   * Get last message for an order
   */
  async getLastMessage(orderId: number) {
    return this.messageRepository.findOne({
      where: { order: { order_id: orderId } },
      relations: ['sender'],
      order: { sent_at: 'DESC' },
    });
  }
}