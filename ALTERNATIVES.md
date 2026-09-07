# Ті самі кроки іншими командами: Spec Kit, OpenSpec, BMAD, скіли Покока

Основний покроковий маршрут мінікурсу використовує SDD. Альтернативи нижче призначені для окремого знайомства; для другого уроку додаткових установлень не потрібно. Якщо у твоїй команді вже є інший spec-driven фреймворк, можеш пройти практику з ним. Потрібно буде знайти відповідники команд і врахувати, куди він записує документи. Шаблони курсу та критерії приймання залишаться тими самими.

Ця сторінка допоможе зіставити маршрути. Спочатку подивися, як установити обраний інструмент, а під час практики повертайся до таблиці фаз. Вона також показує місця, де потрібний крок доведеться виконати самостійно.

Порівняння спирається на звірку README, docs, GitHub Releases і реєстрів пакетів від 2026-09-06; під час тієї перевірки три інсталяції були виконані локально. Команди можуть змінюватися між версіями, тому перед установленням відкрий README обраного інструмента.

| | SDD | Spec Kit | OpenSpec | BMAD Method | Скіли Метта Покока |
|---|---|---|---|---|---|
| Репо | [genkovich/sdd](https://github.com/genkovich/sdd) | [github/spec-kit](https://github.com/github/spec-kit) | [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) | [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | [mattpocock/skills](https://github.com/mattpocock/skills) |
| Версія на 2026-09-06 | v2.3.0 у main, v2.2.0 у релізах | v1.0.4 (2026-09-02) | v1.12.0 (2026-09-03) | v6.12.0 (2026-09-04) | v1.2.3 (2026-08-06) |
| Установка в Claude Code | `/plugin marketplace add genkovich/sdd`, `/plugin install sdd@sdd` | `uv tool install specify-cli`, потім `specify init --here --integration claude` | `npm install -g @fission-ai/openspec@latest`, потім `openspec init` | `npx bmad-method install --modules bmm --tools claude-code` | `/plugin install mattpocock-skills`, потім `/setup-matt-pocock-skills` |
| Як звуться команди в Claude Code | `/sdd:specify` | `/speckit-specify` (у README з крапкою, `/speckit.specify`; у Claude Code це skills, тому дефіс) | `/opsx:propose` | `/bmad-build`, `/bmad-prd`, персони `/bmad-agent-pm` | `/to-spec`, `/wayfinder`, `/implement` |
| Codex CLI, Cursor | `install.sh codex` / `cursor` | так, `$speckit-<cmd>` у Codex | так, `$openspec-propose` у Codex, `/opsx-propose` у Cursor | так, обидва через `.agents/skills` | так, `npx skills@latest add mattpocock/skills` |
| Де лежать артефакти | `docs/features/<slug>/` | `.specify/memory/constitution.md`, `specs/NNN-<name>/` | `openspec/config.yaml`, `openspec/specs/<capability>/`, `openspec/changes/<name>/` | `_bmad-output/planning-artifacts/`, `_bmad-output/specs/spec-<slug>/`, `AGENTS.md` | де скажеш: spec у трекері або файлі, `CONTEXT.md` і ADR у репо |
| Вимоги | Claude Code, Codex або Cursor | Python 3.11+, git, uv або pipx | Node ≥ 20.19 | Node ≥ 20.12, `uv` для build | Claude Code або будь-який агент зі skills |
| Ліцензія | MIT | MIT | MIT | MIT | MIT |

## Відповідність по фазах курсу

Знайди рядок із фазою, яку проходиш зараз, і колонку свого інструмента. У клітинці буде команда для цього кроку. Якщо бачиш «рукою», окремої команди у фреймворку немає: скористайся шаблоном курсу й виконай крок самостійно.

| Фаза | Урок | SDD | Spec Kit | OpenSpec | BMAD | Скіли Покока |
|---|---|---|---|---|---|---|
| Intent, точка А | 1 | шаблон 01; `/sdd:interview` лише для свого репо | шаблон 01; ідею описуєш у `/speckit-specify` | шаблон 01; `/opsx:explore` як «thinking partner», файлів не пише | шаблон 01; `/bmad-forge-idea`, `/bmad-product-brief` | шаблон 01; `/grill-me` |
| Context Engineering | 2 | survey → `docs/architecture-map.md`; читання готових інструкцій і перевірка нової сесії | `/speckit-constitution` → принципи; карту поточного коду й задум потрібно зберегти окремо | секція `context` у `openspec/config.yaml` рукою; `/opsx:onboard` як тур | `/bmad-project-context` → блок в `AGENTS.md` | `/grill-with-docs` оновлює `CONTEXT.md` і ADR; `/wayfinder` карта рішень до spec |
| Spec | 3 | `/sdd:specify` → `spec.md` | `/speckit-specify` → `specs/NNN/spec.md` + `checklists/requirements.md` | `/opsx:propose <name>` → `proposal.md`, дельти `specs/`, `design.md`, `tasks.md` однією командою | `/bmad-spec` → `SPEC.md` (epic-sized) або `/bmad-prd` → `prd.md` | `/to-spec` |
| Clarify | 3 | `/sdd:clarify` (свіжий devil's advocate) | `/speckit-clarify` (≤5 питань у `## Clarifications`); `/speckit-analyze` на узгодженість артефактів | окремого кроку нема; два промпти з шаблону 03 §9 у свіжій сесії; правки `/opsx:update` | окремого кроку нема; питання всередині `/bmad-spec`; `/bmad-advanced-elicitation` | `/grilling` |
| Design, ADR | 3 | `/sdd:design` → `sad.md`, `adr/` | `/speckit-plan` → `plan.md`, `research.md`, `data-model.md`, `contracts/`; ADR нема | `design.md` усередині propose | `/bmad-architecture`; ADR нема | `/codebase-design`, `/domain-modeling`; ADR через `/grill-with-docs` |
| Tasks, план перевірок | 3 | `/sdd:tasks` → `tasks/`, `tasks.json`; `/sdd:plan-tests` | `/speckit-tasks` → `tasks.md` (тест-задачі лише на запит); `/speckit-checklist` | `tasks.md` усередині propose | `/bmad-create-epics-and-stories`, `/bmad-sprint-planning` | `/to-tickets` |
| Implement | 4 | `/sdd:implement`: RED → GREEN → gate → коміт на задачу; режими з `sdd.local.md` | `/speckit-implement` виконує `tasks.md` фазами, не комітить; паралелі й ліміту спроб нема | `/opsx:apply`; `/opsx:continue` | `/bmad-build`: інвестигація → план → код → self-review → локальний коміт | `/implement`, `/tdd` |
| Verification, review | 5 | `/sdd:review` (свіжий рецензент, `_review/`); `/sdd:fix`; плюс вбудовані в Claude Code `/code-review`, `/security-review`, `/simplify` як другий і третій погляд | `/speckit-analyze` до коду, `/speckit-converge` після; незалежного ревʼю коду нема, шаблон 05 §5 рукою | `/opsx:verify` лише в expanded profile (`openspec config profile`), звіт не блокує | `/bmad-code-review` (4 лінзи + triage), `/bmad-walkthrough` | `/code-review`, `/diagnosing-bugs` |
| Ship | 5 | `/sdd:ship`: gate, запуск вживу, changelog, PR | рукою; гілку створює hook при specify | `/opsx:archive` → `openspec/changes/archive/<дата>-<name>/`, `/opsx:sync` зливає дельти в `specs/` | рукою після локального коміту build | рукою |
| Learning, дельта | 6 | fix-record з `/sdd:fix`; правило в `AGENTS.md` + Stop-hook з `npm run verify` (`.claude/settings.example.json`, урок 5); шаблон 06 | `/speckit-converge` дописує залишок у `tasks.md`; шаблон 06 | archive і є Learning: дельти стають чинними specs | `/bmad-retrospective` → `RETROSPECTIVE.md`; refresh `/bmad-project-context` | `/handoff`; шаблон 06 |

## Що варто знати до вибору

У Spec Kit ти знайдеш найближчий до SDD набір команд: є clarify і перевірка узгодженості документів. Кожна фіча має свою нумеровану теку `specs/NNN-<name>/`. Для практики зверни увагу на тести: за замовчуванням вони необов'язкові в задачах, тому їх потрібно замовити явно. Команда implement не робить комітів, а незалежне рев'ю коду свіжим агентом доведеться організувати окремо. Для встановлення потрібен Python.

В OpenSpec команда `/opsx:propose` одразу готує proposal, зміни до spec, design і tasks. Ти отримаєш ці документи за один крок, а clarify проведеш самостійно. Після завершення роботи зміни потрапляють в архів, а доповнення зливаються з чинними specs. У такий спосіб рішення з конкретної задачі залишаються в документах проєкту для наступної роботи. Для Verify потрібен expanded-профіль. README рекомендує моделі з сильним reasoning.

BMAD Method пропонує 29 скілів і п'ять персон: аналітика, PM, UX, архітектора та розробника. Вони працюють у циклі Clarify → Plan → Build and verify → Learn and adjust. Тут найбільше окремих ролей і кроків серед чотирьох фреймворків у таблиці. Такий процес ближчий до командної роботи, де PRD й архітектуру готують різні люди.

Для нашої індивідуальної задачі повний маршрут буде завеликим. Якщо команда вже користується BMAD, можна залишитися в ньому: для малих змін у наявному коді документація радить починати з `/bmad-build` або `/bmad-spec` + build. Для роботи потрібен `uv`.

Скіли Метта Покока можна додавати до свого процесу окремо, під конкретну потребу. Наприклад, `/grill-with-docs` допомагає працювати з `CONTEXT.md` і ADR, а `/wayfinder` збирає карту рішень до spec. Для другого уроку карта рішень не потрібна; опис навчальної задачі вже є в README.

Для spec і задач є `/to-spec` та `/to-tickets`, для реалізації `/implement` і `/tdd`, для перевірки `/code-review`, а для передавання роботи між сесіями `/handoff`. Місце для документів ти задаєш сам. Цими скілами зручно доповнювати SDD або Spec Kit. Якщо ж обереш їх єдиним маршрутом, врахуй, що автоматичних перевірок переходу між стадіями тут немає.

Хоч би який інструмент ти обрав, залиш час прочитати діф і вирішити, чи можна прийняти результат. Шаблон 05 допоможе організувати незалежне рев'ю у свіжій сесії з будь-яким із цих маршрутів.

## Без жодного фреймворка

Пояснення й перевірку документів можна організувати звичайними повідомленнями агенту. Проте основна практика уроку 2 навчає запускати survey; звичайна розмова не є виконанням цього скіла. Інструмент із власним форматом документів потребуватиме узгодженого переходу до подальших стадій.

## Ще кілька, які трапляються

Kiro (IDE від AWS) має власний формат spec-driven роботи: Feature Spec, Quick Spec і Bugfix Spec, артефакти `requirements.md` (або `bugfix.md`), `design.md`, `tasks.md` у `.kiro/specs/<name>/`; Bugfix Spec тримає форму Current / Expected / Unchanged Behavior, яку ми беремо за зразок для наявного коду ([kiro.dev/docs/specs](https://kiro.dev/docs/specs/)). cc-sdd (`npx cc-sdd@latest`, v3.0.2) переносить цей формат у Claude Code і Codex: `/kiro-spec-init` → `/kiro-spec-requirements` → `/kiro-spec-design` → `/kiro-spec-tasks` → `/kiro-impl`, артефакти в `.kiro/specs/<name>/`. GSD (`open-gsd/gsd-core`) називає себе «meta-prompting and spec-driven development system» з `.planning/`. Обидва проходять ті самі фази, мапінг зробиш за таблицею вище.

Ще три інструменти закривають окремі дірки в контексті, про які йдеться в другому уроці, і не є повним маршрутом:

- [Superpowers (obra)](https://github.com/obra/superpowers): методологічні скіли brainstorming → writing-plans → TDD → code review; дизайн лягає в `docs/superpowers/specs/`, план у `docs/superpowers/plans/`.
- [Context7 (upstash)](https://github.com/upstash/context7): MCP-сервер, який підтягує актуальну документацію бібліотек у контекст агента замість застарілих знань моделі.
- [Graphify (Graphify-Labs)](https://github.com/Graphify-Labs/graphify): граф репозиторію на tree-sitter без моделі; вихід `graph.html`, `GRAPH_REPORT.md`, `graph.json`. Карта чужого коду для людини й агента, поруч зі `survey`.

## Дві короткі альтернативи інтервʼю

- [grill-with-docs Метта Покока](https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md) поєднує уточнювальне інтервʼю з документуванням словника й ADR. Це не гарантія файла `docs/idea-brief.md` у форматі SDD.
- [brainstorming у Superpowers](https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md) допомагає уточнити задум і погодити рішення. Обсяг процесу залежить від задачі; не кожна розмова вимагає повного design-документа.

Тексти скілів переглянуто 2026-09-06. Для поточного уроку достатньо survey, який описує наявний код. Інтервʼю та brainstorming можуть знадобитися пізніше, коли сам задум ще невизначений; вони не є обовʼязковою практикою уроку 2. Якщо обираєш альтернативу, перевір її чинні інструкції й структуру результату; однакова мета не означає однакового формату файлів.
