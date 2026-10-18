# Readiness check, Thu 22.10.2026

Owner: PM. This is a report to the owner, who decides the launch date (D1). It is not a go/no-go. Timeline and roles
are in [launch-day.md](launch-day.md), Part 1 (QA 10:00, report 11:00, coordinator review 12:00, sent 12:30). This page
is what gets checked and how. Values marked "18.10" are a baseline: **re-check every row on the day**, and give each
row a source. Anything not green gets an owner and an ETA.

**22.10 is not a result night**, but the 24.10 result day comes two days later. Launch dates to avoid: 24–25.10,
29.10–1.11 and 3–4.11 (release plan on #238).

## 1. Data coverage
| Check | How | 18.10 / now | Green when |
|---|---|---|---|
| Verified records (M2) | DB `athletes.verifiedAt` vs `updatedAt` (the "נבדק ידנית" chip), or the About trust tiles | 109/113 (coordinator, 18.10 evening) | ≥ 90%, and the remaining records are listed with an owner |
| No ❓ record shown as checked (G2) | Drive log: every marked record has a ✅ row | 🟢 18.10 | still true |
| Audit corrections live (G1) | 3 top-harm records in the published data.json (flag football, Shoshani, basketball men) | 🟢 18.10 | still true |
| Quota items | `site/quotas.json` | 59 published (28 in contention, 31 unknown), 4 held back, 33 sports | none held back without sources (G4); unknown items with an event before 1.11 have an owner |
| Sessions 14 days ahead (#175) | `#day` for 22.10–4.11, against the PM's rollover list | 10 sessions in the fixture | every known Israeli start in that window has a session or a dated `nextDate` |

## 2. Result-night track record
One row per night. M3 = Official result → public `data.json`. Source: the PR or thread for that night, and `runs/`.
| Night | Outcome | M3 (≤ 24 h) | Errors or corrections | Status |
|---|---|---|---|---|
| 19.10 Rotterdam WAG qualification | | | | |
| 20.10 Rotterdam MAG team final | Israel was not in the final (#134; waiting for the FIG PDF) | n/a | | |
| 21–22.10 (any other night) | | | | |

Green when every night that has ended was published from an Official source within 24 h, with no public correction.
One correction made through the corrections log counts as yellow, not red.

## 3. Open bugs
- [ ] Gil's 10:00 live QA (G6): no open P0 or P1, at 400px and 1280px, light and dark, signed out.
- [ ] Open PRs and issues tagged by Gil as regressions are listed, with an owner (`gh pr list`, `gh issue list`).
- [ ] Smoke and unit tests pass on main, and `check_live_sync.py` prints OK (G7; OK on 2cb965e, 18.10).
- [ ] The last 2 daily runs published with no errors in `#admin` (G7).
- [ ] The live page has every `<script src>` from `site/index.html` (publishing.md step 5, fixed in #253).

## 4. Legal and disclaimer text
This is a team check of the text, not legal advice. If the owner wants a professional review, that is the owner's call.
- [ ] Footer, on every page: independent and unofficial; no link to the IOC, the LA 2028 organizing committee or the
      Olympic Committee of Israel; public sources; "check against the source"; the contact address.
- [ ] The hero says "מעקב לא רשמי". No LA28 logo, Olympic rings or official marks anywhere, including the tab icon.
- [ ] `#about`: who we are, the four stages, where the data comes from, what is automatic and what is checked by a person.
- [ ] Contact: `il2la28.site@gmail.com` in the footer and the error box (G5). No personal address.
- [ ] Privacy: no analytics and no cookies. Follows and "last visit" stay in this browser (`localStorage`), and the
      page says so on `#following`.
- [ ] Athletes: public sporting facts only, each with a source link. No photos, no private details.
- [ ] Corrections log: off until launch (`LAUNCH_AT = None`). The launch PR sets it (launch-day.md Part 2).

## 5. The owner's open decisions
From [owner-decisions.md](../product/owner-decisions.md).
| # | Decision | By | If no decision |
|---|---|---|---|
| D1 | Launch date | the owner's call, after this report | The site stays unshared |
| D8 | Digest-copy counter | 25.10 | B: no counter |
| D9 | No English, no Paralympics until mid-2027 | 25.10 | Treated as confirmed |
| D-R2 | Daily job proposes quota updates | 25.10 | B: fully manual |
| D10 | Trampoline athletes' Hebrew names | before launch | A: the DB spelling; both records stay unverified |
| D11 | Browser check: Teferi's Sporthive result (lpga.com optional) | before launch | Teferi's result stays on hold |

## Report to the owner (12:30)
One screen: one line per section above (🟢/🟡/🔴 + source), the decisions table, and the recommendation: "ready", or
"ready once X, Y are done (ETA)". Name the reddest item first.
