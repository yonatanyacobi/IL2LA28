# Round 2 — "מה זה אומר" stakes line + `#digest`

Status: ready for implementation (Noa: §1, Omer: §2) · Owner: UX · Base: `main` @ 3588a66
Everything uses existing classes and tokens; new CSS is in §3. Copy is final unless marked.

## 1. Stakes line — "מה זה אומר"

### Data
Optional field on a quota item: `stakes` — one Hebrew sentence on what the next quota event means for
Israel, e.g. `ניצחון בקרב הראשון מכניס אותה ל־17 הראשונות בדירוג, שעולות ישירות`.

- `applyQuotas()`: `stakes: str(q.stakes).trim()`; if longer than 140 chars set it to `""` (drop the
  field, **keep the item** — unlike structural errors, a missing stakes line is harmless).
- Editorial claim → goes through the same fact-check sign-off as `israelNote`; `stakes` must not
  predict results ("תזכה", "בטוח"). Write conditions: "אם…", "ניצחון ב… פירושו…".
- Only meaningful while `nextQuotaEvent` is in the future; render it only when `nxt(q)` is non-null.

### Markup (one fragment, three places)
```js
const stakesLine = (q, cls = "stakes") => q.stakes && nxt(q) ? `<p class="${cls}"><b>מה זה אומר:</b> ${esc(q.stakes)}</p>` : "";
```
(`nxt` = the existing "future nextQuotaEvent" helper in `quotaSection()`; lift it to module scope.)

| Where | Placement |
|---|---|
| Sport page `quotaSection()` row | after the `אירוע המכסה הבא: …` line, before `<details>` |
| `#quotas` "אירועי המכסה הקרובים" rows | inside `.t`, after the `<small>` sport·event line: `<small class="stakes"><b>מה זה אומר:</b> …</small>` |
| `#quotas` per-status rows | not shown (keep the lists scannable) |
| Today strip comp row | inside `.t`, after the existing `<small>`; see matching below |

### Today strip matching
A quota item belongs to a running competition `c` when `q.sportId === c.sportId` **and**
`c.start <= q.nextQuotaEvent.start <= (c.end || c.start)`. Names are free text and are not compared.
If several items match (e.g. several judo weights), show at most 2, each prefixed with its event, then
`ועוד {n} מקצים — <a href="#sport-{id}">בדף הענף</a>`:

```html
<small class="stakes"><b>מה זה אומר:</b> 57- ק״ג נשים: {stakes}</small>
<small class="stakes"><b>מה זה אומר:</b> 63- ק״ג נשים: {stakes}</small>
```
Athlete-only rows (no competition) never show stakes.

### 400px / dark
Line wraps under the event name; the inline-start rule (3px `--sun`) marks it in both themes.
`--sun-ink` on `--surface` is ≥ 4.5:1 in both themes. No icon, no colour-only meaning: the label text is the cue.

```
│ עד 57 ק״ג (נשים)       [◐ במרוץ למכסה] │
│ עד מכסה אחת למדינה                     │
│ אירוע המכסה הבא: גרנד סלאם · 29 באוק׳  │
│ ┃ מה זה אומר: ניצחון בקרב הראשון מכניס │
│ ┃ אותה ל־17 הראשונות בדירוג…           │
│ ▸ איך מחולקות המכסות                   │
```

## 2. `#digest` — weekly summary to share

Route `#digest` (nav highlight: "עדכונים"). Entry points: a link `תקציר שבועי לשיתוף` in the home
"מה התעדכן" `sec-head` (next to `כל העדכונים`) and at the top of `#updates`.
Pure function `digestText(t = today())` → string, so it is unit-testable in `tests/smoke.test.js`.

