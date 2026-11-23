import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomInt } from 'crypto';
import { AuthUser } from '../common/auth';
import { toLocale } from '../common/locale';
import { Prisma } from '../generated/prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateBookingDto } from './bookings.dto';

export const HOLD_MS = 30 * 60 * 1000;
export const CANCEL_CUTOFF_MS = 2 * 3600 * 1000;
export const LARGE_BAG_FEE_CENTS = 500;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => 'BT-' + Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

const bookingInclude = {
  seats: { orderBy: { seatNumber: 'asc' } },
  trip: { include: { route: { include: { from: true, to: true } } } },
  review: true,
} satisfies Prisma.BookingInclude;
type BookingFull = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

@Injectable()
export class BookingsService {
  private readonly log = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly tickets: TicketsService,
  ) {}

  async create(user: AuthUser, dto: CreateBookingDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id: dto.tripId }, include: { bus: true } });
    if (!trip || trip.status !== 'SCHEDULED') throw new NotFoundException('Trip not found');
    if (trip.departureAt.getTime() <= Date.now()) throw new BadRequestException('This trip has already departed');

    const seatNumbers = dto.passengers.map((p) => p.seatNumber);
    if (new Set(seatNumbers).size !== seatNumbers.length) throw new BadRequestException('Duplicate seat numbers');
    if (seatNumbers.some((n) => n > trip.bus.seatCount)) throw new BadRequestException('Seat does not exist on this bus');

    const account = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const largeBags = dto.passengers.reduce((sum, p) => sum + (p.largeBags ?? 0), 0);
    const totalCents = trip.priceCents * dto.passengers.length + largeBags * LARGE_BAG_FEE_CENTS;

    await this.releaseExpired(trip.id);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const booking = await this.prisma.booking.create({
          data: {
            code: makeCode(),
            userId: user.id,
            tripId: trip.id,
            contactEmail: (dto.contactEmail ?? account.email).toLowerCase(),
            contactPhone: dto.contactPhone,
            locale: toLocale(dto.locale ?? account.locale),
            totalCents,
            currency: trip.currency,
            expiresAt: new Date(Date.now() + HOLD_MS),
            seats: {
              create: dto.passengers.map((p) => ({
                tripId: trip.id,
                seatNumber: p.seatNumber,
                passengerName: p.name.trim(),
                smallBags: p.smallBags ?? 1,
                largeBags: p.largeBags ?? 0,
              })),
            },
          },
          include: bookingInclude,
        });
        return this.view(booking);
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          const detail = JSON.stringify(e.meta ?? {}) + e.message;
          if (/Booking_code_key|"code"|\(code\)/.test(detail)) continue;
          throw new ConflictException({ code: 'SEAT_TAKEN', message: 'One of the selected seats was just taken' });
        }
        throw e;
      }
    }
    throw new ConflictException('Could not allocate a booking code, please retry');
  }

  async listMine(userId: string) {
    const rows = await this.prisma.booking.findMany({
      where: { userId },
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return Promise.all(rows.map((b) => this.view(b)));
  }

  async findOne(id: string, user: AuthUser) {
    const b = await this.prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!b || (b.userId !== user.id && user.role !== 'ADMIN')) throw new NotFoundException('Booking not found');
    return this.view(b);
  }

  async cancel(id: string, user: AuthUser) {
    const b = await this.prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!b || b.userId !== user.id) throw new NotFoundException('Booking not found');
    if (b.status === 'CANCELLED' || b.status === 'EXPIRED') return this.view(b);

    if (b.status === 'PAID') {
      if (b.trip.departureAt.getTime() - Date.now() < CANCEL_CUTOFF_MS) {
        throw new ForbiddenException('Paid tickets can be cancelled until 2 hours before departure');
      }
      await this.payments.refund(b);
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.bookingSeat.deleteMany({ where: { bookingId: b.id } }),
      this.prisma.booking.update({ where: { id: b.id }, data: { status: 'CANCELLED' }, include: bookingInclude }),
    ]);
    return this.view(updated);
  }

  async releaseExpired(tripId?: string): Promise<number> {
    const expired = await this.prisma.booking.findMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() }, ...(tripId ? { tripId } : {}) },
      select: { id: true },
    });
    if (!expired.length) return 0;
    const ids = expired.map((b) => b.id);
    await this.prisma.$transaction([
      this.prisma.bookingSeat.deleteMany({ where: { bookingId: { in: ids } } }),
      this.prisma.booking.updateMany({ where: { id: { in: ids }, status: 'PENDING' }, data: { status: 'EXPIRED' } }),
    ]);
    return ids.length;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredJob() {
    const n = await this.releaseExpired();
    if (n) this.log.log(`Released seats of ${n} expired bookings`);
  }

  private async view(b: BookingFull) {
    return {
      id: b.id,
      code: b.code,
      status: b.status,
      totalCents: b.totalCents,
      currency: b.currency,
      expiresAt: b.expiresAt,
      paidAt: b.paidAt,
      createdAt: b.createdAt,
      contactEmail: b.contactEmail,
      trip: {
        id: b.trip.id,
        departureAt: b.trip.departureAt,
        arrivalAt: b.trip.arrivalAt,
        status: b.trip.status,
        from: { slug: b.trip.route.from.slug, names: b.trip.route.from.names, station: b.trip.route.fromStation },
        to: { slug: b.trip.route.to.slug, names: b.trip.route.to.names, station: b.trip.route.toStation },
      },
      seats: b.seats.map((s) => ({
        seatNumber: s.seatNumber,
        passengerName: s.passengerName,
        smallBags: s.smallBags,
        largeBags: s.largeBags,
        boarded: !!s.boardedAt,
      })),
      review: b.review ? { rating: b.review.rating, comment: b.review.comment } : null,
      qr: b.status === 'PAID' ? await this.tickets.qrDataUrl(b.code) : null,
    };
  }
}
