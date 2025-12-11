import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type ServiceResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<ServiceResponse<User>> {
    try {
      const user = this.userRepository.create(createUserDto);
      const savedUser = await this.userRepository.save(user);
      return { success: true, data: savedUser };
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err.message : 'Failed to create user';
      return { success: false, error };
    }
  }

  async findAll(): Promise<ServiceResponse<User[]>> {
    try {
      const users = await this.userRepository.find();
      return { success: true, data: users };
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err.message : 'Failed to fetch users';
      return { success: false, error };
    }
  }

  async findOne(id: number): Promise<ServiceResponse<User>> {
    try {
      const user = await this.userRepository.findOne({
        where: { user_id: id },
      });
      if (!user) throw new NotFoundException(`User ${id} not found`);
      return { success: true, data: user };
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err.message : `Failed to fetch user ${id}`;
      return { success: false, error };
    }
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<ServiceResponse<User>> {
    try {
      await this.userRepository.update(id, updateUserDto);
      const updatedUser = await this.userRepository.findOne({
        where: { user_id: id },
      });
      if (!updatedUser) throw new NotFoundException(`User ${id} not found`);
      return { success: true, data: updatedUser };
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err.message : `Failed to update user ${id}`;
      return { success: false, error };
    }
  }

  async remove(id: number): Promise<ServiceResponse<null>> {
    try {
      const user = await this.userRepository.findOne({
        where: { user_id: id },
      });
      if (!user) throw new NotFoundException(`User ${id} not found`);
      await this.userRepository.remove(user);
      return { success: true, data: null };
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err.message : `Failed to delete user ${id}`;
      return { success: false, error };
    }
  }
}
