// src/payments/entities/payment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

export enum PaymentMethod {
  CARD = 'CARD',
  MPESA = 'MPESA',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentGateway {
  PAYSTACK = 'PAYSTACK',
  MPESA = 'MPESA',
  FLUTTERWAVE = 'FLUTTERWAVE',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  payment_id: number;

  @Column({ type: 'int' })
  user_id: number;

  @Column({ type: 'int' })
  order_id: number;

  @Column({ type: 'nvarchar', length: 100, unique: true })
  payment_number: string;

  @Column({ type: 'nvarchar', length: 255 })
  email: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'nvarchar', length: 10, default: 'KES' })
  currency: string;

  @Column({ type: 'nvarchar', length: 20, default: PaymentMethod.CARD })
  payment_method: PaymentMethod;

  @Column({ type: 'nvarchar', length: 20, default: PaymentGateway.PAYSTACK })
  gateway: PaymentGateway;

  @Column({ type: 'nvarchar', length: 20, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  transaction_id: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  payment_reference: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  authorization_url: string | null;

  @Column({ type: 'nvarchar', nullable: true })
  gateway_response: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  failure_reason: string | null;

  @Column({ type: 'datetime', nullable: true })
  failed_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  refund_reason: string | null;

  @Column({ type: 'datetime', nullable: true })
  refunded_at: Date | null;

  @ManyToOne(() => Order, (order) => order.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
