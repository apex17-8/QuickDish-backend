import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { MarkMessageReadDto } from './dto/mark-message-read.dto';
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  //Send Message

  @Post()
  sendMessage(@Body() dto: SendMessageDto) {
    return this.messagesService.createMessage(
      dto.orderId,
      dto.senderId,
      dto.senderType,
      dto.content,
    );
  }

  //Get all chat messages in an order

  @Get(':orderId')
  getOrderMessages(@Param('orderId') orderId: number) {
    return this.messagesService.getMessagesForOrder(orderId);
  }

  // Mark messages in an order as read by a user
  @Patch(':orderId/read')
  markMessagesAsRead(
    @Param('orderId') orderId: number,
    @Body() dto: MarkMessageReadDto,
  ) {
    return this.messagesService.markMessagesAsRead(orderId, dto.userId);
  }

  // Get unread message count for a user in an order
  @Get(':orderId/unread/:userId')
  getUnreadCount(
    @Param('orderId') orderId: number,
    @Param('userId') userId: number,
  ) {
    return this.messagesService.getUnreadCount(orderId, userId);
  }
}
