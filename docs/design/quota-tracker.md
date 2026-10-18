# Quota tracker + event-day strip — design spec

Status: **as built** on `main` @ a74b99b (sections 0–2 describe shipped code; deviations from the
original proposal are noted) · Owner: UX
Scope: (1) quota tracker on `#sport-<id>`, compact summary on `#sports` cards and home, and the
`#quotas` overview route; (2) "ישראלים מתחרים היום" strip on home. Read-only for visitors.

## 0. Data (as built)

`site/quotas.json` is hand-curated and tracked in the repo (unlike `data.json`):

```json
{"updatedAt": "2026-10-18T10:33:44Z",
 "items": [{"sportId": "judo", "event": "60- ק״ג גברים", "totalQuotas": null, "maxPerNOC": 1,
            "allocation": "…", "israelStatus": "in-contention", "israelNote": "…",
            "nextQuotaEvent": {"name": "…", "start": "2026-10-29"}, "source": "https://…"}]}
```

`loadQuotas()` runs in parallel with `data.json` and never delays or fails the main render.
A 404 counts as an empty file; any other failure, or a body without an `items` array, sets
`S.quotasError = true`. `applyQuotas()` **drops** an invalid item (nothing is mapped to `unknown`).
An item is kept only if all of these hold:

| Field | Rule |
|---|---|
| `sportId` | `sportById(sportId)` exists |
| `israelStatus` | one of `QUOTA_STATUSES` |
| `source` | passes `safeUrl()` (https) |
| `totalQuotas`, `maxPerNOC` | `null` or an integer `>= 0`; a real `0` is shown ("0 מכסות בעולם") |
| `nextQuotaEvent` | `null` or an object with `isDate(start)`; past events are kept for `#admin` and hidden in the UI |

State: `S.quotas` (validated items only), `S.quotasUpdatedAt` (the file's `updatedAt`, empty when no
items), `S.quotasLoaded`, `S.quotasError`. Re-render via `refresh()` when loaded.

Status vocabulary (one constant, used everywhere; symbol + text, never colour alone):

```js
const QUOTA_STATUSES = ["earned", "in-contention", "outside", "unknown"];
const Q_LABEL = {earned: ["✓", "מכסה הושגה"], "in-contention": ["◐", "במרוץ למכסה"],
                 outside: ["○", "מחוץ למכסות כרגע"], unknown: ["?", "אין מידע עדיין"]};
```

"outside" is deliberately neutral (not "נכשל"/"לא העפיל"): standings move until the window closes.

Hebrew plurals: `plural(n, "מקצה אחד", "מקצים")` → "מקצה אחד" / "3 מקצים"; same for "מכסה אחת"/"מכסות".

## 1a. Sport page — section "מכסות לישראל" (as built: `quotaSection()`)

Position: new `<section class="panel">` right **after** "שיטת ההעפלה", before "ספורטאים ונבחרות".
Sort items by `QUOTA_STATUSES`, then `nextQuotaEvent.start` (null last), then `heCmp(event)`.

```html
<section class="panel" aria-labelledby="qH">
  <div class="sec-head"><h2 id="qH">מכסות לישראל</h2><span class="foot">{plural(n,"מקצה אחד","מקצים")}</span></div>
  <div class="bar4 qbar" role="img" aria-label="מכסה הושגה: 1, במרוץ למכסה: 2, מחוץ למכסות כרגע: 0, אין מידע עדיין: 1">
    <i class="q-earned" style="width:25%"></i><i class="q-in-contention" style="width:50%"></i>…</div>
  <ul class="legend">  <!-- existing class; only non-zero statuses -->
    <li><i class="q-earned"></i>מכסה הושגה <b>1</b></li> …</ul>
  <ul class="qlist">
    <li>
      <div class="q-top"><b>{event}</b><span class="pill q-earned">✓ מכסה הושגה</span></div>
      <p class="q-meta">18 מכסות בעולם · עד מכסה אחת למדינה</p>        <!-- omit missing parts; omit line if both null -->
      <p>{israelNote}</p>                                                <!-- omit if empty -->
      <p class="q-meta">אירוע המכסה הבא: {name} · {fmt(start)}</p>      <!-- omit if null -->
      <details><summary>איך מחולקות המכסות</summary>
        <p>{allocation}</p><p class="foot">{linkOut(source, host(source))}</p></details>  <!-- omit details if both empty -->
    </li>
  </ul>
  <p class="foot">ברוב הענפים המכסה שייכת למדינה ולא לספורטאי/ת; הוועד האולימפי בישראל בוחר בהמשך מי ישתמש בה. נתוני מכסות עודכנו: {fmt(S.quotasUpdatedAt)}.</p>  <!-- sentence omitted if no valid date -->
</section>
```

