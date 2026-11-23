import { Body, Controller, Get, HttpCode, Post, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ACCESS_COOKIE, AuthUser, CurrentUser, Public, REFRESH_COOKIE } from '../common/auth';
import { LoginDto, RegisterDto } from './auth.dto';
import { ACCESS_TTL_S, AuthService, REFRESH_TTL_S, Session } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setCookies(res: Response, s: Session) {
    const secure = this.config.get('COOKIE_SECURE') === 'true';
    const base = { httpOnly: true, sameSite: 'lax' as const, secure };
    res.cookie(ACCESS_COOKIE, s.accessToken, { ...base, path: '/', maxAge: ACCESS_TTL_S * 1000 });
    res.cookie(REFRESH_COOKIE, s.refreshToken, { ...base, path: '/api/auth', maxAge: REFRESH_TTL_S * 1000 });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const s = await this.auth.register(dto);
    this.setCookies(res, s);
    return { user: s.user };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const s = await this.auth.login(dto);
    this.setCookies(res, s);
    return { user: s.user };
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const s = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]);
    this.setCookies(res, s);
    return { user: s.user };
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Public()
  @Get('verify')
  async verify(@Query('token') token: string) {
    await this.auth.verifyEmail(token ?? '');
    return { verified: true };
  }
}
