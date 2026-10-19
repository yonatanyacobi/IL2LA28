# Runbook: Frankfurt Marathon, 25.10 (Haimro Alame)

For the coordinator. Session `frankfurt-marathon-2026-20261025-men`, start 10:00 Frankfurt time (11:00 in Israel; both
countries leave summer time that night).

**Source:** the race's own results, linked from https://www.frankfurt-marathon.com/en/information/results/, which come out
final first. World Athletics' results page for the race comes later (Amsterdam's was linked from the WA race report
"Results" link). Live tracking and timing feeds are not sources.

**Athlete write:** through `job/athlete_patch.py` with `"result": {"at": "2026-10-25", "text": …, "source": <results URL>}`.
`next`/`nextDate` → `""` (no next race known). `notes`: put the result first, as for Maru and Selamawit Teferi.

| Outcome | `result.text` | session `result` |
|---|---|---|
| Finished | `מקום <P> במרתון פרנקפורט (<TIME>, 25 באוק׳ 2026)` | `מקום <P>, <TIME>` |
| Finished, PB or NR marked on the official list | `מקום <P> במרתון פרנקפורט (<TIME>, שיא אישי, 25 באוק׳ 2026)` (or `שיא ישראלי`) | `מקום <P>, <TIME>` |
| Did not finish | `לא סיים את מרתון פרנקפורט (25 באוק׳ 2026)` | `לא סיים` |
| Did not start / not on the list | no entry; session without a result | – |

`<TIME>` is the official net time, e.g. `2:06:04`. The format follows the entries already in the DB for Amsterdam
(`מקום 20 במרתון אמסטרדם (2:07:22, 18 באוק׳ 2026)`). That differs from the marathon template in
`result-lines-ofir.md` (`מקום <P> ב<COMP>, <TIME> (<DATE>)`); one of the two should be aligned.

"מה התעדכן": `אתלטיקה: איימרו עלמיה סיים <במקום P> במרתון פרנקפורט (<TIME>)`, only for a top-10 finish or a PB.
