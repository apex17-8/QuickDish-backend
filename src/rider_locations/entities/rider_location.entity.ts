// src/rider_location/entities/rider_location.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Rider } from '../../riders/entities/rider.entity';

@Entity('rider_locations')
export class RiderLocation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Rider, (rider) => rider.locations, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'rider_id' })
  rider: Rider;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({ type: 'varchar', nullable: true })
  address?: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  timestamp: Date;
}
