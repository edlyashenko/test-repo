// Stop-hook для Claude Code: коли агент вважає роботу завершеною, запускаємо `npm run verify`.
// Читає JSON події зі stdin. `stop_hook_active: true` означає, що Claude вже продовжує роботу
// через цей самий hook, тому виходимо з 0, щоб не зациклити сесію. Інакше запускаємо verify
// у теці проєкту: код 0 пропускає зупинку, будь-який інший дає exit 2 з хвостом виводу в stderr.
// Лише exit 2 блокує; його stderr повертається моделі як вхід. Нічого на диск не пише.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch { raw = ''; }
let event = {};
try { event = raw.trim() ? JSON.parse(raw) : {}; } catch { event = {}; }

if (event.stop_hook_active === true) process.exit(0);

const cwd = typeof event.cwd === 'string' && event.cwd ? event.cwd : process.cwd();
const win = process.platform === 'win32';
const run = spawnSync(win ? 'npm.cmd' : 'npm', ['run', 'verify', '--silent'], {
  cwd,
  shell: win,
  encoding: 'utf8',
  timeout: 90_000,
  env: process.env,
});

if (run.status === 0) process.exit(0);

const code = run.status ?? (run.error?.code === 'ETIMEDOUT' ? 'timeout' : run.error?.code ?? run.signal ?? 'error');
const tail = `${run.stdout || ''}\n${run.stderr || ''}`.split(/\r?\n/).filter((l) => l.trim()).slice(-40).join('\n');
process.stderr.write(`npm run verify завершився з кодом ${code}. Не зупиняйся: виправ причину і запусти verify знову.\n${tail}\n`);
process.exit(2);
