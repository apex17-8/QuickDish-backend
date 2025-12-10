import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';
import { Transform } from 'class-transformer';
import { Customer } from '../../customers/entities/customer.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Rider } from '../../riders/entities/rider.entity';
import { Message } from '../../messages/entities/message.entity';
import { OrderItem } from '../../order_items/entities/order_item.entity';
import { OrderStatusLog } from '../../order-status-logs/entities/order-status-log.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum OrderStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Preparing = 'preparing',
  Ready = 'ready',
  OnRoute = 'on_the_way',
  AwaitingConfirmation = 'awaiting_confirmation',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

export enum PaymentStatus {
  Pending = 'pending',
  Paid = 'paid',
  Failed = 'failed',
  Refunded = 'refunded',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  order_id: number;

  // -----------------------------
  // BASE ORDER FIELDS
  // -----------------------------
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  @Transform(({ value }: { value: string }) => parseFloat(value) || 0)
  total_price: number;

  @Column({ type: 'varchar', length: 30, default: OrderStatus.Pending })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  delivery_address: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // -----------------------------
  // PAYMENT FIELDS
  // -----------------------------
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  @Transform(({ value }: { value: string }) => parseFloat(value) || 0)
  amount_paid: number;

  // Store enum as string for MSSQL compatibility
  @Column({ type: 'varchar', length: 20, default: PaymentStatus.Pending })
  payment_status: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_reference: string | null;

  // -----------------------------
  // DELIVERY CONFIRMATION
  // -----------------------------
  @Column({ type: 'bit', default: 0 })
  @Transform(({ value }) => Boolean(value), { toClassOnly: true })
  @Transform(({ value }) => (value ? 1 : 0), { toPlainOnly: true })
  customer_confirmed: boolean = false;

  @Column({ type: 'bit', default: 0 })
  @Transform(({ value }) => Boolean(value), { toClassOnly: true })
  @Transform(({ value }) => (value ? 1 : 0), { toPlainOnly: true })
  rider_confirmed: boolean = false;

  // -----------------------------
  // ASSIGNMENT TRACKING
  // -----------------------------
  @Column({ type: 'datetime2', nullable: true })
  assigned_at: Date | null;

  @Column({ type: 'datetime2', nullable: true })
  accepted_at: Date | null;

  @Column({ type: 'datetime2', nullable: true })
  picked_up_at: Date | null;

  @Column({ type: 'int', default: 0 })
  assignment_attempts: number;

  @Column({ type: 'bit', default: 0 })
  @Transform(({ value }) => Boolean(value), { toClassOnly: true })
  @Transform(({ value }) => (value ? 1 : 0), { toPlainOnly: true })
  requires_manual_assignment: boolean = false;

  // -----------------------------
  // RATING & FEEDBACK
  // -----------------------------
  @Column({ type: 'int', nullable: true })
  customer_rating: number | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  customer_feedback: string | null;

  // -----------------------------
  // DELIVERY LOCATION
  // -----------------------------
  @Column({ type: 'float', nullable: true })
  delivery_latitude: number | null;

  @Column({ type: 'float', nullable: true })
  delivery_longitude: number | null;

  // -----------------------------
  // RELATIONSHIPS
  // -----------------------------
  @ManyToOne(() => Customer, (customer) => customer.orders, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.orders, {
    nullable: false,
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @ManyToOne(() => Rider, (rider) => rider.orders, { nullable: true })
  @JoinColumn({ name: 'rider_id' })
  rider: Rider | null;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  orderItems: OrderItem[];

  @OneToMany(() => OrderStatusLog, (log) => log.order)
  statusLogs: OrderStatusLog[];

  @OneToMany(() => Message, (message) => message.order)
  messages: Message[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];

  // -----------------------------
  // TIMESTAMPS
  // -----------------------------
  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'datetime2' })
  deleted_at: Date | null;
}