`maxPerNOC` copy: 1 → "עד מכסה אחת למדינה"; n → "עד n מכסות למדינה". `totalQuotas` → "n מכסות בעולם".

States (as built — the sport page never shows an error or empty panel; that lives on `#quotas`):

| State | Render |
|---|---|
| not loaded, load failed, or no items for this sport | section omitted |
| all items `unknown` | bar is all hatched; `<p class="muted">עוד אין מידע על מצב ישראל במקצים האלה.</p>` above the list |
| ≥1 `earned` | normal; the `q-earned` chip carries the message — no confetti, no extra banner |

## 1b. `#sports` card — compact summary (as built: `quotaCardSummary()`)

Inside `a.sport`, after the stage bar, before `.meta`. Text only (card is one link: no nested
interactive elements, no extra `role=img`). Show non-zero counts in `QUOTA_STATUSES`, skip `unknown` unless it is the only one:

```html
<span class="qsum"><span class="sr">מכסות: </span>
  <span class="pill q-earned">✓ 1 הושגה</span><span class="pill q-in-contention">◐ 2 במרוץ</span></span>
```

All unknown → `<span class="qsum">מכסות: אין מידע עדיין</span>`. No items / not loaded → omit the line.
The `#sports` intro line gains `<a href="#quotas">תמונת המכסות</a>` when any items exist.

## 1c. Home — one KPI line (as built: `quotaKpi()`)

In the "התקדמות" panel, directly after the existing KPI line. Counts are **events across sports**
(not athletes), so the copy says "מקצים"; `k` = sports with an earned or in-contention item:

- earned ≥ 1: `<b>{e}</b> מקצים עם מכסה לישראל · <b>{c}</b> במרוץ למכסה · ב־{k} ענפים · <a href="#quotas">תמונת המכסות</a>`
- earned = 0: `טרם הושגו מכסות לישראל · <b>{c}</b> מקצים במרוץ למכסה ב־{k} ענפים · <a href="#quotas">תמונת המכסות</a>`
- no items / not loaded / failed: omitted.

Not yet built (proposal): add to `#about` under "ארבעת השלבים": `<p><b>מכסה לפי מקצה</b>: מקום אולימפי שישראל השיגה במקצה מסוים. השלב של ספורטאי/ת והמכסה של המקצה מתעדכנים בנפרד, ולכן המספרים יכולים להיות שונים.</p>`
(Mismatches, e.g. an `earned` quota with no stage-2 athlete in that sport, belong on `#admin`.)

## 1d. `#quotas` overview (as built: `viewQuotas()` in `site/quotas.js`)

Nav highlights "ענפים"; crumb `← כל הענפים`; h1 `תמונת המכסות`. Then:

1. Summary panel: all four counts, zeros included (`<b>0</b> מכסה הושגה · …`), and
   `הספירה היא לפי מקצים, לא לפי ספורטאים. ברוב הענפים המכסה שייכת למדינה ולא לספורטאי/ת. נכון ל־{date}.`
2. `אירועי המכסה הקרובים`: the next 5 future `nextQuotaEvent`s (date · name · sport link · event · status pill).
3. One panel per non-empty status, h2 = status pill + count; rows = sport link · event · `israelNote` · next date.

States: error → `נתוני המכסות לא נטענו כרגע. שאר האתר מעודכן.`; loading → `טוען נתוני מכסות…`;
no items → `עוד לא נאספו נתוני מכסות.`

## 2. Home — event-day strip "ישראלים מתחרים היום" (as built: `todayRows()` / `todayStrip()`)

