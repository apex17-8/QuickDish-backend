import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Protects routes using access JWTs.
 * Skips routes decorated with @Public()
 */
@Injectable()
export class AtGuard extends AuthGuard('access') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getClass(),
      context.getHandler(),
    ]);
    if (isPublic) return true; // allow access without authentication
    return super.canActivate(context); // validate access token
  }

  getRequest(context: ExecutionContext): Request {
    return super.getRequest(context) as Request; // extract request for passport
  }
}
