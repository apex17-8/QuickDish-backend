// src/restaurants/restaurants.service.ts - FIXED CREATE METHOD
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { MenuItem } from '../menu_items/entities/menu_item.entity';
import { RestaurantMenuCategory } from '../restaurant-menu_categories/entities/restaurant-menu_category.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { User, UserRole } from '../users/entities/user.entity';
import {
  RestaurantStaff,
  StaffRole,
} from '../restaurant_staff/entities/restaurant_staff.entity';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(RestaurantMenuCategory)
    private readonly categoryRepository: Repository<RestaurantMenuCategory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RestaurantStaff)
    private readonly staffRepository: Repository<RestaurantStaff>,
  ) {}

  // ========== RESTAURANT OWNER METHODS ==========

  // CREATE RESTAURANT - FIXED VERSION
  async createRestaurant(
    ownerId: number,
    createRestaurantDto: CreateRestaurantDto,
  ): Promise<Restaurant> {
    const owner = await this.userRepository.findOne({
      where: { user_id: ownerId },
    });

    if (!owner) {
      throw new NotFoundException(`User with ID ${ownerId} not found`);
    }

    // Check if user can create restaurants
    if (![UserRole.RestaurantOwner, UserRole.SuperAdmin].includes(owner.role)) {
      throw new ForbiddenException(
        'Only restaurant owners can create restaurants',
      );
    }

    // Convert is_active string to boolean - FIXED
    let isActive = true; // Default to true
    if (createRestaurantDto.is_active !== undefined) {
      if (typeof createRestaurantDto.is_active === 'string') {
        isActive =
          createRestaurantDto.is_active === 'true' ||
          createRestaurantDto.is_active === '1';
      } else if (typeof createRestaurantDto.is_active === 'boolean') {
        isActive = createRestaurantDto.is_active;
      }
    }

    // Create restaurant object directly without using this.restaurantRepository.create()
    const restaurant = new Restaurant();
    restaurant.name = createRestaurantDto.name;
    restaurant.address = createRestaurantDto.address;
    restaurant.phone = createRestaurantDto.phone;
    restaurant.cuisine = createRestaurantDto.cuisine || '';
    restaurant.logo_url = createRestaurantDto.logo_url || '';
    restaurant.price_range = createRestaurantDto.price_range || '';
    restaurant.delivery_fee = createRestaurantDto.delivery_fee ?? 0;
    restaurant.estimated_delivery_time =
      createRestaurantDto.estimated_delivery_time ?? 0; // Default to 0 if null
    restaurant.description = createRestaurantDto.description || '';
    restaurant.is_active = isActive;
    restaurant.owner = owner;
    restaurant.rating = 0; // Default rating

    const savedRestaurant = await this.restaurantRepository.save(restaurant);
    return savedRestaurant;
  }

  // GET RESTAURANTS BY OWNER OR MANAGER
  async findByOwnerOrManager(
    userId: number,
    userRole: string,
  ): Promise<Restaurant[]> {
    if (userRole === UserRole.SuperAdmin.toString()) {
      // Super admin can see all restaurants
      return this.restaurantRepository.find({
        relations: ['menuItems', 'menuCategories', 'owner'],
        order: { created_at: 'DESC' },
      });
    }

    if (userRole === UserRole.RestaurantOwner.toString()) {
      // Restaurant owners see their own restaurants
      return this.restaurantRepository.find({
        where: { owner: { user_id: userId } },
        relations: ['menuItems', 'menuCategories', 'owner'],
        order: { created_at: 'DESC' },
      });
    }

    if (userRole === UserRole.Manager.toString()) {
      // Managers see restaurants they're assigned to
      const staffAssignments = await this.staffRepository.find({
        where: {
          user: { user_id: userId },
          role: StaffRole.Manager,
        },
        relations: ['restaurant'],
      });

      const restaurantIds = staffAssignments.map(
        (sa) => sa.restaurant.restaurant_id,
      );

      if (restaurantIds.length === 0) {
        return [];
      }

      return this.restaurantRepository.find({
        where: { restaurant_id: In(restaurantIds) },
        relations: ['menuItems', 'menuCategories', 'owner'],
        order: { created_at: 'DESC' },
      });
    }

    throw new ForbiddenException(
      'You do not have permission to view restaurants',
    );
  }

  // UPDATE RESTAURANT WITH OWNERSHIP CHECK
  async updateRestaurant(
    restaurantId: number,
    userId: number,
    userRole: string,
    updateRestaurantDto: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { restaurant_id: restaurantId },
      relations: ['owner'],
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    // Check permissions
    if (userRole !== UserRole.SuperAdmin.toString()) {
      if (
        userRole === UserRole.RestaurantOwner.toString() &&
        restaurant.owner.user_id !== userId
      ) {
        throw new ForbiddenException('You do not own this restaurant');
      }

      // For managers, check if they're assigned to this restaurant
      if (userRole === UserRole.Manager.toString()) {
        const isManager = await this.checkIfManager(userId, restaurantId);
        if (!isManager) {
          throw new ForbiddenException(
            'You are not a manager of this restaurant',
          );
        }
      }
    }

    // Update all fields that exist in the DTO
    if (updateRestaurantDto.name !== undefined) {
      restaurant.name = updateRestaurantDto.name;
    }
    if (updateRestaurantDto.address !== undefined) {
      restaurant.address = updateRestaurantDto.address;
    }
    if (updateRestaurantDto.phone !== undefined) {
      restaurant.phone = updateRestaurantDto.phone;
    }
    if (updateRestaurantDto.cuisine !== undefined) {
      restaurant.cuisine = updateRestaurantDto.cuisine;
    }
    if (updateRestaurantDto.logo_url !== undefined) {
      restaurant.logo_url = updateRestaurantDto.logo_url;
    }
    if (updateRestaurantDto.price_range !== undefined) {
      restaurant.price_range = updateRestaurantDto.price_range;
    }
    if (updateRestaurantDto.delivery_fee !== undefined) {
      restaurant.delivery_fee = updateRestaurantDto.delivery_fee;
    }
    if (updateRestaurantDto.estimated_delivery_time !== undefined) {
      restaurant.estimated_delivery_time =
        updateRestaurantDto.estimated_delivery_time;
    }
    if (updateRestaurantDto.description !== undefined) {
      restaurant.description = updateRestaurantDto.description;
    }
    if (updateRestaurantDto.is_active !== undefined) {
      // Convert string to boolean for is_active
      if (typeof updateRestaurantDto.is_active === 'string') {
        restaurant.is_active =
          updateRestaurantDto.is_active === 'true' ||
          updateRestaurantDto.is_active === '1';
      } else {
        restaurant.is_active = updateRestaurantDto.is_active;
      }
    }

    return this.restaurantRepository.save(restaurant);
  }

  // DELETE RESTAURANT
  async deleteRestaurant(restaurantId: number, ownerId: number): Promise<void> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { restaurant_id: restaurantId },
      relations: ['owner'],
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    // Check ownership
    if (restaurant.owner.user_id !== ownerId) {
      throw new ForbiddenException('You do not own this restaurant');
    }

    await this.restaurantRepository.remove(restaurant);
  }

  // ADD MENU ITEM WITH OWNERSHIP CHECK
  async addMenuItem(
    restaurantId: number,
    userId: number,
    userRole: string,
    menuItem: Partial<MenuItem>,
  ): Promise<MenuItem> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { restaurant_id: restaurantId },
      relations: ['owner'],
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    // Check permissions
    if (userRole !== UserRole.SuperAdmin.toString()) {
      if (
        userRole === UserRole.RestaurantOwner.toString() &&
        restaurant.owner.user_id !== userId
      ) {
        throw new ForbiddenException('You do not own this restaurant');
      }

      if (userRole === UserRole.Manager.toString()) {
        const isManager = await this.checkIfManager(userId, restaurantId);
        if (!isManager) {
          throw new ForbiddenException(
            'You are not a manager of this restaurant',
          );
        }
      }
    }

    // Handle is_available conversion - since it's a number in the entity
    let isAvailable = 1; // Default to available
    if (menuItem.is_available !== undefined) {
      if (typeof menuItem.is_available === 'boolean') {
        isAvailable = menuItem.is_available ? 1 : 0;
      } else if (typeof menuItem.is_available === 'number') {
        isAvailable = menuItem.is_available;
      } else if (typeof menuItem.is_available === 'string') {
        isAvailable =
          menuItem.is_available === 'true' || menuItem.is_available === '1'
            ? 1
            : 0;
      }
    }

    const item = this.menuItemRepository.create({
      name: menuItem.name,
      description: menuItem.description,
      price: menuItem.price,
      restaurant: restaurant,
      category: menuItem.category,
      category_id: menuItem.category_id,
      image_url: menuItem.image_url,
      is_available: isAvailable,
    });

    return this.menuItemRepository.save(item);
  }

  // UPDATE CATEGORY WITH OWNERSHIP CHECK
  async updateCategory(
    categoryId: number,
    userId: number,
    userRole: string,
    updateData: Partial<RestaurantMenuCategory>,
  ): Promise<RestaurantMenuCategory> {
    const category = await this.categoryRepository.findOne({
      where: { category_id: categoryId },
      relations: ['restaurant', 'restaurant.owner'],
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }

    // Check permissions
    if (userRole !== UserRole.SuperAdmin.toString()) {
      if (
        userRole === UserRole.RestaurantOwner.toString() &&
        category.restaurant.owner.user_id !== userId
      ) {
        throw new ForbiddenException('You do not own this restaurant');
      }

      if (userRole === UserRole.Manager.toString()) {
        const isManager = await this.checkIfManager(
          userId,
          category.restaurant.restaurant_id,
        );
        if (!isManager) {
          throw new ForbiddenException(
            'You are not a manager of this restaurant',
          );
        }
      }
    }

    Object.assign(category, updateData);
    return this.categoryRepository.save(category);
  }

  // CHECK IF USER IS MANAGER OF RESTAURANT
  private async checkIfManager(
    userId: number,
    restaurantId: number,
  ): Promise<boolean> {
    const staffAssignment = await this.staffRepository.findOne({
      where: {
        user: { user_id: userId },
        restaurant: { restaurant_id: restaurantId },
        role: StaffRole.Manager,
      },
    });
    return !!staffAssignment;
  }

  // ========== KEEP YOUR EXISTING METHODS BELOW ==========

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantRepository.find({
      relations: ['menuItems', 'menuCategories', 'owner'],
    });
  }

  async findFeatured(): Promise<Restaurant[]> {
    try {
      console.log('Finding featured restaurants...');

      const existingRestaurants = await this.restaurantRepository.find({
        take: 6,
        order: { rating: 'DESC' },
        relations: ['menuItems', 'menuCategories', 'owner'],
      });

      if (existingRestaurants.length > 0) {
        console.log(
          `Found ${existingRestaurants.length} restaurants from database`,
        );
        return existingRestaurants;
      }

      console.log('No restaurants in database, returning mock data');
      return this.getMockFeaturedRestaurants() as Restaurant[];
    } catch (error) {
      console.error('Error in findFeatured:', error);
      return this.getMockFeaturedRestaurants() as Restaurant[];
    }
  }

  async findOne(id: number): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { restaurant_id: id },
      relations: ['menuItems', 'menuCategories', 'owner'],
    });
    if (!restaurant) throw new NotFoundException(`Restaurant ${id} not found`);
    return restaurant;
  }

  // Keep your mock data method exactly as is
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
    ];
  }
}
