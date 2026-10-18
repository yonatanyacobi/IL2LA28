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

**Honest wording on the site:** "מתעדכן כל שעתיים בימי תחרות", never "בזמן אמת".

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
| # | Item | Owner | Size | Done when |
|---|---|---|---|---|
| 1.1 | **Design:** `#day-<date>` scoreboard (date strip, sport groups, status chips, followed-first) and `#following` feed with sport follows, 400px, both themes | UX (draft #130) | M | Spec merged |
| 1.2 | **Data:** new `sessions` collection, one per Israeli session: `{competitionId, date, timeLocal, tz, athleteIds, phase, status: before\|live\|awaiting\|result, result, resultSource, resultAt}`. Export, validator, SKILL.md | Maya | M | Validator and tests green; exported to `data.json` |
| 1.3 | **Fill sessions** for the next 14 days from official schedules and entry lists | Roni (combat, gymnastics, aquatics), Yael (shooting, weightlifting, others), Ofir (athletics, water sports, triathlon); fact-check by Dana/Tamar | M, then standing | Every Israeli competing in the next 14 days has a session |
| 1.4 | **`#day-<date>` view** (home links to today) | Itai | M–L | Real fixture renders; fake dates 29.10 (Abu Dhabi) and 3.11 (Doha) |
| 1.5 | **Follow a sport, plus `#following`** with changes since the last visit and a nav badge | Noa | M | Follows persist; the badge clears on visit |
| 1.6 | **Auto-refresh** of `data.json` every 5 min when visible, plus the spike; Omer also monitors event-day runs | Omer (build), Maya (spike) | S + S | An open page shows a new result without reload |
| 1.7 | **Event-day job:** a second scheduled task, every 2 hours from 29.10, on session days only. Fixes the data gap from #130: **every result the job writes also appends a `result` history entry** and fills the session's `result`, so the `#following` feed has items | Maya; the lead syncs the live task | M | On 29.10 (Abu Dhabi), results appear ≤ 2 h after the official posting, each with a history entry |
| 1.8 | QA on event days, signed out | Gil | S each | Abu Dhabi and Doha checks |

**Phase 2: sprints 5–6**
- Competition pages (`#e-<id>`): days, sessions, the Israelis' results. Noa, M.
- The triathlon API in the event-day job. Maya, S.
- The `feed.xml` spike, then build if it works. Omer, S–M.
- The Telegram channel pilot, run by Omer as publisher, if OD3 is approved.
- Per-sport "what's next for Israel" headers. Itai, S.

**Phase 3: 2027, only if justified.** A separate hosted companion for web push and email alerts, with a privacy
policy and consent. It needs a new decision, with phase 2 demand as the evidence: feed or channel subscribers and
reader reports.

## 4. Decisions for the owner (only what's needed)
| # | Decision | Recommendation | If no decision |
|---|---|---|---|
| OD1 | Accept "near-live" (results within 2 hours of the official posting on event days, labelled with the time) instead of real time | **Yes.** True real time needs a server and live feeds we don't have | We build phase 1 with daily updates only |
| OD2 | Run the extra event-day job (every 2 hours, only on days with Israelis competing) and accept its running cost | **Yes**, capped to session days, and reviewed after Doha | Results stay at the daily run, so a ≤ 24 h delay |
| OD3 | A Telegram (or WhatsApp) channel pilot in phase 2, posted manually by the publisher | **Yes, as a 4-week pilot.** It's the only real "alert" without a new platform | Updates stay in-site only |

Phase 3 (another platform) is not a decision now.

## 5. Answers to UX (#130)
- **Result latency:** results within **2 hours** of the official posting on event days (event-day runs every 2 hours
  from 29.10, per the strategy), and next morning on other days. Design the status chip and "עודכן לפני X" for that.
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
