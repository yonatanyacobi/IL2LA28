# Result watch: Rotterdam women's qualification, 2026-10-19 (Raz, Shamai, Shoshani)

Owner: Roni. Sign-off: Dana (the two sessions in #157) and Tamar (the values below).
Builds on `data/sessions/roni.json` (#157), `docs/research/sessions-roni.md` (#143) and the #134 thread about
Longines "Official" results. Style follows `docs/research/result-watch-tongyeong.md` (#160).

## When qualification is decided
- **The ranking is final after the last subdivision, on 19.10, not 21.10.** By the FIG Work Plan, women's
  qualification has 10 subdivisions on 18–19.10, and the last one (sub 10) runs 21:10–22:30 Rotterdam time. On
  21.10 there is only the women's team final, and Israel has no women's team.
  - **Correction:** the briefing said "decided on 21.10". By the FIG Work Plan it is decided after sub 10 on 19.10.
- **After sub 7, Shoshani's rank is provisional.** Subdivisions 8–10 can still push her down. Record nothing until
  the Official list that covers all 10 subdivisions.
- **The list of finalists can change after qualification.** A withdrawal before a final can lift a reserve
  (R1–R3), and the per-country limit can remove an athlete. So:
  - "עלתה לגמר" is based on the Q mark in the Official list;
  - a reserve is recorded as "מחליפה";
  - a later change is a new entry, not an edit of this one.

## Timeline (Israel time = Rotterdam + 1)
| When (IL) | What | Who |
|---|---|---|
| 19.10, before 17:00 | Dana signs the two 19.10 sessions in #157 so that `#day` shows them | Dana |
| 17:00–18:20 | Sub 7: Shoshani (uneven bars, AS 1) | – |
| 22:10–23:30 | Sub 10: Raz and Shamai (all-around, AA 1) | – |
| from ~23:30 | Look for the **Official** women's qualification results on Longines: https://gym.longinestiming.com/2026/Artistic-17247/en-us/Default, Women's Qualifications → "Select file to download" → All-Around Results, Uneven Bars Results, Balance Beam Results, Floor Exercise Results. The **Ranking** pages under the same event (Phase/Ranking) are not marked Official, so they are not a source. FIG's own event page (https://www.gymnastics.sport/site/events/detail.php?id=17247) had no results documents on 18.10 | Roni |
| Official list + 30 min | Fill in the values below and send them to Tamar | Roni |
| after Tamar | An editor applies them: athlete writes through `athlete_patch.py`, session results in the DB | editor |
| 20.10 run | The daily job should see the result as already recorded (see risks) | Roni checks `runs/2026-10-20` |

If the Official PDFs aren't up by the morning of 20.10, wait. Nothing is recorded from the Ranking pages, news, or
social media.

## Values to enter (`<N>` = rank in the Official list, `<R>` = ראשונה/שנייה/שלישית)
An athlete write with `"result": {at, text, source}` through `job/athlete_patch.py`, as the job does:
- `at` = "2026-10-19";
- `source` = the URL of the Official PDF for that apparatus or all-around.

The texts were built with `tri_results.he_date()` ("19 באוק׳ 2026") and the competition name from data.json. They
pass `athlete_patch.result_entry()` unchanged and are 95–111 characters long (the limit is 300).

### Raz (`lihie-raz`) and Shamai (`roni-shamay`), all-around
| Outcome | `result.text` | session `result` | `next` / `nextDate` |
|---|---|---|---|
| Q to the all-around final | `מקום <N> בקרב־רב במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלתה לגמר הקרב־רב` | `מקום <N> בקרב־רב, עלתה לגמר` | `אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר קרב-רב נשים` / `2026-10-23` |
| Not qualified | `מקום <N> בקרב־רב במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלתה לגמר הקרב־רב` | `מקום <N> בקרב־רב, לא עלתה לגמר` | `""` / `""`, unless an editor knows the next competition |

- **Apparatus final as well** (for example Shamai on bars): a second, separate write, with the bars row below and its
  own `source`. Each update gets one history entry, so the two can't share one write.
- If she reaches both finals, `next` points to the nearest one: the all-around final on 23.10 comes before 24–25.10.

### Shoshani (`yali-shoshani`), uneven bars
| Outcome | `result.text` | session `result` | `next` / `nextDate` |
|---|---|---|---|
| Q to the bars final | `מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלתה לגמר המקבילים` | `מקום <N> במקבילים, עלתה לגמר` | `אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר מקבילים מדורגים נשים` / `2026-10-24` |
| Reserve (R1–R3) | `מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), מחליפה <R> לגמר המקבילים` | `מקום <N> במקבילים, מחליפה <R>` | no change |
| Not qualified | `מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלתה לגמר המקבילים` | `מקום <N> במקבילים, לא עלתה לגמר` | `""` / `""` |

**Session result fields** (`data/sessions/roni.json` → DB):
- `resultSource` = the Official PDF;
- `resultAt` = the UTC time the editor records it (`date -u +%Y-%m-%dT%H:%M:%SZ`).

The contract requires both whenever `result` is set. Without them the export blanks the result and reports it as held.

**After a Q:** add the matching final from `pendingFinalBlocks` as a full session, with that athlete's `athleteIds`:
- all-around final: 23.10 at 19:30;
- bars final: 24.10 at 14:00, as in the FIG Work Plan block. An exact start for the apparatus comes only from an FIG
  document.

**No change to:**
- `stage`;
- `quotas.json`: the 2026 Worlds give no individual quotas, which start at the 2027 Worlds;
- `rankNum`.

## Risks
1. **Duplicate entry from the job.** The job (step 2a) may write its own result for Rotterdam on 20.10.
   - `athlete_patch.py` treats it as a repeat only if `at` **and** `text` both match exactly.
   - There's no gymnastics result script like `tri_results.py` to generate an identical text.
   - **Mitigation:** enter the result before the 20.10 run. After the run, if a second Rotterdam entry with
     different wording appears, delete the job's one and tell Maya.
2. **Official PDFs late, or no "Official" stamp.** This is the same problem as in #134. Nothing is recorded from the
   Ranking pages.
3. **Fixed vs provisional.** Shoshani's sub 7 ends before subs 8–10. Don't record her after 18:20; wait for the full list.
