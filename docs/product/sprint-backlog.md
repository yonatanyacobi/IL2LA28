# Backlog 18.10–5.11.2026 (rolling 2-week event calendar)

Owner: PM. It's re-planned after each event below and rolled forward 2 weeks every Sunday.
Sprint 18.10 (quota story MVP, today strip, digest, quota health, QA P2s) is done: see main @ 2701d63, the QA rounds in
`docs/qa/2026-10-18.md` and the launch gates in PR #43 (launch checklist).

Sizes: S ≤ 30 min, M ≤ 1 h, L > 1 h (split before starting). One PR per story; the lead reviews every PR.
**Rule for every event:** the record (athlete + competition) is ✅ and "נבדק ידנית" **before** day 1, and the
quota item reflects the official result **within 24 h** of it (`docs/runbooks/result-night.md`).

## Event calendar

| Dates | Event | Quota at stake | Israelis (data.json) | Site state today |
|---|---|---|---|---|
| 17–25.10 | Artistic gymnastics Worlds, Rotterdam: **men's team final 20.10** | Top 3 teams → 1 team quota (5 gymnasts) | Men's team (5), Dolgopyat (floor), 3 women AA/apparatus | Qualification result not yet verified as official (`docs/runbooks/rotterdam-outcomes.md`) |
| 24.10 | Triathlon World Cup, Tongyeong | Ranking points (OQR) | Shahar Sagiv | Quota item OK; **no competition in data.json** (no calendar row, no "day N" strip) |
| 27.10–8.11 | Weightlifting Worlds | Mandatory IWF qualification event | Celia Gold | Quota item `unknown`: Olympic category not verified |
| 29–31.10 | Judo Grand Slam Abu Dhabi | IJF ranking points (no direct quota) | 5 listed incl. Raz Hershko (world #1) | 7 quota items + stakes lines ready |
| 1–14.11 | Shooting Worlds, Doha | **First LA28 quota places** | Sergey Richter (entry not verified) | Quota item `unknown` |

## P0: event-driven

### E1. Rotterdam result night, 20.10 (Roni + Omer as publisher + Dana and Tamar, S)
- Before 20.10: Roni confirms the official FIG men's qualification result. If Israel isn't in the final, apply outcome (ב) from
  the runbook on 19.10, which covers "not in the final", and drop the "final 20.10" wording everywhere.
- On 20.10: the publisher applies outcome (א) or (ב) from `docs/runbooks/rotterdam-outcomes.md`. `earned` needs both fact-checkers' sign-off. Stage proposals for the 5 gymnasts
  are approved **before** the quota item flips to `earned`. Published the same night, or the next morning at the latest.
- Done when `#sport-artistic-gymnastics`, `#quotas` and the home strip agree, with an official FIG source.

### E2. Add missing competitions for the next 2 weeks (Maya, S)
- Add the Tongyeong World Cup (24.10) as a competition with `qualifying: true` and an official source. Add a test in `tests/`:
  every `nextQuotaEvent` starting in the next 14 days has a containing competition (same sport, start inside it)
  **or** an explicit `end`, matching `quotaEventEnd()`.
- Done when the calendar and today strip show Tongyeong on 24.10.

### E3. Pre-event verification drive (Dana + Tamar, batches due 19–21.10)
- ✅ or ✏️ for every athlete appearing 20.10–1.11: gymnasts, Sagiv, Gold, the judo entrants, Richter. The coordinator marks
  ✅ records "נבדק ידנית". This is launch gate G3; batches and deadlines are in the verification drive (PR #71).

### E4. Weightlifting and shooting quota items (Yael, S, by 26.10)
- Celia Gold's Olympic category and the Doha entry list (Richter). Move each item out of `unknown` only with an
  official IWF/ISSF source. Otherwise improve `israelNote` to say exactly what is unknown.

### E5. Event-day check, each event's day 1 (Gil, S per event)
- Fake today = 20.10, 24.10, 27.10, 29.10, 1.11. The strip, stakes, digest and `#admin` stay consistent. 400px, both themes.

## P1: launch (Thu 22.10, go/no-go 12:00; gates in PR #43)

### L1. Launch PR (lead + coordinator, S)
- G1–G8 green. The contact-address decision (the lead's memo) is recorded. The digest text is used as the launch message.

### L2. "מה קרה" result line on athlete pages (Noa, M)
- The latest `history` item of kind `result` shows at the top of the athlete page with its date and source, so Abu Dhabi
  results are visible without scrolling. Hidden when there is none or it's more than 30 days old.

### L3. Weekly digest ritual (Omer as publisher + PM, S, every Sunday from 25.10)
- Copy `#digest`, check it against the calendar above, then share it. Log the shares and error reports for the metrics.

## Post-launch 22.10–5.11

### Calendar additions
| Dates | Event | At stake | Israelis | Prep owner, due |
|---|---|---|---|---|
| 2–9.11 | Lacrosse sixes Europeans, women (Salou) | Continental route | Women's team | Roni, 30.10 |
| 3.11 / 4.11 | Doha: 10 m air rifle M and W / mixed team | **3 quotas each in ARM and ARW, max 1 per NOC** | Richter; Tashtchiev (D5) | Yael + Tamar, 31.10 |
| 3–7.11 | BMX freestyle Worlds | Quota event | Entrants unknown | Yael, 1.11 |
| 6–15.11 | ISA World Surfing Games (Peru) | 1 place per gender, by team ranking | Not confirmed (Lelior?) | Ofir, 4.11 |

### First: clear the review queue (lead + PM, daily from 22.10)
There are about 30 open PRs. New work waits until they're merged or closed in this order:
1. Launch: #88 (runbook), #89 (corrections log spec), #43, #57.
2. Event-critical before 29.10: #67 (quota-event coverage test), #82 + #84 (rank fields and backfill),
   #78 (verification batch 1), #63 (weightlifting), #65/#86/#68 (round-3 states, needed for Doha).
3. Everything else, oldest first. The PM closes PRs that don't fit the strategy: #60 (English scope) gets
   closed as "no English until mid-2027" (D9).

### Stories
| # | Story | Who | Size | Due | Done when |
|---|---|---|---|---|---|
| PL1 | **Corrections log** (#89): `corrections` collection, editor form, export with `LAUNCH_AT`, `#corrections` page | Maya (data/export), Noa (page + form) | M + M | 24.10 | First real correction appears; smoke tests for `{speed}` and empty state |
| PL2 | **"View as visitor" toggle** for editors | Itai | S | 22.10 (in progress) | An editor sees exactly the signed-out page |
| PL3 | **Quota proposal kind** (D-R2, #76 P1) + `#admin` shows `runs.warnings` and quota proposals | Maya, Itai | M + S | 1.11, if D-R2 is approved by 25.10 | The job files a quota proposal from a saved Abu Dhabi or Rotterdam page in a test |
| PL4 | **Rank tie-break** (#73) in the strip and digest | Noa | S | 28.10 | On fake 29.10, Hershko's item shows first |
| PL5 | **Doha readiness:** Tashtchiev record (if D5) + women's air rifle quota item, Richter `next` 3.11, both verified | Yael, Tamar | S | 31.10 | The strip on fake 3.11 shows both shooters with stakes |
| PL6 | **Verification drive 2:** the remaining ~69 records, 7 a day, alternating Dana and Tamar | Dana, Tamar | L (split into days) | 1.11 for 80% (stretch), 8.11 for 90% | M2 in the weekly log |
| PL7 | **Report triage in week 1:** the launch-day runbook flow, then a review on 25.10 of report count, P0/P1 split and fix time | Dana/Tamar, PM | S | 25.10 | Decide whether the 48 h target holds |
| PL8 | **Weekly digest + metrics log**, Sunday 25.10 and 1.11 | Omer (publisher), PM | S | Sundays | Digest shared; W43/W44 logs on main |
| PL9 | **New-sport onboarding** design (tennis, using #74's research) | UX | M | 30.10 | Spec covers the sport record, quota item, empty sport page and first athletes |

### Explicitly not in this window
- English version and Paralympics (D9).
- Comments or accounts.
- Live scores.

## P2: quality and next sprint
- The 5 ❓ quota items (athletics ×2, sailing ×3): re-check when World Athletics publishes its LA28 system or the 2026
  sailing placings are verified (Roni, standing).
- Next calendar roll (5–19.11): Doha results and reallocation, surfing ISA results, men's lacrosse sixes (10–18.11), WTCS Abu Dhabi (13–14.11).
