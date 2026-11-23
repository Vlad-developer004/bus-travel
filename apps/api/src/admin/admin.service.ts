import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { pickName, toLocale } from '../common/locale';
import { createHash, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { adminGrantedEmail, adminInviteEmail, cancelledEmail } from '../mail/templates';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateTrips } from '../trips/trip-generator';
import { CreateTemplateDto, CreateTripDto, InviteAdminDto, ListBookingsDto, ListTripsDto, ListUsersDto, PatchTemplateDto, UpdateRouteDto, UpdateTripDto } from './admin.dto';

const PAGE_SIZE = 25;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private async owner(userId: string) {
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!me?.isOwner) throw new ForbiddenException('Only the owner can manage administrators');
    return me;
  }

  async team(userId: string) {
    await this.owner(userId);
    const [admins, invites] = await Promise.all([
      this.prisma.user.findMany({ where: { role: 'ADMIN' }, orderBy: [{ isOwner: 'desc' }, { createdAt: 'asc' }], select: { id: true, email: true, name: true, isOwner: true } }),
      this.prisma.adminInvite.findMany({ where: { expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, select: { id: true, email: true, expiresAt: true } }),
    ]);
    return { admins, invites };
  }

  async inviteAdmin(userId: string, dto: InviteAdminDto) {
    const me = await this.owner(userId);
    const email = dto.email.toLowerCase();
    const who = me.name ?? me.email;
    const web = this.config.getOrThrow<string>('WEB_URL');
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role === 'ADMIN') throw new ConflictException('Already an administrator');
      await this.prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
      const loc = toLocale(existing.locale);
      void this.mail.send({ to: email, ...adminGrantedEmail(loc, { who, link: `${web}/${loc}/admin` }) });
      return { status: 'promoted' as const };
    }
    const token = randomBytes(24).toString('hex');
    const loc = toLocale(dto.locale);
    await this.prisma.adminInvite.upsert({
      where: { email },
      update: { tokenHash: createHash('sha256').update(token).digest('hex'), locale: loc, invitedById: me.id, expiresAt: new Date(Date.now() + 7 * 86_400_000) },
      create: { email, tokenHash: createHash('sha256').update(token).digest('hex'), locale: loc, invitedById: me.id, expiresAt: new Date(Date.now() + 7 * 86_400_000) },
    });
    const link = `${web}/${loc}/register?invite=${token}&email=${encodeURIComponent(email)}`;
    void this.mail.send({ to: email, ...adminInviteEmail(loc, { who, link }) });
    return { status: 'invited' as const };
  }

  async removeAdmin(userId: string, targetId: string) {
    await this.owner(userId);
    const t = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!t || t.role !== 'ADMIN') throw new NotFoundException('Administrator not found');
    if (t.isOwner) throw new ForbiddenException('The owner cannot be removed');
    await this.prisma.user.update({ where: { id: targetId }, data: { role: 'USER' } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: targetId } });
  }

  async revokeInvite(userId: string, id: string) {
    await this.owner(userId);
    await this.prisma.adminInvite.deleteMany({ where: { id } });
  }

  async stats() {
    const since = new Date(Date.now() - 14 * 24 * 3600 * 1000);
    const [paid, revenue, upcoming, pending, daily] = await Promise.all([
      this.prisma.booking.count({ where: { status: 'PAID' } }),
      this.prisma.booking.aggregate({ where: { status: 'PAID' }, _sum: { totalCents: true } }),
      this.prisma.trip.count({ where: { status: 'SCHEDULED', departureAt: { gt: new Date() } } }),
      this.prisma.booking.count({ where: { status: 'PENDING' } }),
      this.prisma.$queryRaw<{ day: Date; bookings: bigint; cents: bigint }[]>`
        SELECT date_trunc('day', "paidAt") AS day, COUNT(*) AS bookings, COALESCE(SUM("totalCents"), 0) AS cents
        FROM "Booking" WHERE status = 'PAID' AND "paidAt" >= ${since}
        GROUP BY 1 ORDER BY 1`,
    ]);
    const week = 7 * 86_400_000;
    const sum = async (from: Date, to: Date) =>
      (await this.prisma.booking.aggregate({ where: { status: 'PAID', paidAt: { gte: from, lt: to } }, _sum: { totalCents: true } }))._sum.totalCents ?? 0;
    const now = Date.now();
    const [thisWeek, lastWeek, top, load] = await Promise.all([
      sum(new Date(now - week), new Date(now + 1000)),
      sum(new Date(now - 2 * week), new Date(now - week)),
      this.prisma.$queryRaw<{ fromId: string; toId: string; cents: bigint; seats: bigint }[]>`
        SELECT r."fromCityId" AS "fromId", r."toCityId" AS "toId", SUM(b."totalCents") AS cents,
               (SELECT COUNT(*) FROM "BookingSeat" bs JOIN "Booking" bb ON bb.id = bs."bookingId"
                  JOIN "Trip" tt ON tt.id = bb."tripId" WHERE bb.status = 'PAID' AND tt."routeId" = r.id) AS seats
        FROM "Booking" b JOIN "Trip" t ON t.id = b."tripId" JOIN "Route" r ON r.id = t."routeId"
        WHERE b.status = 'PAID' GROUP BY r.id ORDER BY cents DESC LIMIT 5`,
      this.prisma.$queryRaw<{ sold: bigint; total: bigint }[]>`
        SELECT (SELECT COUNT(*) FROM "BookingSeat" bs JOIN "Trip" t ON t.id = bs."tripId" WHERE t."departureAt" > now() AND t."departureAt" < now() + interval '7 days' AND t.status = 'SCHEDULED') AS sold,
               (SELECT COALESCE(SUM(bu."seatCount"), 0) FROM "Trip" t JOIN "Bus" bu ON bu.id = t."busId" WHERE t."departureAt" > now() AND t."departureAt" < now() + interval '7 days' AND t.status = 'SCHEDULED') AS total`,
    ]);
    const cities = await this.prisma.city.findMany({ where: { id: { in: top.flatMap((x) => [x.fromId, x.toId]) } } });
    const name = (id: string) => pickName(cities.find((c) => c.id === id)?.names, 'en');
    return {
      weekCents: thisWeek,
      prevWeekCents: lastWeek,
      occupancy: Number(load[0].total) ? Number(load[0].sold) / Number(load[0].total) : 0,
      topRoutes: top.map((x) => ({ from: name(x.fromId), to: name(x.toId), cents: Number(x.cents), seats: Number(x.seats) })),
      paidBookings: paid,
      revenueCents: revenue._sum.totalCents ?? 0,
      upcomingTrips: upcoming,
      pendingBookings: pending,
      last14Days: daily.map((d) => ({ day: d.day, bookings: Number(d.bookings), cents: Number(d.cents) })),
    };
  }

  private bookingOrder(sort: string | undefined, dir: 'asc' | 'desc') {
    const by: Record<string, object[]> = {
      createdAt: [{ createdAt: dir }],
      code: [{ code: dir }],
      email: [{ contactEmail: dir }],
      total: [{ totalCents: dir }],
      status: [{ status: dir }, { createdAt: 'desc' }],
      departure: [{ trip: { departureAt: dir } }],
      seats: [{ seats: { _count: dir } }, { createdAt: 'desc' }],
      route: [{ trip: { route: { from: { slug: dir } } } }, { trip: { route: { to: { slug: dir } } } }],
    };
    return (by[sort ?? 'createdAt'] ?? by.createdAt) as never;
  }

  async bookings(q: ListBookingsDto) {
    const loc = toLocale(q.locale);
    const page = q.page ?? 1;
    const term = q.q?.trim();
    const where = {
      ...(q.status ? { status: q.status } : {}),
      ...(term ? { OR: [{ code: { contains: term, mode: 'insensitive' as const } }, { contactEmail: { contains: term, mode: 'insensitive' as const } }] } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        orderBy: this.bookingOrder(q.sort, q.dir ?? 'desc'),
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { seats: { select: { seatNumber: true } }, trip: { include: { route: { include: { from: true, to: true } } } } },
      }),
    ]);
    return {
      total,
      page,
      pageSize: PAGE_SIZE,
      items: rows.map((b) => ({
        id: b.id,
        code: b.code,
        status: b.status,
        email: b.contactEmail,
        totalCents: b.totalCents,
        currency: b.currency,
        createdAt: b.createdAt,
        departureAt: b.trip.departureAt,
        from: pickName(b.trip.route.from.names, loc),
        to: pickName(b.trip.route.to.names, loc),
        seats: b.seats.map((s) => s.seatNumber).sort((a, c) => a - c),
      })),
    };
  }

  async cancelBooking(id: string) {
    const b = await this.prisma.booking.findUnique({
      where: { id },
      include: { seats: true, user: true, trip: { include: { route: { include: { from: true, to: true } } } } },
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status === 'CANCELLED' || b.status === 'EXPIRED') return { status: b.status, refunded: false };
    let refunded = false;
    if (b.status === 'PAID') {
      await this.payments.refund(b);
      refunded = true;
    }
    await this.prisma.$transaction([
      this.prisma.bookingSeat.deleteMany({ where: { bookingId: b.id } }),
      this.prisma.booking.update({ where: { id: b.id }, data: { status: 'CANCELLED' } }),
    ]);
    const loc = toLocale(b.locale);
    void this.mail.send({
      to: b.contactEmail,
      ...cancelledEmail(loc, { name: b.user.name ?? b.contactEmail, code: b.code, from: pickName(b.trip.route.from.names, loc), to: pickName(b.trip.route.to.names, loc) }),
    });
    return { status: 'CANCELLED' as const, refunded };
  }

  async resendTicket(id: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status !== 'PAID') throw new BadRequestException('Only paid bookings have a ticket');
    await this.payments.sendTicket(id);
    return { sent: true };
  }

  private tripOrder(sort: string | undefined, dir: 'asc' | 'desc') {
    if (sort === 'price') return [{ priceCents: dir }, { departureAt: 'asc' }];
    if (sort === 'booked') return [{ seats: { _count: dir } }, { departureAt: 'asc' }];
    return [{ departureAt: dir }];
  }

  async trips(q: ListTripsDto) {
    const loc = toLocale(q.locale);
    const page = q.page ?? 1;
    const scope = q.scope ?? 'upcoming';
    const where = {
      ...(scope === 'cancelled' ? { status: 'CANCELLED' as const } : scope === 'past' ? { departureAt: { lt: new Date() } } : { status: 'SCHEDULED' as const, departureAt: { gte: new Date() } }),
      ...(q.from || q.to ? { route: { ...(q.from ? { from: { slug: q.from } } : {}), ...(q.to ? { to: { slug: q.to } } : {}) } } : {}),
      ...(q.date ? { departureAt: { gte: new Date(`${q.date}T00:00:00Z`), lt: new Date(new Date(`${q.date}T00:00:00Z`).getTime() + 86_400_000) } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.trip.count({ where }),
      this.prisma.trip.findMany({
        where,
        orderBy: this.tripOrder(q.sort, q.dir ?? (scope === 'past' ? 'desc' : 'asc')) as never,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { route: { include: { from: true, to: true } }, bus: true, _count: { select: { seats: true } } },
      }),
    ]);
    return {
      total,
      page,
      pageSize: PAGE_SIZE,
      items: rows.map((t) => ({
        id: t.id,
        departureAt: t.departureAt,
        arrivalAt: t.arrivalAt,
        priceCents: t.priceCents,
        currency: t.currency,
        status: t.status,
        from: pickName(t.route.from.names, loc),
        to: pickName(t.route.to.names, loc),
        bus: t.bus.plate,
        seatCount: t.bus.seatCount,
        booked: t._count.seats,
      })),
    };
  }

  async updateTrip(id: string, dto: UpdateTripDto) {
    const t = await this.prisma.trip.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Trip not found');
    return this.prisma.trip.update({ where: { id }, data: { priceCents: dto.priceCents } });
  }

  async routes(locale?: string) {
    const loc = toLocale(locale);
    const rows = await this.prisma.route.findMany({
      include: { from: true, to: true, _count: { select: { templates: true } } },
      orderBy: [{ from: { slug: 'asc' } }, { to: { slug: 'asc' } }],
    });
    return rows.map((r) => ({
      id: r.id,
      from: pickName(r.from.names, loc),
      to: pickName(r.to.names, loc),
      distanceKm: r.distanceKm,
      durationMin: r.durationMin,
      basePriceCents: r.basePriceCents,
      schedules: r._count.templates,
    }));
  }

  async updateRoute(id: string, dto: UpdateRouteDto) {
    const r = await this.prisma.route.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Route not found');
    await this.prisma.route.update({ where: { id }, data: { basePriceCents: dto.basePriceCents } });
  }

  async patchTemplate(id: string, dto: PatchTemplateDto) {
    const t = await this.prisma.tripTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Schedule not found');
    return this.prisma.tripTemplate.update({ where: { id }, data: dto });
  }

  async users(q: ListUsersDto) {
    const page = q.page ?? 1;
    const term = q.q?.trim();
    const where = {
      ...(q.role ? { role: q.role as 'USER' | 'DRIVER' | 'ADMIN' } : {}),
      ...(term ? { OR: [{ email: { contains: term, mode: 'insensitive' as const } }, { name: { contains: term, mode: 'insensitive' as const } }] } : {}),
    };
    const dir = q.dir ?? 'desc';
    const orderBy = (q.sort === 'email' ? [{ email: dir }] : q.sort === 'role' ? [{ role: dir }, { createdAt: 'desc' }] : q.sort === 'bookings' ? [{ bookings: { _count: dir } }] : [{ createdAt: dir }]) as never;
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { _count: { select: { bookings: true } } } }),
    ]);
    return {
      total,
      page,
      pageSize: PAGE_SIZE,
      items: rows.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, isOwner: u.isOwner, verified: !!u.emailVerifiedAt, createdAt: u.createdAt, bookings: u._count.bookings })),
    };
  }

  async setUserRole(actorId: string, id: string, role: 'USER' | 'DRIVER') {
    if (actorId === id) throw new ForbiddenException('You cannot change your own role');
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('User not found');
    if (u.role === 'ADMIN') throw new ForbiddenException('Administrators are managed in the team section');
    await this.prisma.user.update({ where: { id }, data: { role } });
    if (role === 'USER') await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
  }

  buses() {
    return this.prisma.bus.findMany({ orderBy: { plate: 'asc' } });
  }

  async createTrip(dto: CreateTripDto) {
    const [route, bus] = await Promise.all([
      this.prisma.route.findUnique({ where: { id: dto.routeId } }),
      this.prisma.bus.findUnique({ where: { id: dto.busId } }),
    ]);
    if (!route || !bus) throw new NotFoundException('Route or bus not found');
    const departureAt = new Date(dto.departureAt);
    if (departureAt.getTime() <= Date.now()) throw new BadRequestException('Departure must be in the future');
    return this.prisma.trip.create({
      data: {
        routeId: route.id,
        busId: bus.id,
        departureAt,
        arrivalAt: new Date(departureAt.getTime() + route.durationMin * 60_000),
        priceCents: dto.priceCents ?? route.basePriceCents,
      },
    });
  }

  async cancelTrip(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { route: { include: { from: true, to: true } }, bookings: { where: { status: { in: ['PENDING', 'PAID'] } }, include: { seats: true, user: true } } },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    await this.prisma.trip.update({ where: { id: tripId }, data: { status: 'CANCELLED' } });

    let refunded = 0;
    for (const b of trip.bookings) {
      if (b.status === 'PAID') {
        await this.payments.refund(b);
        refunded++;
      }
      await this.prisma.$transaction([
        this.prisma.bookingSeat.deleteMany({ where: { bookingId: b.id } }),
        this.prisma.booking.update({ where: { id: b.id }, data: { status: 'CANCELLED' } }),
      ]);
      const loc = toLocale(b.locale);
      void this.mail.send({
        to: b.contactEmail,
        ...cancelledEmail(loc, {
          name: b.user.name ?? b.contactEmail,
          code: b.code,
          from: pickName(trip.route.from.names, loc),
          to: pickName(trip.route.to.names, loc),
        }),
      });
    }
    return { cancelled: trip.bookings.length, refunded };
  }

  templates() {
    return this.prisma.tripTemplate.findMany({ include: { route: { include: { from: true, to: true } }, bus: true } });
  }

  async createTemplate(dto: CreateTemplateDto) {
    const template = await this.prisma.tripTemplate.create({ data: dto });
    const generated = await generateTrips(this.prisma, 30);
    return { template, generated };
  }
}
