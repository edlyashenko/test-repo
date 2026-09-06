# Changelog - session-index

## session-index - перелік сесій на головній сторінці

**What:** головна сторінка дашборда показує таблицю сесій Claude Code з домашньої теки: ідентифікатор, шлях проєкту (похідний, з позначкою), розмір у байтах і час останньої зміни, від свіжих до старих. Той самий перелік доступний машинно за адресою `/api/sessions` з параметром `limit` (дефолт 50). Порожня або відсутня тека дає порожній стан.

**Why:** до цього дашборд був скелетом і не показував жодної сесії; це крок S1 roadmap, на якому тримаються заголовки, таймлайн і live tail. Див. [spec](spec.md) §1-§2. Ключові рішення: [ADR-0001](adr/0001-build-the-session-index-from-file-metadata-only.md) індекс лише з метаданих, [ADR-0002](adr/0002-treat-one-level-jsonl-files-as-the-only-sessions.md) сесія = файл на одному рівні, [ADR-0003](adr/0003-resolve-the-sessions-page-through-the-source-registry.md) сторінка через реєстр джерел.

**How to use:** `npm run demo` і відкрити http://127.0.0.1:4180 (усі шість фікстурних сесій) або http://127.0.0.1:4180/?limit=2; машинно `curl 'http://127.0.0.1:4180/api/sessions?limit=2'`.

**Operational notes:**
- Migration: <!-- none -->
- Feature flag / config: `CLAUDE_HOME` як і раніше; `limit` лише з адреси.
- Rollback: відкотити гілку; даних на диску зріз не міняє.
- Порядок «від свіжих» на фікстурах правильний лише після `npm run verify` або `npm run demo` (`pin-fixture-mtimes`), бо git не зберігає mtime.

**Acceptance criteria delivered:** AC-01, AC-01b, AC-01c, AC-01d, AC-02, AC-02b, AC-03, AC-04, AC-05.
