// src/menu_items/menu_items.controller.ts - ADD THIS METHOD
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { MenuItemsService } from './menu_items.service';
import { CreateMenuItemDto } from './dto/create-menu_item.dto';
import { UpdateMenuItemDto } from './dto/update-menu_item.dto';
import { MenuItem } from './entities/menu_item.entity';

@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Get()
  findAll(): Promise<MenuItem[]> {
    return this.menuItemsService.findAll();
  }

  @Get('popular')
  findPopular(): Promise<MenuItem[]> {
    console.log('📞 GET /api/menu-items/popular called');
    return this.menuItemsService.findPopular();
  }

  @Get(':id')
  findOne(@Param('id') id: number): Promise<MenuItem> {
    return this.menuItemsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMenuItemDto): Promise<MenuItem> {
    return this.menuItemsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() dto: UpdateMenuItemDto,
  ): Promise<MenuItem> {
    return this.menuItemsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number): Promise<void> {
    return this.menuItemsService.remove(id);
  }
}
