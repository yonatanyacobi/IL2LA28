# Go/no-go: result night 19.10, Rotterdam women's qualification

Owner: PM (runs this page and logs the outcome on #238). Decision: coordinator, at **16:00**. Israel time throughout.
What to write and how: [result-night-1910.md](result-night-1910.md). Reserve and apparatus-final texts for Raz and Shamai:
[result-watch-rotterdam-wag.md](../research/result-watch-rotterdam-wag.md) (#184 is merged, so the runbook's "Not
covered yet" note no longer applies). This page only says whether we go, who does what, and how to undo it.

**Site code is frozen** (v53 live). Tonight publishes `data.json` only. No merges, no page or script publish.

## People
| Role | Who | Tonight |
|---|---|---|
| Decision, only DB writer, publishes | coordinator | 16:30 call; writes and the same-night export |
| Session sign-off, start lists | Dana | both sessions before 17:00; sub 10 start list before 21:10 |
| Official results, values | Roni | from ~23:30 until the Official PDFs are in |
| Values check | Tamar | each of Roni's value sets, before any write |
| Live check after publish | Gil | 400px, light and dark, signed out |
| Runs-log check | Roni | `runs/2026-10-20` after the 07:13 run; a duplicate goes to Maya |
| Checklist, log | PM | this page; the outcome goes on #238 |

## Times
| When | What |
|---|---|
| 16:00 | Go/no-go (below) |
| 17:00–18:20 | Sub 7: Shoshani, bars. **Record nothing at 18:20**: subs 8–10 can still push her down |
| before 21:10 | Dana: Raz and Shamai in the sub 10 start list |
| 22:10–23:30 | Sub 10: Raz and Shamai, all-around |
| from ~23:30, every 30 min | Roni: Official PDFs |
| Official + 30 min | Values → Tamar → coordinator writes → same-night export |
| 20.10, 07:13 | Daily run; then Roni checks `runs/2026-10-20` |
| 20.10, after that | v54 (release plan on #238) |

## Go/no-go at 16:00 (each must be yes)
- [ ] `#day-2026-10-19` on the live site, signed out, shows both sessions (`…-wag-q-sub7` 17:00, `…-wag-q-sub10` 22:10)
      with the three athletes. If not: Dana signs #157 and the sessions are loaded first.
- [ ] `runs/2026-10-19` says `published: true`, and the home freshness line shows today.
- [ ] `python3 job/check_live_sync.py` on `main` prints OK (#228 changed `job/` today; OK at 2cb965e).
- [ ] The coordinator can write to the DB, and `athlete_patch.py` runs (dry run as in #173).
- [ ] Roni and Tamar are available until about 01:30, and Dana is available at 21:10.

**No-go on any item:** write nothing tonight. The results go in on 20.10 from the Official PDFs through the same
steps, before or right after the 07:13 run. There is no partial go.

## Sources
Only the **Official** PDFs: https://gym.longinestiming.com/2026/Artistic-17247/en-us/Default → Women's Qualifications
→ "Select file to download". Live and ranking pages, news and social media are not sources. No Official PDF by the
morning: wait.

## Publish (coordinator)
1. Write per result-night-1910.md steps 1–4: the athlete through `athlete_patch.py`, then the session `result` +
   `resultSource` + `resultAt` (all three), then "מה התעדכן" for a Q or reserve only.
2. Export and publish as `job/SKILL.md` step 5 (a–e): save the live `data.json` as `prev.json` **first**, then
   export, validate, publish `files = {"data.json": …}` only.
3. Gil, at 400px signed out, light then dark:
   - `#day-2026-10-19`: each result line has "עודכן ב־HH:MM" and "מקור: <bdi>…</bdi>";
   - `#c-ag-worlds-2026`: the same result in the schedule;
   - `#a-<id>`: the new history entry;
   - home "מה התעדכן": the line for a Q or reserve only;
   - no console errors.
4. PM posts on #238: what was written, the publish time, Gil's result.

## Rollback
- **Wrong `data.json` live:** the coordinator republishes `files = {"data.json": "<scratchpad>/prev.json"}` (the copy
  from step 2), then fixes the DB (a new `athlete_patch.py` write; a wrong published fact gets a correction) and
  exports again. Never edit `data.json` by hand.
- **A write was wrong but not yet exported:** fix it in the DB and don't publish until Tamar re-checks.
- **The site itself breaks (v53 code):** no fix forward tonight. Republish v52 per publishing.md "Rollback"; that
  needs the lead.
