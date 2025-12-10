// src/rider_locations/rider_locations.controller.ts - COMPLETE FIXED VERSION
import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RiderLocationService } from './rider_locations.service';
import { CreateRiderLocationDto } from './dto/create-rider_location.dto';
import { RejectRiderDto } from './dto/reject-rider.dto';
import { RiderRequestsService } from '../rider-request/rider-request.service';
import { AtGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { UserRole } from 'src/users/entities/user.entity';

@Controller('rider-location')
export class RiderLocationController {
  constructor(
    private readonly locationService: RiderLocationService,
    private readonly riderRequestsService: RiderRequestsService,
  ) {}

  // Create / Update live location
  @UseGuards(AtGuard)
  @Post(':riderId')
  async updateLocation(
    @Param('riderId', ParseIntPipe) riderId: number,
    @Body() dto: CreateRiderLocationDto,
    @Req() req,
  ) {
    const user = req.user; // JWT payload

    // Riders can ONLY update their own location
    if (user.role === UserRole.Rider && user.sub !== riderId) {
      throw new HttpException(
        "You are not allowed to update another rider's location",
        HttpStatus.FORBIDDEN,
      );
    }

    return this.locationService.updateLocation(riderId, dto);
  }

  // Get real-time location
  @UseGuards(AtGuard)
  @Get(':riderId/live')
  getLiveLocation(@Param('riderId', ParseIntPipe) riderId: number) {
    return this.locationService.getLiveLocation(riderId);
  }

  // Get location history
  @UseGuards(AtGuard)
  @Get(':riderId/history')
  getLocationHistory(@Param('riderId', ParseIntPipe) riderId: number) {
    return this.locationService.getHistory(riderId);
  }

  // Reject rider request
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.Rider, UserRole.SuperAdmin, UserRole.Manager)
  @Patch(':requestId/reject')
  async rejectRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Req() req,
    @Body() dto: RejectRiderDto,
  ) {
    const user = req.user;

    try {
      await this.riderRequestsService.rejectRequest(
        requestId,
        user.sub,
        user.role,
        dto.reason,
      );

      return { message: 'Request rejected successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to reject request',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Get nearby riders for an order
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.RestaurantOwner, UserRole.Manager, UserRole.SuperAdmin)
  @Get('nearby/:restaurantId')
  async getNearbyRiders(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() req,
  ) {
    try {
      return await this.locationService.findNearbyRiders(restaurantId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to find nearby riders',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Endpoint for riders to update their availability status
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.Rider)
  @Patch(':riderId/availability')
  async updateAvailability(
    @Param('riderId', ParseIntPipe) riderId: number,
    @Body() body: { is_available: boolean },
    @Req() req,
  ) {
    const user = req.user;

    // Verify rider is updating their own availability
    if (user.role === UserRole.Rider && user.sub !== riderId) {
      throw new HttpException(
        'You can only update your own availability',
        HttpStatus.FORBIDDEN,
      );
    }

    try {
      return await this.locationService.updateRiderAvailability(
        riderId,
        body.is_available,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update availability',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
