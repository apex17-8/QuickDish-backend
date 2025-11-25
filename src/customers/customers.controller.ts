import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { CustomerService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  findAll(): Promise<Customer[]> {
    return this.customerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number): Promise<Customer> {
    return this.customerService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() dto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.customerService.update(id, dto);
  }

  @Patch(':id/update-points')
  updatePoints(
    @Param('id') id: number,
    @Body() body: { points: number },
  ): Promise<Customer> {
    return this.customerService.updatePoints(id, body.points);
  }

  @Patch(':id/set-default-address')
  setDefaultAddress(
    @Param('id') id: number,
    @Body() body: { address: string },
  ): Promise<Customer> {
    return this.customerService.setDefaultAddress(id, body.address);
  }
}
