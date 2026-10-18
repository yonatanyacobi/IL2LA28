# Publishing calendar: 20.10–5.11.2026

Owner: Omer (Publisher). For each event night: who does what, when official results can be expected, and what
changes on the site. The how is in [result-night.md](result-night.md) (research → sign-off) and
[publishing.md](publishing.md) (merge → live → digest). Roles are from `docs/company/roles.md`.

All times are Israel time. Israel and the EU both leave summer time on **Sunday 25.10**, so Rotterdam is 1 hour
behind Israel throughout. Korea is 6 hours ahead (24.10). After 25.10, Abu Dhabi and Doha are 2 and 1 hours ahead.

**Rules for every row**
- Results are taken only from the federation's official list (FIG / World Triathlon / IJF / ISSF). Live scoring,
  TV and news are not sources, so "expected official results" is a window, not a promise.
- `earned` is approved by Dana and Tamar together (`review.by` `"dana+tamar"`), plus `earnedAt` = the date of the
  deciding result. The athletes' stage proposals are approved and exported **before** the quota item goes live.
- Status labels on the site change by themselves. The day after a quota event ends, the item shows
  "◷ בהמתנה לתוצאות" until `quotas.json` is updated, for up to 14 days. Nobody needs to publish for that.
- The daily run is automated (23:45 on 20.10). It may draft stage proposals from provisional results. Approve
  nothing that the official list doesn't support.
- Before each quota event, Gil runs `node tests/preview_at.js` for the event day and the day after
  (publishing.md, step 4).

## Overview

| Date | Event | Quota at stake? | Researcher | Fact-check | Publisher | Official results expected |
|---|---|---|---|---|---|---|
| Tue 20.10 | Rotterdam Worlds, men's team final | **Yes**: top 3 teams | Roni | Dana (+ Tamar if `earned`) | Omer | Session 20:30–23:30. FIG list: same night or the next morning |
| Sat 24.10 | Rotterdam apparatus finals, day 1 | No | Roni | Dana | Omer | Finals from 15:00. FIG list the same evening |
| Sat 24.10 | Tongyeong World Cup (triathlon) | No (OQR points) | Ofir | Tamar | Omer | Start time not confirmed (open item). Morning in Israel, since Korea is +6 |
| Sun 25.10 | Rotterdam apparatus finals, day 2 | No | Roni | Dana | Omer | Finals from 15:00. FIG list the same evening |
| Sun 25.10 | **Sunday digest** | – | – | – | Omer | Send by 10:00 |
| Thu 29.10–Sat 31.10 | Abu Dhabi Grand Slam (judo) | No (IJF points) | Roni | Dana | Omer | Daily session schedule not in the repo (Roni). IJF results the same evening |
| Sun 1.11 | **Sunday digest** (Rotterdam + Abu Dhabi results) | – | – | – | Omer | Send by 10:00 ([digest-rotterdam.md](digest-rotterdam.md)) |
| Tue 3.11–Wed 4.11 | Doha shooting Worlds: 10 m air rifle men | **Yes**: 3 quotas, max 1 per country | Yael | Tamar (+ Dana if `earned`) | Omer | Schedule from Yael. ISSF results the same evening |

## Rotterdam, team final (Tue 20.10)

Quota item: `artistic-gymnastics` / `קבוצתי גברים`. Texts: [rotterdam-outcomes.md](rotterdam-outcomes.md).

- **Before:** Roni confirms whether Israel reached the final (8 teams) from FIG's qualification results. If not,
  it's outcome (ב) on the night of 18–19.10 and nothing happens on 20.10 except the strip.
- **20.10 during the session:** the today strip shows the Worlds (day 4 of 9) with the team final's "מה זה אומר"
  line. Nothing to publish.
- **20.10 after the FIG list (Roni → Dana + Tamar → Omer):**

| Outcome | Changes on the site after publishing |
|---|---|
| (א) places 1–3 | Stage 2 for the line-up (approved proposals, export). Item `earned` with `earnedAt` 2026-10-20, and the individual men's item → `outside`. Home: "מכסה חדשה לישראל". Strip: "✓ מכסה הושגה: קבוצתי גברים". Sport page: "הושגה ב־20 באוק׳ 2026". `#quotas`: moves to the earned group. |
| (ב) no quota | Item stays `in-contention`, with a new note and `nextQuotaEvent` = Worlds 2027. Sport page and `#quotas` show the next event. No banner. |
| (ג) provisional | `israelNote` only. From 21.10 the item shows "◷ בהמתנה לתוצאות" until FIG confirms. |

