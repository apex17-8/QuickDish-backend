import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiderLocation } from './entities/rider_location.entity';
import { Rider } from '../riders/entities/rider.entity';
import { CreateRiderLocationDto } from './dto/create-rider_location.dto';

@Injectable()
export class RiderLocationService {
  private readonly logger = new Logger(RiderLocationService.name);

  constructor(
    @InjectRepository(RiderLocation)
    private readonly locationRepo: Repository<RiderLocation>,

    @InjectRepository(Rider)
    private readonly riderRepo: Repository<Rider>,
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
}
