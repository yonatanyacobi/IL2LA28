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
| before 21:10 IL | Confirm Raz and Shamai in the sub 10 start list (Longines → Women's Qualifications → Start List). If one is missing, nothing is recorded for her tonight; tell the coordinator | Dana |
| from ~23:30 | Look for the **Official** PDFs: https://gym.longinestiming.com/2026/Artistic-17247/en-us/Default → Women's Qualifications → "Select file to download" → All-Around Results, Uneven Bars Results (and Balance Beam / Floor Exercise for Raz and Shamai). Check every ~30 min. Ranking pages, news and social media are not a source | Roni |
| Official + 30 min | Pick the row per athlete below, fill `<N>`/`<R>` from the Q/R marks, send to Tamar | Roni |
| after Tamar | Steps 1–4 below, **before the 20.10 daily run** | coordinator |
| 20.10 run | Check `runs/2026-10-20` for a second Rotterdam entry with other wording; if there is one, delete the job's entry and tell Maya | Roni |

No Official PDFs by the morning of 20.10: wait. Don't record anything from another source.

## Coordinator steps (per athlete)

1. **Athlete write** through `job/athlete_patch.py` (cur.json = the athlete as read; new.json as below), then
   `update` with the doc's `if_version`:
   ```json
   {"next": "<next>", "nextDate": "<nextDate>",
    "result": {"at": "2026-10-19", "text": "<result.text>", "source": "<Official PDF>"}}
   ```
   No top-level `source`: it would replace the athlete's profile link with the results PDF (dry run, 18.10); the
   history entry carries the PDF. One write per result. An athlete who also makes the bars final gets a second write with the bars row.
2. **Session** `sessions/<session id>`: `result` = the session text below, `resultSource` = the Official PDF,
   `resultAt` = `date -u +%Y-%m-%dT%H:%M:%SZ`. All three, or the export blanks the result. Sub 10 holds both Raz
   and Shamai, so its `result` is `ליהיא רז: <text> · רוני שמאי: <text>`.
3. **"מה התעדכן"**, for every athlete, qualified or not (coordinator, 18.10): prepend the athlete's line
   from the drafts below to `meta/status` `changes` (`{"at": "2026-10-19", "text": …, "athleteId": …}`, `at` is
   the competition day even after midnight), `if_version` from your read, keep 30.
4. **After a Q only**: move the matching final from `pendingFinalBlocks` in `data/sessions/roni.json` to
   `sessions` with that athlete's `athleteIds` (AA final 23.10 19:30, bars final 24.10 14:00 Rotterdam time), Dana
   signs it, and it loads through `job/load_sessions.py`.

5. **Publish the same night** (coordinator's decision): right after the last write, export and publish as in
   step 5 (PUBLISH) of `job/SKILL.md`; don't wait for the 07:13 run. Mechanical part about 2 s in the dry run (#173).
   This path sends only `data.json`; the page and its JS files (`sessions.js` and `home.js` included) are kept as published.

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

One line per athlete, whatever the outcome. The date is in `at`, so the line doesn't repeat it. Keep the
`התעמלות מכשירים: ` prefix exactly: the digest matches the sport by it (`changeSport()` in digest.js).

**ליהיא רז** (`lihie-raz`)
- Q: `התעמלות מכשירים: ליהיא רז עלתה לגמר הקרב־רב באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- Out: `התעמלות מכשירים: ליהיא רז במוקדמות אליפות העולם ברוטרדם: מקום <N> בקרב־רב, לא עלתה לגמר`

**רוני שמאי** (`roni-shamay`)
- Q: `התעמלות מכשירים: רוני שמאי עלתה לגמר הקרב־רב באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- Out: `התעמלות מכשירים: רוני שמאי במוקדמות אליפות העולם ברוטרדם: מקום <N> בקרב־רב, לא עלתה לגמר`

**יהלי שושני** (`yali-shoshani`)
- Q: `התעמלות מכשירים: יהלי שושני עלתה לגמר המקבילים באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- Reserve: `התעמלות מכשירים: יהלי שושני מחליפה <R> לגמר המקבילים באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- Out: `התעמלות מכשירים: יהלי שושני במוקדמות אליפות העולם ברוטרדם: מקום <N> במקבילים, לא עלתה לגמר`

## All-around reserve and apparatus finals

#184 is merged: for an all-around reserve or an apparatus final for Raz or Shamai, use the texts in
[result-watch-rotterdam-wag.md](../research/result-watch-rotterdam-wag.md). Their "מה התעדכן" line follows the Q or
Reserve pattern above, with the final's name.

The "מה התעדכן" lines for these cases, written out from the Q/Reserve pattern above. The `history` and session texts
are in that file's tables. One line per final she reaches; a Q and a reserve spot on the same night are two lines.

**ליהיא רז** (`lihie-raz`)
- all-around (reserve only; Q is above), Reserve: `התעמלות מכשירים: ליהיא רז מחליפה <R> לגמר הקרב־רב באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- vault, Q: `התעמלות מכשירים: ליהיא רז עלתה לגמר הקפיצות באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- vault, Reserve: `התעמלות מכשירים: ליהיא רז מחליפה <R> לגמר הקפיצות באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- uneven bars, Q: `התעמלות מכשירים: ליהיא רז עלתה לגמר המקבילים באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- uneven bars, Reserve: `התעמלות מכשירים: ליהיא רז מחליפה <R> לגמר המקבילים באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- beam, Q: `התעמלות מכשירים: ליהיא רז עלתה לגמר הקורה באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- beam, Reserve: `התעמלות מכשירים: ליהיא רז מחליפה <R> לגמר הקורה באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- floor, Q: `התעמלות מכשירים: ליהיא רז עלתה לגמר הקרקע באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- floor, Reserve: `התעמלות מכשירים: ליהיא רז מחליפה <R> לגמר הקרקע באליפות העולם ברוטרדם (מקום <N> במוקדמות)`

**רוני שמאי** (`roni-shamay`)
- all-around (reserve only; Q is above), Reserve: `התעמלות מכשירים: רוני שמאי מחליפה <R> לגמר הקרב־רב באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- vault, Q: `התעמלות מכשירים: רוני שמאי עלתה לגמר הקפיצות באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- vault, Reserve: `התעמלות מכשירים: רוני שמאי מחליפה <R> לגמר הקפיצות באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- uneven bars, Q: `התעמלות מכשירים: רוני שמאי עלתה לגמר המקבילים באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- uneven bars, Reserve: `התעמלות מכשירים: רוני שמאי מחליפה <R> לגמר המקבילים באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- beam, Q: `התעמלות מכשירים: רוני שמאי עלתה לגמר הקורה באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- beam, Reserve: `התעמלות מכשירים: רוני שמאי מחליפה <R> לגמר הקורה באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- floor, Q: `התעמלות מכשירים: רוני שמאי עלתה לגמר הקרקע באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
- floor, Reserve: `התעמלות מכשירים: רוני שמאי מחליפה <R> לגמר הקרקע באליפות העולם ברוטרדם (מקום <N> במוקדמות)`
