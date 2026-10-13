// Контракт cert-check: node --test test/cert-check.check.js
// Навмисно поза *.test.js: `npm run verify` лишається набором runtime-тестів дашборда.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { check, S0 as KIT_S0 } from '../scripts/cert-check.mjs';

const script = fileURLToPath(new URL('../scripts/cert-check.mjs', import.meta.url));
const F = 'docs/features/session-index';
const long = (s) => `${s}\n${'Текст документа учасника. '.repeat(20)}\n`;

function project(t, files) {
  const dir = fs.mkdtempSync(join(fs.realpathSync(tmpdir()), 'cert-check-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const [p, text] of Object.entries(files)) {
    fs.mkdirSync(dirname(join(dir, p)), { recursive: true });
    fs.writeFileSync(join(dir, p), text);
  }
  return dir;
}

const skeleton = "test('a', () => {});\ntest('b', () => {});\ntest('c', () => {});\n";
const filled = {
  'docs/architecture-map.md': long('# Map'),
  [`${F}/spec.md`]: long('## 5. Acceptance criteria\n- AC-01 список\n## Test plan\n| AC-01 | t |'),
  [`${F}/sad.md`]: long('---\ntarget_surfaces: [backend-service]\n---'),
  [`${F}/adr/0001-x.md`]: long('- **Status:** Accepted'),
  [`${F}/tasks.json`]: '{"tasks":[]}',
  [`${F}/_review/review.md`]: long('# Review'),
  'test/skeleton.test.js': skeleton,
  'test/sessions.test.js': "import test from 'node:test';\ntest('lists sessions', () => {});\n",
  'server.js': 'changed();\n',
};
const hash = (text) => createHash('sha256').update(text).digest('hex');
// The S0 fixture: server.js as shipped is 'original();', the skeleton test is the three-test file above.
const S0 = { code: { 'server.js': [hash('original();\n')] }, protected: { 'test/skeleton.test.js': [hash(skeleton)] } };

test('empty project: every required item is missing and the CLI exits 1 with lesson numbers', (t) => {
  const dir = project(t, { 'package.json': '{}' });
  const required = check(dir, S0).filter((i) => !i.bonus);
  const failed = required.filter((i) => !i.ok).map((i) => i.lesson);
  assert.ok(failed.includes(2) && failed.includes(3) && failed.includes(4) && failed.includes(5));
  const r = spawnSync(process.execPath, [script, dir], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /✘ урок 2: docs\/architecture-map\.md/);
  assert.match(r.stdout, /Бонус, на сертифікат не впливає/);
});

test('filled project passes every required item; bonuses stay optional', (t) => {
  const dir = project(t, filled);
  const items = check(dir, S0);
  assert.deepEqual(items.filter((i) => !i.bonus && !i.ok), []);
  assert.ok(items.some((i) => i.bonus && !i.ok));
});

test('a feature file copied byte for byte from examples fails the check', (t) => {
  const sad = long('---\ntarget_surfaces: [web-frontend]\n---');
  const dir = project(t, { ...filled, [`${F}/sad.md`]: sad, 'examples/session-index/sad.md': sad });
  const copy = check(dir, S0).find((i) => /examples/.test(i.label));
  assert.equal(copy.ok, false);
  assert.match(copy.hint, /sad\.md/);
});

test('a changed skeleton test fails the protected check', (t) => {
  const dir = project(t, filled);
  fs.writeFileSync(join(dir, 'test/skeleton.test.js'), skeleton + "test('d', () => {});\n");
  assert.equal(check(dir, S0).find((i) => /skeleton/.test(i.label)).ok, false);
});

test('the kit itself: shipped files match the newest S0 hash, so an edit without a hash update fails here', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  for (const [p, known] of Object.entries(KIT_S0.protected)) {
    const text = fs.readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n');
    assert.ok(known.includes(hash(text)), `${p}: add its hash to S0`);
  }
});

test('subtests and awaited tests count, skipped ones do not', (t) => {
  const dir = project(t, { ...filled, 'test/sessions.test.js': "test('a', async (t) => { await t.test('b', () => {}); });\ntest.skip('c', () => {});\n" });
  assert.match(check(dir, S0).find((i) => /нові тести/.test(i.label)).label, /: 2$/);
});
