import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsUUID } from 'class-validator';
import type { Request } from 'express';
import { AuthUser, CurrentUser, Public } from '../common/auth';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

class MockConfirmDto {
  @IsUUID() bookingId: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Post('bookings/:id/checkout')
  @HttpCode(200)
  checkout(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.payments.createCheckout(id, user.id);
  }

  @Post('mock/confirm')
  @HttpCode(200)
  async mockConfirm(@Body() dto: MockConfirmDto, @CurrentUser() user: AuthUser) {
    if (this.payments.provider.name !== 'mock') throw new NotFoundException();
    const b = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
    if (!b || b.userId !== user.id) throw new NotFoundException('Booking not found');
    return { result: await this.payments.markPaid(b.id, `mock_${b.code}`) };
  }

  @Public()
  @Post('stripe/webhook')
  @HttpCode(200)
  async stripeWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['stripe-signature'];
    if (!req.rawBody || typeof signature !== 'string') throw new BadRequestException('Missing signature');

    let event;
    try {
      event = this.payments.stripe.client.webhooks.constructEvent(
        req.rawBody,
        signature,
        this.config.getOrThrow('STRIPE_WEBHOOK_SECRET'),
      );
    } catch {
      throw new BadRequestException('Invalid signature');
    }

    if (!(await this.payments.claimEvent(event.id, 'stripe'))) return { received: true, duplicate: true };

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const bookingId = session.metadata?.bookingId;
      const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.id;
      if (bookingId && session.payment_status === 'paid') await this.payments.markPaid(bookingId, intent);
    }
    return { received: true };
  }
}
