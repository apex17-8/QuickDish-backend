import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { MenuItem } from '../../menu_items/entities/menu_item.entity';

@Entity('restaurant_menu_categories')
export class RestaurantMenuCategory {
  @PrimaryGeneratedColumn()
  category_id: number;

  @Column()
  name: string; // e.g., "Burgers", "Drinks", "Pizza", "Snacks"

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;

  // ────────────────────────────────
  // RELATIONSHIPS
  // ────────────────────────────────

  // A restaurant has many menu categories
  @ManyToOne(() => Restaurant, (restaurant) => restaurant.menuCategories, {
    onDelete: 'CASCADE',
  })
  restaurant: Restaurant;

  // Each category has many menu items
  @OneToMany(() => MenuItem, (menuItem) => menuItem.category)
  menuItems: MenuItem[];
}
