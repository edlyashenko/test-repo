---
status: Draft
owner: "maintainer"
reviewers: ["maintainer"]
updated_at: "2026-09-10"
feature_size: "S"
target_surfaces: ["web-frontend"]
---

# Software Architecture Document — session-index

## 1. Introduction and goals

**Intent.** Розробник тримає домашню теку coding-агента з сесіями, розкиданими по закодованих текам проєктів, і сьогодні знаходить потрібну лише руками у файловому менеджері. `session-index` додає на головну сторінку дашборда перелік усіх сесій усіх проєктів, зібраний виключно з метаданих файлів (імʼя, розмір, час зміни), відсортований від найсвіжіших до найстаріших і обрізаний лімітом. Це перший крок роадмапи — кроки 2 (перегляд сесії) і 3 (вартість у токенах) починаються з вибору рядка в цьому переліку.

**Top-3 quality goals (1-liners; full scenarios in §10):**

1. Безпека читання джерела — нуль записів у домашню теку, нічого поза її межами, жодного рядка тексту розмови на сторінці. Критично, бо це перша фіча, яка взагалі обходить диск джерела.
2. Продуктивність на реальному масштабі — перелік лишається швидким не лише на 6-сесійних фікстурах, а й на домашній теці з сотнями чи тисячами сесій.
3. Стійкість до часткової нечитабельності джерела — одна нечитабельна тека чи файл не гасить сторінку, і розробник бачить, що частина не прочиталася, а не вважає неповний перелік повним.

**Stakeholders.**

| Role | Interest | Sign-off owner? |
|---|---|---|
| розробник | бачить перелік своїх сесій усіх проєктів з однієї сторінки | No |
| джерело (Claude Code, `lib/claude/index.js`) | контракт адаптера `listSessions()` нарешті виконаний | No |
| Tech Lead (maintainer) | SAD approval | Yes |

<!-- Decision overrides (¶4) — none yet. -->

## 2. Constraints

**Technical.**
- JavaScript, ESM (`"type": "module"`), Node `>=22` (`package.json`, `.nvmrc`).
- Express `^5.1.0` — єдина залежність, нових не додаємо.
- Синхронний `node:fs` (`readdirSync`, `lstatSync`, `readFileSync`) — `node:fs/promises` у репо немає.
- Без класів: стан живе в замиканні або в plain-обʼєкті; лише named exports.

**Organisational.**
- Розмір S, route `standard` (`.size`, `.route`), effort ≈ 2–5 PR, ~1 тиждень.
- Один розробник (maintainer) веде фічу соло, без окремої команди.

**Conventions.**
- `AGENTS.md` §Межі і §Конвенції; `docs/architecture-map.md` §Conventions.
- Помилки: `throw new Error('текст')` без кодів і власних класів; `catch` без привʼязки до змінної, дефолт замість прокидання (`lib/sources.js:14`, `test/oracle.js:17`).
- Нове читання з диска йде функцією в адаптері (`lib/claude/index.js`); нова сторінка складнішого вигляду виносить рендер в окремий файл `views/<page>.js` (`views/AGENTS.md`).

**Regulatory / external.**
- spec §6.1: класифікація даних — confidential (метадані самі по собі кажуть, над чим і коли працював розробник). Нових персональних полів не створюємо.
- Security review: Required — фіча вперше дає застосунку обходити диск; перевірка запланована окремим проходом на етапі приймання (spec §6.1).

## 3. Context and scope

Локальний дашборд `agent-ops-dashboard` читає домашню теку coding-агента Claude Code (`CLAUDE_HOME`, дефолт `~/.claude`) і показує розробнику, що на диску є, не виходячи за межі цієї теки. `session-index` додає на головну сторінку перелік усіх сесій усіх проєктів; за межами фічі лишається сам вміст сесії (крок 2) і вартість у токенах (крок 3).

<!-- brownfield: docs/architecture-map.md fresh (reflects_commit 7ebfee8, HEAD 84e70aa — один docs-коміт попереду, код не змінювався); прочитано замість повторного сканування. -->

**External systems (in / out):**

| Actor or system | Type | Interaction |
|---|---|---|
| розробник | Person | HTTP GET на `127.0.0.1:4180`, дивиться на перелік сесій |
| `CLAUDE_HOME/projects` (файлова система Claude Code) | System (external, вже інтегроване через `lib/claude/index.js`) | синхронне читання метаданих файлів; лише читання, обхід рівно дворівневий |

**C4 Context (L1):**

