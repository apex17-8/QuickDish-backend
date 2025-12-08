// src/rider-requests/rider-requests.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { RiderRequestsService } from './rider-request.service';
import { CreateRiderRequestDto } from './dto/create-rider-request.dto';
import { UpdateRiderRequestDto } from './dto/update-rider-request.dto';
import { AtGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RiderRequestStatus } from './entities/rider-request.entity';

@Controller('rider-requests')
export class RiderRequestsController {
  constructor(private readonly riderRequestsService: RiderRequestsService) {}

  // Create a new rider request (rider can request to join restaurant)
  @UseGuards(AtGuard)
  @Post()
  async createRequest(@Req() req, @Body() createDto: CreateRiderRequestDto) {
    const userId = req.user.sub;
    return this.riderRequestsService.createRequest(createDto, userId);
  }

  // Get all requests for a restaurant (owner/manager only)
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Get('restaurant/:restaurantId')
  async getRestaurantRequests(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() req,
  ) {
    const user_Id = req.user.sub;
    const userRole = req.user.role;
    return this.riderRequestsService.getRestaurantRequests(
      restaurantId,
      user_Id,
      userRole,
    );
  }

  // Get pending requests for a restaurant
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Get('restaurant/:restaurantId/pending')
  async getPendingRequests(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() req,
  ) {
    const user_Id = req.user.sub;
    const userRole = req.user.role;
    return this.riderRequestsService.getPendingRequests(
      restaurantId,
      user_Id,
      userRole,
    );
  }

  // Get approved riders for a restaurant
  @UseGuards(AtGuard, RolesGuard)
  @Roles(
    UserRole.RestaurantOwner,
    UserRole.Manager,
    UserRole.SuperAdmin,
    UserRole.Rider,
  )
  @Get('restaurant/:restaurantId/approved')
  async getApprovedRiders(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() req,
  ) {
    const user_Id = req.user.sub;
    const userRole = req.user.role;
    return this.riderRequestsService.getApprovedRiders(
      restaurantId,
      user_Id,
      userRole,
    );
  }

  // Get available riders (not yet approved for this restaurant)
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Get('restaurant/:restaurantId/available')
  async getAvailableRiders(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() req,
  ) {
    const user_Id = req.user.sub;
    const userRole = req.user.role;
    return this.riderRequestsService.getAvailableRiders(
      restaurantId,
      user_Id,
      userRole,
    );
  }

  // Get rider statistics for a restaurant
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Get('restaurant/:restaurantId/stats')
  async getRiderStats(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() req,
  ) {
    const user_Id = req.user.sub;
    const userRole = req.user.role;
    return this.riderRequestsService.getRiderStats(
      restaurantId,
      user_Id,
      userRole,
    );
  }

  // Get a specific request
  @UseGuards(AtGuard)
  @Get(':requestId')
  async findOne(@Param('requestId', ParseIntPipe) requestId: number) {
    return this.riderRequestsService.findOne(requestId);
  }

  // Approve a rider request
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Patch(':requestId/approve')
  async approveRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Req() req,
  ) {
    const user_Id = req.user.sub;
    const userRole = req.user.role;
    return this.riderRequestsService.approveRequest(
      requestId,
      user_Id,
      userRole,
    );
  }

  // Reject a rider request
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Patch(':requestId/reject')
  async rejectRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Req() req,
    @Body() body: { reason?: string },
  ) {
    const user_Id = req.user.sub;
    const userRole = req.user.role;
    return this.riderRequestsService.rejectRequest(
      requestId,
      user_Id,
      userRole,
      body.reason,
    );
  }

  // Suspend a rider
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Patch(':requestId/suspend')
  async suspendRider(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Req() req,
    @Body() body: { reason?: string },
  ) {
    const user_Id = req.user.sub;
    const userRole = req.user.role;
    return this.riderRequestsService.suspendRider(
      requestId,
      user_Id,
      userRole,
      body.reason,
    );
  }

  // Reinstate a suspended rider
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Patch(':requestId/reinstate')
  async reinstateRider(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Req() req,
  ) {
    const user_Id = req.user.sub;
    const userRole = req.user.role;
    return this.riderRequestsService.approveRequest(
      requestId,
      user_Id,
      userRole,
    );
  }

  // Remove rider from restaurant
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Delete(':requestId')
  async removeRider(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Req() req,
    @Body() body: { reason?: string },
  ) {
    const user_Id = req.user.sub;
    const userRole = req.user.role;
    return this.riderRequestsService.removeRider(
      requestId,
      user_Id,
      userRole,
      body.reason,
    );
  }

  // Search riders by name, email, or phone
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Get('search')
  async searchRiders(
    @Query('restaurantId', ParseIntPipe) restaurantId: number,
    @Query('query') query: string,
    @Req() req,
  ) {
    const user_Id = req.user.sub;
    const userRole = req.user.role;

    // First get available riders
    const availableRiders = await this.riderRequestsService.getAvailableRiders(
      restaurantId,
      user_Id,
      userRole,
    );

    // Filter by search query
    if (query) {
      const searchQuery = query.toLowerCase();
      return availableRiders.filter(
        (rider) =>
          rider.name.toLowerCase().includes(searchQuery) ||
          rider.email.toLowerCase().includes(searchQuery) ||
          rider.phone?.toLowerCase().includes(searchQuery),
      );
    }

    return availableRiders;
  }

  // Get rider performance metrics
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Get(':requestId/performance')
  async getRiderPerformance(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Req() req,
  ) {
    const request = await this.riderRequestsService.findOne(requestId);
    const user_Id = req.user.sub;
    const userRole = req.user.role;

    // Verify access
    await this.riderRequestsService['verifyRestaurantAccess'](
      request.restaurant.restaurant_id,
      user_Id,
      userRole,
    );

    // Here you would typically fetch rider performance data from orders
    // For now, return mock data
    return {
      rider_id: request.rider.user_id,
      rider_name: request.rider.name,
      total_deliveries: 45,
      completed_deliveries: 42,
      failed_deliveries: 3,
      success_rate: 93.3,
      average_delivery_time: 28, // minutes
      average_rating: 4.5,
      total_earnings: 12500,
      last_delivery: new Date().toISOString(),
      is_online: true,
    };
  }
}
