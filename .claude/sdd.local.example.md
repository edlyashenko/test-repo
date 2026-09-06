---
interview_depth: easy       # easy | medium | hard - скільки питань ставлять specify / clarify / design
artifact_language: uk       # мова прози в документах; заголовки і машинні токени лишаються англійськими
tdd: true                   # RED перед кодом
team_mode: false            # true → команда агентів через TeamCreate; для першого проходу off
workflow_mode: off          # auto → динамічний Workflow, коли граф має паралельні задачі; off → послідовно
max_parallel_agents: 1      # 1 = послідовно; лектор працював з 3 і worktree, це другий прогін
isolation: worktree         # worktree | inplace; при max_parallel_agents 1 значення не має
stop_on_red: true           # червоний, що пережив три спроби, зупиняє прогін
max_red_retries: 3
gate_lint: false            # у цьому репо лінтера нема; увімкнений gate без команди це знахідка #17 у ревʼю лектора
gate_vet: false
require_integration: never  # Docker у цьому репо не потрібен
auto_commit: per_task       # коміт на задачу з трейлерами SDD-Task / SDD-AC; потребує git-репо
branch_strategy: feature    # створює гілку фічі, якщо ти на main
cmd_test_unit: "npm run verify"
cmd_test_integration: ""
cmd_lint: ""
cmd_vet: ""
model_test_author: sonnet
model_implementer: sonnet
model_reviewer: opus
judgment_model: opus
effort_test_author: medium
effort_implementer: medium
effort_reviewer: high
---

# Налаштування SDD для цього пакета

Скопіюй у `.claude/sdd.local.md` (той файл у git не потрапляє, цей приклад лишається):

```sh
cp .claude/sdd.local.example.md .claude/sdd.local.md
```

Або створи через `/sdd:config`. Що означає кожен ключ, описано в README SDD. Значення вище дають найпростіший маршрут для уроку 4: один агент послідовно, без лінтера, який у репо і так відсутній. Паралель і worktree це другий прогін, коли перший прийнятий.
