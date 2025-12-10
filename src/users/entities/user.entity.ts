import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { RestaurantStaff } from '../../restaurant_staff/entities/restaurant_staff.entity';
import { Order } from '../../orders/entities/order.entity';
import { Rider } from '../../riders/entities/rider.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { RiderRequest } from '../../rider-request/entities/rider-request.entity';
import { Message } from '../../messages/entities/message.entity';

export enum UserRole {
  SuperAdmin = 'super_admin',
  RestaurantOwner = 'restaurant_owner',
  Manager = 'manager',
  CustomerCare = 'customer_care',
  Rider = 'rider',
  Customer = 'customer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profile_picture?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hashedRefreshedToken?: string | null;

  @Column({ type: 'varchar', length: 50, default: UserRole.Customer })
  role: UserRole;

  // FIX: For MSSQL, use 'bit' instead of 'boolean'
  @Column({ type: 'bit', default: 1 }) // 1 = true, 0 = false
  is_active: boolean;

  @Column({ type: 'datetime', nullable: true })
  last_login_at: Date;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;

  // RELATIONSHIPS
  @OneToMany(() => Restaurant, (restaurant) => restaurant.owner)
  restaurantsOwned: Restaurant[];

  @OneToMany(() => RestaurantStaff, (staff) => staff.user)
  staffAssignments: RestaurantStaff[];

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];

  @OneToMany(() => Rider, (rider) => rider.user)
  riders: Rider[];

  @OneToMany(() => Customer, (customer) => customer.user)
  customers: Customer[];
  @OneToMany(() => RiderRequest, (riderRequest) => riderRequest.rider)
  riderRequests: RiderRequest[];
  @OneToMany(() => Message, (msg) => msg.sender)
  messages: Message[];
}
