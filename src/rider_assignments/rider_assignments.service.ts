import { Injectable } from '@nestjs/common';
import { CreateRiderAssignmentDto } from './dto/create-rider_assignment.dto';
import { UpdateRiderAssignmentDto } from './dto/update-rider_assignment.dto';

@Injectable()
export class RiderAssignmentsService {
  create(createRiderAssignmentDto: CreateRiderAssignmentDto) {
    return 'This action adds a new riderAssignment';
  }

  findAll() {
    return `This action returns all riderAssignments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} riderAssignment`;
  }

  update(id: number, updateRiderAssignmentDto: UpdateRiderAssignmentDto) {
    return `This action updates a #${id} riderAssignment`;
  }

  remove(id: number) {
    return `This action removes a #${id} riderAssignment`;
  }
}
