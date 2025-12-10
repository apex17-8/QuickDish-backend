// src/restaurants/restaurants.service.ts - COMPLETE FIXED VERSION
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, Between, MoreThanOrEqual } from 'typeorm';
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
import { Order } from '../orders/entities/order.entity';
import * as fs from 'fs';
import * as path from 'path';

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
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
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

  // ========== PUBLIC METHODS ==========

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantRepository.find({
      where: { is_active: true },
      relations: ['menuItems', 'menuCategories', 'owner'],
      order: { rating: 'DESC', name: 'ASC' },
    });
  }

  async findFeatured(): Promise<Restaurant[]> {
    try {
      console.log('Finding featured restaurants...');

      const existingRestaurants = await this.restaurantRepository.find({
        where: { is_active: true },
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

  // ========== NEW IMPLEMENTED METHODS ==========

  /** GET RESTAURANT MENU - FIXED */
  async getRestaurantMenu(restaurantId: number) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { restaurant_id: restaurantId },
      relations: ['menuItems', 'menuItems.category'],
    });

    if (!restaurant) {
      throw new NotFoundException(
        `Restaurant with ID ${restaurantId} not found`,
      );
    }

    // Group menu items by category
    const categories = restaurant.menuItems.reduce(
      (acc, item) => {
        const categoryName = item.category?.name || 'Uncategorized';
        if (!acc[categoryName]) {
          acc[categoryName] = {
            category_id: item.category?.category_id,
            name: categoryName,
            items: [],
          };
        }
        acc[categoryName].items.push({
          menu_item_id: item.menu_item_id,
          name: item.name,
          description: item.description,
          price: item.price,
          image_url: item.image_url,
          is_available: item.is_available,
          // Note: preparation_time and dietary_info don't exist in MenuItem entity
        });
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      restaurant: {
        id: restaurant.restaurant_id,
        name: restaurant.name,
        description: restaurant.description,
      },
      categories: Object.values(categories),
    };
  }

  /** GET RESTAURANT RATINGS - FIXED */
  async getRestaurantRatings(restaurantId: number) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { restaurant_id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException(
        `Restaurant with ID ${restaurantId} not found`,
      );
    }

    // Get all orders for this restaurant with ratings
    const orders = await this.orderRepository.find({
      where: {
        restaurant: { restaurant_id: restaurantId },
        customer_rating: MoreThanOrEqual(1),
      },
      relations: ['customer.user'],
      order: { created_at: 'DESC' },
    });

    const ratings = orders
      .filter((order) => order.customer_rating !== null)
      .map((order) => ({
        order_id: order.order_id,
        rating: order.customer_rating as number, // We filtered out nulls
        feedback: order.customer_feedback,
        customer_name: order.customer.user?.name || 'Anonymous',
        date: order.created_at,
      }));

    // Calculate average rating - FIXED null handling
    const totalRatings = ratings.length;
    const averageRating =
      totalRatings > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;

    // Calculate rating distribution
    const distribution = [1, 2, 3, 4, 5].map((stars) => ({
      stars,
      count: ratings.filter((r) => r.rating === stars).length,
      percentage:
        totalRatings > 0
          ? (ratings.filter((r) => r.rating === stars).length / totalRatings) *
            100
          : 0,
    }));

    return {
      restaurant: {
        id: restaurant.restaurant_id,
        name: restaurant.name,
        overall_rating: restaurant.rating || averageRating,
        total_ratings: totalRatings,
      },
      average_rating: parseFloat(averageRating.toFixed(1)),
      total_ratings: totalRatings,
      distribution,
      recent_reviews: ratings.slice(0, 10),
    };
  }

  /** UPLOAD RESTAURANT IMAGE - FIXED Multer type */
  async uploadRestaurantImage(
    restaurantId: number,
    userId: number,
    userRole: string,
    file: Express.Multer.File,
  ): Promise<Restaurant> {
    // Check if restaurant exists and user has permission
    const restaurant = await this.getRestaurantForUser(
      restaurantId,
      userId,
      userRole,
    );

    // Validate file
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, JPG, and WebP are allowed.',
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        'File size too large. Maximum size is 5MB.',
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'restaurants');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const fileName = `restaurant_${restaurantId}_${Date.now()}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Update restaurant with image URL
    const imageUrl = `/uploads/restaurants/${fileName}`;
    restaurant.logo_url = imageUrl;

    // Delete old image if exists
    if (restaurant.logo_url && restaurant.logo_url.startsWith('/uploads/')) {
      const oldPath = path.join(process.cwd(), restaurant.logo_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    return await this.restaurantRepository.save(restaurant);
  }

  /** UPDATE RESTAURANT STATUS */
  async updateRestaurantStatus(
    restaurantId: number,
    userId: number,
    userRole: string,
    isActive: boolean,
  ): Promise<Restaurant> {
    // Check if restaurant exists and user has permission
    const restaurant = await this.getRestaurantForUser(
      restaurantId,
      userId,
      userRole,
    );

    restaurant.is_active = isActive;
    restaurant.updated_at = new Date();

    return await this.restaurantRepository.save(restaurant);
  }

  /** GET RESTAURANT STATISTICS - FIXED */
  async getRestaurantStatistics(
    restaurantId: number,
    userId: number,
    userRole: string,
    period: string = 'month',
  ) {
    // Check if restaurant exists and user has permission
    await this.getRestaurantForUser(restaurantId, userId, userRole);

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    // Get order statistics
    const orders = await this.orderRepository.find({
      where: {
        restaurant: { restaurant_id: restaurantId },
        created_at: Between(startDate, new Date()),
      },
      relations: ['orderItems', 'orderItems.menu_item'],
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.total_price,
      0,
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get status counts
    const statusCounts = {
      pending: orders.filter((o) => o.status === 'pending').length,
      accepted: orders.filter((o) => o.status === 'accepted').length,
      preparing: orders.filter((o) => o.status === 'preparing').length,
      ready: orders.filter((o) => o.status === 'ready').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };

    // Get top selling items - FIXED: Use proper type
    interface ItemSale {
      quantity: number;
      revenue: number;
      name?: string;
    }

    const itemSales: Record<string, ItemSale> = {};
    orders.forEach((order) => {
      order.orderItems?.forEach((item) => {
        // Access menu_item_id through the menu_item relation
        const itemId = item.menu_item?.menu_item_id?.toString();
        if (!itemId) return;

        if (!itemSales[itemId]) {
          itemSales[itemId] = {
            quantity: 0,
            revenue: 0,
            name: item.menu_item?.name || 'Unknown Item',
          };
        }
        itemSales[itemId].quantity += item.quantity;
        itemSales[itemId].revenue += item.price_at_purchase * item.quantity;
      });
    });

    const topItems = Object.entries(itemSales)
      .map(([itemId, sales]) => ({
        item_id: parseInt(itemId),
        name: sales.name,
        quantity: sales.quantity,
        revenue: sales.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Get hourly distribution
    const hourlyDistribution = Array(24).fill(0);
    orders.forEach((order) => {
      const hour = new Date(order.created_at).getHours();
      hourlyDistribution[hour]++;
    });

    return {
      period,
      date_range: {
        start: startDate,
        end: new Date(),
      },
      overview: {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        average_order_value: averageOrderValue,
        completion_rate:
          totalOrders > 0
            ? ((statusCounts.delivered + statusCounts.cancelled) /
                totalOrders) *
              100
            : 0,
      },
      status_distribution: statusCounts,
      top_selling_items: topItems,
      hourly_distribution: hourlyDistribution.map((count, hour) => ({
        hour: `${hour}:00`,
        orders: count,
      })),
    };
  }

  /** SEARCH RESTAURANTS */
  async searchRestaurants(query: string): Promise<Restaurant[]> {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException(
        'Search query must be at least 2 characters long',
      );
    }

    const searchTerm = `%${query}%`;

    return await this.restaurantRepository
      .createQueryBuilder('restaurant')
      .leftJoinAndSelect('restaurant.menuItems', 'menuItems')
      .leftJoinAndSelect('restaurant.owner', 'owner')
      .where('restaurant.name LIKE :name', { name: searchTerm })
      .orWhere('restaurant.description LIKE :description', {
        description: searchTerm,
      })
      .orWhere('restaurant.cuisine LIKE :cuisine', { cuisine: searchTerm })
      .orWhere('restaurant.address LIKE :address', { address: searchTerm })
      .orWhere('menuItems.name LIKE :itemName', { itemName: searchTerm })
      .andWhere('restaurant.is_active = :isActive', { isActive: true })
      .orderBy('restaurant.rating', 'DESC')
      .addOrderBy('restaurant.name', 'ASC')
      .getMany();
  }

  /** HELPER METHOD: Get restaurant with permission check */
  private async getRestaurantForUser(
    restaurantId: number,
    userId: number,
    userRole: string,
  ): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { restaurant_id: restaurantId },
      relations: ['owner', 'staff', 'staff.user'],
    });

    if (!restaurant) {
      throw new NotFoundException(
        `Restaurant with ID ${restaurantId} not found`,
      );
    }

    // Super admin can access any restaurant
    if (userRole === UserRole.SuperAdmin.toString()) {
      return restaurant;
    }

    // Restaurant owner can access their own restaurants
    if (
      userRole === UserRole.RestaurantOwner.toString() &&
      restaurant.owner.user_id === userId
    ) {
      return restaurant;
    }

    // Manager can access restaurants they're assigned to
    if (userRole === UserRole.Manager.toString()) {
      const isAssigned = restaurant.staff?.some(
        (staff) => staff.user.user_id === userId && staff.role === 'manager',
      );
      if (isAssigned) {
        return restaurant;
      }
    }

    throw new BadRequestException(
      'You do not have permission to access this restaurant',
    );
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
