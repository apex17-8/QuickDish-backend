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
import { MenuItem } from 'src/menu_items/entities/menu_item.entity';
import { RestaurantMenuCategory } from 'src/restaurant-menu_categories/entities/restaurant-menu_category.entity';

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

  @ManyToOne(() => User, (user) => user.restaurantsOwned, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => RestaurantStaff, (staff) => staff.restaurant)
  staff: RestaurantStaff[];

  @OneToMany(() => Order, (order) => order.restaurant)
  orders: Order[];

  //Menu Items relationship
  @OneToMany(() => MenuItem, (menuItem) => menuItem.restaurant)
  menuItems: MenuItem[];

  //Menu category relationship
  @OneToMany(() => RestaurantMenuCategory, (category) => category.restaurant)
  menuCategories: RestaurantMenuCategory[];

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;
}
