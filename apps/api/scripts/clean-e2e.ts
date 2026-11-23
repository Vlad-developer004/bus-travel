import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const users = await prisma.user.findMany({ where: { email: { startsWith: 'e2e-', endsWith: '@example.com' } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (!ids.length) return console.log('No e2e data to clean');
  await prisma.review.deleteMany({ where: { userId: { in: ids } } });
  const b = await prisma.booking.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`Removed ${ids.length} e2e users and ${b.count} bookings`);
}

main().finally(() => prisma.$disconnect());
