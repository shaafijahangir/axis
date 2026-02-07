import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import * as express from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto, AuthResponseDto } from './dto/auth.dto';
import { LocalAuthGuard } from '../../guards/local-auth.guard';

/**
 * PATTERN: Cookie configuration for secure JWT storage.
 * WHY: httpOnly prevents XSS, Secure ensures HTTPS-only, SameSite prevents CSRF.
 */
const COOKIE_NAME = 'access_token';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private setCookie(res: express.Response, token: string): void {
    const isProduction = this.configService.get('app.nodeEnv') === 'production';

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/',
    });
  }

  private clearCookie(res: express.Response): void {
    res.clearCookie(COOKIE_NAME, { path: '/' });
  }

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(registerDto);
    this.setCookie(res, result.accessToken);
    return result;
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Request() req,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(req.user);
    this.setCookie(res, result.accessToken);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: express.Response): {
    success: boolean;
  } {
    this.clearCookie(res);
    return { success: true };
  }
}
