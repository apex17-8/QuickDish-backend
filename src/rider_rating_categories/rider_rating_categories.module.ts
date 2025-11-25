import { Module } from '@nestjs/common';
import { RiderRatingCategoriesService } from './rider_rating_categories.service';
import { RiderRatingCategoriesController } from './rider_rating_categories.controller';

@Module({
  controllers: [RiderRatingCategoriesController],
  providers: [RiderRatingCategoriesService],
})
export class RiderRatingCategoriesModule {}