```mermaid
C4Context
    title session-index — System Context

    Person(dev, "Rozrobnyk", "Vidkryvaie lokalnyi dashboard, shukaie svoiu sesiiu")
    System(app, "agent-ops-dashboard", "Lokalnyi Express-dodatok, renderyt storinky na serveri, slukhaie lyshe 127.0.0.1")
    SystemDb(home, "CLAUDE_HOME", "Domashnia teka Claude Code z sesiiamy .jsonl; zastosunok lyshe chytaie metadani")

    Rel(dev, app, "Vidkryvaie perelik sesii", "HTTP GET 127.0.0.1:4180")
    Rel(app, home, "Chytaie imena, rozmir, mtime failiv", "node:fs synkhronno")
```

Дашборд показує розробнику його власний перелік сесій; жодної третьої сторони, зовнішнього API чи ідентифікаційного провайдера немає — застосунок локальний, петльовий, без облікових записів.

## 4. Solution strategy

**Target surface: `web-frontend`.** Фіча лише додає сторінку в наявний server-rendered Express-застосунок; non-goals (spec §3) прямо виключають другий адаптер джерела і нову JSON-поверхню. Альтернативи в межах цієї фічі немає — рішення прийняте як easy-режимне припущення, без ADR (0 з 3 критеріїв блast-radius: немає реальної альтернативи в межах спека).

**UI-архітектура (для поверхні `web-frontend`): server-rendered, без клієнтського JS.** CSP у `layout()` вже забороняє inline- і зовнішні скрипти (`views/layout.js:17`), а конвенція репо прямо каже «UI-фреймворк і збірку фронтенду не додаємо» (`.claude/rules/views.md`). Альтернатива (SPA) виключена наявним обмеженням — без ADR (критерій «має легітимну альтернативу» не спрацьовує).

**Top strategic choices (ADR seeds):**

1. **Синхронний скан без кешу, перебудова індексу на кожен запит** — жодного персистентного чи кешованого стану між запитами; адаптер щоразу обходить `CLAUDE_HOME/projects` рівно два рівні, сортує в памʼяті (mtime спадаюче, імʼя файлу як другий ключ) і обрізає лімітом після сортування. Торкається продуктивності (quality goal 2) і межі «Записи в домашню теку джерела — 0» (spec §6 NFR). → **ADR-0001**.
2. **Дедуп символічних посилань за realpath, відхилення зовнішніх** — межа довіри для обходу теки проєктів: посилання за межі `CLAUDE_HOME` приховується повністю (AC-09), посилання всередину дедуплікується за реальним шляхом (AC-09b). Торкається безпеки читання (quality goal 1) і §6.1 Abuse cases. → **ADR-0002**.

**Тактичні рішення (easy-режим, без ADR — низький blast radius):**

- **Механізм «іншої довжини переліку» (AC-05, spec §8 OQ)** — query-параметр `?limit=N` на `GET /`; неприпустиме значення (не число, ≤0, >1000) не ламає сторінку, а показує типовий ліміт 50 і пояснення простими словами.
- **Формат розміру файлу (spec §8 OQ, дефолт уже узгоджений)** — людський вигляд (КБ/МБ) у клітинці таблиці, точне значення байтів в атрибуті `title`.
- **Формат часу зміни (spec §8 OQ, дефолт уже узгоджений)** — абсолютний локальний час: стабільний у тестах, не залежить від моменту відкриття сторінки.

Кожне з двох стратегічних рішень трасується у §5 (модульні межі), §6 (потік виконання) і §10 (сценарії якості) нижче.

## 5. Building block view

Наявний простий шар: адаптер джерела (`lib/claude/index.js`) володіє читанням з диска, `server.js` лишається тонким маршрутом, `views/` — HTML-шар без знання про джерела. Нового модуля не заводимо (easy-режимне припущення) — S-розмір фічі вкладається в наявну форму: логіка скану йде в адаптер (конвенція «нове читання з диска → функція в адаптері»), рендер таблиці виносимо в окремий `views/session-index.js`, бо `views/AGENTS.md` прямо каже: «складніша сторінка виносить свою функцію в окремий файл».

**Internal decomposition:**

```
lib/claude/index.js       # + listSessions({ limit }) — synchronous two-level scan (ADR-0001),
                           #   realpath dedup + reject external symlinks (ADR-0002), sort, limit
server.js                 # GET / reads ?limit, calls listSessions(), passes result to the view
views/session-index.js    # NEW: pure render function — table markup + empty()/error notes, esc() everything
views/layout.js           # unchanged — esc, layout, empty stay generic chrome
```

**C4 Container (L2):**

