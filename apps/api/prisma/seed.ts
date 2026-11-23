import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import { generateTrips, repriceFutureTrips } from '../src/trips/trip-generator';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

type Names = { en: string; uk: string; de: string; pl: string };
const CITIES: Record<string, { iso: string; lat: number; lng: number; names: Names }> = {
  berlin: { iso: 'DE', lat: 52.52, lng: 13.405, names: { en: 'Berlin', uk: 'Берлін', de: 'Berlin', pl: 'Berlin' } },
  duesseldorf: { iso: 'DE', lat: 51.2277, lng: 6.7735, names: { en: 'Düsseldorf', uk: 'Дюссельдорф', de: 'Düsseldorf', pl: 'Düsseldorf' } },
  hamburg: { iso: 'DE', lat: 53.5511, lng: 9.9937, names: { en: 'Hamburg', uk: 'Гамбург', de: 'Hamburg', pl: 'Hamburg' } },
  munich: { iso: 'DE', lat: 48.1351, lng: 11.582, names: { en: 'Munich', uk: 'Мюнхен', de: 'München', pl: 'Monachium' } },
  kyiv: { iso: 'UA', lat: 50.4501, lng: 30.5234, names: { en: 'Kyiv', uk: 'Київ', de: 'Kiew', pl: 'Kijów' } },
  lviv: { iso: 'UA', lat: 49.8397, lng: 24.0297, names: { en: 'Lviv', uk: 'Львів', de: 'Lemberg', pl: 'Lwów' } },
  warsaw: { iso: 'PL', lat: 52.2297, lng: 21.0122, names: { en: 'Warsaw', uk: 'Варшава', de: 'Warschau', pl: 'Warszawa' } },
  krakow: { iso: 'PL', lat: 50.0647, lng: 19.945, names: { en: 'Krakow', uk: 'Краків', de: 'Krakau', pl: 'Kraków' } },
  prague: { iso: 'CZ', lat: 50.0755, lng: 14.4378, names: { en: 'Prague', uk: 'Прага', de: 'Prag', pl: 'Praga' } },
  vienna: { iso: 'AT', lat: 48.2082, lng: 16.3738, names: { en: 'Vienna', uk: 'Відень', de: 'Wien', pl: 'Wiedeń' } },
  paris: { iso: 'FR', lat: 48.8566, lng: 2.3522, names: { en: 'Paris', uk: 'Париж', de: 'Paris', pl: 'Paryż' } },
  london: { iso: 'GB', lat: 51.5074, lng: -0.1278, names: { en: 'London', uk: 'Лондон', de: 'London', pl: 'Londyn' } },
  amsterdam: { iso: 'NL', lat: 52.3676, lng: 4.9041, names: { en: 'Amsterdam', uk: 'Амстердам', de: 'Amsterdam', pl: 'Amsterdam' } },
};

const PAIRS: [string, string][] = [
  ['berlin', 'duesseldorf'], ['berlin', 'hamburg'], ['berlin', 'munich'], ['berlin', 'warsaw'], ['berlin', 'prague'],
  ['berlin', 'amsterdam'], ['berlin', 'paris'], ['berlin', 'kyiv'], ['duesseldorf', 'paris'], ['duesseldorf', 'amsterdam'],
  ['duesseldorf', 'london'], ['warsaw', 'kyiv'], ['warsaw', 'krakow'], ['warsaw', 'lviv'], ['krakow', 'lviv'],
  ['lviv', 'kyiv'], ['prague', 'vienna'], ['munich', 'vienna'], ['paris', 'london'],
];

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

async function upsertUser(email: string, role: 'USER' | 'DRIVER' | 'ADMIN', name: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { role, ...(email === 'admin@bustravel.local' ? { isOwner: true } : {}) },
    create: { email, role, name, passwordHash, emailVerifiedAt: new Date(), isOwner: email === 'admin@bustravel.local' },
  });
}

