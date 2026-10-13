#!/usr/bin/env node
// Self-check before sending the repo to the certificate bot: are the artefacts of lessons 2-5 in place?
// Read-only: it never writes, commits or runs the agent. Pure Node, no dependencies.
// Run: npm run cert-check   (or: node scripts/cert-check.mjs [project dir])
// Exit 0 when every required item is present, 1 otherwise. Bonus items never fail the check.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const FEATURE = 'docs/features/session-index';
const EXAMPLE = 'examples/session-index';

// Hashes of the S0 files (line endings normalised), every version the kit has shipped, newest first.
// Code files show whether the feature touched the app at all; protected files must stay as shipped.
// Edit any of these files in the kit → add its new hash here; test/cert-check.check.js catches a miss.
export const S0 = {
  code: {
    'lib/claude/index.js': ['81bfa0b32cb767172e94211af6db317fa6421f3221102e68b3222863065a2ccd'],
    'lib/sources.js': ['97be2ecbc74fa692e62a8186a455b1c5f22c85ca2f89d369ac04f82f4452304a'],
    'server.js': ['3941c8f1c7478337f9f925c080a2493ea673b90759801905389aef21eaf23044'],
    'views/layout.js': [
      '0e87559ddc87f04cc1d9999a8b6fd51352521a058372173134bec85fbcbfa063',
      '12df478938c6dc42244365d6afde0094a11be9928361bf3c5aceb7a8987291bf',
      '69ddcbe72d73917e5ad0c09f241c824e88e8c5fe6fb8d82eeacf2f529672162a',
      '90948aa3b57f285915f70f97c36db52fe77fdd5e4bfdca5f1aff62c377a0d0bf',
    ],
  },
  protected: {
    '.github/workflows/verify.yml': [
      '7895bb707f7c4b0a742c0d9674e03e26ed750461e77e1d4699b46f66a4df95f8',
      '5b78184a9ebffd5ba8ef6698125d217500a334285df00414c437ad8ffb9bc10f',
      '44950b1f2e125d72522ba516f40db5a0b0a916188b6b1b5d43fa05f7af63eaf7',
    ],
    'test/skeleton.test.js': [
      'b2531a32ddd2b1e1cabf0d9710fc5f0f8305d99792b814c00921cb12d44f8f60',
      'fef102fb1e7bc5708f72ec82040754eebd442f8684d0cf0d681aec383b52a4e0',
    ],
  },
};

const hash = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
const posix = (p) => p.split(sep).join('/');

function walk(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.isFile() ? [p] : [];
  });
}

