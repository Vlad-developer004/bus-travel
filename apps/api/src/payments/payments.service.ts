import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { pickName, toLocale } from '../common/locale';
import { Prisma } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { ticketEmail } from '../mail/templates';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { PaymentProvider } from './payment-provider';
import { MockProvider, StripeProvider } from './providers';

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);
  readonly provider: PaymentProvider;
  private readonly webUrl: string;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly tickets: TicketsService,
  ) {
    this.webUrl = config.getOrThrow<string>('WEB_URL');
    this.provider =
      config.get('PAYMENT_PROVIDER') === 'stripe'
        ? new StripeProvider(config.getOrThrow('STRIPE_SECRET_KEY'))
        : new MockProvider(this.webUrl);
  }

  get stripe(): StripeProvider {
    if (!(this.provider instanceof StripeProvider)) throw new NotFoundException();
    return this.provider;
  }

  async createCheckout(bookingId: string, userId: string) {
    const b = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { trip: { include: { route: { include: { from: true, to: true } } } } },
    });
    if (!b || b.userId !== userId) throw new NotFoundException('Booking not found');
    if (b.status !== 'PENDING' || b.expiresAt <= new Date()) {
      throw new ForbiddenException('Booking can no longer be paid: it was paid, cancelled or expired');
    }

    const loc = toLocale(b.locale);
    const { url, ref } = await this.provider.createCheckout({
      bookingId: b.id,
      code: b.code,
      totalCents: b.totalCents,
      currency: b.currency,
      description: `${pickName(b.trip.route.from.names, loc)} → ${pickName(b.trip.route.to.names, loc)}`,
      locale: loc,
      expiresAt: b.expiresAt,
      successUrl: `${this.webUrl}/${loc}/account/bookings/${b.id}?paid=1`,
      cancelUrl: `${this.webUrl}/${loc}/account/bookings/${b.id}`,
    });
    if (ref) await this.prisma.booking.update({ where: { id: b.id }, data: { paymentProvider: this.provider.name, paymentRef: ref } });
    return { url };
  }

  async markPaid(bookingId: string, paymentRef: string): Promise<'paid' | 'already' | 'refunded'> {
    const res = await this.prisma.booking.updateMany({
      where: { id: bookingId, status: 'PENDING' },
      data: { status: 'PAID', paidAt: new Date(), paymentProvider: this.provider.name, paymentRef },
    });

    if (res.count === 0) {
      const b = await this.prisma.booking.findUnique({ where: { id: bookingId } });
      if (b?.status === 'PAID') return 'already';
      this.log.warn(`Payment for booking ${bookingId} (${b?.status ?? 'missing'}) arrived too late: refunding`);
      await this.provider.refund(paymentRef);
      return 'refunded';
    }

    await this.sendTicket(bookingId);
    return 'paid';
  }

  async refund(booking: { paymentRef: string | null }) {
    await this.provider.refund(booking.paymentRef);
  }

  async claimEvent(id: string, provider: string): Promise<boolean> {
    try {
      await this.prisma.paymentEvent.create({ data: { id, provider } });
      return true;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false;
      throw e;
    }
  }

  async sendTicket(bookingId: string) {
    const b = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { seats: true, user: true, trip: { include: { route: { include: { from: true, to: true } } } } },
    });
    if (!b) return;
    const loc = toLocale(b.locale);
    const png = await this.tickets.qrPng(b.code);
    const msg = ticketEmail(loc, {
      name: b.user.name ?? b.seats[0]?.passengerName ?? b.contactEmail,
      code: b.code,
      from: pickName(b.trip.route.from.names, loc),
      to: pickName(b.trip.route.to.names, loc),
      departureAt: b.trip.departureAt,
      arrivalAt: b.trip.arrivalAt,
      seats: b.seats.map((s) => s.seatNumber).sort((a, c) => a - c),
      totalCents: b.totalCents,
      currency: b.currency,
      url: `${this.webUrl}/${loc}/account/bookings/${b.id}`,
    });
    await this.mail.send({
      to: b.contactEmail,
      ...msg,
      attachments: [{ filename: `ticket-${b.code}.png`, content: png, cid: 'ticket-qr' }],
    });
  }
}
