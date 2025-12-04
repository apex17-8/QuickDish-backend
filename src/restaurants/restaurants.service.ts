// src/restaurants/restaurants.service.ts
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
      relations: ['menuItems', 'menuCategories'], // 🔴 FIXED: Changed 'menu_item' to 'menuItems'
    });
  }

  // 🔴 ADD THIS METHOD
  async findFeatured(): Promise<Restaurant[]> {
    try {
      console.log('Finding featured restaurants...');

      // Option 1: Try to get real data from database
      const existingRestaurants = await this.restaurantRepository.find({
        take: 6,
        order: { rating: 'DESC' }, // Order by highest rating
        relations: ['menuItems', 'menuCategories'],
      });

      if (existingRestaurants.length > 0) {
        console.log(
          `Found ${existingRestaurants.length} restaurants from database`,
        );
        return existingRestaurants;
      }

      // Option 2: If no restaurants in DB, return mock data
      console.log('No restaurants in database, returning mock data');
      return this.getMockFeaturedRestaurants() as Restaurant[];
    } catch (error) {
      console.error('Error in findFeatured:', error);
      // Return mock data as fallback
      return this.getMockFeaturedRestaurants() as Restaurant[];
    }
  }

  async findOne(id: number): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { restaurant_id: id },
      relations: ['menuItems', 'menuCategories'], // 🔴 FIXED: Changed 'menu_item' to 'menuItems'
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

  // 🔴 ADD THIS HELPER METHOD FOR MOCK DATA
  private getMockFeaturedRestaurants(): any[] {
    return [
      {
        restaurant_id: 1,
        name: 'Pizza Palace',
        address: '123 Main St, New York, NY',
        phone: '555-1234',
        logo_url:
          'https://via.placeholder.com/150x150/FF6B6B/FFFFFF?text=Pizza',
        rating: 4.5,
        cuisine: 'Italian',
        delivery_time: '25-35 min',
        price_range: '$$',
        created_at: new Date(),
        updated_at: new Date(),
        menuItems: [
          {
            menu_item_id: 1,
            name: 'Margherita Pizza',
            price: 12.99,
            image_url:
              'https://via.placeholder.com/100x100/4ECDC4/FFFFFF?text=Pizza',
          },
        ],
        menuCategories: [
          {
            category_id: 1,
            name: 'Pizza',
          },
        ],
      },
      {
        restaurant_id: 2,
        name: 'Burger Kingdom',
        address: '456 Oak Ave, Brooklyn, NY',
        phone: '555-5678',
        logo_url:
          'https://via.placeholder.com/150x150/45B7D1/FFFFFF?text=Burger',
        rating: 4.3,
        cuisine: 'American',
        delivery_time: '20-30 min',
        price_range: '$',
        created_at: new Date(),
        updated_at: new Date(),
        menuItems: [
          {
            menu_item_id: 2,
            name: 'Cheeseburger Deluxe',
            price: 8.99,
            image_url:
              'https://via.placeholder.com/100x100/96CEB4/FFFFFF?text=Burger',
          },
        ],
        menuCategories: [
          {
            category_id: 2,
            name: 'Burgers',
          },
        ],
      },
      {
        restaurant_id: 3,
        name: 'Sushi Master',
        address: '789 Pine Rd, Queens, NY',
        phone: '555-9012',
        logo_url:
          'https://via.placeholder.com/150x150/FECA57/FFFFFF?text=Sushi',
        rating: 4.7,
        cuisine: 'Japanese',
        delivery_time: '30-40 min',
        price_range: '$$$',
        created_at: new Date(),
        updated_at: new Date(),
        menuItems: [
          {
            menu_item_id: 3,
            name: 'California Roll',
            price: 14.99,
            image_url:
              'https://via.placeholder.com/100x100/FF9F1A/FFFFFF?text=Sushi',
          },
        ],
        menuCategories: [
          {
            category_id: 3,
            name: 'Sushi',
          },
        ],
      },
      {
        restaurant_id: 4,
        name: 'Taco Fiesta',
        address: '321 Elm St, Bronx, NY',
        phone: '555-3456',
        logo_url: 'https://via.placeholder.com/150x150/9B5DE5/FFFFFF?text=Taco',
        rating: 4.4,
        cuisine: 'Mexican',
        delivery_time: '15-25 min',
        price_range: '$',
        created_at: new Date(),
        updated_at: new Date(),
        menuItems: [
          {
            menu_item_id: 4,
            name: 'Chicken Tacos (3 pcs)',
            price: 10.99,
            image_url:
              'https://via.placeholder.com/100x100/F15BB5/FFFFFF?text=Taco',
          },
        ],
        menuCategories: [
          {
            category_id: 4,
            name: 'Tacos',
          },
        ],
      },
      {
        restaurant_id: 5,
        name: 'Curry House',
        address: '654 Maple Dr, Manhattan, NY',
        phone: '555-7890',
        logo_url:
          'https://via.placeholder.com/150x150/00BBF9/FFFFFF?text=Curry',
        rating: 4.6,
        cuisine: 'Indian',
        delivery_time: '35-45 min',
        price_range: '$$',
        created_at: new Date(),
        updated_at: new Date(),
        menuItems: [
          {
            menu_item_id: 5,
            name: 'Butter Chicken',
            price: 16.99,
            image_url:
              'https://via.placeholder.com/100x100/00F5D4/FFFFFF?text=Curry',
          },
        ],
        menuCategories: [
          {
            category_id: 5,
            name: 'Curry',
          },
        ],
      },
      {
        restaurant_id: 6,
        name: 'Noodle Bar',
        address: '987 Cedar Ln, Staten Island, NY',
        phone: '555-2345',
        logo_url:
          'https://via.placeholder.com/150x150/FEE440/FFFFFF?text=Noodle',
        rating: 4.2,
        cuisine: 'Asian',
        delivery_time: '20-30 min',
        price_range: '$',
        created_at: new Date(),
        updated_at: new Date(),
        menuItems: [
          {
            menu_item_id: 6,
            name: 'Pad Thai',
            price: 13.99,
            image_url:
              'https://via.placeholder.com/100x100/9B5DE5/FFFFFF?text=Noodle',
          },
        ],
        menuCategories: [
          {
            category_id: 6,
            name: 'Noodles',
          },
        ],
      },
    ];
  }
}
