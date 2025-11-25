import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  customer_id: number;

  @ManyToOne(() => User, (user) => user.customers, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];

  @Column({ type: 'int', default: 0 })
  loyalty_points: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  default_address: string;

  @Column({ type: 'simple-json', nullable: true })
  preferences: any;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;
}
