# Public corrections log — `#corrections`

Status: ready for implementation on 21.10 · Owner: UX (for PM) · Base: `main` @ 9411b50
Goal: show visitors that mistakes get fixed, fast and in the open. This turns "מצאתם טעות?" from a
mailbox into a visible promise. Existing tokens only. Works at 400px, in light and dark.

## 1. Data

### Record (`corrections/<id>` in the artifact DB → `data.json.corrections[]`)
```json
{"id": "raz-hershko-20261024-rank",
 "at": "2026-10-24T09:10:00Z",
 "reportedAt": "2026-10-23T18:40:00Z",
 "target": {"kind": "athlete", "id": "raz-hershko", "name": "רז הרשקו"},
 "changes": [{"field": "rank", "wrong": "2 בעולם", "right": "1 בעולם (IJF, 21.10.2026)"}],
 "source": "https://www.ijf.org/…",
 "by": "reader"}
```
| Field | Rule |
|---|---|
| `at` | When the fix went live (ISO, Z). Sorting and grouping use it. |
| `reportedAt` | When the report arrived. For audit and job reports, when the error was found. Used for the 48-hour figure. |
| `target.kind` | `athlete` → `#a-<id>`; `sport` or `quota` → `#sport-<id>`. `target.name` is a snapshot, so an entry still reads correctly after a rename or archive. The link is dropped when the target no longer exists. |
| `changes[]` | 1–5 entries. `field` is one of `name, event, rank, next, nextDate, notes, stage, sportId, quota`. `wrong` and `right` are ≤ 200 chars each; one of them may be `""`. |
| `source` | Required, `safeUrl`. A correction without a source isn't published. |
| `by` | `reader` \| `audit` \| `job`. **No reporter name or email, ever**: `data.json` is public. |

### How entries are created (never by automation directly)
1. **Editor form** (`openForm()`): a new fieldset `<fieldset><legend>תיקון טעות</legend>` holds:
   - a checkbox `זה תיקון של טעות שפורסמה`;
   - when checked: a select `מי מצא` (`קורא/ת` / `בדיקה ידנית` / `העדכון האוטומטי`), the date `התקבל ב־` (default today), and `מקור לתיקון` (required).

   On save, the patch is written as today. The same save also writes one `corrections` doc: the `wrong` values
   come from the record before the edit and the `right` values from the patch. It appends a history entry
   `{kind: "correction", text: "תוקן: {field labels}", source}`.
2. **Job**: when it finds an error in its own earlier write, it files a proposal with
   `correction: {by: "job", reportedAt}`. Approving it in the review queue writes the doc, as in (1). Add this to `job/SKILL.md`.
3. **Export** (`export_data.py`): `corrections` with `at >= LAUNCH_AT`, newest first. The >20% shrink guard
   applies. `LAUNCH_AT` is one constant, shared with `app.js`; the **PM sets it**.

The 25 pre-launch audit fixes are **not** entries. They are mentioned once, in the intro (§2).

### Client validation (`applySnapshot`)
- An entry is dropped when any of these fail:
  - `isDate(at.slice(0,10))`;
  - `target.name` is non-empty;
  - `changes` has ≥ 1 item with `wrong || right`;
  - `safeUrl(source)`;
  - `by` is in the enum.
- Cap at 300 entries (they are newest first).

## 2. Page `#corrections`

