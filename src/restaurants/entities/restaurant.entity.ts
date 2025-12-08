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
import { RestaurantStaff } from '../../restaurant_staff/entities/restaurant_staff.entity';
import { Order } from '../../orders/entities/order.entity';
import { MenuItem } from '../../menu_items/entities/menu_item.entity';
import { RestaurantMenuCategory } from '../../restaurant-menu_categories/entities/restaurant-menu_category.entity';
import { RiderRequest } from '../../rider-request/entities/rider-request.entity';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn()
  restaurant_id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo_url: string;

  @Column({ type: 'float', nullable: true })
  rating: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cuisine: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  price_range: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  delivery_fee: number;

  @Column({ type: 'int', nullable: true })
  estimated_delivery_time: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'bit', default: 1 }) // 1 = true, 0 = false
  is_active: boolean;

  @ManyToOne(() => User, (user) => user.restaurantsOwned, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  // Rider Requests relationship
  @OneToMany(() => RiderRequest, (riderRequest) => riderRequest.restaurant)
  riderRequests: RiderRequest[];

  @OneToMany(() => RestaurantStaff, (staff) => staff.restaurant)
  staff: RestaurantStaff[];

  @OneToMany(() => Order, (order) => order.restaurant)
  orders: Order[];

  // Menu Items relationship
  @OneToMany(() => MenuItem, (menuItem) => menuItem.restaurant)
  menuItems: MenuItem[];

  // Menu category relationship
  @OneToMany(() => RestaurantMenuCategory, (category) => category.restaurant)
  menuCategories: RestaurantMenuCategory[];

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;
}
