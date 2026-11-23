import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private mac(code: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('TICKET_SECRET')).update(code).digest('base64url').slice(0, 22);
  }

  sign(code: string): string {
    return `BT1.${code}.${this.mac(code)}`;
  }

  parse(token: string): string {
    const [v, code, mac] = (token ?? '').trim().split('.');
    const expected = Buffer.from(this.mac(code ?? ''));
    const given = Buffer.from(mac ?? '');
    if (v !== 'BT1' || !code || expected.length !== given.length || !timingSafeEqual(expected, given)) {
      throw new BadRequestException('Invalid ticket');
    }
    return code;
  }

  qrDataUrl(code: string): Promise<string> {
    return QRCode.toDataURL(this.sign(code), { margin: 1, width: 320 });
  }

  qrPng(code: string): Promise<Buffer> {
    return QRCode.toBuffer(this.sign(code), { margin: 1, width: 320 });
  }

  async scan(token: string) {
    const code = this.parse(token);
    const booking = await this.prisma.booking.findUnique({
      where: { code },
      include: { seats: true, trip: { include: { route: { include: { from: true, to: true } } } } },
    });
    if (!booking) throw new NotFoundException('Ticket not found');

    const base = {
      code: booking.code,
      tripId: booking.tripId,
      status: booking.status,
      departureAt: booking.trip.departureAt,
      from: booking.trip.route.from.names,
      to: booking.trip.route.to.names,
      passengers: booking.seats.map((s) => ({ name: s.passengerName, seat: s.seatNumber })),
    };

    if (booking.status !== 'PAID') return { valid: false as const, reason: 'NOT_PAID' as const, ...base };
    if (booking.trip.status !== 'SCHEDULED' && booking.trip.status !== 'DEPARTED') {
      return { valid: false as const, reason: 'TRIP_CANCELLED' as const, ...base };
    }

    const alreadyBoarded = booking.seats.every((s) => s.boardedAt);
    if (!alreadyBoarded) {
      await this.prisma.bookingSeat.updateMany({
        where: { bookingId: booking.id, boardedAt: null },
        data: { boardedAt: new Date() },
      });
    }
    return { valid: true as const, alreadyBoarded, ...base };
  }
}
