# Shared components

Status: reference · Owner: UX · The one place that says how a recurring piece looks. A new page reuses these; a
variant needs a change here first. Born from the v45 review, where the same state looked three different ways.
All: 400px and 1280px, light and dark, tokens only, every dynamic string through `esc()`.

**Layout rule.** Everything aligns to the start (right). No centred headings or strips.

## 1. Session row — `sessionRow(s, d)` in `<ul class="rows sess">`
**Use for** every list of sessions: `#day`, `#c-`, home "היום", `#following` "הבא בתור". Never a hand-made row.
```html
<li><span class="d"><time datetime="2026-10-29T07:30:00Z">09:30</time></span>
  <span class="t">★ <a href="#a-raz-hershko">רז הרשקו</a> · <bdi>מוקדמות 57- ק״ג</bdi>
    <span class="res"><b>תוצאה:</b> ארד · עודכן ב־18:40 · <a href="…">מקור: ijf.org</a></span></span>
  <span><span class="pill s-live">מתחרה היום</span></span></li>
```
- **No time anywhere in the group:** `.d` stays empty and the group heading ends with `<span class="muted"> · תאריך בלבד</span>`,
  once. Some rows timed: untimed rows show `השעה תפורסם`.
- ≤ 640px: `.d` on its own line above `.t` (the `.rows.sess` override, #182).

## 2. Status pill — `.pill.{kind}`
**Use for** every status, as text inside a pill. Never plain coloured text (`.now` is retired), never colour alone.
Glyphs are `<span aria-hidden="true">`.

| What | Class | Text |
|---|---|---|
| session | `s-before` / `s-live` / `s-wait` | `לפני התחרות` / `מתחרה היום` / `◷ בהמתנה לתוצאה` |
| competition | `s-before` / `s-live` / `s-wait` / `ended` | `מתחילה ב־{d}` / `מתקיימת עכשיו · יום {n} מתוך {N}` / `◷ הסתיימה · בהמתנה לתוצאות` / `הסתיימה` |
| qualifying, series | `open`, `ended` | `העפלה`, `סדרה עונתית` |
| quota | `q-earned` / `q-in-contention` / `q-outside` / `q-unknown` / `q-awaiting` | via `quotaStatusPill()` |
| stage | `st0`–`st3` | `STAGES[n]` |
| neutral fact (old rank etc.) | `ended` | e.g. `דירוג מ־{d}` |

`s-wait` and ◷ mean only "a result is awaited". Nothing else borrows them.
```html
<span class="pill s-live">מתקיימת עכשיו · יום 2 מתוך 9</span>
```

## 3. Link heading — `h2`/`h3` > `a.hlink`
**Use for** a heading that leads somewhere (a sport on `#day`, a competition, a day on `#c-`). Plain headings stay plain.
```html
<h3><a class="hlink" href="#c-ag-worlds-2026">אליפות העולם בהתעמלות מכשירים 2026</a></h3>
<h3><a class="hlink" href="#day-2026-10-18" aria-current="date">יום א׳, 18 באוק׳ 2026</a> <span class="muted">(יום 2)</span></h3>
```
```css
.hlink{color:var(--ink);text-decoration:none}
.hlink:hover,.hlink:focus-visible{text-decoration:underline}
.hlink[aria-current="date"]{border-bottom:3px solid var(--sun)}   /* one unbroken mark, not a per-word underline */
```
Heading sizes come from `h2`/`h3`; a page never resizes them inline.

## 4. Crumb and prev/next — `.crumb`
**Use for** the parent link above an h1, and `#day`'s day links. Arrow, one space, label; the arrow points the way
you go in RTL.
```html
<p class="crumb"><a href="#sport-artistic-gymnastics">→ התעמלות מכשירים</a></p>
<a href="#day-2026-10-17">→ אתמול</a> … <a href="#day-2026-10-19">מחר ←</a>
```

## 5. Freshness line — `freshLine()` → `.fresh`
**Use for** the one "as of" line under a page's h1 (`#home`, `#day`, `#c-`). Never more than one per page; rows carry
their own times (near-live §1).
```html
<p class="fresh"><i></i><span>נכון ל־<time datetime="2026-10-18T11:01:34Z">18 באוק׳, 14:01</time> · מתעדכן פעם ביום</span></p>
```
Stale: `class="fresh stale"` and the stale copy from near-live §3. Never "נתונים חיים" or "חי", editors included.

## 6. Athlete card and athlete row
**Card — `athleteCard(a, status)` → `a.card`.** Use in grids (`.cards`): `#following`, sport page, home follows.
A page-specific status goes **inside** the card, as the last line, never between cards:
```html
<a class="card" href="#a-artem-dolgopyat"><span class="nm">★ ארטיום דולגופיאט</span>
  <span class="ev">קרקע / נבחרת גברים</span><span><span class="pill st1">בחלון ההעפלה</span></span>
  <span class="ln"><span class="pill s-live">מתחרה היום</span></span></a>
```
**Row — `athleteRow(a, status)` (new) in `<ul class="rows">`.** Use instead of cards in a side column or for more than
4 athletes (`#c-` "הישראלים בתחרות"):
```html
<li><span class="d"></span><span class="t">★ <a href="#a-lihie-raz">ליהיא רז</a><small>קרב־רב נשים</small></span>
  <span><span class="pill s-before">לפני התחרות</span></span></li>
```
★ is `STAR` (visible ★ + `sr` text "במעקב שלך"), in every component.

## 7. Panel — `section.panel` with an h2 (or `.sec-head` when the h2 has a side link)
```html
<section class="panel" aria-labelledby="evSchedH"><h2 id="evSchedH">לוח הסשנים</h2>…</section>
```

## 8. Ranked row and cut line — `<ol class="rows standings">` (standings.md)
**Use for** an ordered list against a threshold (rank vs. the quota line). `.d` holds the number and stays on the row at
every width (`.rows.standings li{grid-template-columns:3.5ch 1fr auto}`, also at ≤ 640px).
```html
<li><span class="d">5</span><span class="t">★ <a href="#a-izhak-ashpiz">יצחק אשפיז</a><span class="sr">, מעל קו המכסה</span></span><span></span></li>
<li class="cutline" aria-hidden="true">קו המכסה: מקום 17</li>
```
The cut line appears only when at least one row is on its list. A caveat shared by several blocks is said once, at the
end of the panel.

## 9. Empty and error state — `div.empty`
**Use for** a page or section with nothing to show. Say what is missing, why if known, and a way on; never a bare "אין".
A whole-page failure gets an h1 and `role="alert"`; a section's empty line is a plain `<p class="muted">`.
```html
<div class="empty"><h1 tabindex="-1">הדף לא נמצא</h1><p>ייתכן שהקישור ישן או שהרשומה הוסרה.</p><p><a href="#home">חזרה לדף הראשי</a></p></div>
```
After a negation: "ספורטאים **או** נבחרות" (Shira).

## Checks (smoke)
- No output contains `class="now"` or `נתונים חיים`.
- On `#day` and `#c-` every `<h2>`/`<h3>` link has `class="hlink"`.
- Each `#c-` athlete's status pill is inside its `.card` or row.
