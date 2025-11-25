import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JWTPayload = {
  sub: number; // user id
  email: string;
  role: string; // user role for RBAC
};

@Injectable()
export class AccessStrategy extends PassportStrategy(Strategy, 'access') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // extracts token from Bearer header
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
      ignoreExpiration: false, // ensures expired tokens are rejected
    });
  }

  /**
   * validate() is called after the token is verified.
   * The returned object is attached to req.user
   */
  async validate(payload: JWTPayload) {
    return {
      user_id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
