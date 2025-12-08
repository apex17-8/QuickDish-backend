// backend/src/auth/auth.service.ts
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateAuthDto } from './dto/signup.dto';
import { LoginDto } from './dto/signin.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  /** Hash any string data (passwords, refresh tokens) */
  private async hashData(data: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(10);
      return await bcrypt.hash(data, salt);
    } catch (error) {
      this.logger.error(`Failed to hash data: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to process credentials');
    }
  }

  /** Verify hashed data */
  private async verifyHash(data: string, hashedData: string): Promise<boolean> {
    try {
      return await bcrypt.compare(data, hashedData);
    } catch (error) {
      this.logger.error(`Failed to verify hash: ${error.message}`, error.stack);
      return false;
    }
  }

  /** Save hashed refresh token in DB */
  private async saveRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    try {
      const hashedToken = await this.hashData(refreshToken);
      await this.userRepository.update(userId, {
        hashedRefreshedToken: hashedToken,
      });
      this.logger.debug(`Refresh token saved for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to save refresh token: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to save session');
    }
  }

  /** Generate JWT access & refresh tokens */
  private generateTokens(userId: number, email: string, role: string) {
    try {
      const accessToken = this.jwtService.sign(
        { sub: userId, email, role },
        {
          secret: this.configService.getOrThrow<string>(
            'JWT_ACCESS_TOKEN_SECRET',
          ),
          expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRY') || '2h',
        },
      );

      const refreshToken = this.jwtService.sign(
        { sub: userId, email, role },
        {
          secret: this.configService.getOrThrow<string>(
            'JWT_REFRESH_TOKEN_SECRET',
          ),
          expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRY') || '7d',
        },
      );

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(
        `Failed to generate tokens: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to generate authentication tokens',
      );
    }
  }

  /** Validate and clean phone number */
  private validatePhone(phone: string): string {
    if (!phone || phone.trim() === '') {
      throw new BadRequestException('Phone number is required');
    }

    // Remove all non-digit characters except leading +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // Check if it's a valid phone number
    if (cleaned.length < 10) {
      throw new BadRequestException('Phone number must be at least 10 digits');
    }

    // Ensure it starts with country code if not already
    if (!cleaned.startsWith('+')) {
      // Default to Kenya country code if not specified
      if (cleaned.startsWith('0')) {
        return '+254' + cleaned.substring(1);
      }
      return '+254' + cleaned;
    }

    return cleaned;
  }

  // ------------------ SignUp ------------------
  async SignUp(createAuthDto: CreateAuthDto) {
    this.logger.log(`Signup attempt for email: ${createAuthDto.email}`);

    try {
      // Log incoming data for debugging
      this.logger.debug(
        `📥 Signup DTO received: ${JSON.stringify(createAuthDto)}`,
      );

      // Validate and clean phone number
      const validatedPhone = this.validatePhone(createAuthDto.phone);
      this.logger.debug(`📱 Validated phone: ${validatedPhone}`);

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: createAuthDto.email },
      });

      if (existingUser) {
        this.logger.warn(
          `Signup failed: User already exists with email ${createAuthDto.email}`,
        );
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createAuthDto.password, 10);

      // Prepare user data
      const userData = {
        name: createAuthDto.name.trim(),
        email: createAuthDto.email.toLowerCase().trim(),
        password: hashedPassword,
        phone: validatedPhone,
        role: createAuthDto.role || UserRole.Customer,
        is_active: true,
        hashedRefreshedToken: '', // Will be set after token generation
      };

      this.logger.debug(
        `🔧 Creating user with data: ${JSON.stringify({
          ...userData,
          password: '[HASHED]',
        })}`,
      );

      // Create and save user
      const user = this.userRepository.create(userData);
      const savedUser = await this.userRepository.save(user);

      this.logger.log(`✅ User created with ID: ${savedUser.user_id}`);

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(
        savedUser.user_id,
        savedUser.email,
        savedUser.role,
      );

      // Save refresh token
      await this.saveRefreshToken(savedUser.user_id, refreshToken);

      // Get updated user with refresh token
      const updatedUser = await this.userRepository.findOne({
        where: { user_id: savedUser.user_id },
      });

      if (!updatedUser) {
        throw new InternalServerErrorException(
          'Failed to retrieve created user',
        );
      }

      // Remove sensitive data from response
      const { password, hashedRefreshedToken, ...userResponse } = updatedUser;

      this.logger.log(`🎉 Signup successful for user ID: ${savedUser.user_id}`);

      return {
        success: true,
        message: 'Account created successfully',
        user: userResponse,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error(`❌ Signup failed: ${error.message}`, error.stack);

      // Re-throw known exceptions
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Handle database errors
      if (
        error.message &&
        error.message.includes('Cannot insert the value NULL')
      ) {
        throw new BadRequestException(
          'Missing required fields. Please check your input data.',
        );
      }

      if (error.message && error.message.includes('violation of UNIQUE KEY')) {
        throw new ConflictException('Email already registered');
      }

      // Generic error for unexpected cases
      throw new InternalServerErrorException(
        'Failed to create account. Please try again.',
      );
    }
  }

  // ------------------ SignIn ------------------
  async SignIn(loginDto: LoginDto) {
    this.logger.log(`Signin attempt for email: ${loginDto.email}`);

    try {
      // Find user
      const foundUser = await this.userRepository.findOne({
        where: { email: loginDto.email },
      });

      if (!foundUser) {
        this.logger.warn(
          `Signin failed: User not found with email ${loginDto.email}`,
        );
        throw new NotFoundException('Invalid email or password');
      }

      // Check if account is active
      if (!foundUser.is_active) {
        this.logger.warn(
          `Signin failed: Account deactivated for user ${foundUser.user_id}`,
        );
        throw new UnauthorizedException(
          'Account is deactivated. Please contact support.',
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        foundUser.password,
      );

      if (!isPasswordValid) {
        this.logger.warn(
          `Signin failed: Invalid password for user ${foundUser.user_id}`,
        );
        throw new UnauthorizedException('Invalid email or password');
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(
        foundUser.user_id,
        foundUser.email,
        foundUser.role,
      );

      // Save refresh token and update last login
      await Promise.all([
        this.saveRefreshToken(foundUser.user_id, refreshToken),
        this.userRepository.update(foundUser.user_id, {
          last_login_at: new Date(),
        }),
      ]);

      // Remove sensitive data from response
      const { password, hashedRefreshedToken, ...userResponse } = foundUser;

      this.logger.log(`✅ Signin successful for user ID: ${foundUser.user_id}`);

      return {
        success: true,
        message: 'Login successful',
        user: userResponse,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error(`❌ Signin failed: ${error.message}`, error.stack);

      // Re-throw known exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Generic error for unexpected cases
      throw new InternalServerErrorException(
        'Failed to authenticate. Please try again.',
      );
    }
  }

  // ------------------ SignOut ------------------
  async SignOut(userId: number) {
    this.logger.log(`Signout request for user ID: ${userId}`);

    try {
      const result = await this.userRepository.update(userId, {
        hashedRefreshedToken: null,
      });

      if (result.affected === 0) {
        this.logger.warn(`Signout failed: User ${userId} not found`);
        throw new NotFoundException(`User not found`);
      }

      this.logger.log(`✅ Signout successful for user ID: ${userId}`);
      return {
        success: true,
        message: 'Signed out successfully',
      };
    } catch (error) {
      this.logger.error(`❌ Signout failed: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to sign out');
    }
  }

  // ------------------ Refresh Tokens ------------------
  async refreshTokens(userId: number, refreshToken: string) {
    this.logger.log(`Token refresh request for user ID: ${userId}`);

    try {
      // Find user with refresh token
      const user = await this.userRepository.findOne({
        where: { user_id: userId },
      });

      if (!user || !user.hashedRefreshedToken) {
        this.logger.warn(
          `Token refresh failed: No valid session for user ${userId}`,
        );
        throw new UnauthorizedException(
          'Session expired. Please sign in again.',
        );
      }

      // Verify refresh token
      const isValid = await this.verifyHash(
        refreshToken,
        user.hashedRefreshedToken,
      );
      if (!isValid) {
        this.logger.warn(
          `Token refresh failed: Invalid refresh token for user ${userId}`,
        );
        throw new UnauthorizedException(
          'Invalid session. Please sign in again.',
        );
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } =
        this.generateTokens(user.user_id, user.email, user.role);

      // Save new refresh token
      await this.saveRefreshToken(user.user_id, newRefreshToken);

      this.logger.log(`✅ Token refresh successful for user ID: ${userId}`);

      return {
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      this.logger.error(
        `❌ Token refresh failed: ${error.message}`,
        error.stack,
      );

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to refresh tokens');
    }
  }

  // ------------------ Get User Profile ------------------
  async getProfile(userId: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { user_id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Remove sensitive data
      const { password, hashedRefreshedToken, ...profile } = user;

      return {
        success: true,
        user: profile,
      };
    } catch (error) {
      this.logger.error(`Failed to get profile: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to retrieve profile');
    }
  }

  // ------------------ Validate Phone (Public Method) ------------------
  async validatePhoneNumber(
    phone: string,
  ): Promise<{ isValid: boolean; formatted: string }> {
    try {
      const formatted = this.validatePhone(phone);
      return {
        isValid: true,
        formatted,
      };
    } catch (error) {
      return {
        isValid: false,
        formatted: phone,
      };
    }
  }
}
