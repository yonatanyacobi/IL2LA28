# Round 3 — after a quota event

Status: single source for round 3, replacing the copies in #44 (merged, §1–§3) and #56 (§4) · Owner: UX
Base: `main` @ c2ce543 · Existing tokens only; new CSS is listed per section. Works at 400px, in light and dark.

| § | Topic | Implementer | State |
|---|---|---|---|
| 1 | Awaiting results | Noa | **shipped** (#65, 7aedc21) |
| 2 | Quota earned (`earnedAt`) | Noa, Omer | partly shipped (8cace9b: sport-page lines); `earnedAt` loader, home panel and strip line open (round3-qa QA-1–QA-4) |
| 3 | Athlete-page quota line | Noa | **shipped** (8cace9b) |
| 4 | `#admin` past quota events (`checkedAt`) | Itai | spec; next after the result-night checklist |
| 5 | Home: next quota chances + "הבא בתור" | Itai | **shipped** (00088a0) |
| 6 | Verification status for visitors | — | spec |

Shared helpers across sections: `nxt()`, `quotaEventEnd()`, `awaitingOf()` (§1), `checkedOf()` (§4; once
`checkedAt` ships, §1 uses it instead of `S.quotasUpdatedAt`), `quotaAthletes()`, `todayRows()`.

## 1. "Awaiting results" — the event ended, quotas.json not updated yet

### Rule
```js
// Quota event is over but the curated file predates its end: results are not in the data yet.
const AWAIT_DAYS = 14;
const awaitingOf = (q, t = today()) => {
  const e = q.nextQuotaEvent, end = quotaEventEnd(q);
  if (!e?.name || !end || end >= t || q.israelStatus === "earned") return null;
  if (str(S.quotasUpdatedAt).slice(0, 10) > end) return null;   // curated after the event: trust the status (§4: checkedOf(q) > end)
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

## 4. `#admin` — quota events that ended and weren't re-checked (Itai, after the result-night checklist)

Today `quotaHealthPanel()` has one flag, `past` ("אירוע המכסה הבא כבר עבר"). It fires on every item
whose event is over, even right after a fact-checker re-reviewed it, and it doesn't say how urgent it is.
This section replaces that flag.

### Data: per-item check date
`job/build_quotas.py` publishes `checkedAt = review.at` (date only; `review.by` stays private).
`applyQuotas()`: `checkedAt: isDate(q.checkedAt) ? q.checkedAt : ""`. One shared helper, also used by §1
instead of the file-level `S.quotasUpdatedAt` once `checkedAt` exists:
```js
const checkedOf = q => q.checkedAt || str(S.quotasUpdatedAt).slice(0, 10);
// Event over, item not reviewed since its last day.
const unchecked = (q, t = today()) => { const end = quotaEventEnd(q); return !!(q.nextQuotaEvent && end && end < t && checkedOf(q) <= end); };
```
An item re-checked after its event but still showing that past event as "next" isn't flagged here: the
reviewer kept it on purpose. Those still lose their next-event line publicly (`nxt()`).

### Panel
Two flags replace `past`, inside the same `quotaHealthPanel()` and in the same `.stack` + `.rows` markup:

| key | label | items | alert |
|---|---|---|---|
| `overdue` | `אירוע מכסה עבר לפני יותר מ־14 יום ולא נבדק מחדש` | `unchecked(q)` and `dayNo(end, t) - 1 > AWAIT_DAYS` | yes (`adm-bad`, panel `adm-alert`) |
| `awaiting` | `בהמתנה לבדיקה אחרי אירוע מכסה` | `unchecked(q)` and within `AWAIT_DAYS` | no (pill "תזכורת") |

Order: `overdue` → `awaiting` → existing `earned` → `soon`. Within a flag: oldest event end first.

Row (`.rows li`):
```html
<li><span class="d"><a href="#sport-{id}">{sport}</a></span>
  <span class="t"><bdi>{event}</bdi><small>{name} ({fmtRange(start, end)}) · לפני {n} ימים · בדיקה ידנית אחרונה: {fmt(checkedOf(q))}</small></span>
  <span>{quotaStatusPill(q.israelStatus)}</span></li>
```
- "לפני {n} ימים": `n = dayNo(end, t) - 1`; n = 1 → `אתמול`.
- Status pill so the editor sees what visitors currently see ("◐ במרוץ למכסה" + public "בהמתנה לתוצאות").
- Footer of each flag (`.foot`, once): `לעדכן את data/quotas/quotas.json (סטטוס, אירוע מכסה הבא, review.at) ולהריץ את build_quotas.py.`
- Empty flags are omitted (as today); if neither fires and nothing else does, the panel pill stays "תקין".

### Tile
Add one tile to `.adm-tiles`, linking to the panel: `tile("#admin", overdue + awaiting, "אירועי מכסה שלא נבדקו מחדש")`
→ href `#quotaHealth` won't work (only bare `#token` hashes route), so the tile stays on `#admin` and the
panel is already above the tiles. If `overdue > 0` the tile is `hot`.

### Done when
- Smoke: an item with an ended event and `checkedAt` before the end appears under `awaiting`; 15 days later
  under `overdue` (panel `adm-alert`); with `checkedAt` after the end it appears in neither.
- `python3 -m py_compile job/build_quotas.py`; build test asserts `checkedAt` is published and `review` is not.

## 5. Home: next quota chances and "הבא בתור" (Itai, after §4)

Implements fixes #1 and #2 from `heuristics-2026-10-18.md`. The
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

## 6. Verification status for visitors (the pre-launch verification drive)

Today `trustChip()` shows the same chip everywhere, including "◌ איסוף אוטומטי" on every unverified card. In the
fixture that is all 99 cards. During the drive most cards would carry a grey "not checked" mark, which reads as
"this site is unchecked". Principle: **show the check where it exists, explain its absence once, on the athlete
page.** Classification stays as is: `trustOf(a)` returns `ok | stale | auto`. No data change.

### 6a. Card (`athleteCard()`: home, sport page, search)
| State | Render |
|---|---|
| `ok` | `<span class="trust ok"><span aria-hidden="true">✓</span> נבדק {fmtShortY(verifiedAt)}</span>` |
| `stale`, `auto` | nothing |

`fmtShortY(d)` = `fmtShort(d)`, plus the year when it differs from `today()`'s year. Call it as
`trustChip(a, "card")`. The card is one link, so the chip has no link of its own.

### 6b. Athlete page (`dl.facts`, row "בדיקה")
The chip comes first, then one muted explanation line, then the link to the trust block. The `<dd>` is `class="stack"`.

| State | Chip | Line |
|---|---|---|
| `ok` | `✓ נבדק ידנית ב־{fmt(verifiedAt)}` (`.trust.ok`) | `הרשומה הושוותה למקור ({host(source)}) ולא השתנתה מאז.` |
| `stale` | `✓ נבדק ב־{fmt(verifiedAt)}` (`.trust.stale`) | `מאז התעדכנו פרטים אוטומטית ({fmt(updatedAt)}). הם ייכללו בבדיקה הבאה.` |
| `auto` | `◌ טרם נבדק ידנית` (`.trust.auto`) | `הפרטים נאספו אוטומטית ממקורות פומביים, והרשומות נבדקות ידנית בהדרגה. בינתיים כדאי להיעזר בקישור למקור.` |

All three states end with `<a href="#about-trust">איך אנחנו בודקים</a>`. Each symbol sits in `<span aria-hidden="true">`.
- `({host(source)})` is omitted when there is no `safeUrl(source)`.
- In the `auto` line, "בקישור למקור" only appears when a source exists. Without one, the line ends at "…בהדרגה."
- No line says "לא אמין", "חשוד" or "שגוי". "טרם" frames the state as a queue position, not a verdict.

### 6c. Link to the About trust block (#48)
Only bare `#token` hashes work, so add a route token rather than an in-page anchor:
- **Router:** `h === "about" || h === "about-trust"` → `viewAbout()`, nav "about".
- **After render:** for `about-trust`, focus `#trustH`: `tabindex="-1"`, `focus({preventScroll:false})`. Skip the
  default h1 focus.
- **Trust-block legend:** the legend (`about-trust.md`) keeps calling the real `trustChip(a)` for each of the three
  states, so it shows exactly the 6b chips.

### 6d. Home KPI during the drive
In the current KPI line, `<b>{V}</b> מתוך {N} נבדקו ידנית` becomes `<b>{V}</b> מתוך {N} נבדקו ידנית עד כה ·
<a href="#about-trust">איך בודקים</a>`. If heuristics fix #4 lands first, this line moves to the trust block and
is not on home at all. With V = 0, show nothing (no "0 נבדקו").

### 6e. CSS (tokens only, both themes)
```css
.trust.stale{background:transparent;border:1px solid var(--line-ui);color:var(--ink)}   /* was sun = warning */
.trust.auto{background:transparent;border:1px dashed var(--line-ui);color:var(--muted)}
```
`ok` is unchanged: `--ok-ink` on `--ok-soft`, 5.8:1 in light and 6.8:1 in dark. `stale` moves off the warning
colours: it is lower confidence, not a problem. At 400px the athlete `dd` stacks chip, line and link. Card chips
wrap with the stage pill.

### 6f. Tests
- **Card:** an `auto` card has no `class="trust`; an `ok` card has `נבדק` and its date.
- **Year:** a `verifiedAt` from the previous year includes the year.
- **Athlete page:** each state renders its line and `href="#about-trust"`, and nothing says "איסוף אוטומטי".
- **`auto` without a source:** no "בקישור למקור".
- **`#about-trust`:** renders `#about` content with nav "about".
- **KPI:** with V = 0 the KPI has no "נבדקו".
