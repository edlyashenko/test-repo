// Separate read-only-tool checks. npm run verify keeps its two runtime tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareKit } from '../scripts/compare-kit.mjs';

const cli = fileURLToPath(new URL('../scripts/compare-kit.mjs', import.meta.url));
function fixture(t) {
  const temp = fs.mkdtempSync(join(fs.realpathSync(tmpdir()), 'mini-compare-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const current = join(temp, 'my working kit'), baseline = join(temp, 'untouched kit');
  for (const dir of [current, baseline]) {
    fs.mkdirSync(dir);
    fs.writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'agent-ops-dashboard' }));
    fs.writeFileSync(join(dir, 'server.js'), 'same bytes\n');
  }
  return { temp, current, baseline };
}
function put(root, name, text = 'data') { const file = join(root, name); fs.mkdirSync(dirname(file), { recursive: true }); fs.writeFileSync(file, text); }
function run(current, baseline) { return spawnSync(process.execPath, [cli, baseline], { cwd: current, encoding: 'utf8' }); }

test('two added practice documents are listed in deterministic order, including spaces in roots', t => {
  const { current, baseline } = fixture(t);
  put(current, 'docs/practice/handoff.md'); put(current, 'docs/practice/02-context.md');
  const expected = [{ status: 'ADDED', path: 'docs/practice/02-context.md' }, { status: 'ADDED', path: 'docs/practice/handoff.md' }];
  assert.deepEqual(compareKit(current, baseline), expected);
  const result = run(current, baseline);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stdout, 'ADDED\tdocs/practice/02-context.md\nADDED\tdocs/practice/handoff.md\nSUMMARY added=2 changed=0 removed=0\n');
});

test('reports runtime byte changes and removed files; ignores mtime differences', t => {
  const { current, baseline } = fixture(t);
  fs.writeFileSync(join(current, 'server.js'), Buffer.from([0, 1, 2]));
  put(baseline, 'views/removed.js');
  fs.utimesSync(join(current, 'package.json'), new Date(0), new Date(0));
  assert.deepEqual(compareKit(current, baseline), [{ status: 'CHANGED', path: 'server.js' }, { status: 'REMOVED', path: 'views/removed.js' }]);
});

test('ignores only dependency/git directories and OS metadata, preserving .claude rules', t => {
  const { current, baseline } = fixture(t);
  for (const name of ['node_modules/a.js', '.git/config', '.DS_Store', 'Thumbs.db']) put(current, name);
  assert.deepEqual(compareKit(current, baseline), []);
  put(current, '.claude/rules/new.md');
  assert.deepEqual(compareKit(current, baseline), [{ status: 'ADDED', path: '.claude/rules/new.md' }]);
});

test('identical copies return zero without changing source bytes', t => {
  const { current, baseline } = fixture(t);
  const before = fs.readFileSync(join(current, 'server.js'));
  const result = run(current, baseline);
  assert.equal(result.status, 0); assert.equal(result.stdout, 'SUMMARY added=0 changed=0 removed=0\n');
  assert.deepEqual(fs.readFileSync(join(current, 'server.js')), before);
});

test('rejects invalid roots, wrong package names and nested copies', t => {
  const { current, baseline } = fixture(t);
  assert.throws(() => compareKit(current, current), /separate/);
  const missing = run(current, join(baseline, 'absent'));
  assert.equal(missing.status, 2); assert.match(missing.stderr, /ERROR:/); assert.equal(missing.stdout, '');
  fs.writeFileSync(join(baseline, 'package.json'), '{');
  assert.equal(run(current, baseline).status, 2);
  fs.writeFileSync(join(baseline, 'package.json'), '{"name":"unrelated"}');
  assert.throws(() => compareKit(current, baseline), /Wrong package.name/);
  assert.throws(() => compareKit(baseline, current), /Wrong package.name/);
});

test('rejects symlinks to files or directories, including root and ignored names', t => {
  const { temp, current, baseline } = fixture(t);
  for (const name of ['linked.js', 'node_modules', 'linked-dir']) {
    const target = name === 'linked.js' ? join(baseline, 'server.js') : baseline;
    const link = join(current, name);
    fs.symlinkSync(target, link, name === 'linked.js' ? 'file' : 'junction');
    assert.throws(() => compareKit(current, baseline), /Symbolic link/);
    fs.unlinkSync(link);
  }
  const rootLink = join(temp, 'baseline-link'); fs.symlinkSync(baseline, rootLink, 'junction');
  assert.throws(() => compareKit(current, rootLink), /Symbolic link/);
});

test('unreadable file fails the whole comparison without a partial report', t => {
  if (process.platform === 'win32' || process.getuid?.() === 0) return t.skip('POSIX permission test requires a non-root user');
  const { current, baseline } = fixture(t);
  const file = join(current, 'unreadable.txt'); fs.writeFileSync(file, 'test data'); fs.chmodSync(file, 0);
  try { const result = run(current, baseline); assert.equal(result.status, 2); assert.match(result.stderr, /EACCES|EPERM/); assert.equal(result.stdout, ''); }
  finally { fs.chmodSync(file, 0o600); }
});
