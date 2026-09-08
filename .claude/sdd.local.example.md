---
interview_depth: easy       # easy | medium | hard - скільки питань ставлять specify / clarify / design
artifact_language: uk       # мова прози в документах; заголовки і машинні токени лишаються англійськими
tdd: true                   # RED перед кодом
team_mode: false            # true → команда агентів через TeamCreate; для першого проходу off
workflow_mode: off          # auto → динамічний Workflow, коли граф має паралельні задачі; off → послідовно
max_parallel_agents: 1      # перший прохід послідовний; паралель потребує окремого обґрунтування
isolation: worktree         # worktree | inplace; при max_parallel_agents 1 значення не має
stop_on_red: true           # зупинка після вичерпання ескалації; не глобальний ліміт у три спроби
max_red_retries: 3          # повтори GREEN до наступних кроків ескалації SDD
gate_lint: false            # лінтера в репо нема; gate без команди дає хибний провал
gate_vet: false
require_integration: never  # окремий Docker-tier вимкнено; файлові й HTTP-перевірки входять у verify
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

Лише якщо `.claude/sdd.local.md` ще немає, цей приклад можна скопіювати під час підготовки. Наявний файл не перезаписуй; погоджені зміни значень роби через `/sdd:config`. Сам файл налаштувань у git не потрапляє, цей приклад лишається:

```sh
cp .claude/sdd.local.example.md .claude/sdd.local.md
```

Або створи через `/sdd:config`. Що означає кожен ключ, описано в README SDD. Значення вище дають найпростіший маршрут: один агент послідовно, без лінтера, який у репо і так відсутній. Паралель і worktree це другий прогін, коли перший прийнятий.