Nav highlight: "אודות". Route tokens: `corrections` and `corrections-<athleteId>`, which filters to one record.
```html
<p class="crumb"><a href="#about">→ אודות</a></p>
<h1 tabindex="-1">יומן התיקונים</h1>
<p class="muted">כל טעות שתוקנה באתר מאז ההשקה ב־{fmt(LAUNCH_AT)}: מה היה כתוב, מה נכון, ומאיזה מקור.
  לפני ההשקה בדקנו ידנית את כל הרשומות ותיקנו 25 מהן.</p>

<section class="panel" aria-labelledby="howH">
  <h2 id="howH">מטעות לתיקון</h2>
  <ol class="steps">
    <li><b>מצאתם טעות</b><span>שלחו קישור לדף ומקור לנתון הנכון.</span></li>
    <li><b>בודקים מול המקור</b><span>אדם בודק כל דיווח, לא תהליך אוטומטי.</span></li>
    <li><b>מתקנים ומתעדים</b><span>התיקון עולה לאתר ונרשם כאן.</span></li>
  </ol>
  <p>היעד: תיקון תוך 48 שעות מקבלת דיווח עם מקור.{stat}</p>
  <p><a href="#about-trust">איך אנחנו בודקים</a> · דיווח: <span dir="ltr">{CONTACT_EMAIL}</span></p>
</section>

{filter line, only on #corrections-<id>: <p>מוצגים התיקונים של <b>{name}</b> · <a href="#corrections">לכל התיקונים</a></p>}

<section class="month" aria-labelledby="m-2026-10">
  <h2 id="m-2026-10">אוקטובר 2026 <span>{n}</span></h2>
  <article class="fix">
    <div class="fix-head"><a href="#a-raz-hershko">רז הרשקו</a><span class="pill by-reader">דיווח של קורא/ת</span></div>
    <dl class="fix-diff">
      <dt>דירוג או הישג</dt>
      <dd><span class="was">היה: <del>2 בעולם</del></span><span class="now-is">עכשיו: <ins>1 בעולם (IJF, 21.10.2026)</ins></span></dd>
    </dl>
    <p class="foot">תוקן ב־{fmt(at)} · {speed} · {linkOut(source, host(source))}</p>
  </article>
</section>
```
**Dynamic parts**
- `{stat}`: shown once there are ≥ 5 entries with `reportedAt` — ` עד עכשיו {k} מתוך {n} תיקונים בוצעו בתוך 48 שעות.`
  Below 5 it's omitted; small numbers would mislead.
- `{speed}`, from `h = (at - reportedAt) / 36e5`:
  - h < 24: `תוקן באותו יום`
  - h ≤ 48: `תוקן תוך יומיים`
  - otherwise: `תוקן אחרי {ceil(h/24)} ימים`

  It is shown even past 48 hours: hiding slow fixes would undercut the point of the page.
- `by` labels: `reader` → `דיווח של קורא/ת`, `audit` → `בדיקה ידנית`, `job` → `העדכון האוטומטי מצא`.
- Field labels: reuse `describePatch()` labels, plus `stage` → `שלב` and `quota` → `מכסה`.
- Empty or partial values: `wrong === ""` → a single `<span class="now-is">נוסף: <ins>{right}</ins></span>`;
  `right === ""` → `<span class="was">הוסר: <del>{wrong}</del></span>`.
- A stage value is shown as `STAGES[n]`; `sportId` as `sportName()`.

**Order and size**: newest first, grouped by month of `at`, with the same `.month` pattern as `#calendar`. No pagination
until there are 300 entries.

### Empty state (launch day)
```html
<div class="empty"><p>עוד אין תיקונים מאז ההשקה.</p>
  <p>מצאתם טעות? שלחו קישור ומקור ל־<span dir="ltr">{CONTACT_EMAIL}</span>, והתיקון יופיע כאן.</p></div>
```
The "מטעות לתיקון" panel stays above it, so the promise is visible from day one.
On `#corrections-<id>` with no entries: `אין תיקונים מתועדים לרשומה הזאת.` plus the link to all corrections.

## 3. Entry points
| Where | Change |
|---|---|
| `reportBox()` ("מצאתם טעות?", on every athlete page and on About) | Add a last line: `<p class="foot">כל התיקונים מתפרסמים ב<a href="#corrections">יומן התיקונים</a>, בדרך כלל תוך 48 שעות.</p>` |
| About trust block, "תיקונים" (`about-trust.md`) | Replace the sentence about "מה התעדכן" with `כל תיקון נרשם ב<a href="#corrections">יומן התיקונים</a> ({n} מאז ההשקה).` With n = 0: `…ביומן התיקונים.` |
| Athlete page `dl.facts` | When the record has entries: `<dt>תיקונים</dt><dd><a href="#corrections-{id}">{plural(n, "תיקון אחד", "תיקונים")}</a></dd>` |
| Athlete history timeline | `kind: "correction"` entries render like the others; the dot uses `.timeline li.k-correction::before{border-color:var(--muted)}` |
| Footer `.site-foot` | After "איך הנתונים נאספים": ` · <a href="#corrections">יומן התיקונים</a>` |
| `#updates` | Corrections are **not** mixed into "מה התעדכן". It stays news; the log is accountability. |

