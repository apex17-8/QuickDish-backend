import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { Rider } from '../../riders/entities/rider.entity';
import { RiderLocationDto } from '../dto/rider-location.dto';

@Injectable()
export class OrderTrackingService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(Rider)
    private readonly riderRepo: Repository<Rider>,
  ) {}

  async updateLocation(data: RiderLocationDto) {
    const rider = await this.riderRepo.findOne({
      where: { rider_id: data.riderId },
    });

    if (!rider) throw new NotFoundException('Rider not found');

    rider.currentLatitude = data.lat;
    rider.currentLongitude = data.lng;
    await this.riderRepo.save(rider);

    return {
      riderId: rider.rider_id,
      lat: rider.currentLatitude,
      lng: rider.currentLongitude,
      orderId: data.orderId,
    };
  }

  async updateStatus(orderId: number, status: string) {
    const order = await this.orderRepo.findOne({
      where: { order_id: orderId },
    });

    if (!order) throw new NotFoundException('Order not found');

    order.status = status as OrderStatus;
    return this.orderRepo.save(order);
  }
}
