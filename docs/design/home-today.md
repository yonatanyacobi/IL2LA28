# Home as a "today" hub (`#home`)

Status: spec · Owner: UX · Builds on `daily-and-following.md`, `event-page.md`, `near-live.md` (its labels and
"no live" rule apply unchanged). Works at 400px and 1280px, light and dark, signed out. CSS tokens only.

**Purpose.** Open the site and see, in this order: who from Israel competes today, what results came in during the
last 48 h (with their source), and the athletes you follow first in both.

## 1. Order of the page
1. `.hero`: h1, the page-level `freshLine()` (near-live §3, replaces `freshness()`), the countdown. `nextUpLine` stays.
2. **"היום"** (§2), replacing `todayStrip()`.
3. **"תוצאות אחרונות"** (§3).
4. **"במעקב שלי"** cards, moved up from below the quota panels (unchanged markup, or the existing tip line).
5. The rest as today: search, won, closest, review, KPI, 14 days, updates, upcoming comps.

Desktop (≥ 900px): §2 and §3 share a row, `.home-now{display:grid;gap:22px}` and
`@media (min-width:900px){.home-now{grid-template-columns:3fr 2fr;align-items:start}}`. At 400px they stack.

## 2. "היום" — today's Israeli sessions
- **Data:** `daySessions(today())` (exported sessions, with the fallback). **Order:** `sessionOrder`, so followed first.
- **h2:** `היום, {dayTitle(t)}` (e.g. `היום, יום א׳, 18 באוק׳`).
- **Row:** the shared `sessionRow(s, t)`, with one addition in `.t`: `<small><a href="#sport-{id}">{sport}</a> ·
  <a href="#c-{compId}">{comp}</a></small>`. Chips and labels come from near-live §2 (`מתחרה היום`, `◷ בהמתנה לתוצאה`, …).
- **Cap:** 6 rows, then `<a href="#today">ועוד {n} סשנים היום</a>` (n = 1: `ועוד סשן אחד היום`).
- **Running competitions without a known Israeli session** collapse into one `.foot` line:
  `עוד היום, בלי סשן ידוע של ישראלים: {links to #c-<id>, joined " · "}`.
- **Stakes:** none here (they live on `#day` and `#c-`). Keeps the home rows to 2–3 lines at 400px.
- **Empty:** `<p class="muted">אין היום סשנים ידועים של ספורטאים או נבחרות מישראל.</p>` plus, when a later session
  exists: `<p>הבא בתור: <a href="#day-{d}">{fmt(d)}</a> · {comp}</p>`.

## 3. "תוצאות אחרונות" — the last 48 h
- **Data:**
  - exported sessions with `resultAt` ≥ now − 48 h;
  - fallback history results (`kind:"result"`) with `at` = today or yesterday (date only).

  Deduped per athlete + day, the session wins (as in `#following`). No source, no row (near-live §4).
- **Order:** followed athletes first, then `resultAt` (or `at`) newest first.
- **Row** (`<ul class="rows">`): `.d` = `whenIL(resultAt)` (near-live §5) or `fmtShort(at)`; `.t` = names (★ for followed) ·
  `<a href="#c-{id}">{comp}</a>`, then `<span class="res"><b>תוצאה:</b> {result} · {linkOut(src, "מקור: " + host)}</span>`.
  No chip and no ✓: a result can be an elimination.
- **Cap:** 5. The rest go into `<details><summary>ועוד {n} תוצאות ב־48 השעות האחרונות</summary>…</details>`, so every
  result is on the home. The section's `.foot` ends with `<a href="#updates">לכל העדכונים באתר</a>`: #updates is the
  change log, not a results list, so it is never worded as "more results".
- **Empty:** `אין תוצאות חדשות ב־48 השעות האחרונות.`

## 4. Copy table (Shira)
| Key | Hebrew |
|---|---|
| today h2 | `היום, {יום א׳, 18 באוק׳}` |
| more today | `ועוד {n} סשנים היום` / `ועוד סשן אחד היום` |
| running, no session | `עוד היום, בלי סשן ידוע של ישראלים:` |
| today empty | `אין היום סשנים ידועים של ספורטאים או נבחרות מישראל.` |
| next | `הבא בתור: {date} · {comp}` |
| results h2 | `תוצאות אחרונות` |
| results sub (`.foot`) | `ב־48 השעות האחרונות · {CADENCE} · לכל העדכונים באתר` |
| results empty | `אין תוצאות חדשות ב־48 השעות האחרונות.` |
| more results | `ועוד {n} תוצאות ב־48 השעות האחרונות` (n = 1: `ועוד תוצאה אחת ב־48 השעות האחרונות`) |
| no follows tip (unchanged) | `טיפ: לחצו על ☆ בדף של ספורטאי/ת או נבחרת כדי לעקוב…` |

**Forbidden here, as everywhere:** "חי", "בזמן אמת", "עכשיו" for a result, "לפני X דקות". This includes the editor-mode
freshness text `נתונים חיים · עדכון אוטומטי אחרון:`, which becomes `נכון ל־{when} · {CADENCE}` for everyone.

## 5. A11y and theme
- h1 → h2 per section; each section is `aria-labelledby` its h2. Times inside `<time datetime>`.
- ★ keeps its `sr` text. Status is text, never colour alone. Only existing tokens (`--ink`, `--muted`, `--surface`,
  `--sun`, `--blue`); no new colours, so contrast is as in phase 1.

## 6. Tests (pinned clock, fixture + injected sessions)
- Today with 8 sessions: 6 rows, followed first, the "more" link reads `ועוד 2 סשנים היום`; each row links `#c-<id>`.
- No sessions today: the empty line and "הבא בתור"; a running competition without a session is in the one-line list.
- 7 results: 5 rows plus a `<details>` with the other 2; `לכל העדכונים באתר` is in the foot, not in the summary.
- Results: 47 h old shows, 49 h old doesn't; a history result from yesterday shows without "עודכן"; a result
  without a source is dropped; a session and a history result for the same athlete and day show once.
- Output contains no "חי", "בזמן אמת" or "לפני" + "דקות", also with `S.live = true`.
