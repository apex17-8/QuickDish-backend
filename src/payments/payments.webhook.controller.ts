// src/payments/payments.webhook.controller.ts
import {
  Controller,
  Post,
  Headers,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import * as crypto from 'crypto';

@Controller('webhooks/paystack')
export class PaystackWebhookController {
  private readonly logger = new Logger(PaystackWebhookController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handlePaystackWebhook(
    @Body() body: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    try {
      // Verify webhook signature
      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) {
        throw new BadRequestException('Paystack secret key not configured');
      }

      const isValid = this.verifyWebhookSignature(body, signature, secretKey);
      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }

      this.logger.log(`Received webhook event: ${body.event}`);

      // Handle different webhook events
      switch (body.event) {
        case 'charge.success':
          await this.paymentsService.verifyTransaction(body.data.reference);
          break;

        case 'charge.failed':
          await this.handleFailedPayment(body.data.reference);
          break;

        case 'transfer.success':
          this.logger.log('Transfer successful', body.data);
          break;

        default:
          this.logger.log(`Unhandled webhook event: ${body.event}`);
      }

      return { status: 'success' };
    } catch (error) {
      this.logger.error('Webhook processing failed', error);
      throw error;
    }
  }

  private verifyWebhookSignature(
    body: any,
    signature: string,
    secretKey: string,
  ): boolean {
    if (!signature) {
      return false;
    }

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(JSON.stringify(body))
      .digest('hex');

    return hash === signature;
  }

  private async handleFailedPayment(reference: string): Promise<void> {
    try {
      const payment = await this.paymentsService.findByReference(reference);
      if (payment) {
        this.logger.log(`Payment failed for reference: ${reference}`);
      }
    } catch (error) {
      this.logger.error(`Error handling failed payment: ${error.message}`);
    }
  }
}
