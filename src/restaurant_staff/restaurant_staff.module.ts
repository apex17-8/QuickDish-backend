import { Module } from '@nestjs/common';
import { RestaurantStaffService } from './restaurant_staff.service';
import { RestaurantStaffController } from './restaurant_staff.controller';

@Module({
  controllers: [RestaurantStaffController],
  providers: [RestaurantStaffService],
})
export class RestaurantStaffModule {}
