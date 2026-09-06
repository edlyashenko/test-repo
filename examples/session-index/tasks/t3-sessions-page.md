---
id: T3
title: "Сторінка переліку сесій замість «No slice is wired up yet»"
layer: "ui"
deps: ["T1"]
blocks: ["T4"]
acs: ["AC-01", "AC-01d", "AC-02"]
files_hint: ["views/sessions.js", "server.js", "test/session-index.test.js"]
owner: "розробник"
estimate: "S"
context_budget: "M"
status: "done"
---

# T3 - Сторінка переліку сесій замість «No slice is wired up yet»

## Place in the sequence

- **Blocked by:** T1 - listSessions · **Blocks:** T4 - приймальні тести · **Wave:** 2, після T2 через спільний `server.js`.
- **Lane:** shares `server.js` with T2 - serialized.

## Why (user story)

> **As a** розробник
> **I want** бачити біля кожної сесії, з якого вона проєкту
> **So that** знайти сесію потрібного репозиторію, не відкриваючи файли
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

Цей таск малює таблицю: ідентифікатор, проєкт як похідний шлях із позначкою, розмір, час; порожній стан лишається для порожньої теки.

## Inlined context

> `views/sessions.js` + sessionsPage(sessions, { claudeHome }): таблиця або порожній стан
>
> — `sad.md §5, Internal decomposition, abridged` · full text: [sad.md](../sad.md)

> UI-архітектура: server-rendered HTML з template literals, без клієнтського JS. CSP забороняє все, крім `self`, build step відсутній.
>
> — `sad.md §4, стратегічний вибір 1, abridged` · full text: [sad.md](../sad.md)

> Shared primitives: `esc()` для HTML-escaping (`views/layout.js:3-9`), `empty()` для порожнього стану (`views/layout.js:35-37`); готові стилі таблиці, `.num` для чисел, `.dim`, `.sub` (`public/style.css:32-39`). Closest UI precedent: порожня сторінка `/` = `layout({ title, body })` з `empty(...)` (`server.js:17-24`).
>
> — `docs/architecture-map.md §Frontend / UI foundation, abridged` · історичне джерело того прогону; у поточній практиці карту створює survey.

> шлях проєкту з розміткою або службовими символами в імені теки: сторінка показує його як текст, розмітка не виконується.
>
> — `spec.md §6.1, Abuse cases, abridged` · full text: [spec.md](../spec.md)

> **Hard rule:** тести без shell-команд (`find`, `grep`, `wc`, `jq`, `child_process`): такий тест ламає `npm run verify` на Windows. Підрахунки з диска робить `test/oracle.js`.
>
> — `CLAUDE.md §Тести, verbatim` · full text: [CLAUDE.md](../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface. Сторінка бере ті самі записи, що й T2, через `getSource('claude').listSessions({ limit })`.

## Acceptance criteria

### AC-01 - happy path

> **Given** розробник запустив дашборд на домашній теці з фікстур, де в трьох проєктах лежать шість файлів сесій із різним часом останньої зміни (запуск перевірок і демо сам вирівнює цей час під вміст файлів, бо система контролю версій його не зберігає)
> **When** розробник відкриває головну сторінку
> **Then** розробник бачить шість рядків, кожен з ідентифікатором сесії, назвою проєкту, розміром файлу в байтах і часом останньої зміни у форматі ISO 8601 в UTC; рядки впорядковані від найсвіжішого до найстарішого, а при однаковому часі за ідентифікатором сесії за зростанням
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-01d - happy path, назва проєкту

> **Given** тека проєкту з іменем, у якому шлях робочої теки записаний через дефіси
> **When** розробник дивиться на рядок сесії
> **Then** розробник бачить шлях проєкту, відновлений з імені теки, і поруч видиму позначку, що шлях похідний і може не збігатися з оригіналом
>
> — `spec.md §5, AC-01d, verbatim` · full text: [spec.md](../spec.md)

### AC-02 - error

> **Given** домашня тека вказує на шлях, де теки проєктів немає або її не можна прочитати
> **When** розробник відкриває головну сторінку
> **Then** розробник бачить порожній стан із поясненням, що сесій не знайдено, і сторінка не показує помилку сервера; це стосується і відсутньої теки, і помилки прав на ній (у приймальному тесті відтворюється лише відсутня тека, бо помилку прав на всіх ОС не зробити)
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] RED: `srv.text('/')` містить `<table`, шість рядків із `sessionId`, відновлений шлях `/Users/demo/sources/checkout/api` (правило SAD §11: кожен `-` → `/`, тому дефіс у `checkout-api` теж стає `/`; саме тому поруч позначка) і позначку «похідний»; на `CLAUDE_HOME` без теки проєктів сторінка містить `class="empty"` і не містить `<table` - `test/session-index.test.js`
- [ ] GREEN: `views/sessions.js` експортує `sessionsPage(sessions, { claudeHome })`: таблиця з колонками sessionId / проєкт (`projectPath` + `<span class="dim">похідний</span>`) / розмір `.num` / час ISO; порожній масив → `empty('Сесій не знайдено')`; усі значення через `esc()` - `views/sessions.js`
- [ ] `app.get('/')` бере `getSource('claude').listSessions({ limit })` і рендерить `sessionsPage`; `<title>` лишається `agent-ops` - `server.js`
- [ ] `npm run verify` зелений

## Edge cases

| Case | Behaviour |
|---|---|
| нуль сесій | порожній стан, без таблиці |
| slug із `<` або `&` | екрановано через `esc()`, розмітка не виконується |
| `limit` в адресі сторінки | та сама логіка, що в T2 (дефолт 50) |

## Definition of Done

- [ ] тест T3 був GOOD red (таблиці нема) і став GREEN
- [ ] скелетний тест на `<title>agent-ops</title>` і CSP проходить без змін
- [ ] коміт з трейлерами `SDD-Task: T3`, `SDD-AC: AC-01`, `SDD-AC: AC-01d`, `SDD-AC: AC-02`
