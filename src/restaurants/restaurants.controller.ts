// src/restaurants/restaurants.controller.ts
import { Controller, Get, Patch, Param, Body, Post } from '@nestjs/common';
import { RestaurantService } from './restaurants.service';
import { Restaurant } from './entities/restaurant.entity';
import { MenuItem } from '../menu_items/entities/menu_item.entity';
import { RestaurantMenuCategory } from '../restaurant-menu_categories/entities/restaurant-menu_category.entity';

@Controller('restaurants')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get()
  findAll(): Promise<Restaurant[]> {
    return this.restaurantService.findAll();
  }

  @Get('featured')
  findFeatured(): Promise<Restaurant[]> {
    console.log('📞 GET /api/restaurants/featured called');
    return this.restaurantService.findFeatured();
  }

  @Get(':id')
  findOne(@Param('id') id: number): Promise<Restaurant> {
    return this.restaurantService.findOne(id);
  }

  @Post(':id/menu-items')
  addMenuItem(
    @Param('id') id: number,
    @Body() menuItem: Partial<MenuItem>,
  ): Promise<MenuItem> {
    return this.restaurantService.addMenuItem(id, menuItem);
  }

  @Patch('categories/:categoryId')
  updateCategory(
    @Param('categoryId') categoryId: number,
    @Body() updateData: Partial<RestaurantMenuCategory>,
  ): Promise<RestaurantMenuCategory> {
    return this.restaurantService.updateCategory(categoryId, updateData);
  }
}