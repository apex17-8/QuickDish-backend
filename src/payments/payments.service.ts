import {
  BadRequestException,
  Injectable,
  Logger,
  Inject,
  forwardRef,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentGateway,
} from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  Order,
  PaymentStatus as OrderPaymentStatus,
  OrderStatus,
} from '../orders/entities/order.entity';
import { OrderService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paystackSecret: string;
  private readonly paystackPublicKey: string;

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,

    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,

    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,

    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
  ) {
    this.paystackSecret =
      this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
    this.paystackPublicKey =
      this.configService.get<string>('PAYSTACK_PUBLIC_KEY') || '';

    if (!this.paystackSecret) {
      this.logger.warn('PAYSTACK_SECRET_KEY not configured');
    }
  }

  // -------------------------
  // Initialize payment
  // -------------------------
  async initializePayment(dto: CreatePaymentDto) {
    if (!this.paystackSecret) {
      throw new BadRequestException('Paystack secret key not configured');
    }

    // Generate unique reference
    const reference = `PAY_${Date.now()}_${dto.user_id}`;

    // Get order to verify amount
    const order = await this.ordersRepository.findOne({
      where: { order_id: dto.order_id },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.order_id} not found`);
    }

    // Use order total if amount not specified
    const amount = dto.amount || order.total_price;
    const amountInKobo = Math.round(amount * 100); // Paystack uses kobo

    const payload = {
      email: dto.email,
      amount: amountInKobo,
      currency: 'KES', // Kenya Shillings
      reference,
      callback_url:
        dto.callback_url ||
        `${this.configService.get('FRONTEND_URL')}/payment/verify`,
      metadata: {
        user_id: dto.user_id,
        order_id: dto.order_id,
        order_reference: `ORD_${dto.order_id}`,
      },
      channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money'],
    };

    this.logger.log(
      `Initializing payment for order ${dto.order_id}, amount: ${amount}, reference: ${reference}`,
    );

    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecret}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || 'Failed to initialize payment',
        );
      }

      const paymentData = response.data.data;

      // Generate payment number
      const paymentNumber = await this.generatePaymentNumber();

      // Create payment record - FIXED: Include all required fields
      const payment = this.paymentsRepository.create({
        user_id: dto.user_id,
        order_id: dto.order_id,
        email: dto.email,
        amount: amount,
        currency: 'KES', // Hardcode for Kenya
        payment_number: paymentNumber,
        payment_method: PaymentMethod.CARD,
        gateway: PaymentGateway.PAYSTACK,
        status: PaymentStatus.PENDING,
        transaction_id: paymentData.reference,
        payment_reference: paymentData.reference,
        authorization_url: paymentData.authorization_url,
        access_code: paymentData.access_code,
        description: dto.description || null,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      });

      const savedPayment = await this.paymentsRepository.save(payment);

      // Update order with payment reference
      await this.ordersRepository.update(dto.order_id, {
        payment_reference: reference,
        payment_status: OrderPaymentStatus.Pending,
      });

      // Emit payment initialized event
      this.eventEmitter.emit('payment.initialized', {
        paymentId: savedPayment.payment_id,
        orderId: dto.order_id,
        userId: dto.user_id,
        amount: amount,
        reference: reference,
        authorizationUrl: paymentData.authorization_url,
      });

      this.logger.log(
        `Payment initialized successfully for order ${dto.order_id}`,
      );

      return {
        success: true,
        authorization_url: paymentData.authorization_url,
        access_code: paymentData.access_code,
        reference: paymentData.reference,
        payment_id: savedPayment.payment_id,
        amount: amount,
        message: 'Payment initialized successfully',
      };
    } catch (error: any) {
      this.logger.error('Payment initialization failed:', error);

      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.message || 'Payment initialization failed';
        throw new BadRequestException(errorMessage);
      }

      throw new BadRequestException('Payment initialization failed');
    }
  }

  // -------------------------
  // Verify transaction
  // -------------------------
  async verifyTransaction(reference: string): Promise<any> {
    if (!this.paystackSecret) {
      throw new BadRequestException('Paystack secret key not configured');
    }

    this.logger.log(`Verifying transaction: ${reference}`);

    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecret}`,
          },
          timeout: 30000,
        },
      );

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || 'Transaction verification failed',
        );
      }

      const transaction = response.data.data;

      // Find payment by reference
      const payment = await this.paymentsRepository.findOne({
        where: { payment_reference: reference },
        relations: ['order'],
      });

      if (!payment) {
        this.logger.warn(`Payment not found for reference: ${reference}`);
        throw new NotFoundException(
          `Payment with reference ${reference} not found`,
        );
      }

      // Update payment status based on transaction status
      const previousStatus = payment.status;

      if (transaction.status === 'success') {
        payment.status = PaymentStatus.COMPLETED;
        payment.paid_at = transaction.paid_at
          ? new Date(transaction.paid_at)
          : new Date();
        payment.transaction_id =
          transaction.id?.toString() || payment.transaction_id;
        payment.gateway_response = JSON.stringify(transaction);

        // Update order payment status and confirm order
        await this.orderService.confirmOrderAfterPayment(payment.order_id);

        // Emit payment success event
        this.eventEmitter.emit('payment.success', {
          paymentId: payment.payment_id,
          orderId: payment.order_id,
          userId: payment.user_id,
          amount: payment.amount,
          reference: reference,
          paidAt: payment.paid_at,
        });

        this.logger.log(`Payment ${reference} verified successfully`);
      } else {
        payment.status = PaymentStatus.FAILED;
        payment.failed_at = new Date();
        payment.failure_reason =
          transaction.gateway_response || 'Payment failed';
        payment.gateway_response = JSON.stringify(transaction);

        // Update order payment status
        await this.ordersRepository.update(payment.order_id, {
          payment_status: OrderPaymentStatus.Failed,
        });

        // Emit payment failed event
        this.eventEmitter.emit('payment.failed', {
          paymentId: payment.payment_id,
          orderId: payment.order_id,
          userId: payment.user_id,
          amount: payment.amount,
          reference: reference,
          reason: payment.failure_reason,
        });

        this.logger.warn(
          `Payment ${reference} failed: ${payment.failure_reason}`,
        );
      }

      await this.paymentsRepository.save(payment);

      return {
        success: true,
        payment: {
          id: payment.payment_id,
          status: payment.status,
          amount: payment.amount,
          reference: payment.payment_reference,
          paid_at: payment.paid_at,
          failed_at: payment.failed_at,
        },
        transaction: {
          status: transaction.status,
          message: transaction.message,
          reference: transaction.reference,
          amount: transaction.amount / 100, // Convert back from kobo
          currency: transaction.currency,
          channel: transaction.channel,
          paid_at: transaction.paid_at,
        },
      };
    } catch (error: any) {
      this.logger.error('Transaction verification failed:', error);

      if (axios.isAxiosError(error)) {
        throw new BadRequestException(
          error.response?.data?.message || 'Transaction verification failed',
        );
      }

      throw new BadRequestException('Transaction verification failed');
    }
  }

  // -------------------------
  // Handle webhook event
  // -------------------------
  async handleWebhookEvent(eventData: any, signature?: string): Promise<void> {
    try {
      // Verify signature if provided
      if (signature && this.paystackSecret) {
        const crypto = await import('crypto');
        const hash = crypto
          .createHmac('sha512', this.paystackSecret)
          .update(JSON.stringify(eventData))
          .digest('hex');

        if (hash !== signature) {
          this.logger.error('Invalid webhook signature');
          throw new BadRequestException('Invalid signature');
        }
      }

      this.logger.log(`Processing webhook event: ${eventData.event}`);

      switch (eventData.event) {
        case 'charge.success':
          await this.verifyTransaction(eventData.data.reference);
          break;

        case 'charge.failed':
          await this.handleFailedPayment(eventData.data.reference);
          break;

        case 'transfer.success':
          this.logger.log('Transfer successful', eventData.data);
          break;

        case 'refund.processed':
          await this.handleRefund(eventData.data);
          break;

        case 'subscription.create':
        case 'invoice.create':
        case 'invoice.payment_failed':
          // Handle other events if needed
          this.logger.log(
            `Webhook event received: ${eventData.event}`,
            eventData.data,
          );
          break;

        default:
          this.logger.log(`Unhandled webhook event: ${eventData.event}`);
      }

      // Emit webhook processed event
      this.eventEmitter.emit('payment.webhook.processed', {
        event: eventData.event,
        reference: eventData.data?.reference,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  // -------------------------
  // Handle failed payment
  // -------------------------
  private async handleFailedPayment(reference: string): Promise<void> {
    try {
      const payment = await this.paymentsRepository.findOne({
        where: { payment_reference: reference },
      });

      if (payment) {
        payment.status = PaymentStatus.FAILED;
        payment.failure_reason = 'Payment failed via webhook';
        payment.failed_at = new Date();

        await this.paymentsRepository.save(payment);

        // Update order
        await this.ordersRepository.update(payment.order_id, {
          payment_status: OrderPaymentStatus.Failed,
        });

        this.logger.log(
          `Payment failed via webhook for reference: ${reference}`,
        );
      } else {
        this.logger.warn(
          `Payment not found for failed webhook reference: ${reference}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error handling failed payment ${reference}:`, error);
    }
  }

  // -------------------------
  // Handle refund
  // -------------------------
  private async handleRefund(refundData: any): Promise<void> {
    try {
      const { reference, amount, status } = refundData;

      if (status === 'success') {
        const payment = await this.paymentsRepository.findOne({
          where: { transaction_id: reference },
        });

        if (payment) {
          payment.status = PaymentStatus.REFUNDED;
          payment.refunded_at = new Date();
          payment.refund_reason = `Refund processed: ${amount / 100} KES`;

          // Update gateway response
          try {
            const currentResponse = payment.gateway_response
              ? JSON.parse(payment.gateway_response)
              : {};
            currentResponse.refund = {
              amount: amount / 100,
              currency: 'KES',
              processedAt: new Date().toISOString(),
            };
            payment.gateway_response = JSON.stringify(currentResponse);
          } catch {
            // Ignore parse errors
          }

          await this.paymentsRepository.save(payment);

          // Update order payment status
          await this.ordersRepository.update(payment.order_id, {
            payment_status: OrderPaymentStatus.Refunded,
          });

          this.logger.log(
            `Refund processed for payment ${reference}: ${amount / 100} KES`,
          );
        } else {
          this.logger.warn(
            `Refund received but no payment found for ${reference}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error processing refund:', error);
    }
  }

  // -------------------------
  // CRUD operations
  // -------------------------
  async create(dto: CreatePaymentDto): Promise<Payment> {
    const paymentNumber = await this.generatePaymentNumber();

    const payment = this.paymentsRepository.create({
      user_id: dto.user_id,
      order_id: dto.order_id,
      email: dto.email,
      amount: dto.amount,
      currency: dto.currency || 'KES',
      payment_number: paymentNumber,
      status: PaymentStatus.PENDING,
      payment_method: PaymentMethod.CARD,
      gateway: PaymentGateway.PAYSTACK,
      description: dto.description || null,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
    });

    return this.paymentsRepository.save(payment);
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      relations: ['order'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { payment_id: id },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return payment;
  }

  async update(id: number, dto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);

    // Prevent updating certain fields if payment is completed
    if (payment.status === PaymentStatus.COMPLETED) {
      const updatableFields = ['metadata', 'description', 'notes'];
      const nonUpdatableFields = Object.keys(dto).filter(
        (key) => !updatableFields.includes(key),
      );

      if (nonUpdatableFields.length > 0) {
        throw new BadRequestException(
          `Cannot update ${nonUpdatableFields.join(', ')} for completed payment`,
        );
      }
    }

    Object.assign(payment, dto);
    return this.paymentsRepository.save(payment);
  }

  async remove(id: number): Promise<void> {
    const payment = await this.findOne(id);

    // Prevent deletion of completed payments
    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Cannot delete completed payment');
    }

    await this.paymentsRepository.remove(payment);
  }

  // -------------------------
  // Find payments by criteria
  // -------------------------
  async findByReference(reference: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { payment_reference: reference },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment with reference ${reference} not found`,
      );
    }

    return payment;
  }

  async findUserPayments(userId: number): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { user_id: userId },
      relations: ['order'],
      order: { created_at: 'DESC' },
    });
  }

  async findOrderPayments(orderId: number): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { order_id: orderId },
      relations: ['order'],
      order: { created_at: 'DESC' },
    });
  }

  async findPaymentsByStatus(status: PaymentStatus): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { status },
      relations: ['order'],
      order: { created_at: 'DESC' },
    });
  }

  // -------------------------
  // Refund operations
  // -------------------------
  async initiateRefund(paymentId: number, reason?: string): Promise<Payment> {
    const payment = await this.findOne(paymentId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    if (!payment.transaction_id) {
      throw new BadRequestException('Payment transaction ID not found');
    }

    if (!this.paystackSecret) {
      throw new BadRequestException('Paystack secret key not configured');
    }

    try {
      // Call Paystack refund API
      const response = await axios.post(
        'https://api.paystack.co/refund',
        {
          transaction: payment.transaction_id,
          amount: Math.round(payment.amount * 100),
          currency: 'KES',
          customer_note: reason || 'Customer requested refund',
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecret}`,
          },
          timeout: 30000,
        },
      );

      if (response.data.status) {
        // Update payment status to pending refund
        payment.status = PaymentStatus.PENDING;
        payment.refund_reason = reason || null;

        const updatedPayment = await this.paymentsRepository.save(payment);

        this.eventEmitter.emit('payment.refund.initiated', {
          paymentId: paymentId,
          orderId: payment.order_id,
          amount: payment.amount,
          reason: reason,
          timestamp: new Date(),
        });

        this.logger.log(`Refund initiated for payment ${paymentId}`);

        return updatedPayment;
      } else {
        throw new BadRequestException(
          response.data.message || 'Failed to initiate refund',
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to initiate refund for payment ${paymentId}:`,
        error,
      );

      if (axios.isAxiosError(error)) {
        throw new BadRequestException(
          error.response?.data?.message || 'Failed to initiate refund',
        );
      }

      throw new BadRequestException('Failed to initiate refund');
    }
  }

  // -------------------------
  // Analytics & Reports
  // -------------------------
  async getPaymentStats(startDate?: Date, endDate?: Date) {
    const query = this.paymentsRepository.createQueryBuilder('payment');

    if (startDate && endDate) {
      query.where('payment.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      query.where('payment.created_at >= :startDate', { startDate });
    } else if (endDate) {
      query.where('payment.created_at <= :endDate', { endDate });
    }

    const total = await query.getCount();
    const completed = await query
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getCount();
    const pending = await query
      .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
      .getCount();
    const failed = await query
      .andWhere('payment.status = :status', { status: PaymentStatus.FAILED })
      .getCount();
    const refunded = await query
      .andWhere('payment.status = :status', { status: PaymentStatus.REFUNDED })
      .getCount();

    const totalRevenue = await query
      .select('SUM(payment.amount)', 'revenue')
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    const averageAmount = await query
      .select('AVG(payment.amount)', 'average')
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    return {
      total,
      completed,
      pending,
      failed,
      refunded,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      totalRevenue: parseFloat(totalRevenue?.revenue || '0'),
      averageAmount: parseFloat(averageAmount?.average || '0'),
    };
  }

  async getDailyRevenue(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyStats = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('DATE(payment.paid_at)', 'date')
      .addSelect('COUNT(payment.payment_id)', 'count')
      .addSelect('SUM(payment.amount)', 'revenue')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.paid_at >= :startDate', { startDate })
      .groupBy('DATE(payment.paid_at)')
      .orderBy('date', 'DESC')
      .getRawMany();

    return dailyStats.map((stat) => ({
      date: stat.date,
      count: parseInt(stat.count),
      revenue: parseFloat(stat.revenue),
    }));
  }

  // -------------------------
  // Helper methods
  // -------------------------
  private async generatePaymentNumber(): Promise<string> {
    const prefix = `PAY${new Date().getFullYear()}`;

    const lastPayment = await this.paymentsRepository
      .createQueryBuilder('payment')
      .where('payment.payment_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('payment.payment_number', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastPayment && lastPayment.payment_number) {
      const lastSequence = parseInt(lastPayment.payment_number.slice(-4));
      sequence = isNaN(lastSequence) ? 1 : lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  async validatePaymentReference(reference: string): Promise<boolean> {
    try {
      const payment = await this.paymentsRepository.findOne({
        where: { payment_reference: reference },
      });

      return !!payment;
    } catch (error) {
      this.logger.error(
        `Error validating payment reference ${reference}:`,
        error,
      );
      return false;
    }
  }

  // -------------------------
  // Cleanup old payments
  // -------------------------
  async cleanupOldPayments(days: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.paymentsRepository
      .createQueryBuilder()
      .delete()
      .where('status IN (:...statuses)', {
        statuses: [PaymentStatus.FAILED, PaymentStatus.CANCELLED],
      })
      .andWhere('created_at < :cutoff', { cutoff: cutoffDate })
      .execute();

    return result.affected || 0;
  }

  // -------------------------
  // Get payment status
  // -------------------------
  async getPaymentStatus(paymentId: number): Promise<{
    status: PaymentStatus;
    message: string;
    details?: any;
  }> {
    const payment = await this.findOne(paymentId);

    let message = '';
    switch (payment.status) {
      case PaymentStatus.PENDING:
        message = 'Payment is pending';
        break;
      case PaymentStatus.COMPLETED:
        message = 'Payment completed successfully';
        break;
      case PaymentStatus.FAILED:
        message = `Payment failed: ${payment.failure_reason}`;
        break;
      case PaymentStatus.REFUNDED:
        message = 'Payment has been refunded';
        break;
      case PaymentStatus.CANCELLED:
        message = 'Payment was cancelled';
        break;
    }

    return {
      status: payment.status,
      message,
      details: {
        amount: payment.amount,
        currency: payment.currency,
        reference: payment.payment_reference,
        paidAt: payment.paid_at,
        failedAt: payment.failed_at,
      },
    };
  }

  // -------------------------
  // Get payment by order
  // -------------------------
  async getPaymentByOrder(orderId: number): Promise<Payment | null> {
    return this.paymentsRepository.findOne({
      where: { order_id: orderId },
      order: { created_at: 'DESC' },
    });
  }

  // -------------------------
  // Check payment eligibility
  // -------------------------
  async canMakePayment(
    orderId: number,
  ): Promise<{ canPay: boolean; reason?: string }> {
    const order = await this.ordersRepository.findOne({
      where: { order_id: orderId },
    });

    if (!order) {
      return { canPay: false, reason: 'Order not found' };
    }

    if (order.payment_status === OrderPaymentStatus.Paid) {
      return { canPay: false, reason: 'Order already paid' };
    }

    if (order.status === OrderStatus.Cancelled) {
      return { canPay: false, reason: 'Order is cancelled' };
    }

    if (order.status === OrderStatus.Delivered) {
      return { canPay: false, reason: 'Order already delivered' };
    }

    // Check if there's already a pending payment
    const pendingPayment = await this.paymentsRepository.findOne({
      where: {
        order_id: orderId,
        status: PaymentStatus.PENDING,
      },
    });

    if (pendingPayment) {
      return {
        canPay: false,
        reason: 'There is already a pending payment for this order',
      };
    }

    return { canPay: true };
  }

  // -------------------------
  // Cancel pending payment
  // -------------------------
  async cancelPendingPayment(paymentId: number): Promise<Payment> {
    const payment = await this.findOne(paymentId);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only pending payments can be cancelled');
    }

    payment.status = PaymentStatus.CANCELLED;
    payment.failed_at = new Date();
    payment.failure_reason = 'Payment cancelled by user';

    const updatedPayment = await this.paymentsRepository.save(payment);

    this.eventEmitter.emit('payment.cancelled', {
      paymentId: paymentId,
      orderId: payment.order_id,
      userId: payment.user_id,
      timestamp: new Date(),
    });

    return updatedPayment;
  }
}
