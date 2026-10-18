# Round 3 — after a quota event

Status: §1 ready for implementation (Noa, now); §2–§3 follow · Owner: UX · Base: `main` @ 2701d63
Existing classes and tokens only, except the one pill in §1. Works at 400px, in light and dark.

## 1. "Awaiting results" — the event ended, quotas.json not updated yet

### Rule
```js
// Quota event is over but the curated file predates its end: results are not in the data yet.
const AWAIT_DAYS = 14;
const awaitingOf = (q, t = today()) => {
  const e = q.nextQuotaEvent, end = quotaEventEnd(q);
  if (!e?.name || !end || end >= t || q.israelStatus === "earned") return null;
  if (str(S.quotasUpdatedAt).slice(0, 10) > end) return null;   // curated after the event: trust the status
  return dayNo(end, t) - 1 <= AWAIT_DAYS ? {...e, end} : null;     // after 2 weeks: stop saying "soon"
};
```
- Uses the existing `quotaEventEnd()` (competition end when matched, else `start`).
- `earned` never awaits. `outside`/`in-contention`/`unknown` can.
- After `AWAIT_DAYS` the row falls back to today's behaviour (no next-event line); `#admin` should list
  these as "quota item past its event, not re-checked" (not in scope here).
- `stakesLine()` already hides once the event is past — keep that; the awaiting line replaces it.

### Copy
- Pill (beside, not instead of, the status pill): `◷ בהמתנה לתוצאות`
- Line (no verb, so it never disagrees with a feminine event name; one form for single- and multi-day):
  `{name} ({fmtRange(e.start, end)}). עדכון המכסות יפורסם אחרי ההודעה הרשמית.`
- Never imply an outcome ("כנראה", "נראה ש…").

### Where
| Place | Render |
|---|---|
| Sport page `quotaSection()` row | in `.q-top`: status pill + `<span class="pill q-awaiting"><span aria-hidden="true">◷</span> בהמתנה לתוצאות</span>`; the line goes where `אירוע המכסה הבא` would be, as `<p class="q-meta">` |
| Sport page sort | awaiting rows right after `earned` (they are the newsiest) |
| `#quotas` | new panel above "אירועי המכסה הקרובים", only if any: h2 `בהמתנה לתוצאות`, `.rows` with `.d` = `fmtShort(end)`, `.t` = `{name}<small>{sport link} · {event}</small>`, third cell = status pill |
| Home KPI (`quotaKpi()`) | append ` · <b>{n}</b> מקצים בהמתנה לתוצאות` when n > 0, via `plural(n, "מקצה אחד", "מקצים")` (`· מקצה אחד בהמתנה לתוצאות`) |
| Today strip | for an item whose event ended inside a competition that is still running, the waiting line replaces its stakes line: `<small class="stakes awaiting"><b><span aria-hidden="true">◷</span> בהמתנה לתוצאות:</b> <bdi>{event}</bdi> · {fmtRange(e.start, end)}</small>` (CSS: `.stakes.awaiting{border-inline-start-color:var(--blue)} .stakes.awaiting b{color:var(--blue)}`). Decided on #65. |
| Athlete page | see §3 |

```html
<li>
  <div class="q-top"><b><bdi>{event}</bdi></b>   <!-- e.g. "60- ק״ג גברים": <bdi> keeps the digits/sign in order -->
    <span class="actions"><span class="pill q-in-contention"><span aria-hidden="true">◐</span> במרוץ למכסה</span><span class="pill q-awaiting"><span aria-hidden="true">◷</span> בהמתנה לתוצאות</span></span></div>
  <p class="q-meta">גרנד סלאם אבו דאבי (29–31 באוק׳ 2026). עדכון המכסות יפורסם אחרי ההודעה הרשמית.</p>
  <details>…</details>
</li>
```
400px: `.q-top` already wraps; the two pills wrap under the event name as one group (`.actions` has `flex-wrap`).

```css
.pill.q-awaiting{background:var(--blue-soft);color:var(--blue)}
```
(`--blue` on `--blue-soft`: 7.1:1 light, 5.6:1 dark.) Symbol + words, so no colour-only meaning.

**A11y, all status pills in this doc (and `quotaStatusPill()`):** wrap the symbol in `<span aria-hidden="true">…</span>`;
the words carry the meaning. Wrap event names in `<bdi>` wherever they sit next to other text.

## 2. "Quota earned"

### Data
Optional `earnedAt: "YYYY-MM-DD"` on quota items (curated in `data/quotas/quotas.json`, passed through by
`job/build_quotas.py`, validated with `isDate`, else `""`). Without it an item is earned but never "new".

