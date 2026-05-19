import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import * as express from 'express';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /** Returns the stable webcal subscription URL for the authenticated user. */
  @Get('token')
  @UseGuards(JwtAuthGuard)
  getToken(@CurrentUser() user: User): { token: string; url: string } {
    const token = this.calendarService.generateToken(user.id);
    const url = `webcal://${process.env.BACKEND_HOST ?? 'localhost:3001'}/api/calendar/feed?token=${token}`;
    return { token, url };
  }

  /** Public endpoint — fetches the .ics feed using the HMAC token. */
  @Get('feed')
  async getFeed(
    @Query('token') token: string,
    @Res() res: express.Response,
  ): Promise<void> {
    if (!token) throw new UnauthorizedException('Missing token');

    const user = await this.calendarService.resolveUserFromToken(token);
    if (!user) throw new UnauthorizedException('Invalid token');

    const ics = await this.calendarService.generateIcal(user.id, user.tenantId);

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="axis-schedule.ics"',
      'Cache-Control': 'no-cache',
    });
    res.send(ics);
  }
}
