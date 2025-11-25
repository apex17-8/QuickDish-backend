import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RiderAssignmentsService } from './rider_assignments.service';
import { CreateRiderAssignmentDto } from './dto/create-rider_assignment.dto';
import { UpdateRiderAssignmentDto } from './dto/update-rider_assignment.dto';

@Controller('rider-assignments')
export class RiderAssignmentsController {
  constructor(private readonly riderAssignmentsService: RiderAssignmentsService) {}

  @Post()
  create(@Body() createRiderAssignmentDto: CreateRiderAssignmentDto) {
    return this.riderAssignmentsService.create(createRiderAssignmentDto);
  }

  @Get()
  findAll() {
    return this.riderAssignmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.riderAssignmentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRiderAssignmentDto: UpdateRiderAssignmentDto) {
    return this.riderAssignmentsService.update(+id, updateRiderAssignmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.riderAssignmentsService.remove(+id);
  }
}
