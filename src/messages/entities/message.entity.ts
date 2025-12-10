import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  message_id: number;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'customer' })
  sender_type: 'customer' | 'rider';

  @ManyToOne(() => Order, (order) => order.messages, { nullable: false })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne(() => Order, (order) => order.messages)
  @Column({ type: 'text' })
  content: string;

  //Whether the receiving user has opened/read the message.
  @Column({ type: 'bit', default: false })
  is_read: boolean;

  @CreateDateColumn({ type: 'datetime2' })
  sent_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
