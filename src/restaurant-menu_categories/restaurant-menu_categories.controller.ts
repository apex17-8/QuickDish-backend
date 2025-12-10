import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RestaurantMenuCategoriesService } from './restaurant-menu_categories.service';
import { CreateRestaurantMenuCategoryDto } from './dto/create-restaurant-menu_category.dto';
import { UpdateRestaurantMenuCategoryDto } from './dto/update-restaurant-menu_category.dto';
import { AssignMenuItemDto } from './dto/assign-menu-item.dto';
@Controller('restaurant-menu-categories')
export class RestaurantMenuCategoriesController {
  constructor(
    private readonly restaurantMenuCategoriesService: RestaurantMenuCategoriesService,
  ) {}

  @Post()
  create(
    @Body() createRestaurantMenuCategoryDto: CreateRestaurantMenuCategoryDto,
  ) {
    return this.restaurantMenuCategoriesService.create(
      createRestaurantMenuCategoryDto,
    );
  }

  @Get()
  findAll() {
    return this.restaurantMenuCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantMenuCategoriesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRestaurantMenuCategoryDto: UpdateRestaurantMenuCategoryDto,
  ) {
    return this.restaurantMenuCategoriesService.update(
      +id,
      updateRestaurantMenuCategoryDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.restaurantMenuCategoriesService.remove(+id);
  }
  @Post(':id/assign-menu-item')
  assignMenuItem(
    @Param('id') categoryId: string,
    @Body() dto: AssignMenuItemDto,
  ) {
    return this.restaurantMenuCategoriesService.assignMenuItem(
      +categoryId,
      dto.menuItemId,
    );
  }
}
