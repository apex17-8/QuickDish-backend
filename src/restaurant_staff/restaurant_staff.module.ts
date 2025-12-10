import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantStaffService } from './restaurant_staff.service';
import { RestaurantStaffController } from './restaurant_staff.controller';
import { RestaurantStaff } from './entities/restaurant_staff.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RestaurantStaff, Restaurant])],
  controllers: [RestaurantStaffController],
  providers: [RestaurantStaffService],
})
export class RestaurantStaffModule {}
