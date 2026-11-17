import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const directories = ['src', 'scripts', 'test'];
function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(name);
    else if (/\.(mjs|cjs)$/.test(name)) yield name;
  }
}
for (const directory of directories) for (const file of walk(directory)) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
}
console.log('JavaScript syntax verified.');
