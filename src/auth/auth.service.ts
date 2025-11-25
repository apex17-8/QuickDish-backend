import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateAuthDto } from './dto/signup.dto';
import { LoginDto } from './dto/signin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  /** Hash any string data (passwords, refresh tokens) */
  private async hashData(data: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(data, salt);
  }

  /** Save hashed refresh token in DB */
  private async saveRefreshToken(userId: number, refreshToken: string) {
    const hashedToken = await this.hashData(refreshToken);
    await this.userRepository.update(userId, {
      hashedRefreshedToken: hashedToken,
    });
  }

  /** Generate JWT access & refresh tokens */
  private generateTokens(userId: number, email: string, role: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId, email, role },
      {
        secret: this.configService.getOrThrow<string>(
          'JWT_ACCESS_TOKEN_SECRET',
        ),
        expiresIn: '2h',
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, email, role },
      {
        secret: this.configService.getOrThrow<string>(
          'JWT_REFRESH_TOKEN_SECRET',
        ),
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  // ------------------ SignUp ------------------
  async SignUp(createAuthDto: CreateAuthDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createAuthDto.email },
      select: ['user_id', 'email', 'password'],
    });

    if (existingUser) throw new Error('User already exists');

    const hashedPassword = await bcrypt.hash(createAuthDto.password, 10);

    const user = this.userRepository.create({
      ...createAuthDto,
      password: hashedPassword,
      hashedRefreshedToken: '',
    });

    const savedUser = await this.userRepository.save(user);

    const { accessToken, refreshToken } = this.generateTokens(
      savedUser.user_id,
      savedUser.email,
      savedUser.role,
    );

    await this.saveRefreshToken(savedUser.user_id, refreshToken);

    const updatedUser = await this.userRepository.findOne({
      where: { user_id: savedUser.user_id },
    });

    return { user: updatedUser, accessToken, refreshToken };
  }

  // ------------------ SignIn ------------------
  async SignIn(loginDto: LoginDto) {
    const foundUser = await this.userRepository.findOne({
      where: { email: loginDto.email },
      select: ['email', 'user_id', 'role', 'password'],
    });

    if (!foundUser)
      throw new NotFoundException('User with that email not found');

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      foundUser.password,
    );
    if (!isPasswordValid) throw new UnauthorizedException('Invalid password');

    const { accessToken, refreshToken } = this.generateTokens(
      foundUser.user_id,
      foundUser.email,
      foundUser.role,
    );

    await this.saveRefreshToken(foundUser.user_id, refreshToken);

    return { user: foundUser, accessToken, refreshToken };
  }

  // ------------------ SignOut ------------------
  async SignOut(userId: number) {
    const res = await this.userRepository.update(userId, {
      hashedRefreshedToken: null,
    });
    if (res.affected === 0)
      throw new NotFoundException(`User with id ${userId} not found`);
    return `User with id ${userId} signed out`;
  }

  // ------------------ Refresh Tokens ------------------
  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
      select: ['user_id', 'email', 'hashedRefreshedToken', 'role'],
    });

    if (!user || !user.hashedRefreshedToken)
      throw new UnauthorizedException('Access Denied');

    const isValid = await bcrypt.compare(refreshToken, user.hashedRefreshedToken);
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(
      user.user_id,
      user.email,
      user.role,
    );

    await this.saveRefreshToken(user.user_id, newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  }
}
