# Run sheet: result night Mon 19.10 (Rotterdam women's qualification)

One page for the night. Israel time (Rotterdam + 1). The rules and the texts are in
[go-no-go-1910.md](go-no-go-1910.md), [result-night-1910.md](result-night-1910.md) and
[result-watch-rotterdam-wag.md](../research/result-watch-rotterdam-wag.md). This sheet says only who does what, when,
from which PDF, and where it goes. Project owner: PM. The only DB writer is the coordinator.

## Timeline
| Time | Who | Action | Done when |
|---|---|---|---|
| 15:30 | PM | Runs the go/no-go gates (§ Go/no-go in go-no-go-1910.md) and posts the answers on #238 | All 5 answered |
| **16:00** | coordinator | **Go / no-go.** No-go: nothing is written tonight, and the results go in on 20.10 | Decision posted on #238 |
| 17:00–18:20 | – | Sub 7: Shoshani, uneven bars. The site shows "מתחרה היום" | – |
| 18:20 | Roni | **Writes nothing for Shoshani yet.** Subs 8–10 can still push her down | – |
| by 21:10 | Dana | Raz and Shamay are in the sub 10 start list (Longines → Women's Qualifications → Start List). A missing name goes to the coordinator, and nothing is recorded for her | Confirmed on #238 |
| 22:10–23:30 | – | Sub 10: Raz and Shamay, all-around | – |
| from ~23:30, every 30 min | Roni | Looks for the **Official** PDFs (list below) | PDFs saved and linked on #238 |
| Official + 30 min | Roni → Tamar | Values (rank `<N>`, Q / R / out) per athlete, from the PDFs, into the texts | Tamar: "values OK" on #238 |
| after Tamar | coordinator | Writes (below), then the same-night export and publish (`job/SKILL.md` step 5: `prev.json` first) | `generatedAt` of the new export noted |
| publish + 15 min | Gil | 400px, light then dark, as the test viewer (launch-day.md): `#day-2026-10-19`, `#c-ag-worlds-2026`, `#a-<id>`, home | Pass/fail on #238 |
| as it happens | PM | Fills the result-night table in readiness-2210.md §2 (PDF time, write time, public time, M3) | One row per athlete |
| 20.10, after 07:13 | Roni | `runs/2026-10-20` has no second Rotterdam entry (if it does: delete the job's entry, tell Maya) | Checked on #238 |
| 20.10 morning | PM | Post-night summary for the owner (below) | Sent |

No Official PDF by the morning: wait, and record nothing from any other source.

## Which PDF, for whom
Longines Official results: https://gym.longinestiming.com/2026/Artistic-17247/en-us/Default → Women's Qualifications →
"Select file to download". Only files marked **Official**.
| Athlete | id | Session | PDFs |
|---|---|---|---|
| יהלי שושני | `yali-shoshani` | `ag-worlds-2026-20261019-wag-q-sub7` | Uneven Bars Results |
| ליהיא רז | `lihie-raz` | `ag-worlds-2026-20261019-wag-q-sub10` | All-Around Results; also Vault, Uneven Bars, Balance Beam and Floor Exercise Results (apparatus finals) |
| רוני שמאי | `roni-shamay` | `ag-worlds-2026-20261019-wag-q-sub10` | same as Raz |

## Where each result goes (coordinator)
| Outcome | Athlete history (`athlete_patch.py`, source = the PDF) | Session `result` + `resultSource` + `resultAt` | "מה התעדכן" (`meta/status`) | Final session |
|---|---|---|---|---|
| Q | yes | yes | yes | move the final from `pendingFinalBlocks` to a session (AA 23.10; bars/vault 24.10; beam/floor 25.10); Dana signs |
| Reserve (R1–R3) | yes | yes | yes | none until the start list confirms her |
| Not qualified | yes | yes | yes, the neutral line (result-night-1910.md drafts) | – |
| Apparatus, not qualified | no (the all-around entry covers the day) | – | – | – |

Every athlete gets one "מה התעדכן" line tonight, qualified or not (coordinator, 18.10): v53 has no results panel on
home, so this line is how a reader finds the result. Sub 10 is one session for both: `result` = `ליהיא רז: <text> · רוני שמאי: <text>`. Never change `stage`,
`quotas.json` or `rankNum` tonight.

## If something goes wrong
- **Wrong data live:** the coordinator republishes `prev.json` as `data.json`, fixes the record in the DB, and exports
  again. No hand edits to `data.json`.
- **The site itself breaks:** no fix forward tonight. Roll back to the previous site version (publishing.md
  "Rollback"); that needs the lead.

## Post-night summary for the owner (PM, 20.10 morning)
Five lines, sent by the coordinator:
1. What happened, per athlete, with the Official PDF.
2. When it was on the site, and how long after the Official PDF.
3. Anything corrected or held back, and why.
4. Gil's check: pass or fail.
5. What's next: any finals (dates), and the 24.10 result day.
