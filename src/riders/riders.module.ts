import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rider } from './entities/rider.entity';
import { RiderService } from './riders.service';
import { RiderController } from './riders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Rider])],
  providers: [RiderService],
  controllers: [RiderController],
  exports: [RiderService],
})
export class RidersModule {}
