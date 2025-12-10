// src/restaurant_staff/restaurant-staff.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { RestaurantStaff } from './entities/restaurant_staff.entity';
import { CreateRestaurantStaffDto } from './dto/create-restaurant_staff.dto';
import { UpdateRestaurantStaffDto } from './dto/update-restaurant_staff.dto';
import { Restaurant } from '../restaurants/entities/restaurant.entity';

@Injectable()
export class RestaurantStaffService {
  constructor(
    @InjectRepository(RestaurantStaff)
    private readonly staffRepository: Repository<RestaurantStaff>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
  ) {}

  async findAll(): Promise<RestaurantStaff[]> {
    return this.staffRepository.find({ relations: ['restaurant'] });
  }

  async findOne(id: number): Promise<RestaurantStaff> {
    const staff = await this.staffRepository.findOne({
      where: { restaurant_staff_id: id } as FindOptionsWhere<RestaurantStaff>,
      relations: ['restaurant'],
    });
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);
    return staff;
  }

  async create(dto: CreateRestaurantStaffDto): Promise<RestaurantStaff> {
    const restaurant = await this.restaurantRepository.findOneBy({
      restaurant_id: dto.restaurantId,
    });
    if (!restaurant)
      throw new NotFoundException(`Restaurant ${dto.restaurantId} not found`);

    const staff = this.staffRepository.create({ ...dto, restaurant });
    return this.staffRepository.save(staff);
  }

  async update(
    id: number,
    dto: UpdateRestaurantStaffDto,
  ): Promise<RestaurantStaff> {
    const staff = await this.findOne(id);
    Object.assign(staff, dto);
    return this.staffRepository.save(staff);
  }

  async remove(restaurant_staff_id: number): Promise<void> {
    const staff = await this.findOne(restaurant_staff_id);
    await this.staffRepository.remove(staff);
  }
}