### Home — "מכסה חדשה לישראל"
Items with `israelStatus === "earned"` and `earnedAt` within the last 14 days. Panel directly after the
today strip (before search). Omit when empty.
```html
<section class="panel won" aria-labelledby="wonH">
  <h2 id="wonH">מכסה חדשה לישראל</h2>      <!-- 2+: "מכסות חדשות לישראל" -->
  <ul class="rows">
    <li><span class="d">{fmtShort(earnedAt)}</span>
      <span class="t"><a href="#sport-{id}">{sport}</a> · {event}<small>{israelNote}</small></span>
      <span class="pill q-earned"><span aria-hidden="true">✓</span> מכסה הושגה</span></li>
  </ul>
  <p class="foot">ברוב הענפים המכסה שייכת למדינה; הוועד האולימפי בישראל יחליט בהמשך מי ישתמש בה.</p>
</section>
```
```css
.won{border-inline-start:4px solid var(--ok)}
```
No confetti, no animation, no exclamation marks.

### Today strip
For a running competition, a matched item (sport + date, same rule as stakes) that is already `earned`
replaces its stakes line: `<small class="stakes won-line"><b><span aria-hidden="true">✓</span> מכסה הושגה:</b> <bdi>{event}</bdi></small>`.
```css
.stakes.won-line{border-inline-start-color:var(--ok)} .stakes.won-line b{color:var(--ok-ink)}
```

### Sport page
Earned row: add `<p class="q-meta">הושגה ב־{fmt(earnedAt)}</p>` (omit if no `earnedAt`). If the sport has
no athlete at stage ≥ 2, add once under the bar: `<p class="foot">המכסה הושגה למדינה. שלב הספורטאים והנבחרות יתעדכן אחרי בדיקה ידנית.</p>`

## 3. Athlete page — quota line

Items for the athlete: `S.quotas.filter(q => q.sportId === a.sportId && quotaAthletes(q).includes(a))`
(existing matcher: name in note/stakes, or weight class). Max 3, status order. None → omit.

In `dl.facts`, after `דירוג או הישג`:
```html
<dt>מכסה</dt>
<dd class="stack">
  <span>{status pill} {event}{awaiting pill}</span>
  <span class="muted">{one of the lines below}</span>
</dd>
```
| Status | Second line |
|---|---|
| earned | `המכסה שייכת למדינה, לא לספורטאי/ת.` + ` היא הושגה ב־{fmt(earnedAt)}.` if known |
| awaiting (§1) | the §1 line |
| in-contention + `nxt(q)` | `אירוע המכסה הבא: {name} · {fmt(start)}` then `stakesLine(q)` |
| outside | `לפי המצב הנוכחי, ישראל מחוץ למקומות המכסה.` |
| unknown | `עוד אין מידע על מצב ישראל במקצה הזה.` |

Last: `<a href="#sport-{id}">לכל המכסות בענף</a>` (once). At 400px `.facts` keeps `auto 1fr`; pills wrap.
The matcher is heuristic, so the line never says "שלו/שלה" — the quota is the event's, not the athlete's.

## 5. Home: next quota chances and "הבא בתור" (Itai, after §4)

Implements fixes #1 and #2 from `heuristics-2026-10-18.md`. §4 (`#admin` past events) is in PR #56. The
title changes from "הכי קרובים למכסה" to **"ההזדמנויות הקרובות למכסה"**: the data has no measure of how
close anyone is, only when the next chance is. The panel sorts by date, so the title must not promise a ranking.

### 5a. Panel "ההזדמנויות הקרובות למכסה"

**Input**: `S.quotas`, with `t = today()`. Take items where `israelStatus === "in-contention"` and `nxt(q, t)` is
non-null. Drop the following:
- Items the today strip already covers: the strip has a row whose `comp` has the same `sportId` and
  `comp.start <= q.nextQuotaEvent.start <= (comp.end || comp.start)`. That is the strip's own stakes rule; pass
  `todayRows()` in and don't recompute it.
