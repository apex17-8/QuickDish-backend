import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from './entities/customer.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), UsersModule],
  controllers: [CustomersController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomersModule {}
