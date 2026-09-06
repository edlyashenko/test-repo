// Integration safety check: run after npm ci, separately from the two-test baseline.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('occupied demo port exits nonzero, reports EADDRINUSE and never announces success', async t => {
  try { await import('express'); }
  catch (error) { if (error.code === 'ERR_MODULE_NOT_FOUND') return t.skip('Run npm ci before this HTTP integration check'); throw error; }
  const blocker = createServer();
  const owned = await new Promise((resolve, reject) => {
    blocker.once('error', error => error.code === 'EADDRINUSE' ? resolve(false) : reject(error));
    blocker.listen(4180, '127.0.0.1', () => resolve(true));
  });
  if (owned) t.after(() => new Promise(resolve => blocker.close(resolve)));
  // If 4180 was already occupied, leave that process untouched and check the same failure.
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/demo.mjs', import.meta.url))], {
    encoding: 'utf8', timeout: 5000,
    env: { ...process.env, CLAUDE_HOME: '/nonpersonal-sentinel', PORT: '9999' },
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Demo failed to listen on 127\.0\.0\.1:4180: EADDRINUSE/);
  assert.doesNotMatch(result.stdout, /agent-ops on http/);
});
