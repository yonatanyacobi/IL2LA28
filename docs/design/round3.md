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
- Pill (beside, not instead of, the status pill): `◷ ממתינים לתוצאות`
- Line: `{name} הסתיים ב־{fmt(end)}. ממתינים לעדכון המכסות לפי ההודעה הרשמית.`
- Single-day event: `{name} התקיים ב־{fmt(end)}. ממתינים לעדכון המכסות לפי ההודעה הרשמית.`
  (pick by `e.start === end`).
- Never imply an outcome ("כנראה", "נראה ש…").

### Where
| Place | Render |
|---|---|
| Sport page `quotaSection()` row | in `.q-top`: status pill + `<span class="pill q-awaiting">◷ ממתינים לתוצאות</span>`; the line goes where `אירוע המכסה הבא` would be, as `<p class="q-meta">` |
| Sport page sort | awaiting rows right after `earned` (they are the newsiest) |
| `#quotas` | new panel above "אירועי המכסה הקרובים", only if any: h2 `ממתינים לתוצאות`, `.rows` with `.d` = `fmtShort(end)`, `.t` = `{name}<small>{sport link} · {event}</small>`, third cell = status pill |
| Home KPI (`quotaKpi()`) | append ` · <b>{n}</b> ממתינים לתוצאות` when n > 0 |
| Today strip | nothing (it lists running competitions only) |
| Athlete page | see §3 |

```html
<li>
  <div class="q-top"><b>60- ק״ג גברים</b>
    <span class="actions"><span class="pill q-in-contention">◐ במרוץ למכסה</span><span class="pill q-awaiting">◷ ממתינים לתוצאות</span></span></div>
  <p class="q-meta">גרנד סלאם אבו דאבי הסתיים ב־31 באוק׳ 2026. ממתינים לעדכון המכסות לפי ההודעה הרשמית.</p>
  <details>…</details>
</li>
```
400px: `.q-top` already wraps; the two pills wrap under the event name as one group (`.actions` has `flex-wrap`).

```css
.pill.q-awaiting{background:var(--blue-soft);color:var(--blue)}
```
(`--blue` on `--blue-soft`: 7.1:1 light, 5.6:1 dark.) Symbol + words, so no colour-only meaning.

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
      <span class="pill q-earned">✓ מכסה הושגה</span></li>
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
replaces its stakes line: `<small class="stakes won-line"><b>✓ מכסה הושגה:</b> {event}</small>`.
```css
.stakes.won-line{border-inline-start-color:var(--ok)} .stakes.won-line b{color:var(--ok-ink)}
```

### Sport page
Earned row: add `<p class="q-meta">הושגה ב־{fmt(earnedAt)}</p>` (omit if no `earnedAt`). If the sport has
no athlete at stage ≥ 2, add once under the bar: `<p class="foot">המכסה הושגה למדינה. שלב הספורטאים יתעדכן אחרי אישור ידני.</p>`

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
| earned | `המכסה שייכת למדינה, לא לספורטאי/ת.` + ` הושגה ב־{fmt(earnedAt)}` if known |
| awaiting (§1) | the §1 line |
| in-contention + `nxt(q)` | `אירוע המכסה הבא: {name} · {fmt(start)}` then `stakesLine(q)` |
| outside | `לפי המצב הנוכחי, מחוץ למקומות המכסה.` |
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
| `awaiting` | `ממתינים לבדיקה אחרי אירוע מכסה` | `unchecked(q)` and within `AWAIT_DAYS` | no (pill "תזכורת") |

Order: `overdue` → `awaiting` → existing `earned` → `soon`. Within a flag: oldest event end first.

Row (`.rows li`):
```html
<li><span class="d"><a href="#sport-{id}">{sport}</a></span>
  <span class="t">{event}<small>{name} הסתיים ב־{fmt(end)} · לפני {n} ימים · נבדק לאחרונה {fmt(checkedOf(q))}</small></span>
  <span>{quotaStatusPill(q.israelStatus)}</span></li>
```
- "לפני {n} ימים": `n = dayNo(end, t) - 1`; n = 1 → `אתמול`.
- Status pill so the editor sees what visitors currently see ("◐ במרוץ למכסה" + public "ממתינים לתוצאות").
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
