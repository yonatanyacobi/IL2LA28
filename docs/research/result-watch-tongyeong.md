# Result watch: Tongyeong World Cup, 2026-10-24 (Sagiv)

Owner: Ofir. Sign-off: Tamar, by 2026-10-22. This builds on `docs/research/2026-10-18-ofir-triathlon.md` (#95)
and `docs/research/sessions-ofir.md` (#135).

## Why a manual entry
The daily job's `tri_results.py` reads the result only on the 2026-10-25 run, after the 10:00 digest. So on
2026-10-24 we enter the result by hand, in exactly the job's wording. The job then sees it as already logged and
does not record it twice. It skips an entry when `history[].at` **and** `history[].text` both match
(`job/tri_results.py`, `plan()`).

## Timeline (Israel time)
| When | What | Who |
|---|---|---|
| 2026-10-22 | Check the elite men start list. If Sagiv is on it, apply the session row from `data/sessions/ofir.json` (drop its `notes`) and the item 34 `stakes` wording from #135. If he is not, use outcome D in #95 and do not apply the session row | Ofir → Tamar → editor |
| 2026-10-24 04:30 | Men's race starts (10:30 Asia/Seoul = 01:30Z). Sprint distance, about 1 hour | – |
| from ~06:00 | Watch the results tab on https://triathlon.org/events/2026-world-triathlon-cup-tongyeong. Use only a list marked final (the job uses the same test: every row validated). TriathlonLIVE and news stories are not sources | Ofir |
| final list + 30 min | Enter the values below and send them to Tamar | Ofir |
| after Tamar | Editor applies them. Item 34 changes go through the result-night runbook (quotas.json PR) | editor, owner |
| 2026-10-25 run | The job finds the entry and writes nothing. Check `runs/2026-10-25`: no new Tongyeong history row, and no warning other than a possible "not found" for a DNS | Ofir |

## Values to enter (replace `<N>` with his place)
Enter it the way the job does: an athlete write with `"result": {at, text, source}` through `job/athlete_patch.py`.
That makes it a `kind: "result"` history entry. Use `at` = "2026-10-24" and `source` =
"https://triathlon.org/events/2026-world-triathlon-cup-tongyeong".

The `text` must match the job character for character. It uses the competition name from `data.json` and the date
in the job's Hebrew format (`he_date`), **not** YYYY-MM-DD. The strings below were generated with
`tri_results.result_text()` and pass `athlete_patch.result_entry()` unchanged.

| Outcome | `result.text` | session `result` | `notes` |
|---|---|---|---|
| Finished, 4th or lower | `מקום <N> בגביע העולם בטריאתלון טונגיונג (ספרינט, 24 באוק׳ 2026)` | "מקום <N>" | no change |
| Podium (1–3) | same text | "מקום <N>" | append `מקום <N> בגביע העולם בטריאתלון טונגיונג 2026`, the job's own note string, so it opens no duplicate proposal |
| DNF | `לא סיים/ה את גביע העולם בטריאתלון טונגיונג (24 באוק׳ 2026)` | "לא סיים" | no change |
| DSQ | `נפסל/ה בגביע העולם בטריאתלון טונגיונג (24 באוק׳ 2026)` | "נפסל" | no change |
| DNS / not on the list | no history entry; do not apply the session row | – | no change |

This replaces the history wording in #95 (that wording used YYYY-MM-DD and "לא סיים", and it would be
recorded twice).

Session result fields: `resultSource` = the results tab URL as it appears on the night, and `resultAt` = the UTC time
the editor records it (`date -u +%Y-%m-%dT%H:%M:%SZ`). The contract requires both whenever `result` is set.

Also from #95, the same night: `next`/`nextDate` → WTCS Abu Dhabi / 2026-11-13, only if his entry is shown.
`stage` does not change. Item 34 stays `in-contention`; its `stakes` and `nextQuotaEvent` move to Abu Dhabi. The
rank update waits for the first Olympic qualification ranking list dated after 2026-10-24.

## Risks to the de-duplication
1. **Distance label.** The job prints "ספרינט, " only if the API's `prog_distance_category` is `sprint`. If the
   API uses another value, the job's text differs, and on 2026-10-25 it adds a second entry. Check: after the run,
   if a second Tongyeong entry appears, delete the manual one (the job's text is the API's truth) and tell Omer.
2. **Date.** The job uses the API's `prog_date` for both `at` and the date in the text. The race is on 2026-10-24
   local, and the API date should be the same. A mismatch has the same effect as risk 1.
3. **Name match.** The job finds Sagiv by profile id 41870 in his `source`, then by `name_en`. Keep `source` on
   the profile URL (see #135).
