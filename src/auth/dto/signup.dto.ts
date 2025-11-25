import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from 'src/users/entities/user.entity';

export class CreateAuthDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({ example: 'admin' })
  @IsNotEmpty()
  @IsString()
  role: UserRole;

  @ApiProperty({ example: 'Tiffany Nyawira' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phone_number?: string;
}