Built from the schedule, not live results. `t = today()` (Israel date).

- `running` = competitions with `start <= t <= end`, **duration ≤ 31 days** (`SERIES_DAYS`), and at least
  one tracked athlete in the sport. The 31-day cap keeps season-long series (e.g. a 16-month World Cup)
  from filling the strip every day.
- Each athlete with a `nextDate` joins the running competition in their sport whose date range contains
  `nextDate` (so day 2 of a Grand Slam still lists athletes who start on day 3); if none contains it but
  `nextDate === t`, they join the sport's first running competition; otherwise, if `nextDate === t`,
  they get their own row. Each athlete appears at most once.
- Order: rows with a followed athlete first, then sport name, then competition/athlete name. Followed names get `★`.
- Cap `TODAY_MAX = 6` rows, then `<p><a href="#calendar">ועוד {n} בלוח התחרויות</a></p>`.
- Render **nothing** when there are no rows. Position: directly after `.hero`.
- Heading: `ישראלים מתחרים היום` if any row has athletes, otherwise `היום בענפים שבמעקב`.
- Athletes shown in the strip are excluded from "ישראלים בפעולה ב־14 הימים הקרובים".

```html
<section class="panel today" aria-labelledby="todayH">
  <h2 id="todayH">ישראלים מתחרים היום</h2>
  <ul class="rows">
    <li><span class="d">יום 2 מתוך 4</span>          <!-- single-day comp or athlete row: "היום" -->
      <span class="t"><a href="#sport-judo">ג׳ודו</a> · גרנד סלאם אבו דאבי
        <small>★ <a href="#a-raz-hershko">רז הרשקו</a>, <a href="#a-…">…</a> · אבו דאבי · {linkOut(source)}</small></span>
      <span class="now">מתקיימת עכשיו</span></li>
    <li><span class="d">היום</span>
      <span class="t"><a href="#a-…">{name}</a><small>{sportName} · {next}</small></span><span></span></li>
  </ul>
  <p class="foot">לפי הנתונים מ־{when}, תוצאות יתעדכנו בעדכון היומי</p>
</section>
```

Not-live label: the foot line says the strip is a snapshot, never "live". `{when}` is `lastRun` for
editors in live mode, otherwise `generatedAt || lastRun`, formatted `he-IL` day, month, hour:minute.
With no timestamp it reads `לפי לוח התחרויות, תוצאות יתעדכנו בעדכון היומי`.

Comp row with no listed athletes: `<small>` reads `{location} · {n} ישראלים במעקב בענף`
(`ישראלי/ת אחד/ת במעקב בענף` for 1), never "מתחרים", because we don't know they are entered.
Day index: `dayNo(start, t)`; total `dayNo(start, end)`.

Midnight: the 60 s interval calls `refresh()` when `today() !== renderedDay`.

## 3. CSS (append to `site/styles.css`; tokens only)

As built. One new token, because `--ok` on `--ok-soft` is 4.29:1 in light (fails AA for 12px text):
add `--ok-ink:#11693c` to `:root` (5.83:1) and `--ok-ink:#5fd18f` to **both** dark blocks.
Borders use `var(--line-ui, var(--stage0))` so this works before and after `dev/shira/copy-a11y` merges.

```css
/* quota tracker + event-day strip */
.q-earned{background:var(--ok)} .q-in-contention{background:var(--sun)} .q-outside{background:var(--stage0)}
.q-unknown{background:repeating-linear-gradient(135deg,var(--stage0) 0 2px,var(--surface) 2px 6px)}
.qbar i+i{border-inline-start:2px solid var(--surface)}
.pill.q-earned{background:var(--ok-soft);color:var(--ok-ink)}
.pill.q-in-contention{background:var(--sun-soft);color:var(--sun-ink)}
.pill.q-outside{background:transparent;border:1px solid var(--line-ui,var(--stage0));color:var(--muted)}
.pill.q-unknown{background:transparent;border:1px dashed var(--line-ui,var(--stage0));color:var(--muted)}
.qlist{list-style:none;margin:0;padding:0;display:grid}
.qlist>li{display:grid;gap:4px;padding-block:10px;border-top:1px solid var(--line);min-width:0;overflow-wrap:anywhere}
.qlist>li:first-child{border-top:0}
.q-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}
.q-meta{font-size:13.5px;color:var(--muted)}
.qlist summary{cursor:pointer;font-size:14px;font-weight:600;color:var(--blue);padding-block:10px}
.qsum{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:14px;color:var(--muted)}
.today{border-inline-start:4px solid var(--sun)}
```