// Counts test()/it() calls, skipped ones excluded. Good enough for a self-check; the bot runs the suite.
// Catches test(), it(), t.test() and await test(); .skip and .todo are not counted.
const countTests = (text) => (text.match(/(?<![.\w])(?:t\.)?(?:test|it)(?:\.only)?\s*\(/g) || []).length;

export function check(root, s0 = S0) {
  const at = (p) => join(root, p);
  const read = (p) => (existsSync(at(p)) ? readFileSync(at(p), 'utf8') : null);
  const files = (p) => walk(at(p)).map((f) => posix(relative(root, f)));
  const items = [];
  const add = (lesson, label, ok, hint, bonus = false) => items.push({ lesson, label, ok: Boolean(ok), hint, bonus });

  add(2, 'docs/architecture-map.md', read('docs/architecture-map.md'), 'запусти survey і перевір карту');

  const spec = read(`${FEATURE}/spec.md`);
  add(3, `${FEATURE}/spec.md з AC-`, spec && /\bAC-\d/.test(spec), 'specify → clarify');

  const featureFiles = files(FEATURE);
  const hasPlan = (spec && /^#{1,3}\s*Test plan/im.test(spec)) || featureFiles.some((f) => /test-plan\.md$/i.test(f));
  add(3, 'Test plan (розділ у spec.md або окремий файл)', hasPlan, 'plan-tests session-index');

  const sad = read(`${FEATURE}/sad.md`);
  add(3, `${FEATURE}/sad.md з target_surfaces`, sad && /target_surfaces\s*:/.test(sad), 'design session-index');

  const adrs = featureFiles.filter((f) => /\/adr\/[^/]+\.md$/.test(f) && /Status:?\**\s*:?\s*Accepted/i.test(read(f)));
  add(3, 'ADR зі Status: Accepted у теці фічі', adrs.length, 'прийми рішення в design');

  let tasksOk = false;
  try { tasksOk = Boolean(JSON.parse(read(`${FEATURE}/tasks.json`) ?? 'null')); } catch { tasksOk = false; }
  add(3, `${FEATURE}/tasks.json`, tasksOk, 'tasks session-index');

  const ownTests = files('test')
    .filter((f) => f.endsWith('.test.js') && !Object.keys(s0.protected).includes(f))
    .reduce((n, f) => n + countTests(read(f)), 0);
  add(4, `нові тести поверх трьох стартових: ${ownTests}`, ownTests > 0, 'implement session-index з TDD');

  const codeNow = [...files('lib'), ...files('views'), 'server.js'].filter((f) => f.endsWith('.js') && existsSync(at(f)));
  const codeChanged = codeNow.some((f) => !(s0.code[f] || []).includes(hash(read(f))))
    || Object.keys(s0.code).some((f) => !existsSync(at(f)));
  add(4, 'код у lib/, views/ або server.js змінено відносно S0', codeChanged, 'implement session-index');

  const reviews = featureFiles.filter((f) => f.startsWith(`${FEATURE}/_review/`) && f.endsWith('.md'));
  add(5, `${FEATURE}/_review/*.md`, reviews.length, 'review session-index');

  for (const [f, known] of Object.entries(s0.protected)) {
    const text = read(f);
    add('4–5', `${f} не змінено`, text !== null && known.includes(hash(text)), `поверни файл: git checkout FEATURE_BASE_COMMIT -- ${f} (хеш у docs/practice/04-workflow.md)`);
  }

  // Short files (presets, stubs) can match by accident; only real documents count as a copy.
  const real = (f) => read(f).trim().length > 200;
  const exampleHashes = new Set(files(EXAMPLE).filter(real).map((f) => hash(read(f))));
  const copied = featureFiles.filter((f) => real(f) && exampleHashes.has(hash(read(f))));
  add(3, 'файли фічі не скопійовані з examples/session-index/', copied.length === 0,
    copied.length ? `збігаються з прикладом лектора: ${copied.slice(0, 3).join(', ')}${copied.length > 3 ? ` і ще ${copied.length - 3}` : ''}` : '');

  add(4, 'docs/practice/04-workflow.md (карта виконання)', read('docs/practice/04-workflow.md'), 'урок 4, крок 5', true);
  add(5, 'docs/practice/05-verification.md (Канва 05)', read('docs/practice/05-verification.md'), 'урок 5, крок 4', true);
  add(6, 'docs/practice/06-delta.md (підсумкова записка)', read('docs/practice/06-delta.md'), 'урок 6', true);

  return items;
}

function git(root, args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

function main() {
  const root = resolve(process.argv[2] || process.cwd());
  const items = check(root);
  const required = items.filter((i) => !i.bonus);
  const line = (i) => `  ${i.ok ? '✔' : '✘'} урок ${i.lesson}: ${i.label}${i.ok || !i.hint ? '' : `  → ${i.hint}`}`;

  console.log('Обовʼязкове для сертифіката:');
  required.forEach((i) => console.log(line(i)));
  console.log('\nБонус, на сертифікат не впливає:');
  items.filter((i) => i.bonus).forEach((i) => console.log(line(i)));

  const status = git(root, ['status', '--porcelain']);
  const branch = git(root, ['branch', '--show-current']);
  const warnings = [];
  if (status === null) warnings.push('це не git-репозиторій: боту потрібне посилання на публічний репо з історією');
  else {
    if (status) warnings.push('є незакомічені зміни: бот бачить лише те, що запушено');
    if (branch && branch !== 'main') warnings.push(`поточна гілка ${branch}: бот дивиться на main. Злий гілку фічі в main або перейменуй гілку: git branch -M main`);
  }
  if (warnings.length) console.log('\nУвага:\n' + warnings.map((w) => `  ! ${w}`).join('\n'));

  const missing = required.filter((i) => !i.ok).length;
  console.log(missing ? `\nБракує обовʼязкового: ${missing}. Деталі в README, розділ «Сертифікат».`
    : '\nУсе обовʼязкове на місці. Запуш у публічний репо, дочекайся зеленого verify у Actions і надішли посилання боту.');
  process.exitCode = missing ? 1 : 0;
}

// realpath on both sides: through a symlinked folder argv[1] and import.meta.url differ.
const self = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
if (process.argv[1] && self(process.argv[1]) === self(fileURLToPath(import.meta.url))) main();
