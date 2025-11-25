import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findAll(): Promise<Customer[]> {
    return this.customerRepository.find();
  }

  async findOne(id: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { customer_id: id },
    });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  async updatePoints(id: number, points: number): Promise<Customer> {
    const customer = await this.findOne(id);
    customer.loyalty_points += points;
    return this.customerRepository.save(customer);
  }

  async setDefaultAddress(id: number, address: string): Promise<Customer> {
    const customer = await this.findOne(id);
    customer.default_address = address;
    return this.customerRepository.save(customer);
  }

  async update(id: number, dto: UpdateCustomerDto): Promise<Customer> {
    await this.customerRepository.update(id, dto);
    return this.findOne(id);
  }
}
