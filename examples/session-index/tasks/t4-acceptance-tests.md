---
id: T4
title: "Приймальні тести зрізу: інваріант з оракулом, Unchanged, час відповіді"
layer: "tests"
deps: ["T1", "T2", "T3"]
blocks: []
acs: ["AC-04", "AC-05"]
files_hint: ["test/session-index.test.js"]
owner: "розробник"
estimate: "S"
context_budget: "S"
status: "done"
---

# T4 - Приймальні тести зрізу: інваріант з оракулом, Unchanged, час відповіді

## Place in the sequence

- **Blocked by:** T1, T2, T3 · **Blocks:** нічого · **Wave:** 3, останній.
- **Lane:** own lane (лише тестовий файл).

## Why (user story)

> **As a** розробник
> **I want** щоб у переліку не було транскриптів субагентів і результатів інструментів
> **So that** кількість у списку збігалася з кількістю моїх сесій
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

Цей таск доводить інваріант незалежним оракулом з диска і закриває Unchanged та NFR числами, а не словами.

## Inlined context

> Tests: `node --test`, `startServer()` з `test/helpers.js`, оракули `test/oracle.js` без shell; нові тести в окремому файлі, скелетні тести не правляться.
>
> — `sad.md §8, рядок Tests, verbatim` · full text: [sad.md](../sad.md)

> QG-1 How verify: приймальний тест звіряє кількість із `sessionFiles(projectsDir, { exactDepth: 2 })` з `test/oracle.js`. QG-2: ≤ 100 ms на відповідь (медіана з пʼяти запитів); 0 байтів вмісту: файл з битим вмістом у переліку з правильними розміром і часом. QG-3: `test/skeleton.test.js` без правок у `git diff`.
>
> — `sad.md §10, QG-1..QG-3, abridged` · full text: [sad.md](../sad.md)

> | Час відповіді переліку на фікстурах (6 сесій) | ≤ 100 ms | час відповіді сервера на запит переліку, теплий прогін, медіана з пʼяти запитів у приймальному тесті |
>
> — `spec.md §6, рядок 1, verbatim` · full text: [spec.md](../spec.md)

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

Internal — no API surface (тести лише читають маршрути T2 і сторінку T3).

## Acceptance criteria

### AC-04 - domain invariant

> **Given** домашня тека з будь-якою кількістю проєктів і файлів сесій
> **When** розробник отримує перелік
> **Then** кількість рядків дорівнює кількості файлів сесій, що лежать рівно на один рівень під теками проєктів, поки їх не більше за ліміт; коли файлів більше, рядків рівно стільки, скільки ліміт, і це найсвіжіші; у будь-якому разі жодного файлу двічі і жодного вкладеного
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-05 - cross-context, Unchanged

> **Given** дашборд зі зрізом індексу
> **When** розробник викликає перевірку здоровʼя або відкриває будь-яку сторінку
> **Then** перевірка здоровʼя відповідає так само, як до зрізу (стан, зареєстровані джерела, домашня тека), оболонка сторінки має ту саму політику безпеки вмісту, і два стартові тести скелета («health reports the configured Claude home and the registered sources», «the shell renders and declares a CSP») проходять із незміненими перевірками; нові тести живуть в окремих файлах
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] інваріант: кількість у `/api/sessions?limit=1000` дорівнює `sessionFiles(fixtureProjects, { exactDepth: 2 }).length`, а множина `sessionId` збігається з іменами файлів без `.jsonl` - `test/session-index.test.js`
- [ ] mtime: усі шість `mtime` у відповіді різні (сторож проти clone без `preverify`) - `test/session-index.test.js`
- [ ] 0 байтів як сторож: тимчасова копія фікстур із файлом сесії з небайдужим вмістом `not json{` → він у переліку з правильним `size` - `test/session-index.test.js`
- [ ] час: пʼять запитів переліку, медіана ≤ 100 ms - `test/session-index.test.js`
- [ ] Unchanged: `git diff --stat kit-baseline-sha -- test/skeleton.test.js` порожній (перевірка руками в DoD, не тестом) - `test/skeleton.test.js`

## Edge cases

| Case | Behaviour |
|---|---|
| CI на Windows | тест не викликає shell; шляхи через `node:path`; `os.tmpdir()` для копії |
| повільна машина CI | медіана з пʼяти, не одиничний прогін |

## Definition of Done

- [ ] кожен тест був GOOD red щонайменше на одній мутації (наприклад, рекурсивний обхід ламає інваріант) або доведено чутливість інакше
- [ ] `npm run verify` зелений локально; CI 3 ОС × 2 Node зелений після push
- [ ] коміт з трейлерами `SDD-Task: T4`, `SDD-AC: AC-04`, `SDD-AC: AC-05`
