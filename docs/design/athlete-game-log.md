# Athlete "game log" (`#a-<id>`)

Status: spec · Owner: UX · PM roadmap priority 4 · Builds on `event-page.md` (the `#c-` links), `near-live.md`
(labels, sources, no "live"), `sessions-contract.md`. Works at 400px and 1280px, light and dark, signed out.
CSS: existing classes and tokens only.

**Purpose.** On the athlete page, every recorded result in one list, newest first: when, which competition, which
stage, what happened, and where it says so.

## 1. Data
One entry per **result**, from two sources:
1. **Sessions:** `exportedSessions()` where the athlete is in `athletes` and the session has a proven result
   (`result` + `resultSource` + `resultAt`). For a shared session, the result counts for this athlete only by
   `event.js`'s rule: a single-athlete session, or a session result with `resultAt` (official for the whole session,
   e.g. a team). A merged text like `{name}: ארד · {name}: …` is never shown as this athlete's result.
2. **History:** `a.history` entries with `kind:"result"`, a valid `at`, non-empty `text` and an https `source`.
   The competition is `compOn(a.sportId, at)` (≤ 31-day competitions); none matched leaves the competition empty.

- **Dedupe:** a session result and a history result of the same athlete on the same day count once, and the session
  wins (the `#following` rule).
- **Grouping:** entries of the same competition form one row (prelims and final together). Entries with no
  competition are one row each.
- **Order:** rows by their latest day, newest first. Inside a row, by day, then `startUtc`, oldest first.
- **Never derived:** no place, medal or "advanced" parsed from the text, no icons. The text is shown as written.

## 2. Layout
A new section between the facts panel and "היסטוריה":
```
┌ תוצאות בתחרויות ─────────────────────┐
│ 3 תוצאות ב־2 תחרויות                 │  ← .kpi, muted
│ 29–30 באוק׳ │ גרנד סלאם אבו דאבי      │  ← .d │ .t: <a href="#c-…">
│             │ מוקדמות 57- ק״ג: עלייה לסיבוב 2 │  ← one line per entry: <bdi>{phase}</bdi>: {result}
│             │ חצי גמר: הדחה · מקור: ijf.org │
│ 12 בספט׳    │ גביע העולם זאגרב         │
│             │ מקום 7 · מקור: ijf.org   │
└──────────────────────────────────────┘
```
- **Markup:** `<section class="panel" aria-labelledby="logH"><h2 id="logH">תוצאות בתחרויות</h2>`, then
  `<ul class="rows">`, one `<li>` per row.
- **`.d`:** `fmtShort(day)` for one day, `fmtRange(first, last)` for several (`29–30 באוק׳`); with the year when it isn't
  the current year. Wrapped in `<time datetime="{day}">`.
- **`.t`:** `<a href="#c-{id}">{comp.name}</a>` (no competition: `<span class="muted">תחרות לא מזוהה</span>`), then per
  entry `<span class="res">{phase ? "<bdi>{phase}</bdi>: " : ""}{result} · {linkOut(src, "מקור: " + host)}</span>`.
  - **Same source** for every entry in a row: shown once, on the last entry.
  - `עודכן ב־{whenIL(resultAt)}` is **not** shown here: in a log, the competition day is the date that matters.
- **Cap:** 10 rows. More go into `<details><summary>הצגת כל {n} התוצאות</summary>…</details>` (no JS; works without
  the clipboard or storage).
- **History timeline:** drops `kind:"result"` entries (they are in the log now) and keeps start, stage, rank and the rest.

## 3. Copy (Shira)
| Key | Hebrew |
|---|---|
| h2 | `תוצאות בתחרויות` |
| summary | `{plural(n, "תוצאה אחת", "תוצאות")} ב־{plural(m, "תחרות אחת", "תחרויות")}` |
| row | `{phase}: {result} · מקור: {host}` |
| no competition | `תחרות לא מזוהה` |
| more | `הצגת כל {n} התוצאות` |
| empty | `עוד לא תועדו תוצאות של {name} בתחרויות.` (the athlete or team name; no gendered verb) |
| footer (`.foot`) | `כל תוצאה מופיעה עם המקור שלה · {CADENCE}` |

Never: "חי", "בזמן אמת", "עכשיו", a verdict ("ניצחון", "הדחה") we wrote ourselves, medals or ✓ added to the text.

## 4. A11y and 400px
- h2 in the page's heading order; `<time>` on every date; a source link carries "(נפתח בחלון חדש)" via `linkOut`.
- At 400px the `.d` column is 70px and the `.t` lines wrap (`overflow-wrap:anywhere`). Don't truncate.

## 5. Tests (fixture + injected sessions and history)
- Two sessions in one competition and one history result elsewhere: 2 rows, the competition linked to `#c-<id>`,
  newest row first, entries oldest first inside it.
- A session result and a history result on the same day show once (the session's text).
- A shared session's merged text never shows on one athlete's log; a team result with `resultAt` does.
- A history result without an https source is dropped; one outside every competition shows `תחרות לא מזוהה`.
- 12 rows: 10 visible plus a `<details>` with `הצגת כל 12 התוצאות`. The history timeline has no result entries.
- `<b>` in a result renders as text. No output contains "חי" or "בזמן אמת".

## Asks
- **Maya (data):** `history` keeps the last 20 entries, so old results fall off a busy athlete. Either
  `athlete_patch.py` stops dropping `kind:"result"` entries (cap the other kinds), or results move to sessions
  (which aren't capped). Until then the log is complete only from sessions.
