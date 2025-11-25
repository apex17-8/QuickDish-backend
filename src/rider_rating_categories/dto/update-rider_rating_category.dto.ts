import { PartialType } from '@nestjs/mapped-types';
import { CreateRiderRatingCategoryDto } from './create-rider_rating_category.dto';

export class UpdateRiderRatingCategoryDto extends PartialType(CreateRiderRatingCategoryDto) {}
