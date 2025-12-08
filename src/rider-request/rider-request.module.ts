// src/rider-requests/rider-requests.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiderRequest } from './entities/rider-request.entity';
import { User } from '../users/entities/user.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { RestaurantStaff } from '../restaurant_staff/entities/restaurant_staff.entity';
import { RiderRequestsService } from './rider-request.service';
import { RiderRequestsController } from './rider-request.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RiderRequest, User, Restaurant, RestaurantStaff]),
  ],
  controllers: [RiderRequestsController],
  providers: [RiderRequestsService],
  exports: [RiderRequestsService],
})
export class RiderRequestsModule {}