## 4. CSS (tokens only, both themes)
```css
/* corrections log */
.steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;counter-reset:st}
.steps li{display:grid;gap:2px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;counter-increment:st}
.steps li b::before{content:counter(st) ". ";color:var(--sun-ink)}
.steps li span{color:var(--muted)}
.fix{display:grid;gap:6px;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:12px 14px;min-width:0}
.fix-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;font-weight:700}
.fix-diff{display:grid;gap:4px 12px;grid-template-columns:auto 1fr;margin:0;font-size:15px}
.fix-diff dt{color:var(--muted)}
.fix-diff dd{margin:0;display:grid;gap:2px;min-width:0;overflow-wrap:anywhere}
.fix-diff del{color:var(--muted)}
.fix-diff ins{text-decoration:none;font-weight:600}
.pill.by-reader{background:var(--blue-soft);color:var(--blue)}
.pill.by-audit,.pill.by-job{background:transparent;border:1px solid var(--line-ui);color:var(--muted)}
.timeline li.k-correction::before{border-color:var(--muted)}
@media (max-width:640px){.steps{grid-template-columns:1fr}.fix-diff{grid-template-columns:1fr}}
```
- No red or green for wrong and right. The words "היה" and "עכשיו" carry the meaning; colour would imply blame.
  `<del>` keeps its line-through, which is a second cue that isn't colour.
- Contrast: `--muted` on `--surface` is 5.6:1 in light and 6.6:1 in dark; `--blue` on `--blue-soft` is 7.1:1 and 5.6:1.
- Screen readers don't announce `<del>`/`<ins>`; the visible "היה:" and "עכשיו:" prefixes do.

## 5. Wireframe (400px)
```
┌──────────────────────────────────────┐
│                             אודות →  │
│ יומן התיקונים                         │
│ כל טעות שתוקנה מאז ההשקה ב־… לפני     │
│ ההשקה בדקנו ותיקנו 25 רשומות.        │
│ ┌ מטעות לתיקון ────────────────────┐ │
│ │ 1. מצאתם טעות                     │ │
│ │    שלחו קישור לדף ומקור…          │ │
│ │ 2. בודקים מול המקור               │ │
│ │ 3. מתקנים ומתעדים                 │ │
│ │ היעד: תיקון תוך 48 שעות…          │ │
│ │ איך אנחנו בודקים · דיווח: …       │ │
│ └──────────────────────────────────┘ │
│ אוקטובר 2026  3                      │
│ ┌──────────────────────────────────┐ │
│ │ רז הרשקו        [דיווח של קורא/ת] │ │
│ │ דירוג או הישג                     │ │
│ │ היה: ̶2̶ ̶ב̶ע̶ו̶ל̶ם̶                     │ │
│ │ עכשיו: 1 בעולם (IJF, 21.10.2026) │ │
│ │ תוקן ב־24 באוק׳ · באותו יום · ijf │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```
Desktop: the three steps sit in one row, and `.fix-diff` shows the label in its own column next to the diff.

## 6. Tests
- **Validation:** an entry without `source`, or with an unknown `by`, is dropped; `wrong: ""` renders "נוסף:" and `right: ""` renders "הוסר:".
- **Archived target:** the name shows with no link.
- **Filter:** `#corrections-raz-hershko` shows only that record's entries; an unknown id shows the filtered empty state, not 404.
- **Speed and stat:** the copy follows the 24h / 48h / later thresholds; `{stat}` is absent with fewer than 5 entries.
- **Empty state:** with `corrections: []`, the page shows the "מטעות לתיקון" panel plus the empty state, and no month headings.
- **Escaping:** `wrong` and `right` values from the fixture are escaped. No `@` appears in any entry (no reporter emails).
- **Export:** entries before `LAUNCH_AT` aren't exported.

## Open for PM
- Set `LAUNCH_AT`.
- Confirm that "תיקנו 25 מהן" may be stated publicly. The count comes from `docs/audit/2026-10-18.md`.
- Confirm that 48 hours is a target we can keep at night and on weekends. If not, say `היעד: תוך יומיים בימי חול`.
- `CONTACT_EMAIL` is still the personal address flagged in the backlog.
