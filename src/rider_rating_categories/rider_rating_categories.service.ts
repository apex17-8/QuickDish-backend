import { Injectable } from '@nestjs/common';
import { CreateRiderRatingCategoryDto } from './dto/create-rider_rating_category.dto';
import { UpdateRiderRatingCategoryDto } from './dto/update-rider_rating_category.dto';

@Injectable()
export class RiderRatingCategoriesService {
  create(createRiderRatingCategoryDto: CreateRiderRatingCategoryDto) {
    return 'This action adds a new riderRatingCategory';
  }

  findAll() {
    return `This action returns all riderRatingCategories`;
  }

  findOne(id: number) {
    return `This action returns a #${id} riderRatingCategory`;
  }

  update(id: number, updateRiderRatingCategoryDto: UpdateRiderRatingCategoryDto) {
    return `This action updates a #${id} riderRatingCategory`;
  }

  remove(id: number) {
    return `This action removes a #${id} riderRatingCategory`;
  }
}
