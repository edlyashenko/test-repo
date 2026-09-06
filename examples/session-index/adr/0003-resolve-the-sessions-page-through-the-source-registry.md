---
status: Accepted
owner: "лектор (сухий прогін)"
reviewers: ["Tech Lead"]
updated_at: "2026-09-06"
feature_size: "S"
ticket: "roadmap S1"
---

# 0003 - Resolve the sessions page through the source registry

- **Status:** Accepted
- **Date:** 2026-09-06
- **Deciders:** лектор, Tech Lead

## Context

У скелеті `server.js` імпортує `claudeHome` з `lib/claude/index.js` напряму, а реєстр джерел годує лише перевірку здоровʼя (`docs/architecture-map.md` §Constraints). Коментар у `lib/sources.js:7-8` обіцяє в адаптері `listSessions()` і `readSession()`, яких ще немає. Перша фіча з даними вирішує, чи стане реєстр справжнім шляхом до даних, чи лишиться декорацією. Spec §8 виніс це питання з дедлайном «before design».

## Decision drivers

- Обіцянка README скелета: другий адаптер без змін `server.js` і `views/`.
- `docs/roadmap.md` S7 (другий агент) залежить від того, що сторінка не знає імені вендора.
- Мінімальний дифф на S: одна функція в адаптері, одна заміна імпорту в `server.js`.

## Considered options

1. **Через реєстр** - адаптер Claude додає `listSessions({ limit })`, `server.js` бере `getSource('claude').listSessions(...)`; прямий імпорт лишається лише для `claudeHome()` у підписі сторінки.
2. **Прямий імпорт** - `server.js` імпортує `listSessions` з `lib/claude/index.js`; менше коду, реєстр і далі лише для здоровʼя, обіцянка про другий адаптер лишається словами.

## Decision outcome

**Chosen:** Option 1. Різниця в коді один рядок, а різниця в архітектурі це чи існує контракт адаптера насправді. Ідентифікатор `'claude'` у `server.js` лишається на цьому зрізі: перебір усіх джерел це робота S7.

## Consequences

**Positive**
- Контракт `{ id, label, home, listSessions }` стає реальним і перевіряється тестом здоровʼя плюс тестом переліку.
- S7 додає адаптер без змін сторінки.

**Negative**
- Один непрямий виклик більше; помилка в назві джерела виявляється в рантаймі (`getSource` кидає `Error`).

**Neutral**
- `readSession(id)` з коментаря реєстру лишається обіцянкою до S3.

## Links

- Spec: [[../spec.md]] §8
- SAD: [[../sad.md]] §4, §5
- Related ADR: [[0001-build-the-session-index-from-file-metadata-only]]
