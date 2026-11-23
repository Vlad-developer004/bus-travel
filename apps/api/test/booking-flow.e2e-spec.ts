import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Booking flow (HTTP + real PostgreSQL)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let mail: MailService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication<NestExpressApplication>({ rawBody: true });
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    mail = app.get(MailService);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function login(email: string, password = 'Demo1234!') {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email, password }).expect(200);
    return agent;
  }

  async function register(email: string) {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/register').send({ email, password: 'Passw0rd!x', name: 'Test User', locale: 'de' }).expect(201);
    return agent;
  }

  async function findTrip() {
    const day = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const res = await http().get('/api/trips/search').query({ from: 'berlin', to: 'warsaw', date: day }).expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    return res.body[0] as { id: string; seatsLeft: number; seatCount: number; priceCents: number };
  }

  it('reports healthy', async () => {
    const res = await http().get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
  });

  it('serves cities with translations in 4 languages', async () => {
    const res = await http().get('/api/cities').expect(200);
    const kyiv = res.body.find((c: any) => c.slug === 'kyiv');
    expect(kyiv.names).toEqual({ en: 'Kyiv', uk: 'Київ', de: 'Kiew', pl: 'Kijów' });
  });

  it('requires authentication and validates input', async () => {
    await http().get('/api/bookings').expect(401);
    await http().get('/api/admin/stats').expect(401);
    await http().post('/api/auth/register').send({ email: 'not-an-email', password: 'x' }).expect(400);
    await http().get('/api/trips/search').query({ from: 'berlin', to: 'warsaw', date: 'tomorrow' }).expect(400);
  });

  it('keeps tokens out of reach of JavaScript (httpOnly cookies)', async () => {
    const res = await http().post('/api/auth/login').send({ email: 'demo@bustravel.local', password: 'Demo1234!' }).expect(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.length).toBe(2);
    cookies.forEach((c) => expect(c).toMatch(/HttpOnly/i));
    expect(JSON.stringify(res.body)).not.toMatch(/eyJ/);
  });

  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const agent = await register('rotate@example.com');
    const first = await agent.post('/api/auth/login').send({ email: 'rotate@example.com', password: 'Passw0rd!x' });
    const oldRefresh = (first.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('bt_refresh='))!.split(';')[0];

    await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', oldRefresh).expect(200);
    await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', oldRefresh).expect(401);
  });

  it('books seats, prevents double-booking, pays, issues a QR and lets the driver board it', async () => {
    const trip = await findTrip();
    const alice = await register('alice@example.com');
    const bob = await register('bob@example.com');

    const booking = await alice
      .post('/api/bookings')
      .send({ tripId: trip.id, passengers: [{ name: 'Alice A', seatNumber: 5 }, { name: 'Alice B', seatNumber: 6, largeBags: 1 }] })
      .expect(201);
    expect(booking.body.status).toBe('PENDING');
    expect(booking.body.totalCents).toBe(trip.priceCents * 2 + 500);
    expect(booking.body.qr).toBeNull();

    const clash = await bob.post('/api/bookings').send({ tripId: trip.id, passengers: [{ name: 'Bob', seatNumber: 6 }] }).expect(409);
    expect(clash.body.code).toBe('SEAT_TAKEN');

    const detail = await http().get(`/api/trips/${trip.id}`).expect(200);
    expect(detail.body.takenSeats).toEqual(expect.arrayContaining([5, 6]));
    expect(detail.body.seatsLeft).toBe(trip.seatsLeft - 2);

    await bob.get(`/api/bookings/${booking.body.id}`).expect(404);
    await bob.post(`/api/payments/bookings/${booking.body.id}/checkout`).expect(404);

    const co = await alice.post(`/api/payments/bookings/${booking.body.id}/checkout`).expect(200);
    expect(co.body.url).toContain('/de/pay/mock');
    const p1 = await alice.post('/api/payments/mock/confirm').send({ bookingId: booking.body.id }).expect(200);
    const p2 = await alice.post('/api/payments/mock/confirm').send({ bookingId: booking.body.id }).expect(200);
    expect([p1.body.result, p2.body.result]).toEqual(['paid', 'already']);

    const paid = await alice.get(`/api/bookings/${booking.body.id}`).expect(200);
    expect(paid.body.status).toBe('PAID');
    expect(paid.body.qr).toMatch(/^data:image\/png;base64,/);

    const sent = mail.outbox.find((m) => m.to === 'alice@example.com' && m.subject.startsWith('Dein Ticket'));
    expect(sent?.attachments?.[0].cid).toBe('ticket-qr');
    expect(sent?.html).toContain(paid.body.code);
    expect(sent?.html).toContain(`/de/account/bookings/${booking.body.id}`);

    const driver = await login('driver@bustravel.local');
    const token = `BT1.${paid.body.code}.${await macFor(paid.body.code)}`;
    const scan1 = await driver.post('/api/tickets/scan').send({ token }).expect(200);
    expect(scan1.body).toMatchObject({ valid: true, alreadyBoarded: false });
    const scan2 = await driver.post('/api/tickets/scan').send({ token }).expect(200);
    expect(scan2.body.alreadyBoarded).toBe(true);

    await driver.post('/api/tickets/scan').send({ token: `BT1.${paid.body.code}.forgedforgedforgedxxxx` }).expect(400);
    await alice.post('/api/tickets/scan').send({ token }).expect(403);
  });

  it('lets exactly one of many concurrent requests win the same seat', async () => {
    const trip = await findTrip();
    const users = await Promise.all(Array.from({ length: 8 }, (_, i) => register(`race${i}@example.com`)));
    const results = await Promise.all(
      users.map((u, i) => u.post('/api/bookings').send({ tripId: trip.id, passengers: [{ name: `Racer ${i}`, seatNumber: 30 }] })),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(7);
    expect(await prisma.bookingSeat.count({ where: { tripId: trip.id, seatNumber: 30 } })).toBe(1);
  });

  it('releases seats of expired unpaid bookings so others can buy them', async () => {
    const trip = await findTrip();
    const carol = await register('carol@example.com');
    const dave = await register('dave@example.com');

    const b = await carol.post('/api/bookings').send({ tripId: trip.id, passengers: [{ name: 'Carol', seatNumber: 41 }] }).expect(201);
    await dave.post('/api/bookings').send({ tripId: trip.id, passengers: [{ name: 'Dave', seatNumber: 41 }] }).expect(409);

    await prisma.booking.update({ where: { id: b.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    await dave.post('/api/bookings').send({ tripId: trip.id, passengers: [{ name: 'Dave', seatNumber: 41 }] }).expect(201);
    const old = await carol.get(`/api/bookings/${b.body.id}`).expect(200);
    expect(old.body.status).toBe('EXPIRED');
    await carol.post(`/api/payments/bookings/${b.body.id}/checkout`).expect(403);
  });

  it('cancels a paid booking and frees its seats; admin cancels a whole trip', async () => {
    const trip = await findTrip();
    const erin = await register('erin@example.com');
    const b = await erin.post('/api/bookings').send({ tripId: trip.id, passengers: [{ name: 'Erin', seatNumber: 12 }] }).expect(201);
    await erin.post('/api/payments/mock/confirm').send({ bookingId: b.body.id }).expect(200);
    const cancelled = await erin.post(`/api/bookings/${b.body.id}/cancel`).expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(await prisma.bookingSeat.count({ where: { tripId: trip.id, seatNumber: 12 } })).toBe(0);

    await erin.get('/api/admin/stats').expect(403);
    const admin = await login('admin@bustravel.local');
    const stats = await admin.get('/api/admin/stats').expect(200);
    expect(stats.body.paidBookings).toBeGreaterThanOrEqual(1);

    const frank = await register('frank@example.com');
    const fb = await frank.post('/api/bookings').send({ tripId: trip.id, passengers: [{ name: 'Frank', seatNumber: 13 }] }).expect(201);
    const res = await admin.post(`/api/admin/trips/${trip.id}/cancel`).expect(200);
    expect(res.body.cancelled).toBeGreaterThan(0);
    expect((await frank.get(`/api/bookings/${fb.body.id}`)).body.status).toBe('CANCELLED');
    await http().get(`/api/trips/${trip.id}`).expect(200);
    await frank.post('/api/bookings').send({ tripId: trip.id, passengers: [{ name: 'Frank', seatNumber: 14 }] }).expect(404);
  });

  it('shows a price per day and a rating, and only lets a paid passenger review once', async () => {
    const day = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const strip = await http().get('/api/trips/prices').query({ from: 'berlin', to: 'warsaw', date: day, days: 7 }).expect(200);
    expect(strip.body).toHaveLength(7);
    expect(strip.body.some((d: any) => d.priceCents > 0)).toBe(true);
    expect(new Set(strip.body.map((d: any) => d.priceCents).filter(Boolean)).size).toBeGreaterThan(1);

    const trip = await findTrip();
    const none = await http().get('/api/trips/search').query({ from: 'berlin', to: 'warsaw', date: day }).expect(200);
    expect(none.body[0].rating).toBeNull();

    const gina = await register('gina@example.com');
    const hank = await register('hank@example.com');
    const b = await gina.post('/api/bookings').send({ tripId: trip.id, passengers: [{ name: 'Gina Green', seatNumber: 30 }] }).expect(201);

    await gina.post('/api/reviews').send({ bookingId: b.body.id, rating: 5 }).expect(403);
    await hank.post('/api/reviews').send({ bookingId: b.body.id, rating: 5 }).expect(404);

    await gina.post('/api/payments/mock/confirm').send({ bookingId: b.body.id }).expect(200);
    await gina.post('/api/reviews').send({ bookingId: b.body.id, rating: 7 }).expect(400);
    const ok = await gina.post('/api/reviews').send({ bookingId: b.body.id, rating: 4, comment: 'Smooth ride' }).expect(201);
    expect(ok.body.rating).toBe(4);
    await gina.post('/api/reviews').send({ bookingId: b.body.id, rating: 5 }).expect(409);

    const list = await http().get('/api/reviews').query({ from: 'warsaw', to: 'berlin' }).expect(200);
    const mine = list.body.items.find((r: any) => r.comment === 'Smooth ride');
    expect(mine).toMatchObject({ author: 'Test U.', verified: true });
    expect((await gina.get(`/api/bookings/${b.body.id}`)).body.review).toEqual({ rating: 4, comment: 'Smooth ride' });
    const rated = await http().get('/api/trips/search').query({ from: 'berlin', to: 'warsaw', date: day }).expect(200);
    expect(rated.body[0].rating).toMatchObject({ average: 4, count: 1 });
  });

  it('lets only the owner invite administrators; an invitation link makes the new account an admin once', async () => {
    const owner = await login('admin@bustravel.local');
    const nobody = await register('not-admin@example.com');
    await nobody.post('/api/admin/team/invite').send({ email: 'x@example.com' }).expect(403);

    const inv = await owner.post('/api/admin/team/invite').send({ email: 'Newbie@Example.com', locale: 'de' }).expect(200);
    expect(inv.body.status).toBe('invited');
    await new Promise((r) => setTimeout(r, 300));
    const mailed = mail.outbox.filter((m) => m.to === 'newbie@example.com').pop()!;
    expect(mailed.subject).toMatch(/Einladung/);
    const token = /invite=([0-9a-f]+)/.exec(mailed.html)![1];

    const other = request.agent(app.getHttpServer());
    await other.post('/api/auth/register').send({ email: 'someone-else@example.com', password: 'Passw0rd!x', inviteToken: token }).expect(201);
    await other.get('/api/admin/stats').expect(403);

    const fresh = request.agent(app.getHttpServer());
    const reg = await fresh.post('/api/auth/register').send({ email: 'newbie@example.com', password: 'Passw0rd!x', inviteToken: token }).expect(201);
    expect(reg.body.user.role).toBe('ADMIN');
    await fresh.get('/api/admin/stats').expect(200);
    await request(app.getHttpServer()).post('/api/auth/register').send({ email: 'newbie2@example.com', password: 'Passw0rd!x', inviteToken: token }).expect(201);
    expect((await owner.get('/api/admin/team')).body.invites.find((i: any) => i.email === 'newbie@example.com')).toBeUndefined();

    const promoted = await owner.post('/api/admin/team/invite').send({ email: 'not-admin@example.com' }).expect(200);
    expect(promoted.body.status).toBe('promoted');
    const team = (await owner.get('/api/admin/team').expect(200)).body;
    const target = team.admins.find((a: any) => a.email === 'not-admin@example.com');
    const boss = team.admins.find((a: any) => a.isOwner);
    await owner.delete(`/api/admin/team/${boss.id}`).expect(403);
    await owner.delete(`/api/admin/team/${target.id}`).expect(204);
    await prisma.user.deleteMany({ where: { email: { in: ['newbie@example.com', 'newbie2@example.com', 'someone-else@example.com', 'not-admin@example.com'] } } });
  });

  it('gives admins trips, routes, users and booking actions', async () => {
    await prisma.booking.deleteMany({ where: { contactEmail: 'carol@example.com' } });
    await prisma.user.deleteMany({ where: { email: 'carol@example.com' } });
    const admin = await login('admin@bustravel.local');
    const pax = await register('carol@example.com');

    const list = await admin.get('/api/admin/trips').query({ from: 'berlin', to: 'warsaw', sort: 'price', dir: 'asc', locale: 'de' }).expect(200);
    expect(list.body.items[0]).toMatchObject({ from: 'Berlin', to: 'Warschau' });
    const t0 = list.body.items[0];
    await admin.patch(`/api/admin/trips/${t0.id}`).send({ priceCents: 3333 }).expect(200);
    expect((await admin.get('/api/admin/trips').query({ from: 'berlin', to: 'warsaw', sort: 'price', dir: 'asc' })).body.items[0].priceCents).toBe(3333);
    await pax.get('/api/admin/trips').expect(403);

    const routes = (await admin.get('/api/admin/routes').expect(200)).body;
    expect(routes.length).toBeGreaterThan(30);
    await admin.patch(`/api/admin/routes/${routes[0].id}`).send({ basePriceCents: routes[0].basePriceCents }).expect(204);

    const trip = await findTrip();
    const detail = await http().get(`/api/trips/${trip.id}`).expect(200);
    const seat = Array.from({ length: detail.body.seatCount }, (_, i) => i + 1).find((n) => !detail.body.takenSeats.includes(n))!;
    const b = await pax.post('/api/bookings').send({ tripId: trip.id, passengers: [{ name: 'Carol Test', seatNumber: seat }] });
    expect(b.status).toBe(201);
    await admin.post(`/api/admin/bookings/${b.body.id}/resend`).expect(400);
    await pax.post('/api/payments/mock/confirm').send({ bookingId: b.body.id }).expect(200);
    await admin.post(`/api/admin/bookings/${b.body.id}/resend`).expect(200);
    const cancelled = await admin.post(`/api/admin/bookings/${b.body.id}/cancel`).expect(200);
    expect(cancelled.body).toMatchObject({ status: 'CANCELLED', refunded: true });
    expect((await pax.get(`/api/bookings/${b.body.id}`)).body.status).toBe('CANCELLED');

    const found = (await admin.get('/api/admin/users').query({ q: 'carol', sort: 'email', dir: 'asc' }).expect(200)).body;
    expect(found.items).toHaveLength(1);
    expect(found.items[0]).toMatchObject({ role: 'USER', bookings: 1 });
    await admin.patch(`/api/admin/users/${found.items[0].id}/role`).send({ role: 'DRIVER' }).expect(204);
    await admin.patch(`/api/admin/users/${found.items[0].id}/role`).send({ role: 'ADMIN' }).expect(400);
    const me = (await admin.get('/api/admin/users').query({ q: 'admin@bustravel' })).body.items[0];
    await admin.patch(`/api/admin/users/${me.id}/role`).send({ role: 'USER' }).expect(403);
    await prisma.booking.deleteMany({ where: { contactEmail: 'carol@example.com' } });
    await prisma.user.deleteMany({ where: { email: 'carol@example.com' } });
  });

  async function macFor(code: string) {
    const { createHmac } = await import('crypto');
    return createHmac('sha256', process.env.TICKET_SECRET!).update(code).digest('base64url').slice(0, 22);
  }
});
