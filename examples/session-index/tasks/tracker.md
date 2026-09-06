# Tracker - session-index

> Status of every task in the epic. `implement` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T1 | listSessions в адаптері Claude | infra | розробник | M | — | done |
| T2 | маршрут переліку JSON з лімітом | ports | розробник | S | T1 | done |
| T3 | сторінка переліку | ui | розробник | S | T1 | done |
| T4 | приймальні тести зрізу | tests | розробник | S | T1, T2, T3 | done |

**Total:** 4 tasks, ~1 person-day.
