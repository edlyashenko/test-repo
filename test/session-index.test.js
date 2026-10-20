import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { startServer, fixtureHome } from './helpers.js';
import { sessionFiles } from './oracle.js';

const srv = await startServer();
after(() => srv.close());

test('AC-01: the index lists exactly the one-level session files', async () => {
  const expected = sessionFiles(join(fixtureHome, 'projects'), { exactDepth: 2 });
  const { sessions } = await srv.json('/api/sessions');
  assert.equal(sessions.length, expected.length);
});

test('AC-02: sessions are sorted newest first', async () => {
  const { sessions } = await srv.json('/api/sessions');
  for (let i = 1; i < sessions.length; i++) assert.ok(sessions[i - 1].mtime >= sessions[i].mtime);
});

test('AC-03: limit caps the number of rows', async () => {
  const { sessions } = await srv.json('/api/sessions?limit=2');
  assert.equal(sessions.length, 2);
});
