import { PartialType } from '@nestjs/mapped-types';
import { CreateRiderAssignmentDto } from './create-rider_assignment.dto';

export class UpdateRiderAssignmentDto extends PartialType(CreateRiderAssignmentDto) {}
