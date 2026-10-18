# Roadmap: sprints 5–6 (NBA direction, after #day, #following, #c- and near-live)

Owner: PM. Approved by the coordinator on 18.10.2026. In priority order; each item is one GitHub issue with its
done-when and Gil's acceptance check.

| # | Item | Owners | Issue |
|---|---|---|---|
| 1 | **Data supply:** sessions for every Israeli 14 days ahead, and results after each session. Without this, `#day` and `#c-` are empty | Maya (loader, job results); Roni, Yael, Ofir (sessions); Dana, Tamar (spot-checks); PM (rollover check) | #175 (with #158) |
| 2 | **Home = today's scoreboard:** Israelis today/next, followed first, linking into `#day` and `#c-` | UX (design), Itai (build) | #176 |
| 3 | **Show what changed on an open page:** after auto-refresh, highlight rows changed since load | Omer | #177 |
| 4 | **Athlete results log ("game log"):** results across competitions on the athlete page | Noa | #178 |
| 5 | **Standings:** Israel against the quota line for ranking-based sports (judo, taekwondo, fencing first) | Itai (UI), Maya (data), Roni (ranks) | #179 |

Gil runs acceptance on each item, plus event-day checks on 29.10 (Abu Dhabi) and 3.11 (Doha).
Not in these sprints: the event-day cadence (OD2) and the channel pilot (OD3), both waiting for the owner. Competition
follows are deferred (#170).

## Standing duty (PM): 14-day data supply
At every rollover, the PM lists the Israeli events in the next 14 days that have no session in the DB and assigns them to
Roni, Yael or Ofir on #175. Each pass is logged in the weekly metrics log.
