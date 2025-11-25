import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { MenuItem } from '../menu_items/entities/menu_item.entity';
import { RestaurantMenuCategory } from './../restaurant-menu_categories/entities/restaurant-menu_category.entity';

import { RestaurantService } from './restaurants.service';
import { RestaurantController } from './restaurants.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Restaurant, MenuItem, RestaurantMenuCategory]),
  ],
  controllers: [RestaurantController],
  providers: [RestaurantService],
  exports: [RestaurantService],
})
export class RestaurantsModule {}
