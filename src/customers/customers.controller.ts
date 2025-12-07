import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  Post,
  Delete,
} from '@nestjs/common';
import { CustomerService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { Customer } from './entities/customer.entity';
import { AtGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin, UserRole.CustomerCare)
  findAll(): Promise<Customer[]> {
    return this.customerService.findAll();
  }

  @Get(':id')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(
    UserRole.SuperAdmin,
    UserRole.CustomerCare,
    UserRole.Customer, // Allow customers to view their own profile
  )
  async findOne(@Param('id') id: number, @Req() req): Promise<Customer> {
    // Check if user is requesting their own data
    const customer = await this.customerService.findOne(id);

    if (
      req.user.role === UserRole.Customer &&
      customer.user.user_id !== req.user.user_id
    ) {
      throw new Error('Unauthorized to view other customers');
    }

    return customer;
  }

  @Post()
  @Public() // Allow public registration
  create(@Body() createCustomerDto: CreateCustomerDto): Promise<Customer> {
    return this.customerService.create(createCustomerDto);
  }

  @Patch(':id')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(
    UserRole.SuperAdmin,
    UserRole.CustomerCare,
    UserRole.Customer, // Allow customers to update their own data
  )
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateCustomerDto,
    @Req() req,
  ): Promise<Customer> {
    // Check if user is updating their own data
    if (req.user.role === UserRole.Customer) {
      const customer = await this.customerService.findOne(id);
      if (customer.user.user_id !== req.user.user_id) {
        throw new Error('Unauthorized to update other customers');
      }
    }
    return this.customerService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin) // Only super admin can delete customers
  remove(@Param('id') id: number): Promise<void> {
    return this.customerService.remove(id);
  }

  @Patch(':id/update-points')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin, UserRole.Manager, UserRole.CustomerCare) // Updated roles
  updatePoints(
    @Param('id') id: number,
    @Body() body: { points: number },
  ): Promise<Customer> {
    return this.customerService.updatePoints(id, body.points);
  }

  @Patch(':id/set-default-address')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(
    UserRole.SuperAdmin,
    UserRole.CustomerCare,
    UserRole.Customer, // Allow customers to update their own address
  )
  async setDefaultAddress(
    @Param('id') id: number,
    @Body() body: { address: string },
    @Req() req,
  ): Promise<Customer> {
    // Check if user is updating their own address
    if (req.user.role === UserRole.Customer) {
      const customer = await this.customerService.findOne(id);
      if (customer.user.user_id !== req.user.user_id) {
        throw new Error('Unauthorized to update other customers');
      }
    }
    return this.customerService.setDefaultAddress(id, body.address);
  }

  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.Customer) // Only customers can access their own profile
  @Get('profile/me')
  async getMyProfile(@Req() req): Promise<Customer> {
    return this.customerService.findByUserId(req.user.user_id);
  }

  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @Patch('profile/me')
  async updateMyProfile(
    @Req() req,
    @Body() dto: UpdateCustomerDto,
  ): Promise<Customer> {
    const customer = await this.customerService.findByUserId(req.user.user_id);
    return this.customerService.update(customer.customer_id, dto);
  }

  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @Get('me/orders')
  async getMyOrders(@Req() req): Promise<any[]> {
    return this.customerService.getCustomerOrders(req.user.user_id);
  }

  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @Get('me/stats')
  async getMyStats(@Req() req): Promise<any> {
    const customer = await this.customerService.findByUserId(req.user.user_id);

    return {
      totalOrders: customer.orders?.length || 0,
      loyaltyPoints: customer.loyalty_points,
      defaultAddress: customer.default_address,
      memberSince: customer.created_at,
    };
  }
}
