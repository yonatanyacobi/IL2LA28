# Design input: a daily view and a "following" view (the owner's NBA-app direction)

Status: input for the PM's research and plan; the phase-1 design follows next sprint · Owner: UX · Base: `main` @ 1bafaf1
This doc says what the two views would look like **on this site and under its constraints**. It is not an
implementation spec.

## What "like the NBA app" can and can't mean here
| NBA app | Here | Why |
|---|---|---|
| Games by day, swipe between days | **Yes**: `#day-YYYY-MM-DD`, with prev/next and a date strip | Bare hash tokens work; data is already dated |
| Tip-off times | **Optional, phase 2**: a session time in Israel time only where the IF publishes it | `competitions` has dates, not sessions or times |
| Live scores | **No.** Instead: "result with time stamp" plus "awaiting result" | Static `data.json` with no external fetch; results arrive with the job run |
| Push notifications for followed players | **No.** Instead: "since your last visit" on open | No push or service worker in the artifact sandbox |
| Follow team or player | **Yes**: athletes (exists) **and sports** (new), in localStorage | Per-viewer convenience, so localStorage is allowed |

**Biggest product lever:** how fast results arrive. Today that is the daily job, so the UI must always say *when*
a result was recorded: "עודכן 14:10", never "live". Faster results mean event-day job runs (PM/lead decision,
see D-R2 in `owner-decisions.md`), not a different UI.

## 1. Daily view `#day-<date>` (default `#today`)

```
┌──────────────────────────────────────┐
│ ‹ אתמול   יום ה׳ 29 באוק׳   מחר ›    │  ← h1 = the date; ‹ › are links to #day-…
│ [א 26][ב 27][ג 28][ד 29●][ה 30][ו 31]│  ← date strip, ● = Israelis compete; scrolls
│ ┌ ג׳ודו · גרנד סלאם אבו דאבי · יום 1/3┐│
│ │ ★ רז הרשקו · 57- ק״ג                ││
│ │   ✓ תוצאה: ארד · עודכן 18:40        ││  ← result row (from history kind "result")
│ │ גפן פרימו · 52- ק״ג                 ││
│ │   ◷ ממתינים לתוצאה                 ││
│ │ ┃ מה זה אומר: …                    ││  ← existing stakes line
│ └────────────────────────────────────┘│
│ ┌ קליעה · אליפות העולם · יום 3/10 ───┐│
│ │ 2 ישראלים במעקב בענף               ││  ← honest fallback: entrants unknown
│ └────────────────────────────────────┘│
│ לפי הנתונים מ־29 באוק׳ 18:40          │
└──────────────────────────────────────┘
```
- **Rows:** reuse `todayRows(t)` generalised to any date (`t` is already a parameter in the helpers). Order:
  followed first, then by sport.
- **Per athlete:**
  - a **result line** when a `history` entry with `kind: "result"` and `at === date` exists;
  - else `◷ ממתינים לתוצאה` if the date is past or today;
  - else nothing.
- **Empty day:** `אין תחרויות ידועות של ישראלים ביום הזה.` plus a link to the next day that has some.
- **Date strip:** ±7 days around the selected date, each with a dot when Israelis compete. It is keyboard-reachable,
  and each chip is a 44px link with `aria-current="date"` on the selected day.
- **Home:** the existing today strip becomes a "today" preview that links to `#today`.

**Data needs (for the PM's plan):**
1. Results as `history` entries with `kind: "result"`, `at` (the date of the result) and a short `text`
   ("ארד", "הודחה בשמינית"). The job prompt already allows this, but the fixture has **zero** today: the job writes
   none yet.
2. A per-athlete link to a competition: today it's inferred by sport + date range. A `compId` on
   `nextDate`/results would remove guessing (phase 2).
3. Optional `sessions: [{date, time, tz, label}]` on competitions for times (phase 2).

## 2. "Following" view `#following`

```
┌──────────────────────────────────────┐
│ במעקב שלי                            │
│ [ספורטאים 4] [ענפים 2]               │  ← two tabs as links (#following, #following-sports)
│ ┌ מאז הביקור הקודם (3) ─────────────┐│
│ │ רז הרשקו · תוצאה: ארד · 29 באוק׳  ││  ← feed: history entries newer than la28.seen
│ │ ג׳ודו · מכסה: בהמתנה לתוצאות      ││  ← followed sport: quota/awaiting changes
│ │ תמר שטיינברג · דירוג: 1 → 2       ││
│ └────────────────────────────────────┘│
│ ┌ הבא בתור למעקב שלי ────────────────┐│
│ │ 6 בנוב׳ · גלישה · …                ││
│ └────────────────────────────────────┘│
│ [cards of followed athletes …]       │
│ המעקב נשמר רק בדפדפן הזה.            │
└──────────────────────────────────────┘
```
- **Follow a sport:** a ☆ button on `#sport-<id>`, stored in `la28.followSports` (try/catch, like `la28.follows`).
  Following a sport surfaces its competitions on `#today`/`#day` first, plus its quota changes in the feed.
- **Feed source:**
  - athletes' `history` (rank, result, stage), newer than `S.seenBefore`;
  - quota status or awaiting changes, which need a per-item `changedAt` (phase 2);
  - newest first, max 20.
- **No account and no sync:** say so plainly. Offer "העתקת רשימת המעקב" as a copyable `#follow-<ids>` link to
  move it between devices (a bare token, so it survives sharing). Phase 2.
- **Empty state:** `עוד לא עוקבים אחרי אף אחד. לחצו ☆ בדף של ספורטאי/ת או ענף.`, plus 3 suggested athletes from
  the closest-chances panel.
- **Nav:** `מעקב` replaces "אודות" in the nav, which moves to the footer (heuristics #5); that keeps one row at 400px.

## 3. Proposed phase-1 cut, for the PM to weigh
1. `#today` / `#day-<date>` with prev/next and the date strip, built from existing data. **S–M.**
2. Result lines from `history` `kind:"result"`, plus "awaiting result". Depends on the job writing results. **S** UI, **M** job.
3. `#following` with the athletes tab and the "since last visit" feed from history. **S.**
4. Follow a sport. **S.**

**Phase 2:** sessions and times, `compId` links, quota `changedAt` in the feed, and moving follows between devices.

## Questions for the PM's research
- **Result latency:** what does the owner accept? "Same evening" means event-day runs; "next morning" is today's job.
- **Results scope:** only Israelis' own results, or also "who won" (field results)? Field results multiply the data and the fact-checking.
- **Times:** are session times worth the per-sport collection cost in phase 1?
- **Following:** are sports enough as "teams", or are national teams within a sport needed separately?
