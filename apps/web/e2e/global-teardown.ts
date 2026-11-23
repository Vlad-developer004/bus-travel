import { spawnSync } from 'node:child_process';
import path from 'node:path';

export default function teardown() {
  if (process.env.CI) return;
  spawnSync('npm run db:clean-e2e', { cwd: path.join(__dirname, '../../api'), shell: true, stdio: 'inherit' });
}
