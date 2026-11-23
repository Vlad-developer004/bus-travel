import type { PrismaClient } from '../generated/prisma/client';

const DAY_FACTOR = [1.12, 1.0, 0.9, 0.9, 1.0, 1.15, 1.08];

export function dynamicPrice(baseCents: number, departureAt: Date): number {
  const hour = departureAt.getUTCHours();
  const timeFactor = hour >= 17 ? 0.94 : hour < 8 ? 0.97 : 1.03;
  return Math.max(500, Math.round((baseCents * DAY_FACTOR[departureAt.getUTCDay()] * timeFactor) / 10) * 10);
}

export async function generateTrips(prisma: PrismaClient, days = 30, now = new Date()): Promise<number> {
  const templates = await prisma.tripTemplate.findMany({ where: { active: true }, include: { route: true } });

  const rows: {
    routeId: string;
    busId: string;
    templateId: string;
    departureAt: Date;
    arrivalAt: Date;
    priceCents: number;
  }[] = [];

  for (const t of templates) {
    const [hh, mm] = t.departureTime.split(':').map(Number);
    for (let i = 0; i <= days; i++) {
      const departureAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i, hh, mm));
      if (departureAt <= now || !t.daysOfWeek.includes(departureAt.getUTCDay())) continue;
      rows.push({
        routeId: t.routeId,
        busId: t.busId,
        templateId: t.id,
        departureAt,
        arrivalAt: new Date(departureAt.getTime() + t.route.durationMin * 60_000),
        priceCents: dynamicPrice(t.priceCents ?? t.route.basePriceCents, departureAt),
      });
    }
  }

  let created = 0;
  for (let i = 0; i < rows.length; i += 1000) {
    const res = await prisma.trip.createMany({ data: rows.slice(i, i + 1000), skipDuplicates: true });
    created += res.count;
  }
  return created;
}

export async function repriceFutureTrips(prisma: PrismaClient): Promise<number> {
  const trips = await prisma.trip.findMany({
    where: { departureAt: { gt: new Date() }, seats: { none: {} }, bookings: { none: {} } },
    select: { id: true, departureAt: true, priceCents: true, route: { select: { basePriceCents: true } }, template: { select: { priceCents: true } } },
  });
  let changed = 0;
  for (const t of trips) {
    const price = dynamicPrice(t.template?.priceCents ?? t.route.basePriceCents, t.departureAt);
    if (price !== t.priceCents) {
      await prisma.trip.update({ where: { id: t.id }, data: { priceCents: price } });
      changed++;
    }
  }
  return changed;
}
