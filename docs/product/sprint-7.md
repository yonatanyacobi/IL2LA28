# Sprint 7 backlog (from 19.10.2026)

Owner: Product lead (PM and UX in one role from 19.10). Main at c623753; updated 19.10 morning. Ranked. Sources: the readiness checklist (`docs/runbooks/readiness-2210.md`), review
leftovers on #237, #246, #254 and #266, the open issues, and owner decisions D10, D11 and D-R2. One PR per item
unless it says otherwise. Freezes follow the release plan on #238 (no site publish 24.10 00:00 → 25.10 10:00 or
28.10 12:00 → 1.11 10:00).

| # | Item | Owner | Done when |
|---|---|---|---|
| 1 | **Sessions 14 days ahead** (#175): every known Israeli start from 22.10 to 5.11 (Abu Dhabi, Doha, Salou, LPGA) | Roni, Yael, Ofir; Dana or Tamar signs | By 27.10, each such start is a signed session in `data.json`, or a dated `nextDate` with a reason in the PM's rollover log |
| 2 | **Results into the DB automatically** (D-R2): the `quota` proposal kind if the owner approves by 25.10; otherwise `gym_results.py` (#168) | Maya | Before Doha (3.11): a dry run on a past event creates the right proposal or history entry, with an Official source, and unit tests cover it |
| 3 | **Stakes only where Israel competes**: home "על הכף היום", `#day` "מה זה אומר", `#c-` "מה על הכף" and the digest show a quota item's stakes only when an Israeli in that sport has a session or `nextDate` inside the item's quota event. Otherwise `#c-` says "ישראל לא משתתפת בשלב הזה" and the other places show nothing. From Gil's note on #237 and the 19.10 reader review: the men's team-final stakes showed on 19–20.10 although Israel wasn't in the final | Noa, after her #304 follow-up | Smoke covers the Rotterdam team final (no Israeli session: no stakes on home or `#day`; the `#c-` line shows) and Abu Dhabi 29.10 (stakes shown). The route probe shows no other change |
| 4 | **Fencing standings, closing #179**: after #285 (judo and taekwondo), the same section for fencing from the FIE ranking | Itai (UI); Roni (FIE rank backfill, #291, held until the list date is known); Dana or Tamar signs the cutoffs | #179's done-when for all three sports: ranked Israelis in order with list name and date, the quota line, "ללא דירוג" for the unranked, ranks over 60 days flagged and not hidden. Gil's acceptance on #179 passes |
| 5 | **Launch PR ready** (readiness §4): `LAUNCH_AT`, corrections log on, and the disclaimer and contact checks ticked with sources | Shira; lead merges on D1 | An open PR that sets `LAUNCH_AT` from a placeholder date, passes smoke and unit tests, and lists each §4 item as checked. Not merged before the owner sets D1 |
| 6 | **Follow through on D10 and D11** | Yael (D10), Ofir (D11) | D10: within a day of the owner's answer, both trampoline records carry the decided spelling and are verified (Dana or Tamar). D11: waits on the Browser verifier or the owner (below). Teferi's Amsterdam result is live with the Sporthive source within 24 h of the owner's check; without a check it stays on hold and the readiness report says so |
| 7 | **Rotterdam men's team outcome** (#134) | Roni; Dana + Tamar sign | The FIG Official PDF is cited and #134 is merged, or #134 is closed with a note on why. No item is left "unchecked" in `quotas.json` |
| 8 | **Live-browser QA leftovers** from #237 §E and §F: result night and auto-refresh on the live site, tab order, focus ring, console | Gil | Run on the live site on **25.10, 10:00–12:00** (after the freeze lifts), together with the UX audit of a returning visitor the morning after a result night (home → תוצאות אחרונות → game log → standings → `#following`). Pass/fail per item on #237, each fail filed as an issue with an owner |

**Done:** item 3's first version, the readiness numbers in `#admin`, is #294 (Noa).

**Closed in sprint 6** (were items 3 and 4 in the first draft): S4 "השבוע" panel, #279 (51eea0b). Duplicate competition
name, #272 (`sameName()` drops the city, year and parentheticals; 11 of 18 pairs fixed, the other 7 add gender,
discipline or sport on purpose).

## Standing duties and holds (from 19.10)
- **Fact-checking is two agents.** Dana and Tamar each run their own queue. Daily samples are split 3/2 (Dana/Tamar).
  `earned` still needs both (D4). Wherever this page says "Dana or Tamar signs", either one is enough.
- **Itai owns the home page.** He reviews every PR that touches home (CODEOWNERS), and a panel-order test guards the
  order. Other developers can still change home; Itai reviews.
- **Researchers' stale-data sweep.** Every morning until 16:15, Roni and Yael check the records in their sports that
  have a past `nextDate` or a rank older than 60 days, and fix them or file them. This comes before new sessions, except
  on a result day.
- **Browser verifier: on hold.** A trial hire for checks on sites the team's tools can't read (D11: Sporthive,
  lpga.com). Blocked because the browser tool can't open those sites. It resumes when the owner allows the domains;
  until then the owner checks by hand (D11), and nothing in this sprint depends on the verifier.

**Not in sprint 7:** #156 (near-live copy, mostly done by #182 and #235; recheck in item 8), #158 (runs log in the DB),
and #163 (`tri_results` text; after the 24.10 Tongyeong result shows whether it still happens).
