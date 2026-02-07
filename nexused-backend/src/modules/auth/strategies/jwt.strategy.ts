import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.jwtSecret'),
    });
  }

  async validate(payload: JwtPayload) {
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
      roles: user.roles,
    };
  }
}
