// src/payments/payments.service.ts
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentGateway,
} from './entities/payment.entity';
import {
  CreatePaymentDto,
  FetchTransactionResponse,
  VerifyResponse,
} from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  Order,
  PaymentStatus as OrderPaymentStatus,
  OrderStatus,
} from '../orders/entities/order.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,

    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
  ) {}

  // -------------------------
  // Initialize payment
  // -------------------------
  async initializePayment(dto: CreatePaymentDto) {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new BadRequestException('Paystack secret key not configured');
    }

    const reference = `PAY_${Date.now()}_${dto.user_id}`;

    const payload = {
      email: dto.email,
      amount: Math.round(dto.amount * 100),
      currency: 'KES',
      callback_url: dto.callback_url,
      reference,
      metadata: {
        user_id: dto.user_id,
        order_id: dto.order_id,
      },
    };

    this.logger.log(
      `Initializing payment for order ${dto.order_id} with reference: ${reference}`,
    );

    try {
      const psRes = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      if (!psRes.data.status) {
        throw new BadRequestException(
          psRes.data.message || 'Failed to initialize payment',
        );
      }

      const paymentNumber = await this.generatePaymentNumber();

      const payment = this.paymentsRepository.create({
        ...dto,
        payment_number: paymentNumber,
        status: PaymentStatus.PENDING,
        payment_method: PaymentMethod.CARD,
        gateway: PaymentGateway.PAYSTACK,
        transaction_id: psRes.data.data.reference,
        payment_reference: psRes.data.data.reference,
        authorization_url: psRes.data.data.authorization_url,
      });

      const saved = await this.paymentsRepository.save(payment);

      // Update order with payment reference
      await this.ordersRepository.update(dto.order_id, {
        payment_reference: reference,
      });

      return {
        authorization_url: saved.authorization_url,
        payment_reference: reference,
        payment_id: saved.payment_id,
        access_code: psRes.data.data.access_code,
      };
    } catch (error) {
      this.logger.error('Payment initialization failed:', error);
      if (axios.isAxiosError(error)) {
        throw new BadRequestException(
          error.response?.data?.message || 'Payment initialization failed',
        );
      }
      throw new BadRequestException('Payment initialization failed');
    }
  }

  // -------------------------
  // Verify transaction
  // -------------------------
  async verifyTransaction(reference: string): Promise<VerifyResponse> {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new BadRequestException('Paystack secret key not configured');
    }

    try {
      const psRes = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
          timeout: 30000,
        },
      );

      if (!psRes.data.status) {
        throw new BadRequestException(
          psRes.data.message || 'Transaction verification failed',
        );
      }

      const payment = await this.paymentsRepository.findOne({
        where: { payment_reference: reference },
      });

      if (payment) {
        const t = psRes.data.data;
        payment.status =
          t.status === 'success'
            ? PaymentStatus.COMPLETED
            : PaymentStatus.FAILED;

        // store gateway response as JSON string to match entity's string column
        try {
          payment.gateway_response = JSON.stringify(t);
        } catch {
          // fallback to toString if stringify fails
          payment.gateway_response = String(t);
        }

        if (t.status === 'success') {
          payment.paid_at = t.paid_at ? new Date(t.paid_at) : new Date();
          // Update order directly (replacing OrderService.confirmOrderAfterPayment)
          await this.confirmOrderAfterPayment(payment.order_id);
        } else {
          payment.failed_at = new Date();
          // Use gateway message if available
          payment.failure_reason =
            (t.gateway_response && String(t.gateway_response)) ||
            'Payment failed';
          await this.ordersRepository.update(payment.order_id, {
            payment_status: OrderPaymentStatus.Failed,
          });
        }

        payment.authorization_url = null;
        await this.paymentsRepository.save(payment);
      }

      return psRes.data;
    } catch (error) {
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
  // Confirm order after payment (replaces OrderService call)
  // -------------------------
  private async confirmOrderAfterPayment(orderId: number): Promise<void> {
    try {
      await this.ordersRepository.update(orderId, {
        payment_status: OrderPaymentStatus.Paid,
        status: OrderStatus.Accepted,
        accepted_at: new Date(),
      });

      this.logger.log(`Order ${orderId} confirmed after payment`);
    } catch (error) {
      this.logger.error(
        `Failed to confirm order ${orderId} after payment:`,
        error,
      );
      throw new BadRequestException('Failed to confirm order after payment');
    }
  }

  // -------------------------
  // Fetch transaction
  // -------------------------
  async fetchTransaction(id: string): Promise<FetchTransactionResponse> {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new BadRequestException('Paystack secret key not configured');
    }

    try {
      const res = await axios.get(`https://api.paystack.co/transaction/${id}`, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
        timeout: 30000,
      });

      return res.data;
    } catch (error) {
      this.logger.error(`Failed to fetch transaction ${id}:`, error);
      if (axios.isAxiosError(error)) {
        throw new BadRequestException(
          error.response?.data?.message || 'Failed to fetch transaction',
        );
      }
      throw new BadRequestException('Failed to fetch transaction');
    }
  }

  // -------------------------
  // Handle webhook event
  // -------------------------
  async handleWebhookEvent(eventData: any): Promise<void> {
    try {
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

        default:
          this.logger.log(`Unhandled webhook event: ${eventData.event}`);
      }
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  // -------------------------
  // Find payment by reference
  // -------------------------
  async findByReference(reference: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { payment_reference: reference },
      relations: ['order'],
    });

    if (!payment) {
      throw new BadRequestException(
        `Payment with reference ${reference} not found`,
      );
    }
    return payment;
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

        await this.ordersRepository.update(payment.order_id, {
          payment_status: OrderPaymentStatus.Failed,
        });

        this.logger.log(`Payment failed for reference: ${reference}`);
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
          // Note: no refund_amount property in entity; if needed, add to entity
          try {
            // store some context in gateway_response if helpful
            const info = { refundedAmount: amount, processedAt: new Date() };
            payment.gateway_response = JSON.stringify(
              Object.assign(
                payment.gateway_response
                  ? JSON.parse(payment.gateway_response)
                  : {},
                { refund: info },
              ),
            );
          } catch {
            // ignore parse errors and just append a minimal string
            payment.gateway_response =
              String(payment.gateway_response || '') + ` | refund:${amount}`;
          }

          await this.paymentsRepository.save(payment);

          // Update order payment status
          await this.ordersRepository.update(payment.order_id, {
            payment_status: OrderPaymentStatus.Refunded,
          });

          this.logger.log(
            `Refund processed for payment ${reference}: ${amount}`,
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

  // CRUD operations

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const paymentNumber = await this.generatePaymentNumber();
    const payment = this.paymentsRepository.create({
      ...dto,
      payment_number: paymentNumber,
      status: PaymentStatus.PENDING,
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
      throw new BadRequestException(`Payment ${id} not found`);
    }

    return payment;
  }

  async update(id: number, dto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);

    // to Prevent updating certain fields if payment is completed
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

    try {
      // Call Paystack refund API
      const refundRes = await axios.post(
        'https://api.paystack.co/refund',
        {
          transaction: payment.transaction_id,
          amount: Math.round(payment.amount * 100),
          currency: 'KES',
          customer_note: reason,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
          timeout: 30000,
        },
      );

      if (refundRes.data.status) {
        // PENDING status for refunds initiation
        payment.status = PaymentStatus.PENDING;
        payment.refund_reason = reason ?? null;

        const updatedPayment = await this.paymentsRepository.save(payment);

        this.logger.log(`Refund initiated for payment ${paymentId}`);
        return updatedPayment;
      } else {
        throw new BadRequestException(
          refundRes.data.message || 'Failed to initiate refund',
        );
      }
    } catch (error) {
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
  // Helper: generate payment number
  // -------------------------
  private async generatePaymentNumber(): Promise<string> {
    const prefix = `PAY${new Date().getFullYear()}`;
    const last = await this.paymentsRepository
      .createQueryBuilder('p')
      .where('p.payment_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('p.payment_number', 'DESC')
      .getOne();

    let seq = 1;
    if (last) {
      const lastSeq = parseInt(last.payment_number.slice(-4));
      seq = isNaN(lastSeq) ? 1 : lastSeq + 1;
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
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
}
