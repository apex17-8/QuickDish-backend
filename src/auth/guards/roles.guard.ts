import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { ROLES_KEY } from '../decorators/role.decorator';

/**
 * Enforces Role-Based Access Control (RBAC)
 * Checks if the authenticated user has required roles
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getClass(), context.getHandler()],
    );

    if (!requiredRoles) return true; // allow access if no roles are required

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false; // deny if no user attached

    const verifiedUser = await this.userRepository.findOne({
      where: { user_id: user.user_id },
      select: ['user_id', 'email', 'role'],
    });
    if (!verifiedUser) return false;

    return requiredRoles.some((role) => verifiedUser.role === role);
  }
}
