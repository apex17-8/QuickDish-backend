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

// TypeScript enum for roles
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
  hashedRefreshedToken?: string | null;

  @Column({ type: 'varchar', length: 50, default: UserRole.Customer })
  role: UserRole;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;

  /** ===============================
   *  RELATIONSHIPS
   *  =============================== */

  // Restaurants owned by this user (role = restaurant_owner)
  @OneToMany(() => Restaurant, (restaurant) => restaurant.owner)
  restaurantsOwned: Restaurant[];

  // Staff assignments (role = manager, customer_care, rider)
  @OneToMany(() => RestaurantStaff, (staff) => staff.user)
  staffAssignments: RestaurantStaff[];

  // Orders placed by this user (role = customer)
  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];

  // Rider-specific info (role = rider)
  @OneToMany(() => Rider, (rider) => rider.user)
  riders: Rider[];

  // Customer-specific info (role = customer)
  @OneToMany(() => Customer, (customer) => customer.user)
  customers: Customer[];
}
