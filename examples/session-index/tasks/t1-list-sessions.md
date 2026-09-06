---
id: T1
title: "Додати listSessions в адаптер Claude: індекс сесій з readdir + stat"
layer: "infra"
deps: []
blocks: ["T2", "T3", "T4"]
acs: ["AC-01", "AC-02", "AC-02b", "AC-03", "AC-04"]
files_hint: ["lib/claude/index.js", "test/session-index.test.js"]
owner: "розробник"
estimate: "M"
context_budget: "M"
status: "done"
---

# T1 - Додати listSessions в адаптер Claude: індекс сесій з readdir + stat

## Place in the sequence

- **Blocked by:** нічого · **Blocks:** T2 - маршрут переліку, T3 - сторінка переліку, T4 - приймальні тести зрізу · **Wave:** 1, бо всі решта беруть дані звідси.
- **Lane:** own lane; `test/session-index.test.js` ділить із T2-T4, але вони йдуть після T1 за залежністю.

## Why (user story)

> **As a** розробник
> **I want** відкрити дашборд і побачити перелік своїх сесій, найсвіжіша зверху
> **So that** за пʼять секунд знати, що я робив останнім і скільки сесій узагалі є
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

Цей таск дає саму функцію індексу: дані від свіжих, без вкладеного шуму, порожній результат на битій теці. Сторінки і маршруту тут ще нема.

## Inlined context

> Індекс будується лише з метаданих файлової системи (імʼя файлу, розмір, час останньої зміни), без читання вмісту. Сесією вважається один файл рівно на один рівень під текою проєкту; вкладені транскрипти субагентів і результати інструментів у перелік не потрапляють. Порожня, відсутня або нечитабельна тека дає порожній стан, а не помилку.
>
> — `spec.md §1, ¶3, verbatim` · full text: [spec.md](../spec.md)

> `lib/claude/index.js` + listSessions({ limit }): readdir(projectsDir) → readdir(<slug>) → stat → sort
>
> — `sad.md §5, Internal decomposition, abridged` · full text: [sad.md](../sad.md)

> Sorting: за `mtime` спадно, tie-break за `sessionId` зростаючи; стабільно на всіх ОС. ID strategy: `sessionId` = імʼя файлу без `.jsonl`; `project` = імʼя теки; `projectPath` = відновлений шлях з міткою `derived: true`. Error handling: `try/catch` навколо `readdir`/`stat`; відсутня або нечитабельна тека → `[]`; битий запис → пропуск.
>
> — `sad.md §8, рядки Sorting / ID strategy / Error handling, abridged` · full text: [sad.md](../sad.md)

> Chosen: лише метадані файлу: `readdir` + `stat`; вміст файлу не відкривається.
>
> — `adr/0001, Decision outcome, abridged` · full text: [0001](../adr/0001-build-the-session-index-from-file-metadata-only.md)

> Chosen: рівно один рівень: `readdir(projects)` → `readdir(<slug>)` → лише файли `*.jsonl` на цьому рівні; теки не відвідуються. Symlink на теки не відстежуємо.
>
> — `adr/0002, Decision outcome, abridged` · full text: [0002](../adr/0002-treat-one-level-jsonl-files-as-the-only-sessions.md)

> **Hard rule:** тести без shell-команд (`find`, `grep`, `wc`, `jq`, `child_process`): такий тест ламає `npm run verify` на Windows. Підрахунки з диска робить `test/oracle.js`.
>
> — `CLAUDE.md §Тести, verbatim` · full text: [CLAUDE.md](../../../CLAUDE.md)

