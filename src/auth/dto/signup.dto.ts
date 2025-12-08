//src/auth/dto/signup.dto.ts
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class SignupDto {
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
    message:
      'Please provide a valid phone number (e.g., +254700000000 or 0700000000)',
  })
  phone: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid role selected' })
  role?: UserRole = UserRole.Customer;
}
