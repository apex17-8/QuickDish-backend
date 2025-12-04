// src/restaurant-menu-categories/restaurant-menu-categories.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantMenuCategoriesService } from './restaurant-menu_categories.service';
import { RestaurantMenuCategoriesController } from './restaurant-menu_categories.controller';
import { RestaurantMenuCategory } from './entities/restaurant-menu_category.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { MenuItem } from '../menu_items/entities/menu_item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RestaurantMenuCategory, Restaurant, MenuItem]),
  ],
  controllers: [RestaurantMenuCategoriesController],
  providers: [RestaurantMenuCategoriesService],
  exports: [RestaurantMenuCategoriesService],
})
export class RestaurantMenuCategoriesModule {}
