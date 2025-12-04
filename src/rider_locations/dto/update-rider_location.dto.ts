import { PartialType } from '@nestjs/mapped-types';
import { CreateRiderLocationDto } from './create-rider_location.dto';

export class UpdateRiderLocationDto extends PartialType(
  CreateRiderLocationDto,
) {}
