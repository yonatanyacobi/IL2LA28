# Readiness check, Thu 22.10.2026

Owner: PM. This is a report to the owner, who decides the launch date (D1). It is not a go/no-go. Timeline and roles
are in [launch-day.md](launch-day.md), Part 1 (QA 10:00, report 11:00, coordinator review 12:00, sent 12:30). This page
is what gets checked and how. The draft below is filled in as of 18.10 evening: **re-check every row on the day**, and give each
row a source. Anything not green gets an owner and an ETA.

The numbers for §1–§3 are on one screen: `#admin` → "מוכנות להשקה" (editors, live mode). Each row links to its list.

**22.10 is not a result night**, but the 24.10 result day comes two days later. Launch dates to avoid: 24–25.10,
29.10–1.11 and 3–4.11 (release plan on #238).

## Draft report to the owner (as of Sun 18.10, 21:45; re-checked on 22.10)

**Recommendation (draft): ready once the 19.10 result night has gone out cleanly from an Official source, and the
Abu Dhabi sessions are in the public data (ETA 27.10).** Launch on a day that isn't a result night. Of the dates
before Abu Dhabi, 26–28.10 fit.

| Area | Status | In one line |
|---|---|---|
| Data coverage | 🟡 | 113/117 records hand-checked (97%), but only 3 of 14 Israeli starts in the next two weeks have a session on the site |
| Result nights | ⬜ | The first one is 19.10; table below |
| Open bugs | 🟢 | None blocking; 146/146 smoke tests, unit tests and the live-job sync all pass on main 9bbdfcb |
| Legal and disclaimer | 🟢 | Every item below checked in the code; professional review is the owner's call |
| Your decisions | 🟡 | D1 (the date) is yours; D10 keeps 2 records unchecked, and D11 holds one result |

## 1. Data coverage
| Check | How | 18.10 / now | Green when |
|---|---|---|---|
| Verified records (M2) | DB `athletes.verifiedAt` vs `updatedAt` (the "נבדק ידנית" chip), or the About trust tiles | 🟢 **113/117** in the DB (coordinator, 18.10 evening). The public export of 18.10 20:16 shows 108/110; the 2 unchecked there are the trampoline pair (D10) | ≥ 90%, and the remaining records are listed with an owner |
| No ❓ record shown as checked (G2) | Drive log: every marked record has a ✅ row | 🟢 18.10 | still true |
| Audit corrections live (G1) | 3 top-harm records in the published data.json (flag football, Shoshani, basketball men) | 🟢 18.10 | still true |
| Quota items | `site/quotas.json` | 🟡 59 published (28 in contention, 31 unknown), 4 held back. One unknown item has its event before 1.11: weightlifting women, category not verified (Worlds 27.10) | none held back without sources (G4); unknown items with an event before 1.11 have an owner (weightlifting: owner named at the 22.10 check, sourced before 27.10) |
| Sessions 14 days ahead (#175) | Public `data.json`: athletes with a `nextDate` from 19.10 to 2.11 vs sessions | 🟡 **3/14** (the 19.10 gymnasts). Missing: Abu Dhabi judo ×7 (signed in #255, not yet exported), Tongyeong (Sagiv, submitted), the 24.10 floor final (Dolgopyat, Berkovich; only after a Q, #134), lacrosse 2.11 | every known Israeli start in that window has a session or a dated `nextDate` (it does: all 14 have one). Green at ≥ 12/14 sessions, by 27.10 (sprint 7 item 1) |

## 2. Result-night track record
One row per night. M3 = Official result → public `data.json`. Source: the PR or thread for that night, and `runs/`.
| Night | Athlete | Official PDF at | Written at | Public at | M3 (≤ 24 h) | Correction | Status |
|---|---|---|---|---|---|---|---|
| 19.10 Rotterdam WAG qualification | Yali Shoshani (bars, sub 7) | | | | | | |
| | Lihie Raz (AA, sub 10) | | | | | | |
| | Roni Shamay (AA, sub 10) | | | | | | |
| 20.10 Rotterdam MAG team final | men's team | Israel was not in the final (#134, waiting for the FIG PDF) | – | – | n/a | | |
| 21–22.10 | none scheduled | | | | | | |

Fill it from the night's thread and `runs/2026-10-20` (go-no-go-1910.md). "Written at" is the coordinator's last
write, and "Public at" is the `generatedAt` of the export that carries it.
Green when every night that has ended was published from an Official source within 24 h, with no public correction.
One correction made through the corrections log counts as yellow, not red.

## 3. Open bugs
- [ ] Gil's 10:00 live QA (G6): no open P0 or P1, at 400px and 1280px, light and dark, as the test viewer (launch-day.md).
- [x] No open regression PRs or issues (18.10: the only open PR is #134, a quotas outcome; open issues are roadmap items).
- [x] Smoke (146/146) and unit tests pass on main 9bbdfcb, and `check_live_sync.py` prints OK (18.10, 21:45).
- [ ] The last 2 daily runs published with no errors in `#admin` (G7).
- [ ] The live page has every `<script src>` from `site/index.html` (publishing.md step 5, fixed in #253).

## 4. Legal and disclaimer text
This is a team check of the text, not legal advice. If the owner wants a professional review, that is the owner's call.
- [x] Footer, on every page: independent and unofficial; no link to the IOC, the LA 2028 organizing committee or the
      Olympic Committee of Israel; public sources; "check against the source"; the contact address.
- [x] The hero says "מעקב לא רשמי". No LA28 logo, Olympic rings or official marks anywhere, including the tab icon (re-check the icon on 22.10).
- [x] `#about`: who we are, the four stages, where the data comes from, what is automatic and what is checked by a person.
- [x] Contact: `il2la28.site@gmail.com` in the footer and the error box (G5). No personal address.
- [x] Privacy: no analytics and no cookies. Follows and "last visit" stay in this browser (`localStorage`), and the
      page says so on `#following`.
- [x] Athletes: public sporting facts only, each with a source link. No photos, no private details.
- [x] Corrections log: off until launch (`LAUNCH_AT = None`). The launch PR sets it (launch-day.md Part 2).

## 5. The owner's open decisions
From [owner-decisions.md](../product/owner-decisions.md).
| # | Decision | By | If no decision |
|---|---|---|---|
| D1 | Launch date | the owner's call, after this report | The site stays unshared |
| D8 | Digest-copy counter | 25.10 | B: no counter |
| D9 | No English, no Paralympics until mid-2027 | 25.10 | Treated as confirmed |
| D-R2 | Daily job proposes quota updates | 25.10 | B: fully manual |
| D10 | Trampoline athletes' Hebrew names | before launch | A: the DB spelling; both records stay unverified. **Status 18.10: asked, no answer yet** |
| D11 | Browser check: Teferi's Sporthive result (lpga.com optional) | before launch | Teferi's result stays on hold. **Status 18.10: asked, no answer yet** |

## Report to the owner (12:30)
One screen: one line per section above (🟢/🟡/🔴 + source), the decisions table, and the recommendation: "ready", or
"ready once X, Y are done (ETA)". Name the reddest item first.
