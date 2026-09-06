# agent-ops-dashboard, пакет мінікурсу

Це стартовий CLAUDE.md пакета. Урок 2 його розширює за шаблоном `templates/02-context-pack.md`.

## Запуск і перевірка

- `npm run verify` перед кожним комітом. Зараз у наборі два тести на скелет; кожна задача додає свої.
- `npm run demo` запускає дашборд на фікстурах: `CLAUDE_HOME=./fixtures/claude-home` з `.env.fixtures`.
- Домашню теку `~/.claude` не читати і не брати як зразок формату. Формат сесій видно у `fixtures/claude-home/`.

## Тести

- Тести не викликають shell-команд (`find`, `grep`, `wc`, `jq`, `child_process`): такий тест ламає `npm run verify` на Windows. Підрахунки з диска робить `test/oracle.js` на чистому Node, бери його.
- Порядок «від свіжих» перевіряй лише після `npm run verify` або `npm run demo`: git не зберігає mtime, тому `preverify` і `predemo` спершу вирівнюють дати фікстур скриптом `scripts/pin-fixture-mtimes.mjs`.

## Матеріали курсу

- `examples/` це артефакти лектора для читання людиною. Під час specify, design, tasks, implement і review їх не читати і не копіювати, якщо людина прямо не попросила.
- Документи курсу студента: `docs/practice/`. Артефакти фічі: `docs/features/session-index/`.
