import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiderLocation } from './entities/rider_location.entity';
import { Rider } from '../riders/entities/rider.entity';
import { RiderLocationService } from './rider_locations.service';
import { RiderLocationController } from './rider_locations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RiderLocation, Rider]),
    // No RedisModule here - it's already in AppModule
  ],
  providers: [RiderLocationService],
  controllers: [RiderLocationController],
  exports: [RiderLocationService],
})
export class RiderLocationsModule {}
