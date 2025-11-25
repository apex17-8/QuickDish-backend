// src/menu_items/menu_items.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu_item.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { RestaurantMenuCategory } from '../restaurant-menu_categories/entities/restaurant-menu_category.entity';
import { CreateMenuItemDto } from './dto/create-menu_item.dto';
import { UpdateMenuItemDto } from './dto/update-menu_item.dto';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(RestaurantMenuCategory)
    private readonly categoryRepository: Repository<RestaurantMenuCategory>,
  ) {}

  async findAll(): Promise<MenuItem[]> {
    return this.menuItemRepository.find({
      relations: ['restaurant', 'category'],
    });
  }

  async findOne(id: number): Promise<MenuItem> {
    const menuItem = await this.menuItemRepository.findOne({
      where: { menu_item_id: id },
      relations: ['restaurant', 'category'],
    });
    if (!menuItem) throw new NotFoundException(`Menu item ${id} not found`);
    return menuItem;
  }

  async create(dto: CreateMenuItemDto): Promise<MenuItem> {
    const restaurant = await this.restaurantRepository.findOneBy({
      restaurant_id: dto.restaurantId,
    });
    if (!restaurant)
      throw new NotFoundException(`Restaurant ${dto.restaurantId} not found`);

    const category = await this.categoryRepository.findOneBy({
      category_id: dto.categoryId,
    });
    if (!category)
      throw new NotFoundException(`Category ${dto.categoryId} not found`);

    const menuItem = this.menuItemRepository.create({
      name: dto.name,
      price: dto.price,
      description: dto.description,
      restaurant,
      category,
    });

    return this.menuItemRepository.save(menuItem);
  }

  async update(id: number, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const menuItem = await this.findOne(id);
    Object.assign(menuItem, dto);
    return this.menuItemRepository.save(menuItem);
  }

  async remove(id: number): Promise<void> {
    const menuItem = await this.findOne(id);
    await this.menuItemRepository.remove(menuItem);
  }
}
