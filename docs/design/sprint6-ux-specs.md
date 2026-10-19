# Sprint 6 UX specs (S1–S5)

Status: accepted by the coordinator, 18.10.2026 · Owner: UX · From a 400px read of `main` @ c02a71a (v52).
Each item is one PR. Copy follows copy-rules.md; markup follows components.md. Line numbers drift, so functions are named.

| # | Spec | Owner | Starts after |
|---|---|---|---|
| S1 | "מעקב" means only the personal follow | Shira | #208 |
| S2 | Following a sport is consistent | Maya | #228, #234 |
| S3 | Every competition mention links to `#c-` | Noa | #238 |
| S4 | One "השבוע" panel on home | Itai | sprint 7, after #237 is live |
| S5 | One empty-state pattern | Omer | now |

## S1. "מעקב" means only the personal follow
**Problem.** One word, three meanings: stage 0 (`STAGES[0]`, a pill on every card), the site's own list ("110 ספורטאים
ונבחרות במעקב", "היום בענפים שבמעקב") and the visitor's follow ("★ במעקב שלך"). A card can show both.

**Change** (terms: copy-rules §5):
- `STAGES[0]` → `לפני חלון ההעפלה`; same in the About stage list.
- Site-list counts → `ברשימה`: home KPI, `#sports` and `#following-sports` card meta (`N ברשימה`), "{n} ברשימה בענף"
  (home, `#c-`), the search count, `#day`/digest "בענפים שבמעקב" → "בענפים שברשימה".
- Untouched: personal-follow copy, and history text already stored ("נכנס/ה למעקב").

**Done when** `grep -n במעקב site/*.js` returns only personal-follow copy, and the smoke assertions pinning old copy are
updated.

## S2. Following a sport is consistent
**Problem.** `followedAthletes()` includes athletes of followed sports, so they drive the nav badge and the
"מאז הביקור הקודם" feed, yet they have no star, aren't in the `#following` athletes tab or home "במעקב שלי", and the home
tip names only athletes. The badge can say 3 while nothing on screen looks followed.

**Change:**
- A feed row that comes only from a sport follow gets `<small>ענף במעקב: {sport}</small>`.
- Home "במעקב שלי" shows followed sports as a `.chips` row (links to `#sport-`) above the cards; the panel shows when
  either list is non-empty.
- Tip: "לחצו על ☆ בדף של ספורטאי/ת, נבחרת או ענף…".
- ★ stays for direct athlete follows only.

**Done when**, with only a sport followed, the badge count equals the visible feed rows, each labelled
"ענף במעקב", and the sport shows on home.

## S3. Every competition mention links to `#c-`
**Problem.** Some lists use `compLink`, others print the name: `followUpcoming()` (competition rows link the sport
only), `closestPanel()` group names, and home "ישראלים בפעולה ב־14 הימים" (`a.next`). Home → competition and
following → competition dead-end.

**Change:** wrap them in `compLink(compOn(sportId, date), …)`; athlete rows reuse `nextCompFact(a)`. Inside a whole-card
link (`#sports` card, `athleteCard`) stays plain: no nested links.

**Done when** a smoke test finds every competition name on home and `#following` that `compOn` resolves inside an
`a[href^="#c-"]`.

## S4. One "השבוע" panel on home (sprint 7)
Owner: Itai (home) · Starts after #237 is live; reuses #240's `emptyState()` and `nextIsraeliDay()`.

**Problem.** At 400px home stacks four to five "what's next" lists (`homeNow`'s "היום" and "הבא בתור",
"ההזדמנויות הקרובות למכסה", "ישראלים בפעולה ב־14 הימים" with up to 17 rows, "תחרויות קרובות"), all answering what `#day`
now answers. And on a result night, after midnight, yesterday's awaited sessions are on no home panel at all.

**Change.**
- Remove "ישראלים בפעולה ב־14 הימים" and "תחרויות קרובות". "מה התעדכן" takes the full width (no `grid2`).
- Add `weekPanel()` in `home.js`, right after `homeNow()`. Days are **tomorrow to today+7** (today belongs to "היום").
  A day is listed only if `daySessions(d)` is non-empty. The day that `homeToday()` already shows as "הבא בתור" is left
  out, so no day appears twice.
- One row per day, in `<ul class="rows">`:
  - `.d`: the day as the row's link, `<a href="#day-{d}">{homeDayTitle(d)}</a>`, e.g. `יום ד׳, 21 באוק׳`.
  - `.t`: the day's competitions (`compLink`, at most 2, then `ועוד {n}`), then `<small>` with the count
    `{n} ספורטאים ונבחרות` / `ספורטאי/ת או נבחרת אחת`. If someone followed competes that day, their names come first:
    `STAR` + at most 2 names, then `ועוד {n}`.
  - Third column: `<span class="pill q-in-contention"><span aria-hidden="true">◐</span> אירוע מכסה</span>` when an
    in-contention item's quota event covers d (`nxt(q)`, `nextQuotaEvent.start ≤ d ≤ quotaEventEnd(q)`); otherwise empty.