### Page
```html
<p class="crumb"><a href="#updates">← עדכונים</a></p>
<h1 tabindex="-1">תקציר שבועי</h1>
<p class="muted">טקסט מוכן להדבקה בוואטסאפ או בכל מקום אחר. {fmt(t-6)} – {fmt(t)}.</p>
<section class="panel digest" aria-labelledby="dgH">
  <h2 id="dgH" class="sr">טקסט התקציר</h2>
  <textarea id="digestText" readonly rows="16" aria-labelledby="dgH" aria-describedby="dgCount">{text}</textarea>
  <div class="actions">
    <button class="btn" data-copy="digestText" data-copy-msg="digestMsg">העתקת התקציר</button>
    <span class="foot" id="dgCount">{n} תווים</span>
  </div>
  <p class="foot" id="digestMsg" aria-live="polite"></p>
</section>
```
- The textarea **is** the preview and the fallback: always visible, `readonly`, selectable.
- Copy handler: read the message element from `data-copy-msg` (fall back to today's mapping), so the
  existing `data-copy` branch serves all three copy buttons. On failure it already calls `select()`
  and says `לא ניתן להעתיק אוטומטית. הטקסט מסומן, אפשר להעתיק ידנית.`
- No `wa.me` button for now: popups from the artifact frame are unreliable; copy covers WhatsApp too.

### Text (exact template)
```
*הדרך ללוס אנג׳לס 28 · תקציר שבועי*
{fmt(t-6)} – {fmt(t)} · נכון ל־{fmt(data date)}

*מה התעדכן*
• {change.text}

*ישראלים מתחרים השבוע*
• {fmtShort(nextDate)} · {name} ({sportName}): {next}

*אירועי מכסה בשבועיים הקרובים*
• {fmtShort(start)} · {sportName}, {event}: {nextQuotaEvent.name}
  מה זה אומר: {stakes}

לכל הפרטים: {SITE_URL}
אתר לא רשמי. הנתונים ממקורות פומביים, כדאי לבדוק מול המקור.
```
- Windows: changes `at >= t-6`, newest first; athletes `t <= nextDate <= t+6` ascending; quota events
  `t <= start <= t+13` ascending, status `earned` excluded. Stakes sub-line only when present.
- Empty section → omit it. All three empty → after the header: `שבוע שקט: אין עדכונים, תחרויות או אירועי מכסה ידועים.`
- `data date` = `generatedAt || lastRun` (live mode: `lastRun`). If older than 2 days, add a line
  under the header: `שימו לב: הנתונים לא עודכנו מאז {fmt}.`
- Sanitising: strip WhatsApp markers from data (`/[*_~`]/g` → `""`), collapse whitespace/newlines to a
  space, cut each bullet at 160 chars with `…`. Only the four section headings are bold.
- RTL: every bullet starts with `• ` then a date (Hebrew month), so WhatsApp picks RTL even when a name
  is in Latin script. Use `·` and `–`, not `|` or `-`, as separators.
- **≤ 3500 chars**: build sections as arrays; while `length > 3500`, remove the last bullet of the
  section with the most bullets and count it; each trimmed section ends with `• ועוד {n} באתר`.
  The header and footer are never trimmed. Counter text: `{n} תווים`.

### 400px wireframe
```
┌──────────────────────────────────────┐
│                           עדכונים →  │
│ תקציר שבועי                          │
│ טקסט מוכן להדבקה בוואטסאפ… 12–18 אוק׳│
│ ┌──────────────────────────────────┐ │
│ │*הדרך ללוס אנג׳לס 28 · תקציר…*    │ │
│ │12 באוק׳ – 18 באוק׳ · נכון ל־18…  │ │
│ │                                  │ │
│ │*מה התעדכן*                       │ │
│ │• ג׳ודו: רז הרשקו מדורגת ראשונה…  │ │
│ │ …                         (גלילה)│ │
│ └──────────────────────────────────┘ │
│ [העתקת התקציר]            1,284 תווים│
│ הועתק.                               │
└──────────────────────────────────────┘
```

## 3. CSS (append to `site/styles.css`; tokens only, both themes)
```css
/* stakes line + digest */
.stakes{font-size:14px;color:var(--ink);border-inline-start:3px solid var(--sun);padding-inline-start:8px;overflow-wrap:anywhere}
.stakes b{color:var(--sun-ink)}
.rows .t small.stakes{color:var(--ink);margin-top:4px}
.digest textarea{width:100%;min-height:22em;resize:vertical;border:1px solid var(--line-ui,var(--stage0));border-radius:8px;
  padding:10px 12px;background:var(--bg);font-size:15px;line-height:1.5}
```

## 4. Done when
- `node --check site/app.js site/quotas.js`; smoke cases: stakes > 140 chars dropped but item kept;
  strip shows stakes only for a running competition matching `nextQuotaEvent`; `digestText()` ≤ 3500
  chars on a fixture with 60 changes; no `*` from data survives; empty week text.
- Checked at 400px, light + dark; copy refused (block clipboard) leaves the text selected.
