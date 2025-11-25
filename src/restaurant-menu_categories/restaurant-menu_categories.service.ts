import { Injectable } from '@nestjs/common';
import { CreateRestaurantMenuCategoryDto } from './dto/create-restaurant-menu_category.dto';
import { UpdateRestaurantMenuCategoryDto } from './dto/update-restaurant-menu_category.dto';

@Injectable()
export class RestaurantMenuCategoriesService {
  create(createRestaurantMenuCategoryDto: CreateRestaurantMenuCategoryDto) {
    return 'This action adds a new restaurantMenuCategory';
  }

  findAll() {
    return `This action returns all restaurantMenuCategories`;
  }

  findOne(id: number) {
    return `This action returns a #${id} restaurantMenuCategory`;
  }

  update(
    id: number,
    updateRestaurantMenuCategoryDto: UpdateRestaurantMenuCategoryDto,
  ) {
    return `This action updates a #${id} restaurantMenuCategory`;
  }

  remove(id: number) {
    return `This action removes a #${id} restaurantMenuCategory`;
  }
}
