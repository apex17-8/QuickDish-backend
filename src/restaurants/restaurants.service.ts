import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { MenuItem } from '../menu_items/entities/menu_item.entity';
import { RestaurantMenuCategory } from '../restaurant-menu_categories/entities/restaurant-menu_category.entity';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(RestaurantMenuCategory)
    private readonly categoryRepository: Repository<RestaurantMenuCategory>,
  ) {}

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantRepository.find({
      relations: ['menu_item', 'menuCategories'],
    });
  }

  async findOne(id: number): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { restaurant_id: id },
      relations: ['menu_item', 'menuCategories'],
    });
    if (!restaurant) throw new NotFoundException(`Restaurant ${id} not found`);
    return restaurant;
  }

  async addMenuItem(
    restaurantId: number,
    menuItem: Partial<MenuItem>,
  ): Promise<MenuItem> {
    const restaurant = await this.findOne(restaurantId);
    const item = this.menuItemRepository.create({ ...menuItem, restaurant });
    return this.menuItemRepository.save(item);
  }

  async updateCategory(
    categoryId: number,
    updateData: Partial<RestaurantMenuCategory>,
  ): Promise<RestaurantMenuCategory> {
    const category = await this.categoryRepository.findOne({
      where: { category_id: categoryId },
    });
    if (!category)
      throw new NotFoundException(`Category ${categoryId} not found`);
    Object.assign(category, updateData);
    return this.categoryRepository.save(category);
  }
}