async function main() {
  const isProd = process.env.NODE_ENV === 'production';
  const demo = process.env.SEED_DEMO === '1';

  for (const [slug, c] of Object.entries(CITIES)) {
    await prisma.city.upsert({
      where: { slug },
      update: { names: c.names, lat: c.lat, lng: c.lng },
      create: { slug, countryIso: c.iso, lat: c.lat, lng: c.lng, names: c.names },
    });
  }
  const cityRows = await prisma.city.findMany();
  const byslug = new Map(cityRows.map((c) => [c.slug, c]));

  const routeIds: { id: string; distanceKm: number }[] = [];
  for (const [a, b] of PAIRS) {
    for (const [from, to] of [[a, b], [b, a]]) {
      const f = byslug.get(from)!, t = byslug.get(to)!;
      const distanceKm = Math.round(haversineKm(f, t) * 1.3);
      const route = await prisma.route.upsert({
        where: { fromCityId_toCityId: { fromCityId: f.id, toCityId: t.id } },
        update: {},
        create: {
          fromCityId: f.id,
          toCityId: t.id,
          fromStation: `${CITIES[from].names.en} Central Bus Station`,
          toStation: `${CITIES[to].names.en} Central Bus Station`,
          distanceKm,
          durationMin: Math.round((distanceKm / 75) * 60) + 20,
          basePriceCents: Math.max(900, Math.round(distanceKm * 7)),
        },
      });
      routeIds.push({ id: route.id, distanceKm });
    }
  }

  const buses = [];
  for (let i = 1; i <= 6; i++) {
    buses.push(
      await prisma.bus.upsert({
        where: { plate: `BT-${100 + i}` },
        update: {},
        create: { plate: `BT-${100 + i}`, model: i % 2 ? 'Setra S 516 HD' : 'Neoplan Cityliner', seatCount: 48 },
      }),
    );
  }

  if ((await prisma.tripTemplate.count()) === 0) {
    for (const [i, r] of routeIds.entries()) {
      const times = r.distanceKm < 800 ? ['07:00', '17:30'] : ['09:00'];
      for (const [j, departureTime] of times.entries()) {
        await prisma.tripTemplate.create({
          data: { routeId: r.id, busId: buses[(i + j) % buses.length].id, departureTime, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
        });
      }
    }
  }

  const demoPassword = process.env.SEED_PASSWORD ?? (isProd ? undefined : 'Demo1234!');
  if (!demoPassword) throw new Error('SEED_PASSWORD is required when NODE_ENV=production');
  await upsertUser('admin@bustravel.local', 'ADMIN', 'Admin', demoPassword);
  if (!isProd) {
    await upsertUser('driver@bustravel.local', 'DRIVER', 'Driver', demoPassword);
    await upsertUser('demo@bustravel.local', 'USER', 'Demo Passenger', demoPassword);
  }

  if (!isProd && demo && (await prisma.review.count()) === 0) {
    const WHO = ['Anna K.', 'Marek W.', 'Olena S.', 'Thomas B.', 'Julia M.', 'Piotr N.', 'Sofia L.', 'Lukas H.', 'Iryna P.', 'Daniel R.', 'Katarzyna D.', 'Max F.'];
    const TEXT: [number, string, string][] = [
      [5, 'en', 'Left on time and arrived early. Clean bus, plenty of legroom and the Wi-Fi actually worked.'],
      [5, 'de', 'Pünktlich, sauber und sehr bequeme Sitze. Ich buche sofort wieder.'],
      [5, 'pl', 'Wygodny autobus, kierowca bardzo miły. Podróż minęła szybko.'],
      [5, 'uk', 'Дуже комфортно, чисто і вчасно. Місце обирав заздалегідь, усе зручно.'],
      [4, 'en', 'Good value for the price. A short delay at the border, otherwise a smooth ride.'],
      [4, 'de', 'Gutes Preis-Leistungs-Verhältnis. Gepäck war kein Problem, der Fahrer sehr freundlich.'],
      [4, 'pl', 'Dobry stosunek ceny do jakości. Klimatyzacja trochę za mocna, ale ogólnie polecam.'],
      [4, 'uk', 'Непогані автобуси та адекватна ціна. Єдиний мінус, затримка на кордоні.'],
      [3, 'en', 'Fine for the money, but the seats are a bit tight on a long trip.'],
      [3, 'de', 'In Ordnung, aber die Pause war etwas kurz.'],
      [5, 'en', 'Booking took two minutes and the QR ticket worked at the first scan.'],
      [5, 'uk', 'Квиток із QR-кодом спрацював одразу. Зручний сервіс і прозорі ціни.'],
    ];
    const routes = await prisma.route.findMany({ include: { from: true, to: true } });
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    let n = 0;
    for (const [a, b] of PAIRS) {
      const r = routes.find((x) => x.from.slug === a && x.to.slug === b)!;
      const rev = routes.find((x) => x.from.slug === b && x.to.slug === a)!;
      const count = 3 + Math.floor(rnd() * 6);
      for (let i = 0; i < count; i++) {
        const [rating, locale, comment] = TEXT[Math.floor(rnd() * TEXT.length)];
        await prisma.review.create({
          data: {
            routeId: rnd() > 0.5 ? r.id : rev.id,
            authorName: WHO[Math.floor(rnd() * WHO.length)],
            rating,
            comment,
            locale,
            createdAt: new Date(Date.now() - Math.floor(rnd() * 70) * 86_400_000),
          },
        });
        n++;
      }
    }
    console.log(`Seeded ${n} demo reviews`);
  }

  const trips = await generateTrips(prisma, 30);
  const repriced = await repriceFutureTrips(prisma);
  if (repriced) console.log(`Repriced ${repriced} future trips (dynamic pricing)`);

  if (!isProd && demo && (await prisma.booking.count({ where: { contactEmail: { endsWith: '@demo.bustravel.local' } } })) === 0) {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const NAMES = ['Anna Kowalska', 'Marek Wiśniewski', 'Olena Shevchenko', 'Thomas Becker', 'Julia Meyer', 'Piotr Nowak', 'Sofia Lang', 'Lukas Hoffmann', 'Iryna Petrenko', 'Daniel Richter', 'Katarzyna Duda', 'Max Fischer', 'Nina Vogel', 'Andriy Bondar'];
    const hash = await bcrypt.hash(demoPassword, 10);
    const users = [];
    for (const [i, name] of NAMES.entries()) {
      const email = `${name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, 'x')}${i}@demo.bustravel.local`;
      users.push(await prisma.user.upsert({ where: { email }, update: {}, create: { email, name, passwordHash: hash, emailVerifiedAt: new Date() } }));
    }
    const future = await prisma.trip.findMany({
      where: { status: 'SCHEDULED', departureAt: { gt: new Date(), lt: new Date(Date.now() + 7 * 86_400_000) } },
      include: { bus: true },
      orderBy: { departureAt: 'asc' },
    });
    const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = () => 'BT-' + Array.from({ length: 6 }, () => ALPHA[Math.floor(rnd() * ALPHA.length)]).join('');
    let made = 0;
    for (let i = 0; i < 1100; i++) {
      const trip = future[Math.floor(rnd() * future.length)];
      const user = users[Math.floor(rnd() * users.length)];
      const count = 1 + Math.floor(rnd() * 3);
      const taken = new Set((await prisma.bookingSeat.findMany({ where: { tripId: trip.id }, select: { seatNumber: true } })).map((x) => x.seatNumber));
      const free = Array.from({ length: trip.bus.seatCount }, (_, k) => k + 1).filter((n) => !taken.has(n));
      if (free.length < count + 8) continue;
      const seats = Array.from({ length: count }, () => free.splice(Math.floor(rnd() * free.length), 1)[0]);
      const age = Math.floor(rnd() * rnd() * 21);
      const paidAt = new Date(Math.min(Date.now() - 3_600_000, Date.now() - age * 86_400_000 - Math.floor(rnd() * 80_000_000)));
      await prisma.booking.create({
        data: {
          code: code(),
          userId: user.id,
          tripId: trip.id,
          status: 'PAID',
          contactEmail: user.email,
          locale: ['en', 'de', 'pl', 'uk'][Math.floor(rnd() * 4)],
          totalCents: trip.priceCents * count,
          currency: trip.currency,
          expiresAt: paidAt,
          paymentProvider: 'mock',
          paymentRef: `demo_${i}`,
          paidAt,
          createdAt: paidAt,
          seats: { create: seats.map((n, k) => ({ tripId: trip.id, seatNumber: n, passengerName: k === 0 ? user.name! : NAMES[Math.floor(rnd() * NAMES.length)] })) },
        },
      }).then(() => made++).catch(() => undefined);
    }
    console.log(`Seeded ${made} demo bookings`);
  }

  console.log(`Seeded ${cityRows.length} cities, ${routeIds.length} routes, ${buses.length} buses, +${trips} trips`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
