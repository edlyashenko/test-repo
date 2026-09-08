---
paths: ["test/**"]
---

# Тести

- Рушій це вбудований `node:test` плюс `node:assert/strict`. Jest, Vitest і будь-який інший рушій не додаємо: dev-залежностей у репо нуль.
- `*.test.js` це рантайм-тести дашборда, їх ганяє `npm run verify` і CI. `*.check.js` це контракти зовнішніх артефактів; вони запускаються рукою і у ворота не входять.
- Перед роботою з сервером імпортуй `test/helpers.js`. Сам імпорт ставить `CLAUDE_HOME` на `fixtures/claude-home/`, тому особиста тека людини в тест не потрапляє.
- Сервер піднімай через `startServer()`: він робить `app.listen(0)` і бере порт із `server.address().port`. Порт 4180 це лише `npm run demo`.
- Підрахунки з диска роби через `test/oracle.js` чистим Node. CI ганяє Windows, де немає `find`, `grep`, `wc` і `jq`.
- Після зміни фікстур прожени `node scripts/pin-fixture-mtimes.mjs`. Git не зберігає mtime, тож без цього дати всіх сесій злипнуться в момент клону.
