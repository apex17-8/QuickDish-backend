import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';

@Entity('order_status_logs')
export class OrderStatusLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.statusLogs, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'varchar', length: 50 })
  from_status: OrderStatus;

  @Column({ type: 'varchar', length: 50 })
  to_status: OrderStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changed_by_user_id' })
  changed_by: User;

  @Column({ type: 'varchar', length: 50, nullable: true })
  changed_by_role: string; // 'system', 'rider', 'restaurant', 'customer_care'

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'datetime2' })
  changed_at: Date;
}