- **Target:** live within 24 hours of the FIG list. With the 23:45 run and sign-offs, that realistically means
  21.10 during the day.

## Rotterdam, apparatus finals (Sat 24.10 and Sun 25.10)

No quota at the 2026 Worlds for individuals. Individual routes are in 2027–28 (rotterdam-outcomes.md).

- Israeli finalists are only those on FIG's official finals lists. As of 18.10, Dolgopyat's floor final (24.10)
  is **not verified**.
- **Site changes:** athlete `history` (result + FIG source) and `notes` if it's a medal. Rank fields are not
  changed on the night. No `quotas.json` change. The Worlds' competition record ends on 25.10, so from 26.10 it
  moves from the strip to "תוצאות השבוע" in the digest.

## Tongyeong World Cup, triathlon (Sat 24.10)

From Ofir's plan (`dev/ofir/triathlon`, docs/research/2026-10-18-ofir-triathlon.md). There's no quota and no stage
change. Reject any stage proposal.

- **Before (Ofir):** confirm Sagiv on the elite men's start list and get the start time. Add the 2026 Tongyeong and
  WTCS Abu Dhabi (13–14.11) competition records, otherwise the strip and digest won't show them.
- **Site changes after the final results list:** Sagiv's `history` gets a result, `next`/`nextDate` = WTCS Abu Dhabi
  13.11 (if he's on that start list). Quota item `triathlon` / `אישי גברים`: `israelNote` with his place, new
  `stakes`, `nextQuotaEvent` = WTCS Abu Dhabi 13–14.11, still `in-contention`. Rank only from the next OQR list.
- **DNS or not entered:** only `next` and `nextQuotaEvent` change.

## Abu Dhabi Grand Slam, judo (Thu 29.10–Sat 31.10)

Seven quota items (`judo`, weights 52 to 78+, men's 60 and 73) have this event as `nextQuotaEvent` (29–31.10).
It's IJF ranking points, not a direct quota, so no status changes to `earned`.

- **During:** the strip shows the event with up to 2 "מה זה אומר" lines, followed athletes' weights first.
- **After each day (Roni → Dana → Omer):** athlete `history` for each Israeli who fought (result + IJF source).
  Medals also in `notes`. Ranks change only from the next IJF ranking list, not on the night.
- **After 31.10:** for each of the 7 items, `israelNote` and `stakes` are rewritten for the next ranking event, with
  a new `nextQuotaEvent`. Until that's published, from 1.11 the items show "◷ בהמתנה לתוצאות". Batch all 7 in one
  PR so the sport page doesn't show a mix.

## Doha shooting Worlds: 10 m air rifle men (Tue 3.11–Wed 4.11)

Quota item `shooting` / `רובה אוויר 10 מ׳ גברים`, currently `unknown`. The item's `nextQuotaEvent` starts on
1.11 (the championship), but the event itself is 3–4.11.

- **Before (Yael, by 1.11):** confirm Richter is entered (the item says it isn't verified), and set
  `nextQuotaEvent` to `{"start": "2026-11-03", "end": "2026-11-04"}` with Tamar's sign-off. Without that, the
  event is dated 1.11 in the strip, `#quotas` and the digest. It also counts as current until the championship ends
  on 14.11, so the stale "מה זה אומר" stays up for 10 days after the result instead of switching to "◷ בהמתנה
  לתוצאות" on 5.11.
- **After the ISSF list:**
  - In the 3 quota places, and Israel's first quota in this event: the earned path, as in Rotterdam (א), with
    `earnedAt` 2026-11-03 or 11-04. The quota belongs to the NOC, so say so in the note.
  - Otherwise: `in-contention` or `outside` per the ISSF system, with the next event.
- Not in this calendar's window: the rest of the Doha Worlds (to 14.11) and WTCS Abu Dhabi (13–14.11). Add them in
  the next calendar.

## Open items (owner of the item in brackets)

- Was Israel in the team final? FIG qualification results for 17–18.10 (Roni).
- Tongyeong: start list and start time (Ofir).
- Abu Dhabi: the weights by day (Roni).
- Doha: Richter's entry, the qualification and final times (Yael).
