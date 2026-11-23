import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { JwtAuthGuard, RolesGuard } from './common/auth';
import { validateEnv } from './config/env';
import { HealthController } from './health/health.controller';
import { MailModule } from './mail/mail.service';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.service';
import { ReviewsModule } from './reviews/reviews.module';
import { TicketsModule } from './tickets/tickets.module';
import { TripsModule } from './trips/trips.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60_000, limit: 120 }],
        skipIf: () => config.get('THROTTLE_DISABLED') === 'true',
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    TicketsModule,
    PaymentsModule,
    AuthModule,
    ReviewsModule,
    TripsModule,
    BookingsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