```mermaid
C4Container
    title session-index — Containers

    Person(dev, "Rozrobnyk")

    Container_Boundary(app, "agent-ops-dashboard") {
        Container(web, "server.js", "Express 5 / ESM", "Marshrut GET /, chytaie ?limit, skladaie storinku cherez layout()")
        Container(view, "views/session-index.js", "Template strings", "Renderyt tablytsiu sesii, empty i error stany")
        Container(layout, "views/layout.js", "Template strings", "Yedynyi HTML-karkas: esc, layout, empty")
        Container(adapter, "lib/claude/index.js", "ESM module", "listSessions(): dvorivnevyi skan, realpath-dedup, sort, limit")
        Container(registry, "lib/sources.js", "ESM module", "Reiestr dzherel; Map u zamykanni")
    }

    ContainerDb(home, "CLAUDE_HOME/projects", "Filesystem", "Teky proektiv + faily sesii .jsonl; lyshe metadani")

    Rel(dev, web, "HTTP GET / (opt. ?limit)", "127.0.0.1:4180")
    Rel(web, adapter, "listSessions({ limit })")
    Rel(web, view, "renderSessionIndex(sessions, meta)")
    Rel(web, layout, "layout({ body })")
    Rel(adapter, registry, "reiestruietsia cherez registerSource() na importi")
    Rel(adapter, home, "readdirSync / lstatSync / realpathSync, synkhronno, lyshe chytannia")
```

Обидва стратегічні рішення §4 живуть у `lib/claude/index.js:listSessions()` — ADR-0001 фіксує відсутність кешу, ADR-0002 фіксує дедуп за realpath. `server.js` і `views/session-index.js` про ці рішення не знають, вони лише споживають готовий результат.

## 6. Runtime view

**Critical flow 1: відкриття переліку сесій (happy path + edge branches inline)**

S-розмір фічі: один потік із `alt`-гілками покриває всі §5 AC замість окремих потоків на кожен edge case (детальне покриття кожного AC — робота стадії `sequences`).

```mermaid
sequenceDiagram
    actor Rozrobnyk
    participant Web as server.js
    participant Adapter as lib/claude/index.js
    participant View as views/session-index.js

    Rozrobnyk->>Web: GET / (opt. ?limit=N)
    alt limit nepryynyatnyi (ne chyslo, <=0, abo > 1000)
        Web->>View: renderSessionIndex([], { invalidLimitNote, usedDefault: 50 })
    else limit korektnyi abo vidsutnii
        Web->>Adapter: listSessions({ limit })
        Adapter->>Adapter: skanuie projects/ dvorivnevo, lstat kozhnoho zapysu
        alt symlink vede za mezhi CLAUDE_HOME
            Adapter->>Adapter: prykhovuie zapys povnistiu (ne dodaie, ne lichyt)
        else symlink useredyni CLAUDE_HOME
            Adapter->>Adapter: dedupliuie za realpath (ADR-0002)
        end
        alt teka abo fail ne chytaietsia (prava dostupu)
            Adapter->>Adapter: propuskaie zapys, incrementuie unreadableCount
        end
        Adapter-->>Web: { sessions (sort: mtime desc, imia faily as tie-break), totalFound, unreadableCount, truncated }
        Web->>View: renderSessionIndex(sessions, meta)
    end
    View-->>Web: HTML (tablytsia abo empty())
    Web-->>Rozrobnyk: 200 html (layout + body)
```

**Critical flow 2: порожня домашня тека / тека проєктів ще не існує (AC-06, AC-07)** — N/A як окремий потік: покривається тією самою гілкою «limit коректний» вище — `listSessions()` повертає порожній масив `sessions`, `View` рендерить `empty()` замість таблиці; `AC-06` додатково показує повний шлях `CLAUDE_HOME`, який читала сторінка (тека не створюється).

Обидва участники (`Adapter`, `View`) — контейнери з §5; повідомлення семантичні, без HTTP-деталей (ендпоінт-рівень фіксує стадія `api`, якщо вона знадобиться — для цієї фічі немає нового JSON-контракту).

## 7. Deployment view

<!-- N/A: reuses existing deployment unit — той самий локальний Express-процес на 127.0.0.1:4180, ні нового процесу, ні нової інфраструктури фіча не додає (easy-режимне припущення). -->

## 8. Crosscutting concepts

| Concept | Convention | Where defined |
|---|---|---|
| Logging | немає структурованого логування; єдиний `console.log` при старті сервера | `server.js` |
| Authentication | немає — локальний петльовий інтерфейс, без облікових записів | `server.js` (bind `127.0.0.1`), `AGENTS.md` §Межі |
| Error handling | `throw new Error('текст')` без кодів і власних класів; читання джерела — best-effort skip + лічильник замість прокидання | `lib/sources.js:14`, `test/oracle.js:17` |
| ID strategy | `sessionId` — UUID у назві файлу `<sessionId>.jsonl`, готовий з диска, не генерується застосунком | `CONTEXT.md` §Glossary |
| Internationalisation | N/A — єдина мова інтерфейсу, `lang="uk"` | `views/layout.js` |
| Observability | N/A — локальний однокористувацький процес без SLO/пропускної здатності (spec §6 NFR) | spec §6 NFR |
| Events | N/A — синхронний HTTP request/response, подій немає | — |

## 9. Architecture decisions