- Foot: `<p class="foot"><a href="#calendar">ללוח התחרויות</a></p>`. This is the home's only calendar link once
  "תחרויות קרובות" goes.
- **Result night:** while a session of **yesterday** is `awaitFresh` or `awaitChecked` (`sessionState(s, yesterday)`; `awaitLong` doesn't count),
  the panel opens with one row above the days: `.d` `<a href="#day-{yesterday}">אתמול</a>`, `.t` the competition
  names and `<small>{n} ממתינים לתוצאה</small>`, third column `<span class="pill s-wait"><span aria-hidden="true">◷</span> בהמתנה
  לתוצאה</span>`. The row goes once every result has landed (the results then show under "תוצאות אחרונות") or turns
  `awaitLong`. `s-wait` keeps its single meaning: a result is awaited.
- No per-session time or status on the day rows: `#day` has them, and a week view that changes state hourly would need
  near-live copy.

**States.**
| State | "היום" (`homeToday`, unchanged) | "השבוע" |
|---|---|---|
| Normal: Israelis on some of the next 7 days | today's rows or "הבא בתור" | the h2 + one row per day with Israelis (minus the "הבא בתור" day) + foot |
| Today only: Israelis today, none in the next 7 days | today's rows | `emptyState("אחרי היום אין השבוע תחרויות ידועות של ספורטאים או נבחרות מישראל.", "#day-{next}", "ליום התחרויות הבא: {fmt(next)}")` with `next = nextIsraeliDay(today+7)`; with no `next`, the link is `#calendar` / `ללוח התחרויות` |
| No Israelis this week (today included) | the empty line + "הבא בתור: {day}" if one is within 60 days | if "הבא בתור" is inside the week, the panel is **hidden** (the only day would repeat it); otherwise `emptyState("אין השבוע תחרויות ידועות של ספורטאים או נבחרות מישראל.", "#calendar", "ללוח התחרויות")` |
| Result night: yesterday has awaited sessions | as usual | the "אתמול" row first, then the rows of whichever state above applies |
| Data not loaded / `day.js` missing | – | panel not rendered (`typeof daySessions !== "function"`) |

**Wireframe, 400px, normal week with a result night** (`homeNow` above, "במעקב שלי" below):
```
┌──────────────────────────────────────┐
│ השבוע                                │
│ אתמול     {תחרות}        [◷ בהמתנה    │
│           2 ממתינים לתוצאה  לתוצאה]  │
│ ──────────────────────────────────── │
│ יום ד׳,   {תחרות}                     │
│ 21 באוק׳  ★ {שם} · ועוד 2             │
│ ──────────────────────────────────── │
│ יום ו׳,   {תחרות}         [◐ אירוע   │
│ 23 באוק׳  ספורטאי/ת או נבחרת   מכסה]  │
│           אחת                        │
│ ──────────────────────────────────── │
│ שבת,      {תחרות} · {תחרות} · ועוד 1  │
│ 24 באוק׳  3 ספורטאים ונבחרות          │
│ ללוח התחרויות                        │
└──────────────────────────────────────┘
```
At ≤ 640px `.d` stays in its column (the generic `.rows` rule); the pill wraps under the text if it doesn't fit.

**Done when**
- home at 400px has no "ישראלים בפעולה ב־14 הימים" and no "תחרויות קרובות", and every "השבוע" row's `.d` links to a `#day-`;
- smoke covers each row of the states table, using the fixture with `preview_at.js` dates: a normal week, today only,
  an empty week, and a result night (19.10 sessions on 20.10 at 08:00 with no result);
- no day appears both in "הבא בתור" and in "השבוע".

## S5. One empty-state pattern
**Problem.** "אין תחרויות קרובות במאגר." (home, sport, athlete; "במאגר" is jargon), `.empty` boxes and `p.muted`
lines used interchangeably, and only `#day` offers a way on.

**Change:** one helper, `emptyLine(text, href, label)`, rendering components §9 (`<p class="muted">` for a section,
`div.empty` stays for whole pages). Every empty list says what is known plus one way on:
| Where | Copy | Way on |
|---|---|---|
| sport / athlete "תחרויות קרובות" | `אין תחרויות קרובות ידועות בענף.` | `לוח התחרויות` → `#calendar-<sport>` |
| home "תחרויות קרובות" | `אין תחרויות קרובות ידועות.` | `לוח התחרויות` → `#calendar` |
| home 14 days | as today | `ליום התחרויות הבא: {date}` → next `#day` with Israelis |
| athlete history | `עוד אין רשומות בהיסטוריה.` | none |

**Done when** `במאגר` appears nowhere in `site/`, and each row of the table renders its link in a smoke test.
