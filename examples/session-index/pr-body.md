## Summary

Перший зріз дашборда: перелік сесій Claude Code на головній сторінці і за адресою `/api/sessions`, зібраний лише з метаданих файлів. Spec: `docs/features/session-index/spec.md`.

## Acceptance criteria

- AC-01 — шість сесій від свіжих з ідентифікатором, проєктом, розміром і часом ✓
- AC-01b — явний ліміт лишає найсвіжіші ✓
- AC-01c — відсутній або невалідний ліміт дає 50 ✓
- AC-01d — похідний шлях проєкту з позначкою ✓
- AC-02 / AC-02b — порожній стан на відсутній теці, битий запис пропущено ✓
- AC-03 — транскрипти субагентів і результати інструментів не в переліку ✓
- AC-04 — кількість дорівнює файлам на одному рівні в межах ліміту ✓
- AC-05 — перевірка здоровʼя, CSP і два стартові тести без змін ✓

## Design

- Spec: `docs/features/session-index/spec.md` (з inline `## Test plan`)
- Architecture: `docs/features/session-index/sad.md`
- Decisions: `docs/features/session-index/adr/` (0001 метадані, 0002 один рівень, 0003 через реєстр)
- Data model / API: без БД; стадію `api` пропущено свідомо, контракт маршруту в T2

## Tasks (SDD-Task trailers)

T1 `listSessions` · T2 `/api/sessions` · T3 сторінка · T4 приймальні тести · fix (ревʼю) · fix (повторне ревʼю)

## Verification

- Unit: `npm run verify` 26 pass, 0 fail, 0 skipped
- Integration: N/A (файлова система, без Docker)
- Lint + vet: немає в репо (gate_lint false)
- Ran the feature: `npm run demo`, перевірено AC-01 (6 рядків від свіжих), AC-01c (`3abc` → 50), AC-01d (похідний шлях + позначка + title), AC-05 (health і CSP як були)
- Review: `_review/review-2026-09-06.md`, PASS після двох раундів фіксів (11 + 4 знахідки)

## Operational notes

- Migration: none. Порядок «від свіжих» на фікстурах лише після `npm run verify`/`npm run demo` (pin mtime).
