# Backlog 18.10–1.11.2026 (rolling 2-week event calendar)

Owner: PM. It's re-planned after each event below and rolled forward 2 weeks every Sunday.
Sprint 18.10 (quota story MVP, today strip, digest, quota health, QA P2s) is done: see main @ 2701d63, the QA rounds in
`docs/qa/2026-10-18.md` and the launch gates in `docs/product/launch-checklist.md`.

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

### E1. Rotterdam result night, 20.10 (Roni + Dana + owner, S)
- Before 20.10: Roni confirms the official FIG men's qualification result. If Israel isn't in the final, use outcome (ג) from
  the runbook on 19.10 and drop the "final 20.10" wording everywhere.
- On 20.10: the owner applies outcome (א)/(ב)/(ג) from `rotterdam-outcomes.md`. Stage proposals for the 5 gymnasts
  are approved **before** the quota item flips to `earned`. Published the same night, or the next morning at the latest.
- Done when `#sport-artistic-gymnastics`, `#quotas` and the home strip agree, with an official FIG source.

### E2. Add missing competitions for the next 2 weeks (Maya, S)
- Add the Tongyeong World Cup (24.10) as a competition with `qualifying: true` and an official source. Check that every
  `nextQuotaEvent` in the next 14 days has a matching competition (a test in `tests/`, so the gap can't come back).
- Done when the calendar and today strip show Tongyeong on 24.10.

### E3. Pre-event verification sweep (Dana, M, by 23.10)
- ✅ or ✏️ for every athlete appearing 20.10–1.11: gymnasts, Sagiv, Gold, the judo entrants, Richter. The owner marks
  ✅ records "נבדק ידנית". This is launch gate G3.

### E4. Weightlifting and shooting quota items (Yael, S, by 26.10)
- Celia Gold's Olympic category and the Doha entry list (Richter). Move each item out of `unknown` only with an
  official IWF/ISSF source. Otherwise improve `israelNote` to say exactly what is unknown.

### E5. Event-day check, each event's day 1 (Gil, S per event)
- Fake today = 20.10, 24.10, 27.10, 29.10, 1.11. The strip, stakes, digest and `#admin` stay consistent. 400px, both themes.

## P1: launch (target Thu 22.10, see `launch-checklist.md`)

### L1. Launch PR (lead + owner, S)
- G1–G8 green. The contact-address decision (the lead's memo) is recorded. The digest text is used as the launch message.

### L2. "מה קרה" result line on athlete pages (Noa, M)
- The latest `history` item of kind `result` shows at the top of the athlete page with its date and source, so Abu Dhabi
  results are visible without scrolling. Hidden when there is none or it's more than 30 days old.

### L3. Weekly digest ritual (owner + PM, S, every Sunday from 25.10)
- Copy `#digest`, check it against the calendar above, then share it. Log the shares and error reports for the metrics.

## P2: quality and next sprint
- QA P2-8: geresh normalisation for data strings in the job/export (Maya, S).
- QA: singular forms in the home quota KPI; hide the empty "איך מחולקות המכסות" details (Itai, S).
- The 5 ❓ quota items (athletics ×2, sailing ×3): re-check when World Athletics publishes its LA28 system or the 2026
  sailing placings are verified (Roni, standing).
- Next calendar roll (1–15.11): surfing ISA (6.11), lacrosse sixes Europeans (2–18.11), BMX freestyle Worlds (3.11),
  Doha results.
