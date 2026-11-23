import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { toLocale } from '../common/locale';
import type { User } from '../generated/prisma/client';
import { verifyEmail } from '../mail/templates';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

export const ACCESS_TTL_S = 15 * 60;
export const REFRESH_TTL_S = 30 * 24 * 3600;

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export const toPublicUser = (u: User) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  isOwner: u.isOwner,
  locale: u.locale,
  emailVerified: !!u.emailVerifiedAt,
});
export type PublicUser = ReturnType<typeof toPublicUser>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  private get rounds() {
    return Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
  }

  async register(dto: RegisterDto): Promise<Session> {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Email already registered');

    const invite = dto.inviteToken
      ? await this.prisma.adminInvite.findFirst({ where: { email, tokenHash: sha256(dto.inviteToken), expiresAt: { gt: new Date() } } })
      : null;

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        locale: toLocale(dto.locale),
        passwordHash: await bcrypt.hash(dto.password, this.rounds),
        ...(invite ? { role: 'ADMIN' as const, emailVerifiedAt: new Date() } : {}),
      },
    });
    if (invite) {
      await this.prisma.adminInvite.delete({ where: { id: invite.id } });
      return this.issueSession(user);
    }

    const token = await this.jwt.signAsync(
      { sub: user.id, typ: 'verify' },
      { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: '2d' },
    );
    const link = `${this.config.getOrThrow('WEB_URL')}/${user.locale}/verify?token=${token}`;
    void this.mail.send({ to: email, ...verifyEmail(toLocale(user.locale), link) });

    return this.issueSession(user);
  }

  async login(dto: LoginDto): Promise<Session> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !ok) throw new UnauthorizedException('Invalid email or password');
    return this.issueSession(user);
  }

  async refresh(rawToken: string | undefined): Promise<Session> {
    if (!rawToken) throw new UnauthorizedException('No refresh token');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (stored.expiresAt < new Date()) throw new UnauthorizedException('Refresh token expired');

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueSession(stored.user);
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return toPublicUser(user);
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      const p = await this.jwt.verifyAsync<{ sub: string; typ: string }>(token, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
      if (p.typ !== 'verify') throw new Error('wrong token type');
      await this.prisma.user.update({ where: { id: p.sub }, data: { emailVerifiedAt: new Date() } });
    } catch {
      throw new UnauthorizedException('Invalid or expired verification link');
    }
  }

  private async issueSession(user: User): Promise<Session> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role, typ: 'access' },
      { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: ACCESS_TTL_S },
    );
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_S * 1000),
      },
    });
    return { accessToken, refreshToken, user: toPublicUser(user) };
  }
}
