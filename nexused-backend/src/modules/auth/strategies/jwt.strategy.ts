import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * WHY: Extract JWT from httpOnly cookie first, fall back to Authorization header.
 * PATTERN: Cookie-based auth is more secure than localStorage for XSS protection.
 * The fallback to Bearer token allows gradual migration and API testing tools.
 */
function extractJwtFromCookieOrHeader(req: Request): string | null {
  // Try cookie first (more secure)
  const cookies = req.cookies as Record<string, string> | undefined;
  if (cookies?.access_token) {
    return cookies.access_token;
  }
  // Fall back to Authorization header for backward compatibility
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.jwtSecret'),
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<{ id: string; email: string; tenantId: string; roles: string[] }> {
    // Verify user exists AND belongs to the tenant claimed in the JWT
    // This prevents token reuse if a user is moved between tenants
    const user = await this.usersService.findById(
      payload.sub,
      payload.tenantId,
    );

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles as string[],
    };
  }
}