- Items that are awaiting results (`awaitingOf(q)`, once #65 merges). `nxt()` already drops them, so this is a guard only.

**Grouping**: one row per `(sportId, nextQuotaEvent.start, nextQuotaEvent.name)`. On 18.10 that gives Grand
Slam Abu Dhabi as one row with 7 judo weights, instead of 7 rows.

**Sort**:
1. `nextQuotaEvent.start` ascending.
2. Groups with a followed athlete (`quotaAthletes(q)` ∩ `S.follows`) first.
3. Groups with at least one matched athlete first.
4. `heCmp(sportName)`.

Inside a group, sort items with a matched athlete first, then by `heCmp(event)`.

**Limits**: `CLOSE_MAX = 5` groups and `CLOSE_EVENTS = 3` items per group, then ` · ועוד {n} מקצים`. There is
no date horizon: when the nearest chance is months away the date says so.

**Row**:
```html
<li><span class="d">{fmtShort(start)}</span>
  <span class="t"><a href="#sport-{sportId}">{sportName}</a> · {nextQuotaEvent.name}
    <small>{items}</small>
    {stakes}</span>
  <span class="muted">{when}</span></li>
```
- `{items}`: per item, `<bdi>{event}</bdi>`, plus ` ({athlete links, joined ", "})` when `quotaAthletes(q)` is
  non-empty. Join items with ` · `.
- `{stakes}`: `stakesLine(q, "stakes", "small")` only when the group has exactly 1 item. Several weights'
  stakes would bury the row; the sport page has them.
- `{when}`: `היום` if `start === t`, `מחר` if `start === addDays(t, 1)`, else `בעוד {n} ימים`, where
  `n = dayNo(t, start) - 1`. If `start < t` (multi-day event already running, not in the strip): `מתקיים עכשיו`.

**Panel**:
```html
<section class="panel today" aria-labelledby="closeH">
  <h2 id="closeH">ההזדמנויות הקרובות למכסה</h2>
  <ul class="rows">…</ul>
  <p class="foot">מקצים שבהם ישראל במרוץ למכסה, לפי אירוע המכסה הבא. <a href="#quotas">לכל תמונת המכסות</a></p>
</section>
```
- Position: right after `todayStrip(rows)`, before `reviewPanel()`.
- Omitted when there are no groups, or when quotas aren't loaded or failed (`!S.quotasLoaded || S.quotasError`).
- `.today` reuses the accent border; there is no new CSS. At 400px `.rows` already drops the date onto its own line.

**18.10 example (fixture + `site/quotas.json`)**: the 20.10 team final is inside the running Worlds, so it is in
the strip and not here. The rows are:
1. 24.10 triathlon.
2. 29.10 judo: 3 weights, then "ועוד 4 מקצים".
3. 2.11 lacrosse.
4. 6.11 surfing.
5. 15.1.2027 sailing.

### 5b. "הבא בתור" in the hero

Shown **only when `todayRows()` is empty**; the strip answers "what's next" on event days. It goes under
`freshness()`, inside the hero's text column.

**Candidates**: `S.comps` with `c.start > t`, `dayNo(c.start, c.end || c.start) <= SERIES_DAYS` and
`athletesOf(c.sportId).length > 0`. For each, `entrants` = athletes of that sport with
`isDate(nextDate) && c.start <= nextDate <= (c.end || c.start)`.

**Pick**: the earliest `start` among candidates with `entrants.length > 0`. Break ties by more entrants, then
`qualifying` first, then `heCmp(name)`. If there is none, take the earliest candidate overall (fallback copy below).
If there are no candidates, omit the line.

**Copy**:
```html
<p class="next-up"><b>הבא בתור:</b> <a href="#sport-{id}">{sportName}</a> · {c.name} · {fmtRange(c.start, c.end)} · {who}{qual}</p>
```
- `{who}`:
  - 1–3 entrants: their names as links, joined with ", ".
  - 4 or more: `{n} ישראלים`.
  - Fallback (no entrants): `{n} ישראלים במעקב בענף` (`ישראלי/ת אחד/ת במעקב בענף` for 1). It never says
    "מתחרים", same rule as the strip.
- `{qual}`: ` · <span class="pill open">העפלה</span>` when `c.qualifying`.

**Example (26.10)**: weightlifting Worlds on 27.10 has no entrants, so judo is picked:
`הבא בתור: ג׳ודו · גרנד סלאם אבו דאבי · 29–31 באוק׳ 2026 · 5 ישראלים`. On 18.10 the line is hidden, because the strip shows.

**CSS** (tokens only):
```css
.next-up{margin-top:8px;font-size:15px;overflow-wrap:anywhere}
.next-up b{color:var(--sun-ink)}
```

### 5c. Tests (date matrix, pinned clock)

- **18.10**: strip shown, `next-up` absent; panel row 1 = triathlon; no gymnastics team-final row.
- **26.10**: `next-up` names judo with "5 ישראלים", skipping weightlifting.
- **A day with only a no-entrant candidate**: the fallback text appears and "מתחרים" does not.
- **`S.quotasError`**: no panel, and the page still renders.
- **Judo group**: exactly 3 `<bdi>` items + "ועוד 4 מקצים", and no stakes line.
- **Escaping**: the event and competition names from the fixture are escaped.
