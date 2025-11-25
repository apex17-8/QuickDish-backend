import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

export enum StaffRole {
  Manager = 'manager',
  CustomerCare = 'customer_care',
  Rider = 'rider',
}

@Entity('restaurant_staff')
export class RestaurantStaff {
  @PrimaryGeneratedColumn()
  restaurant_stuff_id: number; // Primary key for restaurant_staff table

  // User assigned as staff
  @ManyToOne(() => User, (user) => user.staffAssignments, { nullable: false })
  @JoinColumn({ name: 'user_id' }) // FK column
  user: User;

  // Restaurant to which the staff is assigned
  @ManyToOne(() => Restaurant, (restaurant) => restaurant.staff, {
    nullable: false,
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ type: 'varchar', length: 50 })
  role: StaffRole; // Staff type: manager, customer_care, rider

  // Tracks who assigned this staff (owner or manager)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ type: 'datetime2' })
  assigned_at: Date; // Assignment timestamp

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date; // Last update timestamp
}
