# Phase 2: competition page `#c-<id>` (the "game page")

Status: design spec for phase 2 · Owner: UX · Base: `main` @ 00543fd. It builds on the phase-1 spec,
`daily-and-following.md` (merged), and reuses its sessions data, status rules, copy and follow model.
Works at 400px and 1280px, in light and dark.

**Purpose.** One competition, everything Israeli in it:
- when each Israeli competes;
- where they are now (status or result);
- what's at stake for a quota;
- a way to follow it.

As in phase 1: no live scores and no field results. The cadence string is the shared `CADENCE`.

## 0. Route and files
- **Route:** `#c-<competitionId>` (a bare token; ids are already kebab, e.g. `#c-judo-gs-abu-dhabi-2026`). An unknown id
  gives `notFound()`.
- **Files:** `site/event.js` (`viewEvent(id)`, route hook). `app.js` gets one router line:
  `else if (h.startsWith("c-") && typeof viewEvent === "function") html = viewEvent(h.slice(2)), nav = "calendar";`
- **Shared renderers:** move the session-row and status functions from `day.js` into a shared `sessions.js`
  (`sessionRow(s)`, `sessionStatus(s, now)`, `sessionsFor(pred)` with the phase-1 fallback). `#day` and `#c-` then
  render identically. That's a refactor PR before the page PR.

## 1. Page

```
┌──────────────────────────────────────┐
│ → ג׳ודו                              │  ← crumb to #sport-<id>
│ גרנד סלאם אבו דאבי                   │  ← h1
│ 29–31 באוק׳ 2026 · אבו דאבי          │
│ [מתקיימת עכשיו · יום 2 מתוך 3] [העפלה]│  ← competition status + qualifying pill
│ ┌ בקצרה ────────────────────────────┐│
│ │ 5 ספורטאים ונבחרות · 2 תוצאות     ││
│ └────────────────────────────────────┘│
│ ┌ מה על הכף ────────────────────────┐│  ← only if quota items match
│ │ 57- ק״ג נשים  [◐ במרוץ למכסה]      ││
│ │ ┃ מה זה אומר: …                   ││
│ │ 52- ק״ג נשים  [◷ בהמתנה לתוצאות]   ││
│ │ לכל המכסות בענף                    ││
│ └────────────────────────────────────┘│
│ ┌ לוח הסשנים ───────────────────────┐│
│ │ יום ה׳, 29 באוק׳  (יום 1)  ← #day  ││  ← h3 per day, links to #day-<date>
│ │ 09:30 · ★ רז הרשקו · 57- ק״ג       ││
│ │ תוצאה: ארד · עודכן ב־29 באוק׳, 18:40││
│ │ יום ו׳, 30 באוק׳  (יום 2)          ││
│ │ תאריך בלבד · {שם} · 63- ק״ג        ││
│ │ [מתחרה היום]                       ││
│ └────────────────────────────────────┘│
│ ┌ הישראלים בתחרות (5) ──────────────┐│
│ │ [athlete cards, each + its status]││
│ └────────────────────────────────────┘│
│ נכון ל־… · מתעדכן פעם ביום · מקור    │
│ ┌ שיתוף ────────────────────────────┐│  ← existing .share box
└──────────────────────────────────────┘
```
Desktop (> 900px): the schedule sits in the main column; "מה על הכף" and "הישראלים בתחרות" go to a side column.
This uses the existing `.grid2` rule, `grid-template-columns:2fr 1fr` under the page-specific class `.event`.

### Header
- **h1:** `comp.name`. **Meta line:** `fmtRange(start, end)` · `location`.
- **Competition status**, by date and Israel's `today()`:

  | When | Render |
  |---|---|
  | before | `<span class="pill s-before">מתחילה ב־{fmt(start)}</span>` |
  | during | `<span class="pill s-live">מתקיימת עכשיו · יום {n} מתוך {total}</span>` |
  | after, with any session awaiting | `<span class="pill s-wait"><span aria-hidden="true">◷</span> הסתיימה · בהמתנה לתוצאות</span>` |
  | after, otherwise | `<span class="pill ended">הסתיימה</span>` |
- **Pills:** `<span class="pill open">העפלה</span>` when `qualifying`. A competition longer than 31 days also gets
  `<span class="pill ended">סדרה עונתית</span>`, and its schedule groups by month, not by day.
- **Follow button (deferred, §2):** `<button class="btn ghost follow" data-follow-comp="{id}" aria-pressed>` with the labels
  `☆ מעקב אחרי התחרות` / `★ התחרות במעקב שלך`.

### "בקצרה"
One `.kpi` line, built from the sessions of this competition:
- `{plural(n, "ספורטאי/ת או נבחרת אחת", "ספורטאים ונבחרות")}`
- `· {r} תוצאות` when r > 0
- `· {w} בהמתנה לתוצאה` when w > 0
- `· {b} לפני התחרות` when b > 0

With no sessions and no fallback athletes: `לא ידוע על ספורטאים או נבחרות מישראל בתחרות הזו.`, plus
`{n} ספורטאים ונבחרות במעקב בענף` linking to the sport. Never claim they compete.

