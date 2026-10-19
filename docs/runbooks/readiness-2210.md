# Readiness check, Thu 22.10.2026

Owner: PM. This is a report to the owner, who decides the launch date (D1). It is not a go/no-go. Timeline and roles
are in [launch-day.md](launch-day.md), Part 1 (QA 10:00, report 11:00, coordinator review 12:00, sent 12:30). This page
is what gets checked and how. The draft below is filled in as of 18.10 evening: **re-check every row on the day**, and give each
row a source. Anything not green gets an owner and an ETA.

The numbers for §1–§3 are on one screen: `#admin` → "מוכנות להשקה" (editors, live mode). Each row links to its list.

**22.10 is not a result night**, but the 24.10 result day comes two days later. Launch dates to avoid: 24–25.10,
29.10–1.11 and 3–4.11 (release plan on #238).

## Draft report to the owner (as of Mon 19.10, 09:55; re-checked on 22.10)

Items marked **⏳ OWNER** wait on the owner; nothing the team does can turn them green.

**Recommendation (draft): ready once (1) the daily task runs on schedule again, (2) the public link question is
answered, and (3) the 19.10 result night has gone out cleanly from an Official source.** Launch on a day that isn't a
result night. Of the dates before Abu Dhabi, 26–28.10 fit.

| Area | Status | In one line |
|---|---|---|
| Daily task | 🔴 ⏳ OWNER | The 07:13 run missed again on 19.10: the scheduler shows 0 runs ever, and the DB `runs` log is empty. Today's data is a hand export (19.10, 09:28) |
| Public link | 🔴 ⏳ OWNER | A signed-out link must exist for a public launch (launch-day.md). The org's share menu, as seen on the team board, offers only "the organization" or "specific users". Owner to check the site's Share menu and ask the admin if needed |
| Data coverage | 🟢 | 113/113 records in the public export hand-checked and unchanged since. Sessions for 14 of 18 starts in the next 14 days |
| Result nights | ⬜ | The first one is tonight, 19.10; table below |
| Open bugs | 🟢 | None blocking. 23 PRs merged since 19.10 00:00 (#303–#334), including stakes only where Israel competes (#322), the late-data render (#308) and both-checker quota sign-off (#330) |
| Legal and disclaimer | 🟢 | Every item checked in the code; professional review is the owner's call |
| Your decisions | 🟡 ⏳ OWNER | D1 (date), D-R2 (quota proposals, by 25.10), D11 (browser checks: Maru Teferi, two taekwondo ranks, the weightlifting start book, the surfing quota rule), the view-only test account for QA. D10 is done |

## 1. Data coverage
| Check | How | 18.10 / now | Green when |
|---|---|---|---|
| Verified records (M2) | `#admin` "מוכנות להשקה" (`noverified`), and `verifiedAt` ≥ `updatedAt` | 🟢 **113/113** in the export of 19.10 09:28 (0 never checked, 0 changed since their check). The trampoline pair is checked after D10 (#298, #303) | ≥ 90%, and the remaining records are listed with an owner |
| No ❓ record shown as checked (G2) | Drive log: every marked record has a ✅ row | 🟢 18.10 | still true |
| Audit corrections live (G1) | 3 top-harm records in the published data.json (flag football, Shoshani, basketball men) | 🟢 18.10 | still true |
| Quota items | live `quotas.json` (the v55 publish on 20.10 brings 61) | 🟡 59 published (28 in contention, 31 unknown), 4 held back. One unknown item has its event before 1.11: weightlifting women, category not verified (Worlds 27.10) | none held back without sources (G4); unknown items with an event before 1.11 have an owner (weightlifting: owner named at the 22.10 check, sourced before 27.10) |
| Sessions 14 days ahead (#175) | `#admin` `nosession` rule (#294; `job/session_gaps.py` agrees) on the export of 19.10 09:28 | 🟢 **14/18** have a session (33 sessions in all; Abu Dhabi judo is in). Missing: the 24.10 floor final (Dolgopyat, Berkovich: only after a Q), Tongyeong 24.10 (Sagiv, until the start list on 22.10), lacrosse 2.11 | every known Israeli start in that window has a session or a dated `nextDate` (it does: all 14 have one). Green at ≥ 12/14 sessions, by 27.10 (sprint 7 item 1) |

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
- [ ] 🔴 ⏳ OWNER: The last 2 daily runs published with no errors in `#admin` (G7). **19.10, 09:55: no run has fired.** `la28-israel-daily-update` is enabled (07:13 daily, next 20.10) but lists 0 runs, and `runs` in the DB is empty. The likely cause is that a local scheduled task needs the owner's Claude app running and the machine awake at 07:13; the owner checks that, or presses Run now each morning until it fires on its own. Until then the coordinator exports by hand.
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
| D-R2 | Daily job proposes quota updates; options and costs in [d-r2-options.md](../product/d-r2-options.md) (#350) | 25.10 | B: fully manual. **⏳ OWNER** |
| D10 | Trampoline athletes' Hebrew names | – | **Done:** the federation's spelling (#298, #303); both records checked |
| D11 | Checks in the owner's browser, [owner-decisions.md](../product/owner-decisions.md#d11-checks-in-the-owners-browser): (1) **Maru** Teferi's Amsterdam result on Sporthive (20th, 2:07:22 by a secondary read), required; (2) WT ranks for Bayech and Dan; (3) the IWF Start Book for Ningbo, by 26.10; (4) lpga.com for Beck, optional; (5) isasurf.org, whether the 2026 World Surfing Games quota goes to the top individual or the top team per gender. **Not part of D11 any more:** **Selamawit** Teferi's Amsterdam result (9th, 2:22:58), which Dana verified from World Athletics' race report on 19.10 | before launch; (3) by 26.10 | Maru Teferi's result stays on hold; Bayech and Dan keep their list date open; Celia Gold has no session. **⏳ OWNER, 19.10: no answer yet**; the coordinator collects the reply (sprint 8, item 20) |
| – | **Public link** for signed-out visitors (launch-day.md, Sharing settings) | before D1 | No public launch. **⏳ OWNER: check the site's Share menu now, not on launch day** |
| – | **View-only test account** for pre-launch QA (launch-day.md, Test viewer) | 20.10 09:10 (v55 check 8) | QA runs as an editor with "צפייה כגולש/ת", which is weaker. **⏳ OWNER** |
| – | **Daily task fires at 07:13** (§3) | 20.10 07:13 | Hand exports by the coordinator. **⏳ OWNER** |

## Report to the owner (12:30)
One screen: one line per section above (🟢/🟡/🔴 + source), the decisions table, and the recommendation: "ready", or
"ready once X, Y are done (ETA)". Name the reddest item first.
