//src/users/dto/create-user.dto.ts
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+?[\d\s\-()]{10,}$/, {
    message: 'Please provide a valid phone number',
  })
  phone: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.Customer;

  @IsOptional()
  @IsString()
  profile_picture?: string;
}
