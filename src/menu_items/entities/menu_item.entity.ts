import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { RestaurantMenuCategory } from '../../restaurant-menu_categories/entities/restaurant-menu_category.entity';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn()
  menu_item_id: number;

  @Column({ type: 'nvarchar', length: 255 })
  name: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 1 })
  is_available: number; // 1 = available, 0 = unavailable

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  image_url: string;
  // RELATIONSHIPS
  @ManyToOne(() => Restaurant, (restaurant) => restaurant.menuItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column()
  restaurant_id: number;

  // Category relationship (NO cascade to avoid multiple cascade paths)
  @ManyToOne(() => RestaurantMenuCategory, (category) => category.menuItems, {
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'category_id' })
  category: RestaurantMenuCategory;

  @Column()
  category_id: number;
}
