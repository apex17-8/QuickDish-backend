import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AtGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
@UseGuards(AtGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(UserRole.SuperAdmin)
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.userService.create(createUserDto);
      return { success: true, data: user };
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      return { success: false, error };
    }
  }

  @Roles(UserRole.SuperAdmin)
  @Get()
  async findAll() {
    try {
      const users = await this.userService.findAll();
      return { success: true, data: users };
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      return { success: false, error };
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const user = await this.userService.findOne(id);
      return { success: true, data: user };
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      return { success: false, error };
    }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    try {
      const user = await this.userService.update(id, updateUserDto);
      return { success: true, data: user };
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      return { success: false, error };
    }
  }

  @Roles(UserRole.SuperAdmin)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.userService.remove(id);
      return { success: true };
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      return { success: false, error };
    }
  }
}
