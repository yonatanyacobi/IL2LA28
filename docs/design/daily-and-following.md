# Phase 1 spec: `#day-<date>` and `#following`

Status: **phase-1 spec, ready for implementation** (plan item 1.1 in `docs/product/nba-style.md`, #131) ·
Owner: UX · Copy: Shira (#130 comment, folded in below) · Base: `main` @ 1e59677

Builders:
- Itai: `#day` in **`site/day.js`**.
- Noa: `#following` in **`site/following.js`**.
- `app.js` gets **router lines only** (§0).

Works at 400px and 1280px, in light and dark, signed out. Acceptance: Gil's list in `nba-style.md`, items 1–13.

**What phase 1 is not.** No "live", no push, no field results.
- The cadence is **one string**: `const CADENCE = "מתעדכן פעם ביום";`, in `day.js`. When OD2 is approved it
  becomes "מתעדכן כל שעתיים בימי תחרות" in that one place.
- Never "בזמן אמת" or "חי".

## 0. Wiring (the only changes outside the two new files)

**`app.js` router lines.** Add these to `route()`:
```js
else if ((h === "today" || /^day(-|$)/.test(h)) && typeof viewDay === "function") html = viewDay(h === "today" || h === "day" ? today() : h.slice(4)), nav = "day";
else if (/^following(-|$)/.test(h) && typeof viewFollowing === "function") html = viewFollowing(h.slice(10)), nav = "following";
```
At the end of `route()`, before `return h`:
```js
(window.routeHooks || []).forEach(f => { try { f(h); } catch {} });
```
Each new file pushes its hook (`(window.routeHooks ||= []).push(fn)`) and adds its own `document` click listener.
They don't touch `app.js` handlers.

**`index.html`:**
- **Scripts:** `<script src="day.js"></script><script src="following.js"></script>` after `corrections.js`.
- **Nav, 6 links:** `ראשי · היום · מעקב · ענפים · לוח · עדכונים`, where "היום" is `#today` (data-nav `day`) and
  "מעקב" is `#following` (data-nav `following`).
- **"לוח תחרויות" becomes "לוח".**
- **"אודות" moves to the footer.** The footer link "איך הנתונים נאספים" becomes `<a href="#about">אודות ואיך הנתונים נאספים</a>`.
  Lead note: QA (Gil) confirms the #about link is visible at 400px.
- **Nav CSS:** at ≤640px, `.links a{padding-inline:8px}`. The six links then fit one row at 400px (≈ 350px).

## 1. `#day-<date>` (Itai, `site/day.js`)

### Data: sessions first, fallback second
**Primary: `data.json.sessions`** (plan 1.2, Maya). Consumed fields:

| Field | Type |
|---|---|
| `id` | string |
| `competitionId` | string |
| `date` | YYYY-MM-DD, local at the venue |
| `startUtc` | ISO with Z, or null |
| `athleteIds` | string[] |
| `phase` | short Hebrew |
| `result` | short Hebrew |
| `resultSource` | https |
| `resultAt` | ISO with Z |

- **Ask to Maya:** export a computed `startUtc` when `timeLocal` + `tz` exist (Python `zoneinfo`), so the page
  never converts time zones. Without it, the time is unknown.
- **Day key** = the Israel date of `startUtc` when present, else `date`.
- **Validation:** drop a session with an unknown `competitionId`, no known athlete, or a bad `date`. `result` and
  `phase` are ≤ 120 chars and always escaped. `resultSource` goes through `linkOut`.

**Fallback while `sessions` is empty or missing** (before 1.2/1.3 ship). Pseudo-sessions per athlete:
- `nextDate` inside a ≤ 31-day competition of their sport gives a session on `nextDate` with no time;
- a `history` entry with `kind:"result"` gives a session on its `at`, with `result: text` and `resultSource: source`
  (no `resultAt`).

Dedupe by athlete + day. The page states "תאריך בלבד" for times (see the copy table).

### Status (computed in the page from data and the clock, so a refresh-free open page stays right)
`SESSION_WINDOW_H = 3` (a session with a start time is "now" from `startUtc` to `+3h`).

| Status | When | Render |
|---|---|---|
| `result` | `result` non-empty | line `<p class="res"><b>תוצאה:</b> {result} · עודכן ב־{HH:MM}</p>`. On a past day: `עודכן ב־{fmtShort}, {HH:MM}`; no "עודכן" without `resultAt`. Then ` · {linkOut(resultSource)}`. **No chip, no ✓** (a result can be an elimination). |
| `live` | not result; `startUtc` ≤ now < `startUtc+3h`, or no time and day = today | `<span class="pill s-live">מתחרה היום</span>`. The competition header shows `מתקיימת עכשיו · יום {n} מתוך {total}`. |
| `awaiting` | not result; past the window, or the day < today | `<span class="pill s-wait"><span aria-hidden="true">◷</span> בהמתנה לתוצאה</span>` |
| `before` | otherwise | `<span class="pill s-before">לפני התחרות</span>` |

### Layout and order
```
┌──────────────────────────────────────┐
│ → אתמול    יום ה׳, 29 באוק׳ 2026   מחר ← │  ← prev/next links around the h1 (stacked at 400px: h1 first)
│ [ב׳ 26][ג׳ 27][ד׳ 28][ה׳ 29][ו׳ 30][ש׳ 31][א׳ 1] │  ← 7 chips, selected centred; ● under days with Israelis
│ נכון ל־29 באוק׳, 18:40 · מתעדכן פעם ביום │
│ ┌ ★ ג׳ודו ──────────────────────────┐ │  ← sport section, h2 (★ = followed sport)
│ │ גרנד סלאם אבו דאבי                 │ │  ← h3 competition
│ │ מתקיימת עכשיו · יום 1 מתוך 3        │ │
│ │ 09:30 · ★ רז הרשקו · מוקדמות 57- ק״ג │ │  ← session row
│ │ [מתחרה היום]                        │ │
│ │ ┃ מה זה אומר: …                     │ │  ← stakes line, if a quota event matches
│ │ ───────────────────────────────────  │ │
│ │ 11:00 · גפן פרימו · 52- ק״ג          │ │
│ │ תוצאה: הודחה ברבע הגמר · עודכן ב־… │ │
│ └────────────────────────────────────┘ │
│ ┌ הרמת משקולות ─────────────────────┐ │
│ │ אליפות העולם · יום 3 מתוך 13       │ │
│ │ השעה תפורסם · {שם} · עד 64 ק״ג     │ │
│ │ [לפני התחרות]                       │ │
│ └────────────────────────────────────┘ │
└──────────────────────────────────────┘
```
- **Sport sections:**
  1. followed sports;
  2. sports with a session of a followed athlete;
  3. the rest, by `heCmp(sport.he)`.

  Inside a sport, competitions go by start time of their first session. Inside a competition, sessions with a
  followed athlete come first, then by `startUtc` (no time last), then name.
- **Only sessions with Israelis are listed.** A running competition without a session that day isn't shown here
  (the home strip still covers it).
- **Session row** is `<li>` in `<ul class="rows sess">`:
  - `.d`: the time (`HH:MM` in Israel time) or `השעה תפורסם` (fallback: `תאריך בלבד`);
  - `.t`: athlete links (★ for followed, `aria-label="במעקב שלך"`) · `phase`;
  - then the status chip or the result line.
- **Stakes line:** reuse `stakesLine()`. It shows when a quota item in that sport has
  `nextQuotaEvent.start` ≤ day ≤ its end and it is `in-contention`. At most 2, as in the strip. No field results anywhere.
- **Competition header:** `<h3>{comp.name}</h3>` plus a `.foot` with `fmtRange` · `{location}` · `linkOut(source)`.
  The `מתקיימת עכשיו · יום n מתוך N` line shows only when today is inside it.

### Date strip
```html
<nav class="daystrip" aria-label="בחירת יום">
  <a href="#day-2026-10-29" aria-current="date" aria-label="יום חמישי, 29 באוקטובר · יש תחרויות של ישראלים" class="has">ה׳ 29</a> …
</nav>
```
- 7 chips: the selected day ± 3. Visible text: weekday letter + day number (`ה׳ 30`).
- `aria-label`: full weekday and date, plus ` · יש תחרויות של ישראלים` when there are sessions.
- **Prev/next:**
  - the selected day is today: `→ אתמול` / `מחר ←`;
  - otherwise: `→ היום הקודם` / `היום הבא ←`;
  - plus a `היום` link (`#today`) when not on today.
- **h1:** `toLocaleDateString("he-IL", {weekday:"short", day:"numeric", month:"short", year:"numeric"})`, giving
  `יום ה׳, 29 באוק׳ 2026`.

### Empty and invalid
- **Empty day:** `<div class="empty"><p>אין תחרויות ידועות של ספורטאים ונבחרות מישראל ביום הזה.</p><p>לתחרות הבאה: <a href="#day-{d}">{fmt(d)}</a></p></div>`.
  The second line is omitted when there's no later session.
- **Invalid date** (`#day-2026-13-40`, or not a real calendar day): `notFound()`.

### Home link (via the route hook, no `app.js` edit)
On `#home`, if `#todayH` exists, insert after it:
`<p class="foot"><a href="#today">לכל התחרויות היום</a></p>`. With no strip, add it to the end of `.hero`'s first `div`.

## 2. `#following` (Noa, `site/following.js`)

### State (localStorage via the existing `store`, try/catch)
- `S.followSports = new Set(store.get("la28.followSports", []))`. Athletes keep `la28.follows`; national teams are athletes.
- `la28.followSeen`: ISO of the last `#following` visit. It is set **after** rendering `#following`, so the visit
  that clears the badge still shows its items. On the first visit, null means the baseline is set silently.
- Unknown ids in either set are ignored (and dropped on the next write).

### Follow a sport (route hook on `#sport-<id>`)
- **Button:** inserted into the page's first `.sec-head`, after the h1:
  `<button class="btn ghost follow" data-follow-sport="{id}" aria-pressed="{bool}">☆ מעקב אחרי הענף</button>`.
  Pressed: `★ הענף במעקב שלך`.
- **Click:** toggle, `store.set`, then `refresh()`, then focus the button again. Enter and Space work because it's a `<button>`.

### Feed items (newest first, max 20, last 30 days)
| Source | Item | Time |
|---|---|---|
| Session results of followed athletes or sports | `{athlete} · תוצאה: {result}` → `#day-{day}` | `resultAt` |
| `history` of followed athletes, kinds `result, rank, stage, correction` | `{athlete} · {text}` → `#a-{id}` | `at` (date) |
| Quota items in followed sports that are awaiting (`awaitingOf`) or newly earned (`earnedAt`) | `{sport} · <bdi>{event}</bdi>: בהמתנה לתוצאות` / `מכסה הושגה` → `#sport-{id}` | end date / `earnedAt` |
| Fallback, before 1.7 ships: a followed athlete with `updatedAt` > `followSeen` and no item above | `{athlete} · הפרטים עודכנו` → `#a-{id}` | `updatedAt` |

- **New** = time > `followSeen`. For date-only items: `at` ≥ the `followSeen` date **and** the athlete's
  `updatedAt` > `followSeen`.
- **Dedupe:** a session result and a history result for the same athlete and day count once; the session wins.

### Nav badge (route hook, every route)
- **Markup:** `<a href="#following" data-nav="following">מעקב<span class="badge" aria-hidden="true">{n}</span><span class="sr">, {n} עדכונים חדשים</span></a>`.
  - n = 1: sr text `, עדכון חדש אחד`.
  - n > 9: shows `9+`; the sr text keeps the real number.
  - No badge at 0, before the first visit, or with no follows.
- **Clears** after visiting `#following`, because `followSeen` is set then.

### Page
```
┌──────────────────────────────────────┐
│ במעקב שלי                            │
│ [ספורטאים ונבחרות (4)] [ענפים (2)]   │  ← .chips links: #following / #following-sports, aria-current
│ ┌ מאז הביקור הקודם (3) ─────────────┐│
│ │ 29 באוק׳ · רז הרשקו · תוצאה: ארד ● ││  ← .rows; ● = .new on unseen items
│ │ 28 באוק׳ · ג׳ודו · 57- ק״ג: בהמתנה… ││
│ └────────────────────────────────────┘│
│ ┌ הבא בתור במעקב שלי ────────────────┐│
│ │ 6 בנוב׳ · גלישה · {שם} → #day-…    ││  ← next 5 sessions/nextDates in 14 days
│ └────────────────────────────────────┘│
│ [athlete cards …] / [sport chips …]  │  ← per tab
│ המעקב נשמר רק בדפדפן הזה, בלי חשבון. │
└──────────────────────────────────────┘
```
- **Tabs:** `#following` shows athlete cards (`athleteCard`), and `#following-sports` shows sport cards (the `#sports`
  card markup). Each tab shows its count. Any other `#following-…` is `notFound()`.
- **Feed h2:** `מאז הביקור הקודם ({n})`.
  - empty: `אין עדכונים חדשים מאז הביקור הקודם.`;
  - first visit: `עדכונים על מי שבמעקב שלך יופיעו כאן מהביקור הבא.`

  The feed shows on both tabs.
- **No follows at all:** `<div class="empty">עוד אין כאן אף אחד. לחצו על ☆ בדף של ספורטאי/ת, נבחרת או ענף כדי לעקוב.</div>`,
  then `<h3>הצעות למעקב</h3>` with up to 3 athletes from `closestGroups()` (the in-contention ones), as cards.
- **Home "במעקב שלי"** gets `<a href="#following">לכל המעקב</a>` in its `sec-head` (route hook, `#home` only).

### Followed-first elsewhere (phase 1 scope)
`#day` (§1), the home strip (already done) and `#following`. `#sports` and the calendar stay as they are in phase 1.

## 3. CSS (tokens only, both themes; append to `styles.css`)
```css
/* #day */
.daystrip{display:flex;gap:6px;overflow-x:auto;padding-block:4px;scrollbar-width:thin}
.daystrip a{flex:0 0 auto;min-width:44px;min-height:44px;display:grid;place-items:center;gap:2px;padding:4px 8px;border:1px solid var(--line-ui);border-radius:10px;text-decoration:none;color:var(--ink);font-size:14px;line-height:1.2}
.daystrip a.has::after{content:"";width:6px;height:6px;border-radius:50%;background:var(--sun)}
.daystrip a[aria-current="date"]{background:var(--blue);border-color:var(--blue);color:var(--on-blue)}
.daystrip a[aria-current="date"].has::after{background:var(--on-blue)}   /* sun on blue is 1.2:1 in dark */
.day-nav{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}
.rows.sess li{grid-template-columns:70px 1fr auto}
.res{font-size:14.5px;overflow-wrap:anywhere}
.pill.s-before{background:transparent;border:1px solid var(--line-ui);color:var(--muted)}
.pill.s-live{background:var(--ok-soft);color:var(--ok-ink)}
.pill.s-wait{background:var(--blue-soft);color:var(--blue)}
/* following */
.badge{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;margin-inline-start:4px;border-radius:99px;background:var(--sun-soft);color:var(--sun-ink);border:1px solid var(--sun);font-size:12px;font-weight:700;line-height:1}
@media (max-width:640px){.links a{padding-inline:8px}.day-nav h1{flex-basis:100%;order:-1}}
```
**Contrast:**

| Pair | Light | Dark |
|---|---|---|
| `--ok-ink` on `--ok-soft` | 5.8:1 | 6.8:1 |
| `--blue` on `--blue-soft` | 7.1:1 | 5.6:1 |
| `--sun-ink` on `--sun-soft` | 5.5:1 | 7.8:1 |
| `--on-blue` on `--blue` (current chip) | 8.5:1 | 7.6:1 |
| `--muted` on `--surface` | 5.6:1 | 6.6:1 |

The strip dot is decorative; the aria-label carries "יש תחרויות".
**400px:**
- the 7 chips (≈ 350px) fit;
- session rows collapse to `1fr auto` with the time on its own line (the existing `.rows` rule);
- the h1 goes above prev/next.

## 4. Copy (Shira, final)
| Key | Hebrew |
|---|---|
| before | `לפני התחרות`; date line `מתחרה ב־{date}` / `מתחרה מחר` (`#following` next list) |
| live chip | `מתחרה היום` |
| live header | `מתקיימת עכשיו · יום {n} מתוך {total}` |
| awaiting | `◷ בהמתנה לתוצאה` (replaces the gendered "ממתינים לתוצאה") |
| result | `תוצאה: {text} · עודכן ב־{HH:MM}`; past day `עודכן ב־{d}, {HH:MM}` |
| no time | `השעה תפורסם`; fallback data `תאריך בלבד` |
| data note | `נכון ל־{date}, {HH:MM} · ` + `CADENCE` |
| empty day | `אין תחרויות ידועות של ספורטאים ונבחרות מישראל ביום הזה.` + `לתחרות הבאה: {date}` |
| home link | `לכל התחרויות היום` |
| follow athlete | `☆ מעקב אחרי {name}` / `★ במעקב שלך` |
| follow sport | `☆ מעקב אחרי הענף` / `★ הענף במעקב שלך` |
| badge sr | `מעקב, {n} עדכונים חדשים` / `מעקב, עדכון חדש אחד` |
| no follows | `עוד אין כאן אף אחד. לחצו על ☆ בדף של ספורטאי/ת, נבחרת או ענף כדי לעקוב.` + `הצעות למעקב` (replaces "עוד לא עוקבים") |
| storage | `המעקב נשמר רק בדפדפן הזה, בלי חשבון.` |

**Gil's acceptance list** (#131, item 3) uses "לפני / מתחרים עכשיו / ממתינים לתוצאה". The QA check should follow
these final strings instead.

## 5. Tests (smoke, pinned clock; numbers map to the acceptance list)
- **#1:** `#today` equals `#day-{today()}`; `#day-2026-10-29` renders that h1; the strip has 7 chips and one `aria-current`.
- **#2:** fixture day 29.10 (fallback data) lists the Abu Dhabi athletes once, under ג׳ודו. Following the judo sport
  or an athlete moves the section or row first.
- **#3:**
  - With a fake session and pinned clocks before / inside / after the window / with a result, the chip is
    לפני התחרות / מתחרה היום / בהמתנה לתוצאה / the result line.
  - With no `startUtc`, it shows "השעה תפורסם" and never a time.
- **#4:** an empty day shows the copy and links to the next day with sessions.
- **#5:**
  - The stakes line appears for an in-contention item whose event covers the day.
  - No field results: a session `result` containing `<b>` renders as text.
- **#6:** `#day-2026-13-40` and `#day-2026-02-30` are not found.
- **#7:**
  - A sport ☆ toggles `aria-pressed` and persists.
  - Blocked storage (`localStorage` throws) renders without errors.
- **#8:**
  - The badge count equals the new feed items.
  - It's absent after visiting `#following`.
  - It's absent with no follows.
  - `9+` shows when there are more than 9.
- **#9:** following `israel-basketball-men` works like an athlete.
- **Regression:** `app.js` diff is limited to the router lines and the hook loop. Home, `#quotas`, `#digest`,
  `#corrections` and the calendar are unchanged. The nav is one row at 400px (layout check by Gil).

## Asks to others
- **Maya (1.2):**
  - export `startUtc` (from `timeLocal` + `tz`) and `resultAt` in UTC with Z;
  - keep `result` ≤ 120 chars, Israelis only.
- **Maya (1.7):** the session result and the `result` history entry must carry the same day and text, so the feed dedupe works.
- **Omer (1.6):** auto-refresh calls `refresh()`; `#day` and `#following` are pure renders of `S`, so the scroll
  position and focus are kept by `refresh()`.
