import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { RiderService } from './riders.service';
import { UpdateRiderDto } from './dto/update-rider.dto';
import { Rider } from './entities/rider.entity';

@Controller('riders')
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  @Get()
  findAll(): Promise<Rider[]> {
    return this.riderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number): Promise<Rider> {
    return this.riderService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdateRiderDto): Promise<Rider> {
    return this.riderService.update(id, dto);
  }

  @Patch(':id/go-online')
  goOnline(@Param('id') id: number): Promise<Rider> {
    return this.riderService.goOnline(id);
  }

  @Patch(':id/go-offline')
  goOffline(@Param('id') id: number): Promise<Rider> {
    return this.riderService.goOffline(id);
  }

  @Patch(':id/update-location')
  updateLocation(
    @Param('id') id: number,
    @Body() body: { latitude: number; longitude: number },
  ): Promise<Rider> {
    return this.riderService.updateLocation(id, body.latitude, body.longitude);
  }
}
