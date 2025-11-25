import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MenuItem } from './entities/menu_item.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { RestaurantMenuCategory } from './../restaurant-menu_categories/entities/restaurant-menu_category.entity';

import { MenuItemsService } from './menu_items.service';
import { MenuItemsController } from './menu_items.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MenuItem, Restaurant, RestaurantMenuCategory]),
  ],
  controllers: [MenuItemsController],
  providers: [MenuItemsService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
