// src/restaurants/restaurants.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Post,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RestaurantService } from './restaurants.service';
import { Restaurant } from './entities/restaurant.entity';
import { MenuItem } from '../menu_items/entities/menu_item.entity';
import { RestaurantMenuCategory } from '../restaurant-menu_categories/entities/restaurant-menu_category.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { AtGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('restaurants')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  // ========== PUBLIC ENDPOINTS ==========
  @Get()
  findAll(): Promise<Restaurant[]> {
    return this.restaurantService.findAll();
  }

  @Get('featured')
  findFeatured(): Promise<Restaurant[]> {
    return this.restaurantService.findFeatured();
  }

  @Get(':id')
  findOne(@Param('id') id: number): Promise<Restaurant> {
    return this.restaurantService.findOne(id);
  }

  // ========== RESTAURANT OWNER ENDPOINTS ==========

  // 1. Create Restaurant (Owner Only)
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.SuperAdmin)
  @Post()
  async createRestaurant(
    @Req() req,
    @Body() createRestaurantDto: CreateRestaurantDto,
  ): Promise<Restaurant> {
    const ownerId = req.user.sub;
    return this.restaurantService.createRestaurant(
      ownerId,
      createRestaurantDto,
    );
  }

  // 2. Get My Restaurants (Owner's restaurants)
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Get('owner/my-restaurants')
  async getMyRestaurants(@Req() req): Promise<Restaurant[]> {
    const userId = req.user.sub;
    const userRole = req.user.role;
    return this.restaurantService.findByOwnerOrManager(userId, userRole);
  }

  // 3. Update My Restaurant (Owner/Manager)
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Patch(':id')
  async updateMyRestaurant(
    @Param('id') id: number,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
    @Req() req,
  ): Promise<Restaurant> {
    const userId = req.user.sub;
    const userRole = req.user.role;
    return this.restaurantService.updateRestaurant(
      id,
      userId,
      userRole,
      updateRestaurantDto,
    );
  }

  // 4. Delete My Restaurant (Owner Only)
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.SuperAdmin)
  @Delete(':id')
  async deleteRestaurant(
    @Param('id') id: number,
    @Req() req,
  ): Promise<{ message: string }> {
    const ownerId = req.user.sub;
    await this.restaurantService.deleteRestaurant(id, ownerId);
    return { message: 'Restaurant deleted successfully' };
  }

  // 5. Add Menu Item (Owner/Manager)
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Post(':id/menu-items')
  async addMenuItem(
    @Param('id') id: number,
    @Body() menuItem: Partial<MenuItem>,
    @Req() req,
  ): Promise<MenuItem> {
    const userId = req.user.sub;
    const userRole = req.user.role;
    return this.restaurantService.addMenuItem(id, userId, userRole, menuItem);
  }

  // 6. Update Category (Owner/Manager)
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Patch('categories/:categoryId')
  async updateCategory(
    @Param('categoryId') categoryId: number,
    @Body() updateData: Partial<RestaurantMenuCategory>,
    @Req() req,
  ): Promise<RestaurantMenuCategory> {
    const userId = req.user.sub;
    const userRole = req.user.role;
    return this.restaurantService.updateCategory(
      categoryId,
      userId,
      userRole,
      updateData,
    );
  }
}
