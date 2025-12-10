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

  async findPopular(): Promise<MenuItem[]> {
    try {
      console.log('Finding popular menu items...');

      // get data from database first
      const existingItems = await this.menuItemRepository.find({
        take: 8,
        order: { price: 'ASC' }, // { menu_item_id: 'DESC' } for newest first
        relations: ['restaurant', 'category'],
      });

      if (existingItems.length > 0) {
        console.log(`Found ${existingItems.length} menu items from database`);
        return existingItems;
      }

      // If no items in DB, create some sample data
      console.log('No menu items in database, creating sample data...');
      await this.createSampleMenuItems();

      // Try again after creating sample data
      const sampleItems = await this.menuItemRepository.find({
        take: 8,
        relations: ['restaurant', 'category'],
      });

      return sampleItems;
    } catch (error) {
      console.error('Error in findPopular:', error);
      // Return structured mock data as fallback
      return this.getMockPopularItems() as MenuItem[];
    }
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
      restaurant_id: dto.restaurant_Id,
    });
    if (!restaurant)
      throw new NotFoundException(`Restaurant ${dto.restaurant_Id} not found`);

    const category = await this.categoryRepository.findOneBy({
      category_id: dto.category_Id,
    });
    if (!category)
      throw new NotFoundException(`Category ${dto.category_Id} not found`);

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

  private async createSampleMenuItems(): Promise<void> {
    try {
      //check there are restaurants and categories
      const restaurant = await this.restaurantRepository.findOne({
        where: { restaurant_id: 1 },
      });

      const category = await this.categoryRepository.findOne({
        where: { category_id: 1 },
      });

      if (!restaurant || !category) {
        console.log('Need restaurants and categories first');
        return;
      }

      //sample menu items
      const sampleItems = [
        {
          name: 'Margherita Pizza',
          description:
            'Classic pizza with fresh mozzarella, tomato sauce, and basil',
          price: 12.99,
          is_available: 1,
          image_url: '/api/images/pizza.jpg',
          restaurant,
          category,
          restaurant_id: 1,
          category_id: 1,
        },
        {
          name: 'Pepperoni Pizza',
          description: 'Pizza with pepperoni and mozzarella cheese',
          price: 14.99,
          is_available: 1,
          image_url: '/api/images/pepperoni-pizza.jpg',
          restaurant,
          category,
          restaurant_id: 1,
          category_id: 1,
        },
        {
          name: 'Cheeseburger Deluxe',
          description:
            'Beef patty with cheese, lettuce, tomato, and special sauce',
          price: 8.99,
          is_available: 1,
          image_url: '/api/images/burger.jpg',
          restaurant,
          category,
          restaurant_id: 1,
          category_id: 1,
        },
        {
          name: 'Caesar Salad',
          description:
            'Fresh romaine lettuce with Caesar dressing and croutons',
          price: 9.99,
          is_available: 1,
          image_url: '/api/images/salad.jpg',
          restaurant,
          category,
          restaurant_id: 1,
          category_id: 1,
        },
      ];

      for (const itemData of sampleItems) {
        const menuItem = this.menuItemRepository.create(itemData);
        await this.menuItemRepository.save(menuItem);
      }

      console.log('Created sample menu items');
    } catch (error) {
      console.error('Error creating sample menu items:', error);
    }
  }

  // MOCK DATA FALLBACK
  private getMockPopularItems(): any[] {
    return [
      {
        menu_item_id: 1,
        name: 'Margherita Pizza',
        description:
          'Classic pizza with fresh mozzarella, tomato sauce, and basil',
        price: 12.99,
        is_available: 1,
        image_url: '/api/images/pizza.jpg',
        restaurant_id: 1,
        category_id: 1,
        restaurant: {
          restaurant_id: 1,
          name: 'Pizza Palace',
          address: '123 Main St',
          phone: '555-1234',
          logo_url: '/api/images/pizza-logo.jpg',
          rating: 4.5,
        },
        category: {
          category_id: 1,
          name: 'Pizza',
          description: 'Italian pizzas',
        },
      },
      {
        menu_item_id: 2,
        name: 'Cheeseburger Deluxe',
        description:
          'Beef patty with cheese, lettuce, tomato, and special sauce',
        price: 8.99,
        is_available: 1,
        image_url: '/api/images/burger.jpg',
        restaurant_id: 1,
        category_id: 1,
        restaurant: {
          restaurant_id: 1,
          name: 'Pizza Palace',
          address: '123 Main St',
          phone: '555-1234',
          logo_url: '/api/images/pizza-logo.jpg',
          rating: 4.5,
        },
        category: {
          category_id: 1,
          name: 'Pizza',
          description: 'Italian pizzas',
        },
      },
      {
        menu_item_id: 3,
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with Caesar dressing and croutons',
        price: 9.99,
        is_available: 1,
        image_url: '/api/images/salad.jpg',
        restaurant_id: 1,
        category_id: 1,
        restaurant: {
          restaurant_id: 1,
          name: 'Pizza Palace',
          address: '123 Main St',
          phone: '555-1234',
          logo_url: '/api/images/pizza-logo.jpg',
          rating: 4.5,
        },
        category: {
          category_id: 1,
          name: 'Pizza',
          description: 'Italian pizzas',
        },
      },
      {
        menu_item_id: 4,
        name: 'Chocolate Lava Cake',
        description: 'Warm chocolate cake with molten center',
        price: 7.99,
        is_available: 1,
        image_url: '/api/images/cake.jpg',
        restaurant_id: 1,
        category_id: 1,
        restaurant: {
          restaurant_id: 1,
          name: 'Pizza Palace',
          address: '123 Main St',
          phone: '555-1234',
          logo_url: '/api/images/pizza-logo.jpg',
          rating: 4.5,
        },
        category: {
          category_id: 1,
          name: 'Pizza',
          description: 'Italian pizzas',
        },
      },
    ];
  }
}
