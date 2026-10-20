# Architecture map (TEST REPOSITORY)

> Тестовий репозиторій для перевірки бота сертифікатів Інтенсиву. Не є прикладом проходження практики.

- `server.js` - Express-застосунок: `/api/health`, `/api/sessions`, сторінка `/`.
- `lib/sources.js` - реєстр адаптерів джерел телеметрії.
- `lib/claude/index.js` - адаптер Claude Code: тека `CLAUDE_HOME`, індекс сесій з метаданих файлів.
- `views/layout.js` - серверний HTML-шаблон з CSP.
- `test/` - тести на `node:test` поверх фікстур `fixtures/claude-home`.
