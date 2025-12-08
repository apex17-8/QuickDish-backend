// src/restaurants/restaurants.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { MenuItem } from '../menu_items/entities/menu_item.entity';
import { RestaurantMenuCategory } from '../restaurant-menu_categories/entities/restaurant-menu_category.entity';
import { User } from '../users/entities/user.entity'; // ADD THIS
import { RestaurantStaff } from '../restaurant_staff/entities/restaurant_staff.entity'; // ADD THIS
import { RestaurantService } from './restaurants.service';
import { RestaurantController } from './restaurants.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Restaurant,
      MenuItem,
      RestaurantMenuCategory,
      User,
      RestaurantStaff,
    ]),
  ],
  controllers: [RestaurantController],
  providers: [RestaurantService],
  exports: [RestaurantService],
})
export class RestaurantsModule {}
