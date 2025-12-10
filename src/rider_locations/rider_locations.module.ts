// src/rider_locations/rider_locations.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiderLocation } from './entities/rider_location.entity';
import { Rider } from '../riders/entities/rider.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { RiderLocationService } from './rider_locations.service';
import { RiderLocationController } from './rider_locations.controller';
import { UsersModule } from '../users/users.module';
import { RiderRequestsModule } from '../rider-request/rider-request.module'; // Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([RiderLocation, Rider, Restaurant]),
    UsersModule,
    RiderRequestsModule, // Add this line
  ],
  providers: [RiderLocationService],
  controllers: [RiderLocationController],
  exports: [RiderLocationService],
})
export class RiderLocationsModule {}
