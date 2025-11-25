import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './../database/database.module';
import { User } from './../users/entities/user.entity';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccessStrategy } from './strategies/access.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    PassportModule, // for strategies
    JwtModule.register({ global: true }), // JWT for access & refresh tokens
    TypeOrmModule.forFeature([User]), // inject User repository
  ],
  providers: [
    AuthService,
    AccessStrategy, // validates access tokens
    RefreshStrategy, // validates refresh tokens
    RolesGuard, // protects routes based on role
  ],
  controllers: [AuthController],
  exports: [RolesGuard], // export guard so other modules can use RBAC
})
export class AuthModule {}
