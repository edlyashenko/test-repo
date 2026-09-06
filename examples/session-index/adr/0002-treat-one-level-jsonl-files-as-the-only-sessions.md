---
status: Accepted
owner: "лектор (сухий прогін)"
reviewers: ["Tech Lead"]
updated_at: "2026-09-06"
feature_size: "S"
ticket: "roadmap S1"
---

# 0002 - Treat one-level jsonl files as the only sessions

- **Status:** Accepted
- **Date:** 2026-09-06
- **Deciders:** лектор, Tech Lead

## Context

Під `projects/<slug>/` поруч із `<sessionId>.jsonl` лежить тека `<sessionId>/` із `subagents/*.jsonl` і `tool-results/*.txt`. Рекурсивний пошук `*.jsonl` знайшов би транскрипти субагентів і порахував їх як сесії. Треба зафіксувати правило сканування, бо від нього залежать інваріант AC-04 і межа AC-03, а також усі наступні кроки, які шукають файл сесії через індекс.

## Decision drivers

- `CONTEXT.md`: «сесія - один файл `<sessionId>.jsonl` рівно на один рівень під `projects/<slug>/`; NOT транскрипт субагента».
- spec AC-03 (boundary) і AC-04 (invariant).
- `test/oracle.js` `sessionFiles(dir, { exactDepth: 2 })` уже кодує те саме правило для тестів.

## Considered options

1. **Рівно один рівень** - `readdir(projects)` → `readdir(<slug>)` → лише файли `*.jsonl` на цьому рівні; теки не відвідуються.
2. **Рекурсивний пошук із фільтром** - обійти все дерево і відкинути шляхи з `subagents/` і `tool-results/` за іменем; ламається на будь-якій новій службовій теці.

## Decision outcome

**Chosen:** Option 1. Правило збігається зі словником і з оракулом тестів, не залежить від імен службових тек і не відкриває файлів. Символічні посилання пропускаємо (`isSymbolicLink()`), за ними не ходимо; закрито в SAD §8.

## Consequences

**Positive**
- Інваріант «рядків = файлів на одному рівні» перевіряється одним оракулом.
- Нова службова тека від Claude Code не зламає перелік.

**Negative**
- Якщо Claude Code колись покладе сесію глибше, індекс її не побачить; це буде видно як розбіжність із диском.

**Neutral**
- Той самий обхід перевикористають S2 (заголовки) і S5 (live tail).

## Links

- Spec: [[../spec.md]] AC-03, AC-04
- SAD: [[../sad.md]] §4, §5
- Related ADR: [[0001-build-the-session-index-from-file-metadata-only]]
