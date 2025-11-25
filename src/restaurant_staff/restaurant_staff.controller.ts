// src/restaurant_staff/restaurant-staff.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { RestaurantStaffService } from './restaurant_staff.service';
import { CreateRestaurantStaffDto } from './dto/create-restaurant_staff.dto';
import { UpdateRestaurantStaffDto } from './dto/update-restaurant_staff.dto';
import { RestaurantStaff } from './entities/restaurant_staff.entity';

@Controller('restaurant-staff')
export class RestaurantStaffController {
  constructor(private readonly staffService: RestaurantStaffService) {}

  @Get()
  findAll(): Promise<RestaurantStaff[]> {
    return this.staffService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number): Promise<RestaurantStaff> {
    return this.staffService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRestaurantStaffDto): Promise<RestaurantStaff> {
    return this.staffService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() dto: UpdateRestaurantStaffDto,
  ): Promise<RestaurantStaff> {
    return this.staffService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number): Promise<void> {
    return this.staffService.remove(id);
  }
}
