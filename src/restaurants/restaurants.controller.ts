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
  ParseIntPipe,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Restaurant> {
    return this.restaurantService.findOne(id);
  }

  @Get(':id/menu')
  async getRestaurantMenu(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.getRestaurantMenu(id);
  }

  @Get(':id/ratings')
  async getRestaurantRatings(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.getRestaurantRatings(id);
  }

  @Get('search/:query')
  async searchRestaurants(
    @Param('query') query: string,
  ): Promise<Restaurant[]> {
    return this.restaurantService.searchRestaurants(query);
  }

  // ========== RESTAURANT OWNER ENDPOINTS ==========

  // 1. Create Restaurant
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

  // 2. Get Restaurants Owned/Managed by User
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Get('owner/my-restaurants')
  async getMyRestaurants(@Req() req): Promise<Restaurant[]> {
    const user_id = req.user.sub;
    const userRole = req.user.role;

    return this.restaurantService.findByOwnerOrManager(user_id, userRole);
  }

  // 3. Update Restaurant
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Patch(':id')
  async updateMyRestaurant(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
    @Req() req,
  ): Promise<Restaurant> {
    const user_id = req.user.sub;
    const userRole = req.user.role;

    return this.restaurantService.updateRestaurant(
      id,
      user_id,
      userRole,
      updateRestaurantDto,
    );
  }

  // 4. Delete Restaurant
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.SuperAdmin)
  @Delete(':id')
  async deleteRestaurant(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
  ): Promise<{ message: string }> {
    const ownerId = req.user.sub;
    await this.restaurantService.deleteRestaurant(id, ownerId);
    return { message: 'Restaurant deleted successfully' };
  }

  // 5. Add Menu Item
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Post(':id/menu-items')
  async addMenuItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() menuItem: Partial<MenuItem>,
    @Req() req,
  ): Promise<MenuItem> {
    const user_id = req.user.sub;
    const userRole = req.user.role;

    return this.restaurantService.addMenuItem(id, user_id, userRole, menuItem);
  }

  // 6. Update Menu Category
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Patch('categories/:categoryId')
  async updateCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() updateData: Partial<RestaurantMenuCategory>,
    @Req() req,
  ): Promise<RestaurantMenuCategory> {
    const user_id = req.user.sub;
    const userRole = req.user.role;

    return this.restaurantService.updateCategory(
      categoryId,
      user_id,
      userRole,
      updateData,
    );
  }

  // 7. Upload Restaurant Image
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Post(':id/upload-image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ): Promise<Restaurant> {
    const user_id = req.user.sub;
    const userRole = req.user.role;

    return this.restaurantService.uploadRestaurantImage(
      id,
      user_id,
      userRole,
      file,
    );
  }

  // 8. Update Restaurant Status
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { is_active: boolean },
    @Req() req,
  ): Promise<Restaurant> {
    const user_id = req.user.sub;
    const userRole = req.user.role;

    return this.restaurantService.updateRestaurantStatus(
      id,
      user_id,
      userRole,
      body.is_active,
    );
  }

  // 9. Get Restaurant Statistics
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Get(':id/statistics')
  async getStatistics(
    @Param('id', ParseIntPipe) id: number,
    @Query('period') period: string = 'month',
    @Req() req,
  ) {
    const user_id = req.user.sub;
    const userRole = req.user.role;

    return this.restaurantService.getRestaurantStatistics(
      id,
      user_id,
      userRole,
      period,
    );
  }
}