### "מה על הכף" (quota link)
- **Items:** `quotasOf(sportId)` where `nextQuotaEvent.start` falls in `[start, end]` (the strip's matching rule),
  plus items that are `awaitingOf()` with that event.
- **Row:** `.qlist`-style (`<bdi>{event}</bdi>`, status pill, awaiting pill), then `stakesLine(q)` for in-contention
  items. An earned item shows its `✓ מכסה הושגה` status pill and no stakes (round3-qa QA-2).
- **Footer link:** `<a href="#sport-{id}">לכל המכסות בענף</a>`.
- **No items:** the section is omitted. A qualifying competition gets one line under the header instead:
  `תחרות שנספרת להעפלה. <a href="#sport-{id}">שיטת ההעפלה בענף</a>`.

### "לוח הסשנים"
- **Day groups:** `<h3><a href="#day-{date}">{weekday, date}</a> <span class="muted">(יום {n})</span></h3>`.
  Each group holds a `<ul class="rows sess">` of the shared `sessionRow(s)`. Followed athletes go first within a
  day, then by time.
- **No sessions yet, before start:** `הסשנים של הישראלים יפורסמו לפי לוח הזמנים הרשמי.`
  With the fallback athletes, list them under their `nextDate` day with `תאריך בלבד`.
- **Today's group** gets `aria-current="date"` on its h3 link, and the page scrolls it into view on arrival
  (route hook; respects `prefers-reduced-motion`).

### "הישראלים בתחרות"
- **Cards:** `athleteCard(a)` for every athlete with a session or fallback entry. After the card, the athlete's latest
  status in *this* competition as a chip. A result is shown only in its schedule row, next to its source
  (near-live §4).
- **Order:** followed first, then by `heCmp(name)`.

### Footer and share
- **Footer:** `נכון ל־{date}, {HH:MM} · {CADENCE} · {linkOut(source, host(source))}`.
- **Share:** the existing `.share` box with `${SITE_URL}#c-${id}` and a copy button (`data-copy` +
  `data-copy-msg`). Clipboard may be refused, so the input is selectable.

## 2. Follow a competition (deferred)
Deferred by the PM (#170): no follow button on `#c-`, and nothing below is built. Kept for when it returns.

- **Storage:** `la28.followComps` (store, try/catch). On each write, prune competitions that ended more than 14 days ago.
- **Feed (`#following`):** session results and awaiting items of followed competitions join the feed, deduped with
  athlete and sport items.
- **Badge:** counts them.
- **Following page:** a third tab, `תחרויות ({n})` → `#following-comps`, listing followed competitions as `compRow`
  with links.
- **Day view:** competitions the visitor follows come first within their sport section on `#day`.

## 3. Entry points (links to `#c-<id>`)
| Where | Change |
|---|---|
| `#day` competition h3 | the name links to `#c-<id>` |
| `compRow()` (home, calendar, sport page) | the competition name becomes a link. The sport link stays as a separate link before it. |
| Home today strip | the competition name links to `#c-<id>` |
| Athlete page | with a session for the athlete: `<dt>התחרות הבאה</dt>` links to `#c-<competitionId>` |
| `#quotas` "אירועי המכסה הקרובים" | a row whose event matches a known competition (the same rule) links to it |

## 4. CSS (tokens only)
```css
.event-cols{display:grid;gap:22px}
@media (min-width:900px){.event-cols{grid-template-columns:2fr 1fr;align-items:start}}
.event-head{display:grid;gap:6px}
.event-head .pills{display:flex;flex-wrap:wrap;gap:6px}
.sess-day h3{font-size:16px;font-family:var(--f-body);font-weight:700}
.sess-day h3 a[aria-current="date"]{color:var(--ink);text-decoration-thickness:3px;text-decoration-color:var(--sun)}
```
Everything else reuses phase-1 classes (`.pill.s-*`, `.rows.sess`, `.res`, `.qlist`, `.share`).
No new colours, so contrast is as in phase 1.

## 5. A11y
- **Headings:** h1, then h2 per section, then h3 per day.
- **Status:** the competition status pill is text, never colour alone.
- **Follow button:** `aria-pressed`, the same as the other follow buttons.
- **Auto-scroll to today:** only on arrival, with `preventScroll` for focus. The h1 keeps focus, as in `navigate()`.

## 6. Tests
- **Abu Dhabi (fallback data):**
  - `#c-judo-gs-abu-dhabi-2026` renders the h1, 3 day groups, the judo quota items in "מה על הכף", and the athletes once each.
  - `#c-nope` is not found.
- **Pinned clocks:** before, during and after give the competition status pills from the header table. A session
  result containing `<b>` renders as text.
- **Earned:** an earned quota item shows `מכסה הושגה` and no stakes.
- **Season series:** a competition longer than 31 days shows `סדרה עונתית` and month groups.
- **Follow (deferred, §2):** the competition persists. A followed result appears in the `#following` feed once. Pruning after 14 days works.
- **Entry points:** `compRow` names link to `#c-<id>`; the sport link is unchanged.

## Asks
- **Maya:** sessions need `competitionId` for every session (plan 1.2 has it). Please keep competition ids stable,
  since they become shareable links.
- **PM (resolved, #170):** following a competition is deferred, so §2 and the button are out of phase 2.
