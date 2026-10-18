# Result-night calendar, through 30.11.2026

One place for the coordinator: every night with an Israeli result, who owns it, and its runbook. Kept by Omer
(result-night owner); updated whenever #175 adds an event. Times are Israel time. A runbook still in a PR is linked
by PR number until it merges.

Owner = the researcher who watches the result and sends values. Sign-off is in each runbook (values: Tamar or
Dana; sessions: Dana; `earned`: Dana + Tamar). The coordinator writes to the DB.

| Date | Event (Israelis) | Owner | Runbook | Status |
|---|---|---|---|---|
| 19.10 | Rotterdam Worlds, women's qualification (Shoshani 17:00; Raz, Shamay 22:10) | Roni | [result-night-1910.md](result-night-1910.md) (#173) | ready; reserve/apparatus texts in #184 |
| 20.10 | Rotterdam, men's team final | Roni | [rotterdam-outcomes.md](rotterdam-outcomes.md) (ב) | **לא העפילה** (Israel 20th in qualification, #134); no result night |
| 22.10 | Rotterdam, men's all-around final, 20:30 | Roni | – | only if #134 shows an Israeli Q; no plan yet |
| 23.10 | Rotterdam, women's all-around final, 20:30 (Raz, Shamay if Q) | Roni | – | only after a Q on 19.10; no plan yet |
| 24.10 | Tongyeong World Cup, triathlon (Sagiv 04:30) | Ofir | [result-night-2410.md](result-night-2410.md) (#201) | ready; plan in #160 |
| 24.10 | Rotterdam, men's floor final (Dolgopyat, Berkovich 15:00) | Roni | same (#201) | only if #134 confirms Q |
| 24.10 | Rotterdam, women's bars final, 15:00 (Shoshani etc. if Q) | Roni | – | only after a Q on 19.10; texts in #184 |
| 25.10 | Rotterdam, apparatus finals day 2 (beam/floor women; vault, p-bars, high bar men) | Roni | – | only after a Q; no plan yet |
| 29–31.10 | Grand Slam Abu Dhabi, judo (Ashpiz, G. Primo, Nelson Levy; Elbaz; Hershko) | Roni | [result-night-abu-dhabi.md](result-night-abu-dhabi.md) (#203) | ready; prelim times after the 28.10 draw |
| 2–9.11 | European Sixes Salou, women's lacrosse | Yael | [result-night-salou.md](result-night-salou.md) (#214) | schedule and results source pending |
| 3–4.11 | ISSF Worlds Doha, 10m air rifle (Richter, Tashtchiev), **quotas on 3.11** | Yael | [result-night-doha.md](result-night-doha.md) (#210) | history wording pending (Yael) |
| 5–8.11 | Trampoline Worlds, Nanjing (Israeli entries unknown) | Roni | – | no quota; only if an Israeli is entered |
| 6–15.11 | ISA World Surfing Games, Peru (Lelior, entry unverified) | Ofir | – | quota possible; runbook needed once the entry is confirmed |
| 10–18.11 | European Sixes Salou, men's lacrosse | Yael | [result-night-salou.md](result-night-salou.md) (#214) | as for the women |
| 11, 14, 17.11 | EuroBasket Women 2027 qualifiers (women's team, 19:40 / 19:40 / 19:00) | Yael | [result-night-basketball-women-nov.md](result-night-basketball-women-nov.md) (#214) | sessions live (v47) |
| 13.11 | WTCS Abu Dhabi, triathlon, sprint (Sagiv, start list unverified) | Ofir | [result-night-wtcs-abu-dhabi.md](result-night-wtcs-abu-dhabi.md) (#223) | competition record and strings due by 11.11 |
| 13–15.11 | Judo Grand Prix Zagreb (only if Israelis enter) | Roni | – | check the IJF entry list |
| 27, 30.11 | World Cup 2027 qualifiers, men's basketball (The Hague 21:00, Riga 19:30) | Yael | [result-night-basketball-men-nov.md](result-night-basketball-men-nov.md) (#226) | sessions in the DB |
| 28–29.11 | World Triathlon Cup Jeddah (Sagiv's entry unknown) | Ofir | – | only if entered |

Unconfirmed entries, no night planned: weightlifting Worlds Ningbo (to 8.11, Celia Gold not confirmed), fencing
World Cup Bern (12–14.11, no LA28 effect), LPGA events (Beck, entries not confirmed).

Daily job run: 23:45. Every runbook enters results before it, and checks `runs/<next day>` for duplicates.
