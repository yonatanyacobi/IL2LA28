# NBA-app style: research and plan

Owner: PM. Requested by the owner on 18.10.2026: competitions by day, results updating in real time, following a sport or
an athlete, and an update to the user whenever something about them changes.
Status: plan for the owner and the CEO. UX designs phase 1, and the CEO updates the strategy's "no live scores" line (§6).

## 1. What we take from the NBA app

| NBA app | What it does | For us |
|---|---|---|
| **Scoreboard by day** | A date strip (yesterday, today, tomorrow…), every game that day, and a status per game (upcoming, live, final) | **Take it.** A `#day` view: every competition that day, grouped by sport, with the Israelis in it, the session time in Israel time, and a status: לפני / מתחרים עכשיו / ממתינים לתוצאה / תוצאה |
| **Game page** | Box score, play-by-play, recap | **Take a light version.** A competition page with the Israelis per day, their round reached, place or score, and the official source. No play-by-play |
| **Live score** | Updates every few seconds | **Don't take it.** We have no live feed and no server. We get "near-live" (§2) |
| **Favourites** | Follow teams and players; they come first everywhere | **Take it.** Following athletes already exists (localStorage). Add following a sport, and order every list followed-first |
| **Push notifications** | Alerts on start, final and big plays | **Not on this platform.** In the site: "what changed since your last visit", badges, and a "my feed" page. Push only on another platform (§2, phase 3) |
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
| **A. Event-day job** (recommended): a second scheduled task runs every 60 min (30 min at peak sessions), only on days when an Israeli competes. It reads the official result page for today's sessions only, writes status and result, and republishes `data.json` | Statuses and results with "עודכן לפני X דק׳" | ~30–90 min | Running cost: ~10–15 extra job runs per event day, at about 2–3 event days a week. Build M (Maya) | **Do it** |
| **B. Page auto-refresh:** the open page re-fetches `data.json` every 5 min while visible, and shows "יש עדכון" when it changed | No reload needed | +0–5 min on top of A | Build S (Omer), plus a spike S to check that a republished `data.json` reaches an already-open page | **Do it** (after the spike) |
| **C. World Triathlon API** (D-R1, the owner is registering) | Structured triathlon results | Same as A, fewer misreads | S, once the key exists | **Do it**; it's the only documented API |
| **D. Live scraping or live feeds** | Seconds-fresh scores | Seconds | Needs a server; against IF terms; breaks often | **Don't** |

**Stays manual:** quota status and stage changes (D4: both fact-checkers) and new athletes (D5). Results that the job
writes from an official page carry their source and time. If a page says "unofficial", so does the site. Dana and Tamar
spot-check results the same day, and a wrong result goes to the corrections log.

**Honest wording on the site:** "מתעדכן כל שעה בימי תחרות", never "בזמן אמת".

### "Updates" to the user
| Path | Possible here? | Cost | Verdict |
|---|---|---|---|
| **In-site:** a "my feed" page (`#mine`): followed athletes and sports, and what changed since the last visit. A badge with the count on the nav. Followed-first ordering everywhere. Already half-built: follows and "עודכנו מאז הביקור הקודם" exist | Yes. It's per browser (localStorage), so there's no cross-device sync | M | **Phase 1** |
| **Weekly digest** (exists): the publisher shares it by copy and paste | Yes | Exists | Keep it |
| **Atom/RSS feed file** (`feed.xml`) published next to `data.json`, so feed readers can poll it | Maybe. It depends on whether the artifact file URL is readable by feed readers, signed out. Spike S | S–M | **Phase 2**, after the spike |
| **Telegram or WhatsApp channel:** the publisher posts results on event days (manual, from the job's summary) | Yes; it's outside the site | Ongoing publisher time, ~10 min per event day | **Phase 2 pilot**, with owner OK (OD3) |
| **Web push or email alerts** | No. Needs separate hosting, a backend, a push service or mailer, a signup with consent, unsubscribe and a privacy policy (emails are personal data) | L–XL to build, plus ongoing hosting and maintenance | **Phase 3**, only if phase 2 shows demand |
| **A separate native app** | Different platform entirely | XL | **No** |

## 3. MVP phases

**Phase 1: sprints 3–4 (about 2 weeks; ready before the Doha Worlds, 1–14.11)**
| # | Item | Owner | Size | Done when |
|---|---|---|---|---|
| 1.1 | **Design:** `#day` scoreboard (date strip, sport groups, status chips, followed-first) and `#mine` my feed, 400px, both themes | UX | M | Spec merged |
| 1.2 | **Data:** new `sessions` collection, one per Israeli session: `{competitionId, date, timeLocal, tz, athleteIds, phase, status: before\|live\|awaiting\|result, result, resultSource, resultAt}`. Export, validator, SKILL.md | Maya | M | Validator and tests green; exported to `data.json` |
| 1.3 | **Fill sessions** for the next 14 days from official schedules and entry lists | Roni (combat, gymnastics, aquatics), Yael (shooting, weightlifting, others), Ofir (athletics, water sports, triathlon); fact-check by Dana/Tamar | M, then standing | Every Israeli competing in the next 14 days has a session |
| 1.4 | **`#day` view** (home links to today) | Noa | M–L | Real fixture renders; fake dates 29.10 (Abu Dhabi) and 3.11 (Doha) |
| 1.5 | **Follow a sport, plus `#mine`** with changes since the last visit and a nav badge | Itai | M | Follows persist; the badge clears on visit |
| 1.6 | **Auto-refresh** of `data.json` every 5 min when visible, plus the spike | Omer (build), Maya (spike) | S + S | An open page shows a new result without reload |
| 1.7 | **Event-day job:** a second scheduled task, hourly, on session days only | Maya; the lead syncs the live task | M | On a test day, results appear ≤ 90 min after the official page |
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
| OD1 | Accept "near-live" (updates within ~30–90 min on event days, labelled with the time) instead of real time | **Yes.** True real time needs a server and live feeds we don't have | We build phase 1 with daily updates only |
| OD2 | Run the extra event-day job (hourly, only on days with Israelis competing) and accept its running cost | **Yes**, capped to session days, and reviewed after Doha | Results stay at the daily run, so a ≤ 24 h delay |
| OD3 | A Telegram (or WhatsApp) channel pilot in phase 2, posted manually by the publisher | **Yes, as a 4-week pilot.** It's the only real "alert" without a new platform | Updates stay in-site only |

Phase 3 (another platform) is not a decision now.

## 5. Changes elsewhere
- **Strategy (CEO, PR #58):** replace "We will NOT run live scores or scraping" with "near-live results on event days from
  official sources, labelled with the update time; no live-score feeds, no scraping". Add the `#day` scoreboard and
  follow-sport to the season roadmap.
- **Metrics:** M3 (result latency) target becomes ≤ 90 min on event days with the event-day job, and ≤ 24 h otherwise.
- **Backlog:** phase 1 items 1.1–1.8 go into sprints 3–4, ahead of the season items they displace.
