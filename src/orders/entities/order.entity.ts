import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Rider } from '../../riders/entities/rider.entity';
import { Message } from '../../messages/entities/message.entity';
import { MenuItem } from '../../menu_items/entities/menu_item.entity';
import { OrderItem } from '../../order_items/entities/order_item.entity';
import { OrderStatusLog } from 'src/order_status_logs/entities/order_status_log.entity';

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

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  order_id: number;

  // -----------------------------
  // BASE ORDER FIELDS
  // -----------------------------
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_price: number;

  @Column({ type: 'varchar', length: 30, default: OrderStatus.Pending })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  delivery_address: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // -----------------------------
  // DELIVERY CONFIRMATION
  // -----------------------------
  @Column({ type: 'bit', default: false })
  customer_confirmed: boolean;

  @Column({ type: 'bit', default: false })
  rider_confirmed: boolean;

  // -----------------------------
  // ASSIGNMENT TRACKING
  // -----------------------------
  @Column({ type: 'datetime2', nullable: true })
  assigned_at: Date;

  @Column({ type: 'datetime2', nullable: true })
  accepted_at: Date;

  @Column({ type: 'datetime2', nullable: true })
  picked_up_at: Date;

  @Column({ type: 'int', default: 0 })
  assignment_attempts: number;

  @Column({ type: 'boolean', default: false })
  requires_manual_assignment: boolean;

  // -----------------------------
  // RATING & FEEDBACK
  // -----------------------------
  @Column({ type: 'int', nullable: true })
  customer_rating: number;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  customer_feedback: string;

  // -----------------------------
  // DELIVERY LOCATION (for distance calculation)
  // -----------------------------
  @Column({ type: 'float', nullable: true })
  delivery_latitude: number;

  @Column({ type: 'float', nullable: true })
  delivery_longitude: number;

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
  rider: Rider;

  // Order items (detailed breakdown)
  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  orderItems: OrderItem[];

  // Status change history
  @OneToMany(() => OrderStatusLog, (log) => log.order)
  statusLogs: OrderStatusLog[];

  // Chat messages (order-level conversation)
  @OneToMany(() => Message, (message) => message.order)
  messages: Message[];

  // -----------------------------
  // TIMESTAMPS
  // -----------------------------
  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;

  // -----------------------------
  // VIRTUAL PROPERTIES (Not stored in DB)
  // -----------------------------

  /**
   * Calculate total from order items
   */
  get calculated_total(): number {
    if (!this.orderItems || this.orderItems.length === 0) {
      return this.total_price;
    }
    return this.orderItems.reduce((total, item) => {
      return total + item.price_at_purchase * item.quantity;
    }, 0);
  }

  /**
   * Check if order can be cancelled
   */
  get can_be_cancelled(): boolean {
    return [OrderStatus.Pending, OrderStatus.Accepted].includes(this.status);
  }

  /**
   * Check if delivery can be confirmed
   */
  get can_confirm_delivery(): boolean {
    return this.status === OrderStatus.AwaitingConfirmation;
  }

  /**
   * Check if assignment has expired (5-minute window)
   */
  get assignment_expired(): boolean {
    if (!this.assigned_at || this.accepted_at) {
      return false;
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.assigned_at < fiveMinutesAgo;
  }

  /**
   * Get estimated delivery time (restaurant prep + delivery time)
   */
  get estimated_delivery_time(): Date | null {
    if (!this.created_at) return null;

    const deliveryTime = new Date(this.created_at);

    // Add restaurant preparation time (default 30 minutes)
    deliveryTime.setMinutes(deliveryTime.getMinutes() + 30);

    // Add estimated delivery time (default 15 minutes)
    deliveryTime.setMinutes(deliveryTime.getMinutes() + 15);

    return deliveryTime;
  }
}
