import { execSync } from 'child_process';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { startLocalPg } from '../scripts/local-pg';

export default async function globalSetup() {
  if (!process.env.DATABASE_URL) {
    const db = await startLocalPg({
      dir: mkdtempSync(join(tmpdir(), 'bt-e2e-')),
      port: 5544,
      database: 'bustravel_test',
      persistent: false,
    });
    process.env.DATABASE_URL = db.url;
    (globalThis as any).__LOCAL_PG__ = db;
  }

  Object.assign(process.env, {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    JWT_ACCESS_SECRET: 'test-access-secret-0123456789-abcdefghij',
    JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789-abcdefghi',
    TICKET_SECRET: 'test-ticket-secret-0123456789-abcdefghij',
    PAYMENT_PROVIDER: 'mock',
    THROTTLE_DISABLED: 'true',
    BCRYPT_ROUNDS: '4',
  });

  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
  execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit', env: process.env });
}
