// src/riders/entities/rider.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';
import { RiderLocation } from '../../rider_locations/entities/rider_location.entity';
import { RiderRequest } from '../../rider-request/entities/rider-request.entity';
@Entity('riders')
export class Rider {
  @PrimaryGeneratedColumn()
  rider_id: number;

  @ManyToOne(() => User, (user) => user.riders, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => RiderLocation, (location) => location.rider)
  locations: RiderLocation[];

  @OneToMany(() => Order, (order) => order.rider)
  orders: Order[];

  @OneToMany(() => RiderRequest, (request) => request.rider)
  requests: RiderRequest[];

  @Column({ type: 'varchar', length: 50 })
  vehicle_type: string;

  @Column({ type: 'bit', default: false })
  is_online: boolean;

  @Column({ type: 'float', nullable: true })
  rating: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  last_location: string;

  @Column({ type: 'float', nullable: true })
  currentLatitude: number;

  @Column({ type: 'float', nullable: true })
  currentLongitude: number;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;
}
