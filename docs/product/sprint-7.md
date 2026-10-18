# Sprint 7 backlog (from 19.10.2026)

Owner: PM. Main at 5a43300. Ranked. Sources: the readiness checklist (`docs/runbooks/readiness-2210.md`), review
leftovers on #237, #246, #254 and #266, the open issues, and owner decisions D10, D11 and D-R2. One PR per item
unless it says otherwise. Freezes follow the release plan on #238 (no site publish 24.10 00:00 → 25.10 10:00 or
28.10 12:00 → 1.11 10:00).

| # | Item | Owner | Done when |
|---|---|---|---|
| 1 | **Sessions 14 days ahead** (#175): every known Israeli start from 22.10 to 5.11 (Abu Dhabi, Doha, Salou, LPGA) | Roni, Yael, Ofir; Dana signs | By 27.10, each such start is a signed session in `data.json`, or a dated `nextDate` with a reason in the PM's rollover log |
| 2 | **Results into the DB automatically** (D-R2): the `quota` proposal kind if the owner approves by 25.10; otherwise `gym_results.py` (#168) | Maya | Before Doha (3.11): a dry run on a past event creates the right proposal or history entry, with an Official source, and unit tests cover it |
| 3 | **Home "השבוע" panel** (S4, `docs/design/sprint6-ux-specs.md`) | Itai | The S4 done-when holds: no 14-day list or "תחרויות קרובות" on home, every row links to `#day-`, and smoke covers the 5 states |
| 4 | **Competition name shown twice**: `sameName()` misses "אליפות העולם בהתעמלות מכשירים, רוטרדם" vs "… 2026" (Gil on #237). Also covers Shira's 400px nit on #246 | Noa | Text and competition name match after ignoring the city after a comma and the year. Smoke covers the Rotterdam pair plus 2 more, and no other `compMention()` output changes in the route probe |
| 5 | **Launch PR ready** (readiness §4): `LAUNCH_AT`, corrections log on, and the disclaimer and contact checks ticked with sources | Shira; lead merges on D1 | An open PR that sets `LAUNCH_AT` from a placeholder date, passes smoke and unit tests, and lists each §4 item as checked. Not merged before the owner sets D1 |
| 6 | **Follow through on D10 and D11** | Yael (D10), Ofir (D11) | D10: within a day of the owner's answer, both trampoline records carry the decided spelling and are verified (Dana). D11: Teferi's Amsterdam result is live with the Sporthive source within 24 h of the owner's check; without a check it stays on hold and the readiness report says so |
| 7 | **Rotterdam men's team outcome** (#134) | Roni; Dana + Tamar sign | The FIG Official PDF is cited and #134 is merged, or #134 is closed with a note on why. No item is left "unchecked" in `quotas.json` |
| 8 | **Live-browser QA leftovers** from #237 §E and §F: result night and auto-refresh on the live site, tab order, focus ring, console | Gil | Run on the live site on 24.10 (after the result night) and after the next publish. Pass/fail per item on #237, each fail filed as an issue with an owner |

**Not in sprint 7:** #156 (near-live copy, mostly done by #182 and #235; recheck in item 8), #158 (runs log in the DB),
and #163 (`tri_results` text; after the 24.10 Tongyeong result shows whether it still happens).
