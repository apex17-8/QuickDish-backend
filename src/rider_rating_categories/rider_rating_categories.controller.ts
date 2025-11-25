import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RiderRatingCategoriesService } from './rider_rating_categories.service';
import { CreateRiderRatingCategoryDto } from './dto/create-rider_rating_category.dto';
import { UpdateRiderRatingCategoryDto } from './dto/update-rider_rating_category.dto';

@Controller('rider-rating-categories')
export class RiderRatingCategoriesController {
  constructor(private readonly riderRatingCategoriesService: RiderRatingCategoriesService) {}

  @Post()
  create(@Body() createRiderRatingCategoryDto: CreateRiderRatingCategoryDto) {
    return this.riderRatingCategoriesService.create(createRiderRatingCategoryDto);
  }

  @Get()
  findAll() {
    return this.riderRatingCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.riderRatingCategoriesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRiderRatingCategoryDto: UpdateRiderRatingCategoryDto) {
    return this.riderRatingCategoriesService.update(+id, updateRiderRatingCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.riderRatingCategoriesService.remove(+id);
  }
}
