import { Controller, HttpCode, NotFoundException, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { Public } from '../common/auth';
import { BookingsService } from '../bookings/bookings.service';
import { TripsService } from '../trips/trips.service';

@Public()
@SkipThrottle()
@Controller('internal')
export class JobsController {
  constructor(
    private readonly config: ConfigService,
    private readonly bookings: BookingsService,
    private readonly trips: TripsService,
  ) {}

  @Post('tick')
  @HttpCode(200)
  async tick(@Req() req: Request, @Query('full') full?: string) {
    const secret = this.config.get<string>('INTERNAL_CRON_SECRET');
    if (!secret) throw new NotFoundException();
    const given = Buffer.from(String(req.headers['x-cron-secret'] ?? ''));
    const expected = Buffer.from(secret);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new UnauthorizedException();

    const released = await this.bookings.releaseExpired();
    const generated = full === '1' ? await this.trips.topUp() : undefined;
    return { released, generated };
  }
}
