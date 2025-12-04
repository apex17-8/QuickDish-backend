import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateRestaurantMenuCategoryDto } from './dto/create-restaurant-menu_category.dto';
import { UpdateRestaurantMenuCategoryDto } from './dto/update-restaurant-menu_category.dto';
import { RestaurantMenuCategory } from './entities/restaurant-menu_category.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { MenuItem } from 'src/menu_items/entities/menu_item.entity';

@Injectable()
export class RestaurantMenuCategoriesService {
  constructor(
    @InjectRepository(RestaurantMenuCategory)
    private readonly categoryRepo: Repository<RestaurantMenuCategory>,

    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,

    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
  ) {}

  // ───────────────────────────────────────────────────────────
  // CREATE CATEGORY
  // ───────────────────────────────────────────────────────────
  async create(
    createDto: CreateRestaurantMenuCategoryDto,
  ): Promise<RestaurantMenuCategory> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { restaurant_id: createDto.restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException(
        `Restaurant with ID ${createDto.restaurantId} not found`,
      );
    }

    const category = this.categoryRepo.create({
      name: createDto.name,
      description: createDto.description,
      isActive: true,
      restaurant,
    });

    return await this.categoryRepo.save(category);
  }

  // ───────────────────────────────────────────────────────────
  // FIND ALL
  // ───────────────────────────────────────────────────────────
  async findAll(): Promise<RestaurantMenuCategory[]> {
    return await this.categoryRepo.find({
      relations: ['restaurant', 'menuItems'],
      order: { category_id: 'ASC' },
    });
  }

  // ───────────────────────────────────────────────────────────
  // FIND ONE
  // ───────────────────────────────────────────────────────────
  async findOne(id: number): Promise<RestaurantMenuCategory> {
    const category = await this.categoryRepo.findOne({
      where: { category_id: id },
      relations: ['restaurant', 'menuItems'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  // ───────────────────────────────────────────────────────────
  // UPDATE
  // ───────────────────────────────────────────────────────────
  async update(
    id: number,
    updateDto: UpdateRestaurantMenuCategoryDto,
  ): Promise<RestaurantMenuCategory> {
    const category = await this.findOne(id);

    Object.assign(category, updateDto);

    return await this.categoryRepo.save(category);
  }

  // ───────────────────────────────────────────────────────────
  // REMOVE
  // ───────────────────────────────────────────────────────────
  async remove(id: number): Promise<string> {
    const category = await this.findOne(id);

    await this.categoryRepo.remove(category);

    return `Category with ID ${id} removed successfully`;
  }

  // ───────────────────────────────────────────────────────────
  // ASSIGN MENU ITEM TO CATEGORY (Optional Future Use)
  // ───────────────────────────────────────────────────────────
  async assignMenuItem(categoryId: number, menuItemId: number) {
    const category = await this.findOne(categoryId);

    const menuItem = await this.menuItemRepo.findOne({
      where: { menu_item_id: menuItemId },
    });

    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${menuItemId} not found`);
    }

    menuItem.category = category;

    return await this.menuItemRepo.save(menuItem);
  }
}
