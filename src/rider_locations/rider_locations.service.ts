// src/rider_locations/rider_locations.service.ts - COMPLETE FIXED
import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiderLocation } from './entities/rider_location.entity';
import { Rider } from '../riders/entities/rider.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { CreateRiderLocationDto } from './dto/create-rider_location.dto';

@Injectable()
export class RiderLocationService {
  private readonly logger = new Logger(RiderLocationService.name);

  constructor(
    @InjectRepository(RiderLocation)
    private readonly locationRepo: Repository<RiderLocation>,

    @InjectRepository(Rider)
    private readonly riderRepo: Repository<Rider>,

    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
  ) {}

  async updateLocation(
    riderId: number,
    dto: CreateRiderLocationDto,
  ): Promise<RiderLocation> {
    const rider = await this.riderRepo.findOne({
      where: { rider_id: riderId },
    });

    if (!rider) {
      throw new NotFoundException(`Rider with ID ${riderId} not found`);
    }

    // Save to location history
    const location = this.locationRepo.create({
      rider,
      latitude: dto.latitude,
      longitude: dto.longitude,
      address: dto.address ?? null,
    });

    await this.locationRepo.save(location);

    // Update rider's current location in rider table
    rider.currentLatitude = dto.latitude;
    rider.currentLongitude = dto.longitude;
    rider.last_location = dto.address ?? `${dto.latitude},${dto.longitude}`;
    await this.riderRepo.save(rider);

    this.logger.log(`Updated location for rider ${riderId} in database`);
    return location;
  }

  async getHistory(riderId: number): Promise<RiderLocation[]> {
    const rider = await this.riderRepo.findOne({
      where: { rider_id: riderId },
    });

    if (!rider) {
      throw new NotFoundException(`Rider with ID ${riderId} not found`);
    }

    return this.locationRepo.find({
      where: { rider: { rider_id: riderId } },
      order: { timestamp: 'DESC' },
      take: 50,
    });
  }

  /**
   * Get current location from database (fallback)
   */
  async getCurrentLocationFromDb(riderId: number) {
    const rider = await this.riderRepo.findOne({
      where: { rider_id: riderId },
      select: ['currentLatitude', 'currentLongitude', 'last_location'],
    });

    if (
      !rider ||
      rider.currentLatitude === null ||
      rider.currentLongitude === null
    ) {
      return null;
    }

    return {
      latitude: rider.currentLatitude,
      longitude: rider.currentLongitude,
      address: rider.last_location,
    };
  }

  /**
   * Get live location from rider's current coordinates
   */
  async getLiveLocation(riderId: number): Promise<any> {
    const rider = await this.riderRepo.findOne({
      where: { rider_id: riderId },
      select: ['currentLatitude', 'currentLongitude', 'last_location'],
    });

    if (
      !rider ||
      rider.currentLatitude === null ||
      rider.currentLongitude === null
    ) {
      return null;
    }

    return {
      lat: rider.currentLatitude,
      lng: rider.currentLongitude,
      address: rider.last_location,
      timestamp: new Date().toISOString(),
    };
  }

  /** FIND NEARBY RIDERS - USING QUERY BUILDER */
  async findNearbyRiders(restaurantId: number, maxDistanceKm: number = 5) {
    // Get restaurant location
    const restaurant = await this.restaurantRepo.findOne({
      where: { restaurant_id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException(
        `Restaurant with ID ${restaurantId} not found`,
      );
    }

    // Check if restaurant has location data
    if (!restaurant.latitude || !restaurant.longitude) {
      this.logger.warn(`Restaurant ${restaurantId} doesn't have location data`);
      return [];
    }

    // Use Query Builder for better control
    const activeRiders = await this.riderRepo
      .createQueryBuilder('rider')
      .leftJoinAndSelect('rider.user', 'user')
      .where('rider.is_online = :isOnline', { isOnline: true })
      .andWhere('rider.currentLatitude IS NOT NULL')
      .andWhere('rider.currentLongitude IS NOT NULL')
      .getMany();

    // Filter riders within distance
    const nearbyRiders = activeRiders.filter((rider) => {
      if (!rider.currentLatitude || !rider.currentLongitude) return false;

      const distance = this.calculateDistance(
        restaurant.latitude!,
        restaurant.longitude!,
        rider.currentLatitude,
        rider.currentLongitude,
      );

      return distance <= maxDistanceKm;
    });

    // Format response
    return nearbyRiders
      .map((rider) => {
        const distance = this.calculateDistance(
          restaurant.latitude!,
          restaurant.longitude!,
          rider.currentLatitude,
          rider.currentLongitude,
        );

        const response: any = {
          rider_id: rider.rider_id,
          name: rider.user?.name,
          phone: rider.user?.phone,
          distance: parseFloat(distance.toFixed(2)),
          eta: this.calculateETA(distance),
          location: {
            latitude: rider.currentLatitude,
            longitude: rider.currentLongitude,
            address: rider.last_location,
          },
          rating: rider.rating || 0,
          vehicle_type: rider.vehicle_type || 'bike',
        };

        // Only include total_deliveries if it exists in the entity
        if ('total_deliveries' in rider) {
          response.total_deliveries = (rider as any).total_deliveries;
        }

        return response;
      })
      .sort((a, b) => a.distance - b.distance);
  }

  /** UPDATE RIDER AVAILABILITY */
  async updateRiderAvailability(
    riderId: number,
    isAvailable: boolean,
  ): Promise<Rider> {
    const rider = await this.riderRepo.findOne({
      where: { rider_id: riderId },
      relations: ['user'],
    });

    if (!rider) {
      throw new NotFoundException(`Rider with ID ${riderId} not found`);
    }

    rider.is_online = isAvailable;
    rider.updated_at = new Date();

    const updatedRider = await this.riderRepo.save(rider);

    this.logger.log(
      `Updated availability for rider ${riderId}: ${isAvailable}`,
    );

    return updatedRider;
  }

  /** CALCULATE DISTANCE BETWEEN TWO POINTS (in kilometers) */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    // Haversine formula
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /** CALCULATE ETA (Estimated Time of Arrival) in minutes */
  private calculateETA(distanceKm: number): number {
    // Assuming average speed of 20 km/h in city traffic
    const averageSpeedKmh = 20;
    const etaHours = distanceKm / averageSpeedKmh;
    return Math.ceil(etaHours * 60); // Convert to minutes
  }

  /** CONVERT DEGREES TO RADIANS */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
