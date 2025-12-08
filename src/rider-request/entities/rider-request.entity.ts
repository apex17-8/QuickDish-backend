// src/rider-requests/entities/rider-request.entity.ts
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

export enum RiderRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

@Entity('rider_requests')
export class RiderRequest {
  @PrimaryGeneratedColumn()
  request_id: number;

  @ManyToOne(() => User, (user) => user.riders, { nullable: false })
  @JoinColumn({ name: 'rider_id' })
  rider: User;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.staff, {
    nullable: false,
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({
    type: 'varchar',
    length: 20,
    default: RiderRequestStatus.PENDING,
  })
  status: RiderRequestStatus;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column({ type: 'text', nullable: true })
  suspension_reason: string;

  @Column({ type: 'datetime', nullable: true })
  approved_at: Date;

  @Column({ type: 'datetime', nullable: true })
  rejected_at: Date;

  @Column({ type: 'datetime', nullable: true })
  suspended_at: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewed_by: User;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
