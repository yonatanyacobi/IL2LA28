# Runbook: result night 19.10, Rotterdam women's qualification

For the coordinator (the only DB writer). Values and texts come from Roni's plan,
[result-watch-rotterdam-wag.md](../research/result-watch-rotterdam-wag.md), unchanged; this file only orders them.
All times are Israel time (Rotterdam + 1).

| Athlete | id | Session | Format |
|---|---|---|---|
| יהלי שושני | `yali-shoshani` | `ag-worlds-2026-20261019-wag-q-sub7`, 17:00–18:20 | uneven bars |
| ליהיא רז | `lihie-raz` | `ag-worlds-2026-20261019-wag-q-sub10`, 22:10–23:30 | all-around |
| רוני שמאי | `roni-shamay` | `ag-worlds-2026-20261019-wag-q-sub10`, 22:10–23:30 | all-around |

## Sequence

| When | Step | Who |
|---|---|---|
| before 17:00 | Both 19.10 sessions signed in #157, so `#day` shows them | Dana |
| 18:20 | Sub 7 ends. **Record nothing for Shoshani.** Subs 8–10 can still push her down | – |
| before 21:10 | Confirm Raz and Shamai in the sub 10 start list (Longines → Women's Qualifications → Start List). If one is missing, nothing is recorded for her tonight; tell the coordinator | Dana |
| from ~23:30 | Look for the **Official** PDFs: https://gym.longinestiming.com/2026/Artistic-17247/en-us/Default → Women's Qualifications → "Select file to download" → All-Around Results, Uneven Bars Results (and Balance Beam / Floor Exercise for Raz and Shamai). Check every ~30 min. Ranking pages, news and social media are not a source | Roni |
| Official + 30 min | Pick the row per athlete below, fill `<N>`/`<R>` from the Q/R marks, send to Tamar | Roni |
| after Tamar | Steps 1–4 below, **before the 20.10 daily run** | coordinator |
| 20.10 run | Check `runs/2026-10-20` for a second Rotterdam entry with other wording; if there is one, delete the job's entry and tell Maya | Roni |

No Official PDFs by the morning of 20.10: wait. Don't record anything from another source.

## Coordinator steps (per athlete)

1. **Athlete write** through `job/athlete_patch.py` (cur.json = the athlete as read; new.json as below), then
   `update` with the doc's `if_version`:
   ```json
   {"next": "<next>", "nextDate": "<nextDate>", "source": "<Official PDF>",
    "result": {"at": "2026-10-19", "text": "<result.text>", "source": "<Official PDF>"}}
   ```
   One write per result. An athlete who also makes the bars final gets a second write with the bars row.
2. **Session** `sessions/<session id>`: `result` = the session text below, `resultSource` = the Official PDF,
   `resultAt` = `date -u +%Y-%m-%dT%H:%M:%SZ`. All three, or the export blanks the result. Sub 10 holds both Raz
   and Shamai, so its `result` is `ליהיא רז: <text> · רוני שמאי: <text>`.
3. **"מה התעדכן"**, for a Q or a reserve only (not-qualified goes to history only): prepend the athlete's line
   from the drafts below to `meta/status` `changes` (`{"at": "2026-10-19", "text": …, "athleteId": …}`, `at` is
   the competition day even after midnight), `if_version` from your read, keep 30.
4. **After a Q only**: move the matching final from `pendingFinalBlocks` in `data/sessions/roni.json` to
   `sessions` with that athlete's `athleteIds` (AA final 23.10 19:30, bars final 24.10 14:00 Rotterdam time), Dana
   signs it, and it loads through `job/load_sessions.py`.

**Don't change:** `stage`, `quotas.json` (the 2026 Worlds give no individual quotas), `rankNum`.

## Values

`<N>` = rank in the Official list, `<R>` = ראשונה/שנייה/שלישית.

### Raz and Shamai, all-around (session `…-sub10`)

| Outcome | `result.text` | session `result` | `next` / `nextDate` |
|---|---|---|---|
| Q | `מקום <N> בקרב־רב במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלתה לגמר הקרב־רב` | `מקום <N> בקרב־רב, עלתה לגמר` | `אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר קרב־רב נשים` / `2026-10-23` |
| Not qualified | `מקום <N> בקרב־רב במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלתה לגמר הקרב־רב` | `מקום <N> בקרב־רב, לא עלתה לגמר` | `""` / `""` |

Also in the bars final: a second write with Shoshani's bars Q row and its own `source`. `next` stays the AA final
(23.10 comes first).

### Shoshani, uneven bars (session `…-sub7`)

| Outcome | `result.text` | session `result` | `next` / `nextDate` |
|---|---|---|---|
| Q | `מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלתה לגמר המקבילים` | `מקום <N> במקבילים, עלתה לגמר` | `אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר מקבילים מדורגים נשים` / `2026-10-24` |
| Reserve (R1–R3) | `מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), מחליפה <R> לגמר המקבילים` | `מקום <N> במקבילים, מחליפה <R>` | no change |
| Not qualified | `מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלתה לגמר המקבילים` | `מקום <N> במקבילים, לא עלתה לגמר` | `""` / `""` |

A later change (a reserve moving up, the per-country limit) is a new entry, not an edit of this one.

## Drafts for "מה התעדכן" (`meta/status`)

Only for a qualification or a reserve. The date is in `at`, so the line doesn't repeat it. Keep the
`התעמלות מכשירים: ` prefix exactly: the digest matches the sport by it (`changeSport()` in digest.js).

**ליהיא רז** (`lihie-raz`)
- Q: `התעמלות מכשירים: ליהיא רז עלתה לגמר הקרב־רב באליפות העולם ברוטרדם (מקום <N> במוקדמות)`

**רוני שמאי** (`roni-shamay`)
- Q: `התעמלות מכשירים: רוני שמאי עלתה לגמר הקרב־רב באליפות העולם ברוטרדם (מקום <N> במוקדמות)`

**יהלי שושני** (`yali-shoshani`)
- Q: `התעמלות מכשירים: יהלי שושני עלתה לגמר המקבילים באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- Reserve: `התעמלות מכשירים: יהלי שושני מחליפה <R> לגמר המקבילים באליפות העולם ברוטרדם (מקום <N> במוקדמות)`

## Not covered yet

An all-around reserve, or a beam/floor final for Raz or Shamai, has no wording. Roni is adding it to her plan;
until it is on `main`, don't write those outcomes.
