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
  - a reserve is recorded as "מחליפה" in the session `result` and in `next` (the history text says "לא עלה/תה לגמר");
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

All `result.text` values are the output of `gym_results.result_text("qual", …)` from #219, the one wording the job
uses too, so it sees a manual entry as already logged. They use `tri_results.he_date()` ("19 באוק׳ 2026") and the
competition name from data.json, and pass `athlete_patch.result_entry()` unchanged.
**Reserves:** `result_text` has no reserve form, so a reserve gets `qualified=False` ("לא עלה/תה לגמר"). The reserve
number appears only in the session `result` ("מחליפה <R>") and in `next`. A reserve variant in `result_text` is
proposed to Maya in #219.

### Raz (`lihie-raz`) and Shamai (`roni-shamay`), all-around
| Outcome | `result.text` | session `result` | `next` / `nextDate` |
|---|---|---|---|
| Q to the all-around final | `מקום <N> בקרב־רב במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלה/תה לגמר` | `מקום <N> בקרב־רב, עלתה לגמר` | `אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר קרב־רב נשים` / `2026-10-23` |
| Reserve (R1–R3) | `מקום <N> בקרב־רב במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלה/תה לגמר` | `מקום <N> בקרב־רב, מחליפה <R>` | `אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר קרב־רב נשים (מחליפה)` / `2026-10-23` |
| Not qualified | `מקום <N> בקרב־רב במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלה/תה לגמר` | `מקום <N> בקרב־רב, לא עלתה לגמר` | `""` / `""`, unless an editor knows the next competition |

- **Apparatus final as well**: a second, separate write, with its own `source` (the Official PDF for that
  apparatus). Each update gets one history entry, so the two can't share one write.

#### Raz / Shamai: apparatus finals (24–25.10)
One write per apparatus. `<R>` = ראשונה/שנייה/שלישית. A plain "not qualified" on an apparatus isn't recorded: the
all-around entry already covers the day.

| Apparatus (final date) | Q: `result.text` | Reserve: `result.text` | session `result` | `next` / `nextDate` if this is her nearest final |
|---|---|---|---|---|
| Vault (24.10) | `מקום <N> בקפיצות במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלה/תה לגמר` | `מקום <N> בקפיצות במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלה/תה לגמר` | `מקום <N> בקפיצות, עלתה לגמר` / `…, מחליפה <R>` | `אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר קפיצות נשים` / `2026-10-24` |
| Uneven bars (24.10) | `מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלה/תה לגמר` | `מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלה/תה לגמר` | `מקום <N> במקבילים, עלתה לגמר` / `…, מחליפה <R>` | `אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר מקבילים מדורגים נשים` / `2026-10-24` |
| Beam (25.10) | `מקום <N> בקורה במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלה/תה לגמר` | `מקום <N> בקורה במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלה/תה לגמר` | `מקום <N> בקורה, עלתה לגמר` / `…, מחליפה <R>` | `אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר קורה נשים` / `2026-10-25` |
| Floor (25.10) | `מקום <N> בקרקע במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלה/תה לגמר` | `מקום <N> בקרקע במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלה/תה לגמר` | `מקום <N> בקרקע, עלתה לגמר` / `…, מחליפה <R>` | `אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר קרקע נשים` / `2026-10-25` |

- **`next` order:**
  - all-around final 23.10 → vault and bars 24.10 → beam and floor 25.10;
  - `next` names only the nearest one;
  - a reserve spot counts only if she has no final as a qualifier;
  - add "(מחליפה)" to the `next` text for a reserve, as in the all-around table.
- **Sessions:** a Q moves the matching block from `pendingFinalBlocks` to a session (24.10 or 25.10 at 14:00 Europe/Amsterdam,
  the FIG Work Plan block), with only that athlete's id. A reserve gets no session until she is confirmed in the
  final's start list.
- All the texts come from `gym_results.result_text()` (#219) and pass `athlete_patch.result_entry()`.
- If she reaches both finals, `next` points to the nearest one: the all-around final on 23.10 comes before 24–25.10.

### Shoshani (`yali-shoshani`), uneven bars
| Outcome | `result.text` | session `result` | `next` / `nextDate` |
|---|---|---|---|
| Q to the bars final | `מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלה/תה לגמר` | `מקום <N> במקבילים, עלתה לגמר` | `אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר מקבילים מדורגים נשים` / `2026-10-24` |
| Reserve (R1–R3) | `מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלה/תה לגמר` | `מקום <N> במקבילים, מחליפה <R>` | no change |
| Not qualified | `מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלה/תה לגמר` | `מקום <N> במקבילים, לא עלתה לגמר` | `""` / `""` |

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

## The men's team line in "מה התעדכן" (Omer's digest, owned by Roni)
It's based on #134, the item `artistic-gymnastics` / `קבוצתי גברים`, outcome (ב). Publish it **only after** Dana and Tamar
sign #134 against FIG's Official results. Until then the digest has no team line.

Line, one line, maqaf before numbers, date in the job's format (`he_date`, "18 באוק׳ 2026"):
```
נבחרת הגברים במקום 20 במוקדמות אליפות העולם ברוטרדם (18 באוק׳ 2026) ולא עלתה לגמר הקבוצתי; ללא מכסת נבחרת, והסיכוי הבא: 9 נבחרות במוקדמות אליפות העולם 2027
```
- The rank (20) and the date come from #134's israelNote. If the Official PDF gives a different rank, change only the
  number.
- No individual finalists in this line. Dolgopyat's and Berkovich's floor final (24.10) is its own line, from the
  result on 24.10.
- The source link is the Official FIG/Longines team qualification PDF, the same one #134 cites.

## Risks
1. **Duplicate entry from the job.** The job (step 2a) may write its own result for Rotterdam on 20.10.
   - `athlete_patch.py` treats it as a repeat only if `at` **and** `text` both match exactly.
   - There's no gymnastics result script like `tri_results.py` to generate an identical text.
   - **Mitigation:** enter the result before the 20.10 run. After the run, if a second Rotterdam entry with
     different wording appears, delete the job's one and tell Maya.
2. **Official PDFs late, or no "Official" stamp.** This is the same problem as in #134. Nothing is recorded from the
   Ranking pages.
3. **Fixed vs provisional.** Shoshani's sub 7 ends before subs 8–10. Don't record her after 18:20; wait for the full list.
