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
import { Throttle } from '@nestjs/throttler';
import * as express from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  AuthResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { LocalAuthGuard } from '../../guards/local-auth.guard';
import { User } from '../../database/entities/user.entity';

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

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(registerDto);
    this.setCookie(res, result.accessToken);
    return result;
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(
    @Request() req: express.Request & { user: User },
    @Res({ passthrough: true }) res: express.Response,
  ): AuthResponseDto {
    const result = this.authService.login(req.user);
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

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() body: ForgotPasswordDto,
  ): Promise<{ message: string; resetUrl?: string }> {
    const result = await this.authService.forgotPassword(
      body.email,
      body.tenantId,
    );
    // In dev, return the URL so testers can use it directly.
    // In production, send an email and never return the URL.
    const isDev =
      this.configService.get<string>('app.nodeEnv') !== 'production';
    return {
      message:
        'If an account with that email exists, a reset link has been sent.',
      ...(isDev && result.resetUrl ? { resetUrl: result.resetUrl } : {}),
    };
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(body.token, body.password);
    return { message: 'Password reset successfully. You can now sign in.' };
  }
}
