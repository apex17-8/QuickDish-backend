import { Module } from '@nestjs/common';
import { RestaurantMenuCategoriesService } from './restaurant-menu_categories.service';
import { RestaurantMenuCategoriesController } from './restaurant-menu_categories.controller';

@Module({
  controllers: [RestaurantMenuCategoriesController],
  providers: [RestaurantMenuCategoriesService],
})
export class RestaurantMenuCategoriesModule {}
