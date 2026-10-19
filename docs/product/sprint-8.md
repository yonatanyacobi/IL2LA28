# Sprint 8 (Wed 21.10 – Tue 27.10): draft

Owner: Product lead. One owner per item; every current worker has at least one, so nobody is idle after v55
(20.10). Freezes (release plan on #238): no site publish **24.10 00:00 → 25.10 10:00** or **28.10 12:00 → 1.11
10:00**. Results go out through the DB and the export, never through a site publish. Sprint-7 items still open carry
on as listed in `sprint-7.md`.

## The week's events
| Date | Event | Israelis | Thread |
|---|---|---|---|
| 23.10 | Rotterdam women's all-around final (if Raz or Shamay qualified on 19.10) | per tonight | #312 |
| 24.10 | Rotterdam men's floor final | Dolgopyat, Berkovich | #313 |
| 24.10 | World Cup Tongyeong (triathlon, sprint) | Sagiv | #313 |
| 24–25.10 | Rotterdam apparatus finals, women (if any qualified) | per tonight | #313, #314 |
| 25.10 | Frankfurt Marathon | Haimro Alame | – |
| 27.10 → | Weightlifting Worlds (27.10–8.11) | women's item status unknown | – |
| 29–31.10 | Grand Slam Abu Dhabi (judo), prelims each morning | 11 judoka | #315 |

## Items
| # | Item | Owner | Done when |
|---|---|---|---|
| 1 | **Rotterdam finals results** (23–25.10): floor final, any women's AA or apparatus final | Roni | Each Israeli's result is in history and the session from the Official FIG PDF, within 24 h, using result-night-1910.md's texts |
| 2 | **Tongyeong result by hand** (24.10), then decide #163 | Ofir | Sagiv's result is live before the 25.10 07:13 run, in `tri_results`' exact format; #163 closed or confirmed with the real text |
| 3 | **Frankfurt Marathon** (25.10) | Ofir | Alame's result (official results service) in history with source within 24 h; a DNS/DNF records nothing |
| 4 | **Abu Dhabi prep and results** (draw 28.10, prelims 29–31.10) | Roni | Entries rechecked after the draw; every judoka's day is a signed session by 28.10 18:00; each night's results go in per result-night-abu-dhabi.md |
| 5 | **Abu Dhabi publishing** (29–31.10, inside freeze F3: data only) | Omer | Each night's export published and checked the same night; nothing but `data.json` published |
| 6 | **Digests 25.10 and 1.11** | Omer | Sent to the owner by 10:00 each Sunday per publishing.md step 7; no line repeats a logged result (#327) |
| 7 | **Weightlifting women's item** (Worlds from 27.10) and Beck's dated LPGA checks (BMW 22–25.10, Maybank 29.10) | Yael | The item has a sourced status before 27.10, signed by both fact-checkers; Beck's `next` matches the entries pages on each check day |
| 8 | **Fact-check: result sign-off** for items 1–4 | Dana | Every result and session above signed on its thread before it's written |
| 9 | **Fact-check: daily verification sample and quota changes** (incl. the removals log, #332) | Tamar | Daily sample done (3/2 split with Dana); every quota PR this week signed by both |
| 10 | **Results automation, after D-R2** (decided 25.10): the `quota` proposal kind if approved, else Nanjing via `gym_results` (8.11) | Maya | A dry run on a past event creates the right proposal or history entry with an Official source; unit tests cover it |
| 11 | **Daily-task health on `#admin`** (after Noa's host-shortening fix): a red row when no run has published in 26 h, with the last run's time and "Run now" as the fix | Noa | With an empty or stale `runs` log, `#admin` shows the red row and the readiness panel counts it; smoke covers fresh, stale and empty |
| 12 | **Fencing standings, closing #179** (#291, #321) | Itai | #179's done-when holds for fencing; Gil's acceptance passes |
| 13 | **Post-v55 regressions** | Gil | v55 live check on 20.10 (publish-v55.md step 7), then each P1/P2 filed with an owner; 25.10 live QA (live-qa-2510.md) |
| 14 | **Launch PR** (#342), mergeable the day D1 is set | Shira | `LAUNCH_AT` is the only open value; smoke and unit tests pass; copy reviewed |
| 15 | **v56, 27.10** (between the freezes): what merged after v55 | Lead | Published per publishing.md with the go/no-go of publish-v55.md, rollback point saved |
| 16 | **Launch path, pending D1**: the owner items in readiness-2210.md (public link, view-only test account, daily task firing, D11) | Coordinator | Each is answered or has a date from the owner; the 22.10 report goes out at 12:30 |
| 17 | **Weekly owner update, 25.10** | CEO | Sent from owner-update-template.md: the week's results, readiness, decisions needed |
| 18 | **Board fixes** from the 18.10 review: card rows on phones, 2-line goals, "Sprint 7" once, current statuses | Board keeper | At 400px each worker's job is readable without side-scrolling, in light and dark |
| 19 | **Returning-visitor audit (25.10) and the 22.10 readiness report** | Product lead | audit-2510.md findings filed by 13:00 on 25.10; the report reviewed with the coordinator at 12:00 on 22.10 |
| 20 | **Browser checks when unblocked** (D11: Sporthive for Teferi; lpga.com optional) | Browser verifier (on hold) | Starts only after the owner allows the domains; until then nothing waits on it |

**Noa:** item 11 is hers once the host-shortening fix lands.