| # | Title | Status | Section |
|---|---|---|---|
| 0001 | Rebuild the session index synchronously per request, with no cache or persisted store | Accepted | §4 |
| 0002 | Deduplicate the project scan by realpath and reject symlinks that resolve outside CLAUDE_HOME | Accepted | §4 |

ADR files live under `docs/features/session-index/adr/NNNN-<title>.md`.

## 10. Quality requirements

Кожна з top-3 quality goals §1 розгорнута в повний сценарій; числа взяті дослівно зі spec §6 NFR.

**QG-1. Безпека читання джерела**
- **When:** серед тек проєктів є символічне посилання за межі `CLAUDE_HOME` (AC-09) і два внутрішні посилання на ту саму теку (AC-09b); розробник відкриває сторінку переліку.
- **Then:** сесії за зовнішнім посиланням не зʼявляються і ніяк не згадуються, навіть у примітці про непрочитане (AC-09); дублікат внутрішньої теки зʼявляється рівно один раз, сторінка складається за скінченний час (AC-09b); «Записи в домашню теку джерела» — рівно 0 (spec §6 NFR).
- **How verify:** тест звіряє перелік файлів і час зміни `CLAUDE_HOME` до й після запиту; тимчасова тека із символічними посиланнями, яку створює й прибирає сам тест (spec §8 OQ).

**QG-2. Продуктивність на реальному масштабі**
- **When:** домашня тека має 6 сесій (навчальні фікстури) або орієнтовно 200 сесій.
- **Then:** складання переліку на fixtures (6 сесій) — ≤50 ms чистою функцією побудови переліку, без HTTP-шару; на ~200 сесіях — ≤400 ms як орієнтир, а не як ворота (spec §6 NFR).
- **How verify:** один прогін чистої функції `listSessions()` у тесті на `fixtures/claude-home` (ворота); замір на тимчасовій теці з 200 сесіями, яку тест генерує і прибирає за собою — чи входить цей замір до `npm run verify`, вирішує стадія `plan-tests` (spec §6 NFR).

**QG-3. Стійкість до часткової нечитабельності джерела**
- **When:** сама тека проєктів, одна з тек проєктів, або окремий файл сесії не читається через права доступу, а решта джерела читається (AC-08).
- **Then:** розробник бачить сесії з того, що прочиталося (порожній перелік, якщо не прочиталося нічого), і примітку про кількість непрочитаних елементів джерела, без шляхів і без тексту системної помилки; 0 випадків, коли одна нечитабельна тека залишає сторінку без переліку (spec §6 NFR).
- **How verify:** тест із текою, яку не вдається прочитати через права доступу — перевіряє, що відповідь 200, перелік містить сесії з прочитаних тек, а примітка показує лише кількість.

## 11. Risks and technical debt

| Risk / debt | Severity | Mitigation | Owner |
|---|---|---|---|
| Дедуп за realpath на кожен символічний запис коштує системної викличкою; за нетипової вкладеності посилань це може уповільнити скан | Low | Обхід рівно дворівневий (`projects/` → сесії), символічні посилання трапляються лише серед записів теки проєктів — кількість викликів обмежена кількістю проєктів, не сесій; ADR-0002 фіксує стратегію | maintainer |
| Стеля 1000 рядків і орієнтир 400 ms на 200 сесій узяті як розумні дефолти, а не з виміру (spec §8 OQ) | Open question | Resolve before `/sdd:plan-tests`; лишаємо як орієнтир до першого заміру, чи входить до воріт вирішує `plan-tests` | maintainer |
| Тестовий оракул (`test/oracle.js`) використовує `lstat` і наразі пропускає символічні посилання; перелік має проходити ті, що ведуть усередину `CLAUDE_HOME` (ADR-0002) — оракул потребує узгодження під цю поведінку (spec §8 OQ) | Open question | Resolve before `/sdd:tasks`; узгодити оракул під нову поведінку симлінків, тест на тимчасовій теці, пропуск із явним повідомленням, якщо створити посилання не вдалося (Windows-права) — default уже зафіксовано в spec | maintainer |
| Адаптер `lib/claude/index.js` наразі реєструє лише `id`, `label`, `home`; контракт `lib/sources.js` вимагає ще `listSessions()` і `readSession(id)` — ця фіча закриває `listSessions()`, `readSession()` лишається боргом кроку 2 | Low | Крок 2 роадмапи (`docs/roadmap.md`) явно закриває цю прогалину; не блокує `session-index` | maintainer |

**Accepted debt (acceptable in v1, plan to fix later):**
- Немає персистентного індексу чи кешу — кожен запит перечитує диск синхронно (ADR-0001); прийнятно для S-розміру фічі й одного користувача на своїй машині, можливий кеш у майбутній ітерації, якщо перф-орієнтир §6 NFR не витримає на реальних масштабах.
