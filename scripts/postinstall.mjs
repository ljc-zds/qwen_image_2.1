import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('data', { recursive: true });
const result = spawnSync(process.execPath, ['scripts/db-setup.mjs'], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
