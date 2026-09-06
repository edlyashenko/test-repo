---
id: T2
title: "Маршрут переліку сесій у JSON з лімітом з адреси"
layer: "ports"
deps: ["T1"]
blocks: ["T4"]
acs: ["AC-01", "AC-01b", "AC-01c"]
files_hint: ["server.js", "test/session-index.test.js"]
owner: "розробник"
estimate: "S"
context_budget: "M"
status: "done"
---

# T2 - Маршрут переліку сесій у JSON з лімітом з адреси

## Place in the sequence

- **Blocked by:** T1 - listSessions · **Blocks:** T4 - приймальні тести · **Wave:** 2, разом із T3 за залежностями, але послідовно.
- **Lane:** shares `server.js` with T3 - serialized.

## Why (user story)

> **As a** розробник
> **I want** відкрити дашборд і побачити перелік своїх сесій, найсвіжіша зверху
> **So that** за пʼять секунд знати, що я робив останнім і скільки сесій узагалі є
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

Цей таск дає машинний перелік: той самий індекс через маршрут, з лімітом з адреси і дефолтом 50.

## Inlined context

> Сторінка і маршрут беруть індекс через реєстр джерел: `server.js` перестає імпортувати адаптер Claude напряму заради даних і бере `getSource('claude').listSessions()`.
>
> — `sad.md §4, стратегічний вибір 4, abridged` · full text: [sad.md](../sad.md)

> Limits: `limit` з адреси; нечислове, 0 або відʼємне → 50; більше за 50 виконується як є.
>
> — `sad.md §8, рядок Limits, verbatim` · full text: [sad.md](../sad.md)

> Chosen: через реєстр. Ідентифікатор `'claude'` у `server.js` лишається на цьому зрізі: перебір усіх джерел це робота S7.
>
> — `adr/0003, Decision outcome, abridged` · full text: [0003](../adr/0003-resolve-the-sessions-page-through-the-source-registry.md)

> Новий JSON-маршрут → `app.get('/api/...')` за зразком `/api/health` (`server.js:13-15`).
>
> — `docs/architecture-map.md §Where things live, abridged` · історичне джерело того прогону; у поточній практиці карту створює survey.

> **Hard rule:** тести без shell-команд (`find`, `grep`, `wc`, `jq`, `child_process`): такий тест ламає `npm run verify` на Windows. Підрахунки з диска робить `test/oracle.js`.
>
> — `CLAUDE.md §Тести, verbatim` · full text: [CLAUDE.md](../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Стадію `api` на цьому зрізі пропущено, контракт описаний тут:

- маршрут переліку: `/api/sessions`, необовʼязковий параметр `limit` (ціле > 0; інакше 50)
- відповідь: `{ sessions: [ { sessionId, project, projectPath, derived, size, mtime } ], limit }`, масив від свіжих
- відсутня тека → `{ sessions: [], limit }`, статус успішний

— `sad.md §5 C4 Container + §8 Limits, abridged` · full text: [sad.md](../sad.md)

## Acceptance criteria

### AC-01 - happy path

> **Given** розробник запустив дашборд на домашній теці з фікстур, де в трьох проєктах лежать шість файлів сесій із різним часом останньої зміни (запуск перевірок і демо сам вирівнює цей час під вміст файлів, бо система контролю версій його не зберігає)
> **When** розробник відкриває головну сторінку
> **Then** розробник бачить шість рядків, кожен з ідентифікатором сесії, назвою проєкту, розміром файлу в байтах і часом останньої зміни у форматі ISO 8601 в UTC; рядки впорядковані від найсвіжішого до найстарішого, а при однаковому часі за ідентифікатором сесії за зростанням
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-01b - happy path, ліміт

> **Given** та сама домашня тека з шістьма сесіями
> **When** розробник просить показати лише дві найсвіжіші, задавши ліміт в адресі сторінки (окремого контролу на сторінці немає)
> **Then** розробник бачить рівно два рядки, і це дві сесії з найпізнішим часом останньої зміни
>
> — `spec.md §5, AC-01b, verbatim` · full text: [spec.md](../spec.md)

### AC-01c - happy path, ліміт за замовчуванням

> **Given** домашня тека з будь-якою кількістю сесій
> **When** розробник відкриває перелік, не задаючи ліміт
> **Then** розробник бачить не більше ніж пʼятдесят найсвіжіших сесій; на фікстурах це всі шість. Пʼятдесят це дефолт, а не стеля: явно заданий більший ліміт виконується. Нуль, відʼємне або нечислове значення ліміту дає ті самі пʼятдесят
>
> — `spec.md §5, AC-01c, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] RED: запит переліку через `srv.json('/api/sessions')` дає шість записів від свіжих з усіма полями; `?limit=2` дає два найсвіжіші; `?limit=0`, `?limit=abc` дають ті самі шість (дефолт 50) - `test/session-index.test.js`
- [ ] GREEN: `app.get('/api/sessions', ...)` бере `getSource('claude').listSessions({ limit })`; парсинг `limit` через `Number.parseInt`, невалідне → 50 - `server.js`
- [ ] прямий імпорт `claudeHome` лишити лише для підпису сторінки і здоровʼя; імпортувати `getSource` з `lib/sources.js` - `server.js`
- [ ] `npm run verify` зелений

## Edge cases

| Case | Behaviour |
|---|---|
| `limit=0`, `limit=-3`, `limit=abc`, без параметра | 50 найсвіжіших |
| `limit=200` | до 200, стелі немає |
| тека проєктів відсутня | порожній масив, успішна відповідь |

## Definition of Done

- [ ] тест T2 був GOOD red (маршрут відсутній) і став GREEN
- [ ] `/api/health` відповідає як раніше (скелетний тест без змін)
- [ ] коміт з трейлерами `SDD-Task: T2`, `SDD-AC: AC-01`, `SDD-AC: AC-01b`, `SDD-AC: AC-01c`
