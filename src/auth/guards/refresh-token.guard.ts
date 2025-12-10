import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protects refresh token routes.
 * Uses RefreshStrategy to validate JWT.
 */
@Injectable()
export class RtGuard extends AuthGuard('refresh') {
  getRequest(context: ExecutionContext) {
    return super.getRequest(context) as Request; // extract request for passport
  }
}
