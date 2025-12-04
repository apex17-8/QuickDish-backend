// src/payments/payments.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaystackWebhookController } from './payments.webhook.controller';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order]),
    forwardRef(() => OrdersModule), // circular dependency
  ],
  controllers: [PaymentsController, PaystackWebhookController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
