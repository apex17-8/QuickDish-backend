import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rider } from './entities/rider.entity';
import { UpdateRiderDto } from './dto/update-rider.dto';

@Injectable()
export class RiderService {
  constructor(
    @InjectRepository(Rider)
    private readonly riderRepository: Repository<Rider>,
  ) {}

  async findAll(): Promise<Rider[]> {
    return this.riderRepository.find();
  }

  async findOne(id: number): Promise<Rider> {
    const rider = await this.riderRepository.findOne({
      where: { rider_id: id },
    });
    if (!rider) throw new NotFoundException(`Rider ${id} not found`);
    return rider;
  }

  async update(id: number, dto: UpdateRiderDto): Promise<Rider> {
    await this.riderRepository.update(id, dto);
    return this.findOne(id);
  }

  async goOnline(id: number): Promise<Rider> {
    const rider = await this.findOne(id);
    rider.is_online = true;
    return this.riderRepository.save(rider);
  }

  async goOffline(id: number): Promise<Rider> {
    const rider = await this.findOne(id);
    rider.is_online = false;
    return this.riderRepository.save(rider);
  }

  async updateLocation(
    id: number,
    latitude: number,
    longitude: number,
  ): Promise<Rider> {
    const rider = await this.findOne(id);
    rider.currentLatitude = latitude;
    rider.currentLongitude = longitude;
    return this.riderRepository.save(rider);
  }
}
