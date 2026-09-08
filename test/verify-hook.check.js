// Контракт Stop-hook: node --test test/verify-hook.check.js
// Навмисно поза *.test.js: `npm run verify` лишається набором runtime-тестів дашборда.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const hook = join(root, 'scripts', 'verify-hook.mjs');
const read = (p) => fs.readFileSync(join(root, p), 'utf8');

function project(t, exitCode) {
  const dir = fs.mkdtempSync(join(fs.realpathSync(tmpdir()), 'mini-hook-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'hook-probe', private: true,
    scripts: { verify: `node -e "require('fs').writeFileSync('ran.txt','1'); console.log('probe verify'); process.exit(${exitCode})"` },
  }));
  return dir;
}
function runHook(input, cwd) {
  return spawnSync(process.execPath, [hook], { input, cwd, encoding: 'utf8' });
}

test('settings.example.json declares exactly one Stop hook that runs the verify script', () => {
  const example = JSON.parse(read('.claude/settings.example.json'));
  assert.deepEqual(example, { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'node scripts/verify-hook.mjs', timeout: 120 }] }] } });
  assert.match(read('.gitignore'), /^\.claude\/settings\.local\.json$/m);
});

test('stop_hook_active: true exits 0 without running npm', (t) => {
  const dir = project(t, 1);
  const r = runHook('{"stop_hook_active":true,"cwd":' + JSON.stringify(dir) + '}', dir);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(join(dir, 'ran.txt')), 'verify must not run when the hook is already re-entered');
});

test('a red verify blocks the stop with exit 2 and the exit code in stderr', (t) => {
  const dir = project(t, 1);
  const r = runHook('{"stop_hook_active":false,"cwd":' + JSON.stringify(dir) + '}', root);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /npm run verify завершився з кодом 1/);
  assert.match(r.stderr, /Не зупиняйся/);
  assert.match(r.stderr, /probe verify/);
  assert.ok(fs.existsSync(join(dir, 'ran.txt')));
});

test('a green verify lets the stop through with exit 0; cwd falls back to process.cwd()', (t) => {
  const dir = project(t, 0);
  const r = runHook('{"stop_hook_active":false}', dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, '');
  assert.ok(fs.existsSync(join(dir, 'ran.txt')));
  const empty = runHook('', dir);
  assert.equal(empty.status, 0, 'empty stdin is treated as a plain stop');
});
