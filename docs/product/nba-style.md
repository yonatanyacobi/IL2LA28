# NBA-app style: research and plan

Owner: PM. Requested by the owner on 18.10.2026: competitions by day, results updating in real time, following a sport or
an athlete, and an update to the user whenever something about them changes.
Status: plan for the owner and the CEO. UX designs phase 1 (draft #130, `docs/design/daily-and-following.md`). Aligned with the
strategy update f7586be on #58: event-day runs every 2 hours from 29.10, results on the site within 2 hours of the official posting.

## 1. What we take from the NBA app

| NBA app | What it does | For us |
|---|---|---|
| **Scoreboard by day** | A date strip (yesterday, today, tomorrow…), every game that day, and a status per game (upcoming, live, final) | **Take it.** A `#day-<date>` view: every competition that day, grouped by sport, with the Israelis in it, the session time in Israel time, and a status: לפני / מתחרים עכשיו / ממתינים לתוצאה / תוצאה |
| **Game page** | Box score, play-by-play, recap | **Take a light version.** A competition page with the Israelis per day, their round reached, place or score, and the official source. No play-by-play |
| **Live score** | Updates every few seconds | **Don't take it.** We have no live feed and no server. We get "near-live" (§2) |
| **Favourites** | Follow teams and players; they come first everywhere | **Take it.** Following athletes already exists (localStorage). Add following a sport, and order every list followed-first |
| **Push notifications** | Alerts on start, final and big plays | **Not on this platform.** In the site: "what changed since your last visit", badges, and a `#following` feed. Push only on another platform (§2, phase 3) |
| **News, highlights, video** | Editorial content | **Don't take it.** Out of scope; copyright |

## 2. Feasibility on our platform (honest version)

Our platform, from CLAUDE.md:
- The page can't fetch external sites.
- Signed-out visitors read only the published `data.json` (and `quotas.json`).
- Updates come from a scheduled Claude job that researches official pages, writes the DB and republishes `data.json`.
- There's no server, no push and no analytics.

### "Real time": what it can mean for us
| Path | What the user sees | Delay after the official result | Cost | Verdict |
|---|---|---|---|---|
| **A. Event-day job** (recommended, in the strategy): a second scheduled task runs **every 2 hours from 29.10**, only on days when an Israeli competes. It reads the official result page for today's sessions only, writes status and result, and republishes `data.json`. Tighten to hourly at peak sessions only if the 2-hour target is missed | Statuses and results with "עודכן לפני X דק׳" | **≤ 2 h** | Running cost: ~6–8 extra job runs per event day, at about 2–3 event days a week. Build M (Maya) | **Do it** |
| **B. Page auto-refresh:** the open page re-fetches `data.json` every 5 min while visible, and shows "יש עדכון" when it changed | No reload needed | +0–5 min on top of A | Build S (Omer), plus a spike S to check that a republished `data.json` reaches an already-open page | **Do it** (after the spike) |
| **C. World Triathlon API** (D-R1, the owner is registering) | Structured triathlon results | Same as A, fewer misreads | S, once the key exists | **Do it**; it's the only documented API |
| **D. Live scraping or live feeds** | Seconds-fresh scores | Seconds | Needs a server; against IF terms; breaks often | **Don't** |

**Stays manual:** quota status and stage changes (D4: both fact-checkers) and new athletes (D5). Results that the job
writes from an official page carry their source and time. If a page says "unofficial", so does the site. Dana and Tamar
spot-check results the same day, and a wrong result goes to the corrections log.

**Honest wording on the site:** "מתעדכן פעם ביום" in phase 1, and "מתעדכן כל שעתיים בימי תחרות" only after OD2. Never "בזמן אמת".

### "Updates" to the user
| Path | Possible here? | Cost | Verdict |
|---|---|---|---|
| **In-site:** a `#following` feed: followed athletes and sports, and what changed since the last visit. A badge with the count on the nav. Followed-first ordering everywhere. Already half-built: follows and "עודכנו מאז הביקור הקודם" exist | Yes. It's per browser (localStorage), so there's no cross-device sync | M | **Phase 1** |
| **Weekly digest** (exists): the publisher shares it by copy and paste | Yes | Exists | Keep it |
| **Atom/RSS feed file** (`feed.xml`) published next to `data.json`, so feed readers can poll it | Maybe. It depends on whether the artifact file URL is readable by feed readers, signed out. Spike S | S–M | **Phase 2**, after the spike |
| **Telegram or WhatsApp channel:** the publisher posts results on event days (manual, from the job's summary) | Yes; it's outside the site | Ongoing publisher time, ~10 min per event day | **Phase 2 pilot**, with owner OK (OD3) |
| **Web push or email alerts** | No. Needs separate hosting, a backend, a push service or mailer, a signup with consent, unsubscribe and a privacy policy (emails are personal data) | L–XL to build, plus ongoing hosting and maintenance | **Phase 3**, only if phase 2 shows demand |
| **A separate native app** | Different platform entirely | XL | **No** |

## 3. MVP phases

**Phase 1: sprints 3–4 (about 2 weeks; ready before the Doha Worlds, 1–14.11)**
Phase 1 runs on today's **daily** job. The event-day cadence (OD2) and the Telegram pilot (OD3) wait for the owner and
are not part of it (see "Waiting for the owner" below). So phase 1 copy says "מתעדכן פעם ביום", never "כל שעתיים".
The status chip is computed in the page from the session's date and time and whether a result exists: before / now
(inside the session's time window) / awaiting result / result. The job only writes `result`.
| # | Item | Owner | Size | Done when |
|---|---|---|---|---|
| 1.1 | **Design:** `#day-<date>` scoreboard (date strip, sport groups, status chips, followed-first) and `#following` feed with sport follows, 400px, both themes | UX (draft #130) | M | Spec merged |
| 1.2 | **Data:** new `sessions` collection, one per Israeli session: `{competitionId, date, timeLocal, tz, athleteIds, phase, status: before\|live\|awaiting\|result, result, resultSource, resultAt}`. Export, validator, SKILL.md | Maya | M | Validator and tests green; exported to `data.json` |
| 1.3 | **Fill sessions** for the next 14 days from official schedules and entry lists | Roni (combat, gymnastics, aquatics), Yael (shooting, weightlifting, others), Ofir (athletics, water sports, triathlon); fact-check by Dana/Tamar | M, then standing | Every Israeli competing in the next 14 days has a session |
| 1.4 | **`#day-<date>` view** (home links to today) | Itai | M–L | Real fixture renders; fake dates 29.10 (Abu Dhabi) and 3.11 (Doha) |
| 1.5 | **Follow a sport, plus `#following`** with changes since the last visit and a nav badge | Noa | M | Follows persist; the badge clears on visit |
| 1.6 | **Auto-refresh** of `data.json` every 5 min when visible, plus the spike | Omer (build), Maya (spike) | S + S | An open page shows a new result without reload |
| 1.7 | **Daily job writes results** (closes the #130 data gap): for each session that ended, the daily run fills `result`, `resultSource` and `resultAt` from the official page, and **appends a `result` history entry** to each athlete. Quota and stage still go through sign-off (D4) | Maya; the lead syncs the live task | S–M | After the first real session, the next daily run shows the result on `#day-<date>`, the athlete page and `#following` |
| 1.8 | **Acceptance QA** against the list below, signed out | Gil | M | Every item passes on main before phase 1 is called done |

**Waiting for the owner (not in phase 1)**
- **Event-day job (OD2):** a second scheduled task every 2 hours, on session days only (strategy target: from 29.10,
  results ≤ 2 h). Maya, M. It reuses 1.7's result writing, so it can start as soon as OD2 is approved. Omer monitors the runs.
- **Telegram channel pilot (OD3):** Omer as publisher, 4 weeks, phase 2.

**Phase 2: sprints 5–6**
- Competition pages (`#e-<id>`): days, sessions, the Israelis' results. Noa, M.
- The triathlon API in the event-day job. Maya, S.
- The `feed.xml` spike, then build if it works. Omer, S–M.
- Per-sport "what's next for Israel" headers. Itai, S.

**Phase 3: 2027, only if justified.** A separate hosted companion for web push and email alerts, with a privacy
policy and consent. It needs a new decision, with phase 2 demand as the evidence: feed or channel subscribers and
reader reports.

## Phase 1 acceptance list (Gil)
Run against `main` with the real fixture: signed out, 400px and 1280px, light and dark. Use fake dates **29.10**
(Abu Dhabi, multi-day) and **3.11** (Doha), plus an empty day.

**Day view (`#day-<date>`)**
1. `#day` opens today's date in Israel time. The date strip moves day by day, and a shared `#day-2026-10-29` link opens that day.
2. Every session with an Israeli that day is listed once, grouped by sport. Followed athletes and sports come first.
3. Status per session is correct across the day:
   - before the session time: "לפני";
   - inside its time window: "מתחרים עכשיו";
   - after it with no result: "ממתינים לתוצאה";
   - with a result: "תוצאה" plus the result and its source link.
   - A session with no official time shows the date and "השעה תפורסם", never a guessed time.
4. An empty day says so ("אין ישראלים שמתחרים היום") and points to the next day with sessions.
5. A quota-relevant session shows the stakes line. No field results (other countries) appear anywhere.
6. Unknown dates (`#day-2026-13-40`) show not-found.

**Following (`#following`)**
7. ☆ on a sport page and on an athlete page toggles a follow (keyboard too). It persists across reloads and survives
   a refused or blocked localStorage without errors.
8. `#following` lists followed sports and athletes with what changed since the last visit, newest first. The nav badge
   count matches, and it clears after the visit. With no follows, it explains how to follow.
9. National teams behave like athletes (e.g. `israel-basketball-men` can be followed).

**Results and freshness**
10. After the daily run that follows a real session, the result appears on `#day-<date>`, the athlete page and
    `#following`, each with source and time, and the athlete has a `result` history entry.
11. An open page picks up a newly published `data.json` within 5 minutes without reload, and shows "יש עדכון".
    Focus and scroll position aren't lost.
12. The copy says "מתעדכן פעם ביום". No "בזמן אמת", and no 2-hour promise.

**Regression**
13. Smoke and Python tests pass. Home, `#quotas`, `#digest`, `#corrections` and the calendar are unchanged.
    Every new string is escaped (an HTML-injection fixture in a session result renders as text).

## 4. Decisions for the owner (only what's needed)
| # | Decision | Recommendation | If no decision |
|---|---|---|---|
| OD1 | Accept "near-live" (results within 2 hours of the official posting on event days, labelled with the time) instead of real time | **Yes.** True real time needs a server and live feeds we don't have | We build phase 1 with daily updates only |
| OD2 | Run the extra event-day job (every 2 hours, only on days with Israelis competing) and accept its running cost | **Yes**, capped to session days, and reviewed after Doha | Results stay at the daily run, so a ≤ 24 h delay |
| OD3 | A messaging-channel pilot (WhatsApp recommended, or Telegram), posted manually by the publisher from launch day; one-pager: `telegram-pilot.md` | **Yes, as a 4-week pilot.** It's the only real "alert" without a new platform | Updates stay in-site only |

Phase 3 (another platform) is not a decision now.

## 5. Answers to UX (#130)
- **Result latency:** phase 1 = the next daily run (≤ 24 h). If the owner approves OD1/OD2, it becomes ≤ 2 h on event days.
  Design "עודכן לפני X" so it reads well for both, and keep the cadence words in one string.
- **Results scope: Israelis only** in phase 1: their round reached, place or score, and the source. No field results
  (who won), since they'd multiply data and fact-checking. One exception: where it matters for a quota, show the
  quota line from the item's stakes (e.g. "3 הראשונות זוכות במכסה"), not the whole field.
- **Session times: yes**, but bounded to the next 14 days of sessions with Israelis, from official schedules only.
  If no official time exists, show the date and "השעה תפורסם". Never guess.
- **Following:** sports plus athletes are enough. National teams are already athlete records
  (e.g. `israel-basketball-men`), so following a team means following that record. No new entity.
- **Data gap** (no `result` history entries yet): fixed in item 1.7. The job appends a `result` entry for every result it
  writes. Until it ships, `#following` uses `updatedAt` changes and the changes feed.

## 6. Changes elsewhere
- **Strategy (CEO, PR #58):** done in f7586be (no play-by-play or live in-match scores; no device push; event-day runs
  every 2 hours; results ≤ 2 h). Open point for the CEO: the strategy says followed updates appear "on the next visit
  and in the digest". OD3, a Telegram channel pilot, would be the one addition, and it's for the owner to decide.
- **Metrics:** M3 (result latency) target becomes ≤ 2 h on event days and ≤ 24 h otherwise, as in the strategy.
- **Backlog:** phase 1 items 1.1–1.8 go into sprints 3–4, ahead of the season items they displace.
