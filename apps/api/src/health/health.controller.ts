import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../common/auth';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
    return { status: 'ok', db: 'up', version: process.env.APP_VERSION ?? 'dev', uptime: Math.round(process.uptime()) };
  }
}
