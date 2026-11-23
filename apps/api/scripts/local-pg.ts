import { existsSync } from 'fs';
import { join } from 'path';

const EmbeddedPostgres = require('embedded-postgres').default;

export interface LocalPg {
  url: string;
  stop: () => Promise<void>;
}

export async function startLocalPg(opts: { dir: string; port: number; database: string; persistent?: boolean }): Promise<LocalPg> {
  const pg = new EmbeddedPostgres({
    databaseDir: opts.dir,
    user: 'postgres',
    password: 'postgres',
    port: opts.port,
    persistent: opts.persistent ?? true,
    onLog: () => undefined,
    onError: () => undefined,
  });
  if (!existsSync(join(opts.dir, 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase(opts.database);
  } catch {
  }
  return {
    url: `postgresql://postgres:postgres@localhost:${opts.port}/${opts.database}`,
    stop: () => pg.stop(),
  };
}

if (require.main === module) {
  startLocalPg({ dir: join(__dirname, '..', '.pgdata'), port: 5433, database: 'bustravel' }).then((db) => {
    console.log(`PostgreSQL is running: ${db.url}`);
    console.log('Press Ctrl+C to stop.');
    const stop = () => db.stop().finally(() => process.exit(0));
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  });
}