Notes: `.legend i.q-*` reuses the bar classes (the legend `<i>` already has size). At 400px: `.q-top`
wraps the chip under the event name; `.rows` already collapses the date column under 640px; summary
gets ≥44px tap height from `padding-block`. No animation anywhere (no pulsing "live" dot).

## 4. Accessibility

- Bars: `role="img"` + full `aria-label` with all four counts (zero included), as `stageBar()` does. On cards, no bar — text only.
- Every status is symbol + word; symbols sit inside the text, not in `::before`, so they are read as part of the label.
- `<details>/<summary>` gives keyboard + SR disclosure for free; don't replace with a custom toggle.
- Strip `section` and quota `section` use `aria-labelledby` to their h2; heading order stays h1 → h2.
- External links only via `linkOut()` (already announces "נפתח בחלון חדש").
- Followed ★ in the strip: wrap as `<span class="star-on" aria-label="במעקב שלך">★</span>` (same as cards).

## 5. Wireframes (~400px, RTL)

Sport page:
```
┌──────────────────────────────────────┐
│                        כל הענפים →   │
│ ג׳ודו                                │
│ ┌ שיטת ההעפלה ───────── [חלון פתוח] ┐│
│ └────────────────────────────────────┘│
│ ┌ מכסות לישראל ────────── 4 מקצים ──┐│
│ │ ████▌▓▓▓▓▓▓▓▓▓▓▌░░░░░░▌/////////  ││
│ │ ■ מכסה הושגה 1  ■ במרוץ 2  / אין 1 ││
│ │ עד 57 ק״ג (נשים)    [✓ מכסה הושגה] ││
│ │ 18 מכסות בעולם · עד מכסה אחת למדינה││
│ │ אירוע המכסה הבא: גרנד סלאם · 29 אוק׳││
│ │ ▸ איך מחולקות המכסות               ││
│ │ ────────────────────────────────── ││
│ │ עד 78 ק״ג (נשים)    [◐ במרוץ למכסה] ││
│ │ …                                  ││
│ │ ברוב הענפים המכסה שייכת למדינה…    ││
│ └────────────────────────────────────┘│
│ ספורטאים ונבחרות (5)                  │
└──────────────────────────────────────┘
```

`#sports` card:
```
┌──────────────────────────────────────┐
│ ג׳ודו                    [חלון פתוח] │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░                  │
│ [✓ 1 הושגה] [◐ 2 במרוץ]               │
│ 5 במעקב · התחרות הבאה: אבו דאבי (29.10)│
└──────────────────────────────────────┘
```

Home, event day:
```
┌──────────────────────────────────────┐
│ הדרך ללוס אנג׳לס 28        ┌ 635 ימים┐│
│ ┃ ישראלים מתחרים היום                 │
│ ┃ יום 2 מתוך 4                        │
│ ┃ ג׳ודו · גרנד סלאם אבו דאבי  מתקיימת │
│ ┃ ★ רז הרשקו, … · אבו דאבי · מקור     │
│ ┃ ─────────────────────────────────  │
│ ┃ היום                                │
│ ┃ {שם} — שייט · {next}                │
│ ┃ לפי הנתונים מ־18 באוק׳, 14:00, תוצ…│
│ [ חיפוש ספורטאי/ת, נבחרת או ענף    ] │
└──────────────────────────────────────┘
```

## 6. Done when

- `node --check site/app.js` and `node tests/smoke.test.js` pass; new smoke cases: quotas fetch fails
  (page still renders, `#quotas` shows "לא נטענו"), all-unknown sport, fixture with today's `nextDate`.
- Checked at 400px in light and dark: no horizontal scroll, chips wrap, hatch visible in both themes.
