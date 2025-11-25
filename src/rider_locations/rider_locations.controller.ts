import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  ParseIntPipe,
} from '@nestjs/common';
import { RiderLocationService } from './rider_locations.service';
import { CreateRiderLocationDto } from './dto/create-rider_location.dto';

@Controller('rider-location')
export class RiderLocationController {
  constructor(private readonly locationService: RiderLocationService) {}

  // Create / Update live location
  @Post(':riderId')
  updateLocation(
    @Param('riderId', ParseIntPipe) riderId: number,
    @Body() dto: CreateRiderLocationDto,
  ) {
    return this.locationService.updateLocation(riderId, dto);
  }

  // Get real-time location (from Redis)
  @Get(':riderId/live')
  getLiveLocation(
    @Param('riderId', ParseIntPipe) riderId: number,
  ): Promise<any> {
    return this.locationService.getLiveLocation(riderId);
  }

  // Get location history (from DB) - NOW THIS WILL WORK
  @Get(':riderId/history')
  getLocationHistory(@Param('riderId', ParseIntPipe) riderId: number) {
    return this.locationService.getHistory(riderId);
  }
}