> **Hard rule:** mtime фікстур після clone однаковий, тест на порядок стає тавтологією; `preverify`/`predemo` вирівнюють mtime; тест на порядок додатково перевіряє, що дати різні.
>
> — `sad.md §11, рядок 1, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full ([spec.md](../spec.md) · [sad.md](../sad.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface. Форма запису для T2/T3: `{ sessionId, project, projectPath, derived: true, size, mtime }` (`mtime` як ISO 8601 в UTC), масив від свіжих, обрізаний до `limit`.

## Acceptance criteria

### AC-01 - happy path

> **Given** розробник запустив дашборд на домашній теці з фікстур, де в трьох проєктах лежать шість файлів сесій із різним часом останньої зміни (запуск перевірок і демо сам вирівнює цей час під вміст файлів, бо система контролю версій його не зберігає)
> **When** розробник відкриває головну сторінку
> **Then** розробник бачить шість рядків, кожен з ідентифікатором сесії, назвою проєкту, розміром файлу в байтах і часом останньої зміни у форматі ISO 8601 в UTC; рядки впорядковані від найсвіжішого до найстарішого, а при однаковому часі за ідентифікатором сесії за зростанням
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-02 - error

> **Given** домашня тека вказує на шлях, де теки проєктів немає або її не можна прочитати
> **When** розробник відкриває головну сторінку
> **Then** розробник бачить порожній стан із поясненням, що сесій не знайдено, і сторінка не показує помилку сервера; це стосується і відсутньої теки, і помилки прав на ній (у приймальному тесті відтворюється лише відсутня тека, бо помилку прав на всіх ОС не зробити)
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

### AC-02b - error, один битий проєкт

> **Given** серед записів у теці проєктів один не є текою (звичайний файл) або зник між переліком і читанням, решта це теки з файлами сесій
> **When** розробник відкриває головну сторінку
> **Then** розробник бачить сесії з нормальних проєктів, а битий запис мовчки пропущений без помилки
>
> — `spec.md §5, AC-02b, verbatim` · full text: [spec.md](../spec.md)

### AC-03 - boundary

> **Given** поруч із файлом сесії лежить тека з тим самим імʼям, а в ній транскрипти субагентів і збережені результати інструментів
> **When** розробник відкриває головну сторінку
> **Then** у переліку є лише файл сесії, а транскрипти субагентів і результати інструментів у рядки не потрапляють; дашборд читає лише налаштовану домашню теку і нічого поза нею
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-04 - domain invariant

> **Given** домашня тека з будь-якою кількістю проєктів і файлів сесій
> **When** розробник отримує перелік
> **Then** кількість рядків дорівнює кількості файлів сесій, що лежать рівно на один рівень під теками проєктів, поки їх не більше за ліміт; коли файлів більше, рядків рівно стільки, скільки ліміт, і це найсвіжіші; у будь-якому разі жодного файлу двічі і жодного вкладеного
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] RED: `test/session-index.test.js` викликає `listSessions` з адаптера на `fixtures/claude-home`: шість записів, порядок за mtime спадно, tie-break за `sessionId`; на неіснуючій теці `[]`; тимчасова копія фікстур із файлом замість теки проєкту → пропуск - `test/session-index.test.js`
- [ ] GREEN: `export async function listSessions({ limit = 50 } = {})` у `lib/claude/index.js`: `readdir(projectsDir(), { withFileTypes: true })`, для кожної теки `readdir` + `stat` лише звичайних `*.jsonl`-файлів (символічні посилання пропускати через `isSymbolicLink()`), без рекурсії, `try/catch` → `[]` або пропуск - `lib/claude/index.js`
- [ ] додати `listSessions` у обʼєкт `registerSource({ ... })`, щоб контракт адаптера став реальним - `lib/claude/index.js`
- [ ] `projectPath` = slug із `-` → `/`, поле `derived: true`; жодного читання вмісту - `lib/claude/index.js`
- [ ] REFACTOR при зеленому; `npm run verify` зелений

## Edge cases

| Case | Behaviour |
|---|---|
| тека `projects/` відсутня або без прав | `[]`, без винятку |
| запис у `projects/` це файл, не тека | пропущено, решта проєктів у переліку |
| `<sessionId>/subagents/*.jsonl`, `tool-results/*.txt` | не в переліку (не відвідуються) |
| два файли з однаковим mtime | порядок за `sessionId` за зростанням |
| `limit` більший за кількість файлів | усі файли |

## Definition of Done

- [ ] тест T1 був GOOD red (assertion на відсутній функції або порядку) і став GREEN
- [ ] у `listSessions` немає `readFile`/`open`/`createReadStream` (ревʼю)
- [ ] `npm run verify` зелений, два скелетні тести без змін
- [ ] коміт з трейлерами `SDD-Task: T1` і `SDD-AC` для кожного AC вище
