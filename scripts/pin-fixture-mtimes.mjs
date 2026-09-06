#!/usr/bin/env node
// git does not store file mtimes: after a clone every fixture session carries the same mtime (the
// checkout moment). Anything that sorts or buckets sessions by mtime then sees six identical dates.
// This pins each session file's mtime to its own last `timestamp`, exactly like make-fixtures.mjs
// did when it wrote them. Runs before `verify` and `demo` (see package.json), safe to run any time.
import { readdirSync, readFileSync, statSync, utimesSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'claude-home', 'projects');

let pinned = 0;
for (const project of readdirSync(root)) {
  const dir = join(root, project);
  if (!statSync(dir).isDirectory()) continue;
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (!name.endsWith('.jsonl') || !statSync(file).isFile()) continue;
    const stamps = readFileSync(file, 'utf8')
      .split('\n')
      .map((line) => { try { return JSON.parse(line).timestamp; } catch { return undefined; } })
      .filter(Boolean)
      .sort();
    if (!stamps.length) continue;
    const last = new Date(stamps[stamps.length - 1]);
    utimesSync(file, last, last);
    pinned += 1;
  }
}
console.log(`fixture mtimes pinned: ${pinned} session files`);
