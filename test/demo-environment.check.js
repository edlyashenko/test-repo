// Separate safety regression: node --test test/demo-environment.check.js
// The two-test teaching baseline remains test/*.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { demoEnvironment, fixtureHome, repoRoot } from '../scripts/demo.mjs';

test('demo overrides inherited personal paths and port without mutating caller input', () => {
  const inherited = { CLAUDE_HOME: '/personal-must-not-be-read', PORT: '9999', OTHER: 'keep' };
  assert.deepEqual(demoEnvironment(inherited), { ...inherited, CLAUDE_HOME: fixtureHome, PORT: '4180' });
  assert.equal(inherited.CLAUDE_HOME, '/personal-must-not-be-read');
  assert.equal(inherited.PORT, '9999');
  assert.equal(fixtureHome, join(repoRoot, 'fixtures', 'claude-home'));
});

test('absolute fixture path is independent of working directory', () => {
  const moduleUrl = new URL('../scripts/demo.mjs', import.meta.url).href;
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', `const {demoEnvironment}=await import(${JSON.stringify(moduleUrl)}); console.log(JSON.stringify(demoEnvironment({CLAUDE_HOME:'elsewhere',PORT:'9999'})));`], { cwd: tmpdir(), encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout), { CLAUDE_HOME: fixtureHome, PORT: '4180' });
});

test('test helper overrides inherited CLAUDE_HOME before any server import', () => {
  const moduleUrl = new URL('./helpers.js', import.meta.url).href;
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', `const {fixtureHome}=await import(${JSON.stringify(moduleUrl)}); console.log(JSON.stringify({actual:process.env.CLAUDE_HOME,fixtureHome}));`], { cwd: tmpdir(), env: { ...process.env, CLAUDE_HOME: '/personal-must-not-be-read', PORT: '9999' }, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout), { actual: fixtureHome, fixtureHome });
});

test('demo command uses safe launcher and baseline selector remains unchanged', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.demo, 'node scripts/demo.mjs');
  assert.equal(pkg.scripts.predemo, 'node scripts/pin-fixture-mtimes.mjs');
  assert.equal(pkg.scripts.verify, 'node --test --test-reporter=spec "test/*.test.js"');
});
