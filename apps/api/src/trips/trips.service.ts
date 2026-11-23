import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';
import { PriceStripDto, SearchTripsDto } from './trips.dto';
import { generateTrips } from './trip-generator';

const tripInclude = {
  bus: { select: { seatCount: true, model: true } },
  route: { include: { from: true, to: true } },
  _count: { select: { seats: true } },
} satisfies Prisma.TripInclude;

type TripWithRelations = Prisma.TripGetPayload<{ include: typeof tripInclude }>;

const city = (c: { slug: string; names: Prisma.JsonValue; countryIso: string; lat: number; lng: number }) => ({
  slug: c.slug,
  names: c.names,
  countryIso: c.countryIso,
  lat: c.lat,
  lng: c.lng,
});

export const toTripView = (t: TripWithRelations) => ({
  id: t.id,
  departureAt: t.departureAt,
  arrivalAt: t.arrivalAt,
  durationMin: t.route.durationMin,
  priceCents: t.priceCents,
  currency: t.currency,
  status: t.status,
  from: { ...city(t.route.from), station: t.route.fromStation },
  to: { ...city(t.route.to), station: t.route.toStation },
  seatCount: t.bus.seatCount,
  busModel: t.bus.model,
  seatsLeft: t.bus.seatCount - t._count.seats,
});

@Injectable()
export class TripsService {
  private readonly log = new Logger(TripsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: ReviewsService,
  ) {}

  async search(q: SearchTripsDto) {
    const dayStart = new Date(`${q.date}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    const from = new Date(Math.max(dayStart.getTime(), Date.now()));

    const trips = await this.prisma.trip.findMany({
      where: {
        status: 'SCHEDULED',
        departureAt: { gte: from, lt: dayEnd },
        route: { from: { slug: q.from }, to: { slug: q.to } },
      },
      include: tripInclude,
      orderBy: { departureAt: 'asc' },
    });

    const rating = trips.length ? await this.reviews.rating(q.from, q.to) : null;
    return trips
      .map(toTripView)
      .filter((t) => t.seatsLeft >= (q.passengers ?? 1))
      .map((t) => ({ ...t, rating }));
  }

  async priceStrip(q: PriceStripDto) {
    const span = q.days ?? 7;
    const start = new Date(new Date(`${q.date}T00:00:00.000Z`).getTime() - Math.floor(span / 2) * 86_400_000);
    const end = new Date(start.getTime() + span * 86_400_000);
    const trips = await this.prisma.trip.findMany({
      where: {
        status: 'SCHEDULED',
        departureAt: { gte: new Date(Math.max(start.getTime(), Date.now())), lt: end },
        route: { from: { slug: q.from }, to: { slug: q.to } },
      },
      select: { departureAt: true, priceCents: true, currency: true },
    });
    const best = new Map<string, { priceCents: number; currency: string }>();
    for (const t of trips) {
      const day = t.departureAt.toISOString().slice(0, 10);
      const cur = best.get(day);
      if (!cur || t.priceCents < cur.priceCents) best.set(day, { priceCents: t.priceCents, currency: t.currency });
    }
    return Array.from({ length: span }, (_, i) => {
      const day = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      return { date: day, priceCents: best.get(day)?.priceCents ?? null, currency: best.get(day)?.currency ?? 'EUR' };
    });
  }

  async findOne(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: { ...tripInclude, seats: { select: { seatNumber: true } } },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    const rating = await this.reviews.rating(trip.route.from.slug, trip.route.to.slug);
    return { ...toTripView(trip), rating, takenSeats: trip.seats.map((s) => s.seatNumber).sort((a, b) => a - b) };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async topUp() {
    const n = await generateTrips(this.prisma, 30);
    if (n) this.log.log(`Generated ${n} trips from templates`);
  }
}
