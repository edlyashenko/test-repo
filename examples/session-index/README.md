# Артефакти лектора: session-index, сухий прогін 2026-09-06

Коли дійдеш до spec, задач і ревʼю у своїй практиці, тут можна подивитися, як ці документи виглядали в мене на тій самій фічі. Це повний прогін SDD 2.3.0 від `specify` до `ship` на свіжому clone цього пакета: артефакти лежать у тому стані, в якому їх лишив ship, включно з двома раундами ревʼю. Числа тут (кількість знахідок, ADR, тестів) це мій прогін; твій дасть інші, і це нормально.

Спочатку зроби свій варіант. `/sdd:specify session-index` створить твій `docs/features/session-index/spec.md`, і тоді порівняєш рішення. Копіювати мої документи в свою теку не потрібно.

Під час specify, design, tasks, implement і review не показуй ці файли агентові. Це обмеження записане в `CLAUDE.md` пакета. Так він працюватиме з твоїми вимогами замість готового прикладу.

| Файл | Що це | Урок | Написано через |
|---|---|---|---|
| `spec.md` | spec на 9 AC (5 типів плюс крайові AC-01b/01c/01d/02b), NFR з вимірюванням, §8 закриті в design, inline `## Test plan` внизу | 3 | `/sdd:specify` + `/sdd:clarify` + `/sdd:plan-tests` |
| `sad.md` | Software Architecture Document, 12 розділів arc42, C4 L1/L2, один sequence flow | 3 | `/sdd:design --depth=easy` |
| `adr/0001…0003` | три рішення з альтернативами: індекс лише з метаданих; сесія = файл на одному рівні; сторінка через реєстр джерел | 3 | `/sdd:design` (ADR спавниться на blast-radius) |
| `tasks/_epic.md`, `tasks/tracker.md`, `tasks/t1…t4`, `tasks.json` | чотири задачі, граф, DoD і інлайновані AC у кожній | 3 | `/sdd:tasks` |
| `_review/review-2026-09-06.md` | незалежне ревʼю: 11 знахідок, 5 по AC, CHANGES REQUESTED; після фіксів повторне ревʼю мутаціями, ще 4, PASS | 5 | `/sdd:review` двічі |
| `changelog.md`, `pr-body.md` | нотатка про зміну і тіло PR (PR не відкривав) | 5 | `/sdd:ship` |
| `.size`, `.route` | S і standard, лежать і в `docs/features/session-index/` пакета | 3 | пресет пакета |

## На що дивитись

- `spec.md` §1 ¶4: два абзаци «після критика» і «після clarify» показують, що саме змінили критик і devil's advocate. Найгостріше було: інваріант «рядків = файлів» проти дефолтного ліміту 50. У твоєму spec цей конфлікт зʼявиться так само, щойно додаси ліміт.
- `spec.md` §5 AC-02b: «нечитабельна тека» стала «файл замість теки проєкту», бо на Windows права через Node не зняти. Критик зловив це до коду.
- `sad.md` §3, коментар brownfield: карта архітектури з `reflects_commit`, який не резолвився. У пакеті вже виправлено.
- `sad.md` §8 рядки Symlinks і Output escaping: обидва зʼявилися лише після критика design; у першій чернетці їх не було.
- `adr/0003`: рішення, яке зробило коментар у `lib/sources.js` правдою. Ревʼю потім вимагало тест, який відрізняє реєстр від прямого імпорту, бо без нього ADR лишався словами.
- `tasks/t3-sessions-page.md`: очікування похідного шляху `checkout/api` замість `checkout-api`. Правило «кожен дефіс на слеш» неточне за задумом, позначка «похідний» обовʼязкова; test-author помітив розбіжність між моїм брифом і SAD і взяв SAD.
- `_review/review-2026-09-06.md` знахідка #1: `Number.parseInt` пропускає `3abc` як 3. Тест перевіряв лише `abc`. Ревʼю бере власні входи, окремі від тестових.
- Там же R1: тест на tie-break був зелений і при компараторі `return 0`, бо стабільний sort і порядок readdir давали потрібний порядок самі. Мутаційна перевірка це те, чого зелений набір не покаже.

## Порядок комітів у прогоні

```text
3d5e877  kit baseline: S0 skeleton + course docs                урок 2 (пакет)
a5d65d0  context: + розробник                                    урок 3 (словник без ролі)
7c3d111  spec: session-index                                     урок 3
04486f1  clarify: session-index - 11 resolved, 0 deferred        урок 3
6d7cd4f  design: session-index bootstrap sad.md                  урок 3
c65bc6c  design: session-index sad §1-§12 + 3 ADR (batched)      урок 3
7f890b9  design: session-index finalization (critic pass)        урок 3
5f6861f  tasks: session-index (breakdown + tasks.json); test-plan урок 3
421164e  feat(session-index): listSessions (T1)                  урок 4
c3d467a  feat(session-index): /api/sessions route (T2)           урок 4
6b3c7f3  feat(session-index): sessions page (T3)                 урок 4
8737d2a  test(session-index): acceptance suite (T4)              урок 4
200e975  fix(session-index): review 2026-09-06 findings          урок 5
1ab07c0  fix(session-index): re-review findings R1-R4            урок 5
6f46a29  ship: session-index                                      урок 5
```

Design на маршруті `standard` за протоколом робить по коміту на кожну з 12 секцій; я збатчив у три і написав це в повідомленні коміту. T2 і T3 за залежностями незалежні, але обидві правлять `server.js`, тому пішли по черзі. Стадії `ux-flows`, `api` і `screens`, які хендофи пропонували після clarify і design, пропустив свідомо: одна сторінка, один маршрут, без БД. У README пакета це названо прямо.
