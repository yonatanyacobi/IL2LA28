# Sprint 7 backlog (from 19.10.2026)

Owner: PM. Main at 5a43300; updated after #272 and #279. Ranked. Sources: the readiness checklist (`docs/runbooks/readiness-2210.md`), review
leftovers on #237, #246, #254 and #266, the open issues, and owner decisions D10, D11 and D-R2. One PR per item
unless it says otherwise. Freezes follow the release plan on #238 (no site publish 24.10 00:00 → 25.10 10:00 or
28.10 12:00 → 1.11 10:00).

| # | Item | Owner | Done when |
|---|---|---|---|
| 1 | **Sessions 14 days ahead** (#175): every known Israeli start from 22.10 to 5.11 (Abu Dhabi, Doha, Salou, LPGA) | Roni, Yael, Ofir; Dana signs | By 27.10, each such start is a signed session in `data.json`, or a dated `nextDate` with a reason in the PM's rollover log |
| 2 | **Results into the DB automatically** (D-R2): the `quota` proposal kind if the owner approves by 25.10; otherwise `gym_results.py` (#168) | Maya | Before Doha (3.11): a dry run on a past event creates the right proposal or history entry, with an Official source, and unit tests cover it |
| 3 | **Readiness numbers in `#admin`**: extend the "מוכנות להשקה" panel with the readiness-2210.md §1–§3 figures: records verified (X/N), Israelis with a start in the next 14 days but no session, the last 2 daily runs (published, errors), and per result night the time from session end to a public result (M3) | Noa | Every number the 22.10 report needs for §1–§3 reads from one `#admin` screen; each row links to its list; smoke covers each row, including M3 > 24 h |
| 4 | **Fencing standings, closing #179**: after #285 (judo and taekwondo), the same section for fencing from the FIE ranking | Itai (UI); Roni (FIE rank backfill); Dana signs the cutoffs | #179's done-when for all three sports: ranked Israelis in order with list name and date, the quota line, "ללא דירוג" for the unranked, ranks over 60 days flagged and not hidden. Gil's acceptance on #179 passes |
| 5 | **Launch PR ready** (readiness §4): `LAUNCH_AT`, corrections log on, and the disclaimer and contact checks ticked with sources | Shira; lead merges on D1 | An open PR that sets `LAUNCH_AT` from a placeholder date, passes smoke and unit tests, and lists each §4 item as checked. Not merged before the owner sets D1 |
| 6 | **Follow through on D10 and D11** | Yael (D10), Ofir (D11) | D10: within a day of the owner's answer, both trampoline records carry the decided spelling and are verified (Dana). D11: Teferi's Amsterdam result is live with the Sporthive source within 24 h of the owner's check; without a check it stays on hold and the readiness report says so |
| 7 | **Rotterdam men's team outcome** (#134) | Roni; Dana + Tamar sign | The FIG Official PDF is cited and #134 is merged, or #134 is closed with a note on why. No item is left "unchecked" in `quotas.json` |
| 8 | **Live-browser QA leftovers** from #237 §E and §F: result night and auto-refresh on the live site, tab order, focus ring, console | Gil | Run on the live site on **25.10, 10:00–12:00** (after the freeze lifts), together with the UX audit of a returning visitor the morning after a result night (home → תוצאות אחרונות → game log → standings → `#following`). Pass/fail per item on #237, each fail filed as an issue with an owner |

**Closed in sprint 6** (were items 3 and 4 in the first draft): S4 "השבוע" panel, #279 (51eea0b). Duplicate competition
name, #272 (`sameName()` drops the city, year and parentheticals; 11 of 18 pairs fixed, the other 7 add gender,
discipline or sport on purpose).

**Not in sprint 7:** #156 (near-live copy, mostly done by #182 and #235; recheck in item 8), #158 (runs log in the DB),
and #163 (`tri_results` text; after the 24.10 Tongyeong result shows whether it still happens).
