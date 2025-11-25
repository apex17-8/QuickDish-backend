import { Module } from '@nestjs/common';
import { RiderAssignmentsService } from './rider_assignments.service';
import { RiderAssignmentsController } from './rider_assignments.controller';

@Module({
  controllers: [RiderAssignmentsController],
  providers: [RiderAssignmentsService],
})
export class RiderAssignmentsModule {}
