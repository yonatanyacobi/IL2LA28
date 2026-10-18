# Near-live labels: when, what we know, and where from (`#day`, `#c-<id>`)

Status: spec for sprint 4 · Owner: UX · Base: `main` @ 359becd
Builds on: `daily-and-following.md` §1, `event-page.md`, `sessions-contract.md` and auto-refresh (#152).
Builders: Itai (`#day`, `sessions` rendering) and Noa (`#c-<id>`). Both use **one shared set of label functions**
(§5), so the two pages can't drift.

**The promise this copy keeps.** Every status says **what we know and as of when**, never more:
- no "חי", "בזמן אמת", "עכשיו" for a result, or relative times that go stale;
- every time is absolute, in Israel time.

The cadence wording stays in `CADENCE` (one place) and follows the owner decision OD2.

## 1. The three timestamps (and only these)
| Name | Source | Means | Shown as |
|---|---|---|---|
| **result time** | `session.resultAt` | when the result was recorded on the site | `עודכן ב־{when}` on the result line |
| **check time** | `S.lastRun` (live mode) or `S.generatedAt \|\| S.lastRun` | when the job last looked at the sources | `נבדק לאחרונה ב־{when}` on awaiting rows; `נכון ל־{when}` on the page |
| **session time** | `session.startUtc` | when the session starts | `HH:MM` in the time column |

`{when}`:
- `HH:MM` when the Israel date is today;
- `{fmtShort}, HH:MM` otherwise;
- with the year when it isn't the current year.

Times go through the existing `hhmm()`/`ilDate()` (Israel time) and are wrapped in
`<time datetime="{ISO}">…</time>`.

## 2. Session states and their labels
The order of evaluation matters: a result wins, then the clock. The window and the chips are as in phase 1.

| State | Condition | Status cell | Detail line (in `.t`, `.res` / `.foot` style) |
|---|---|---|---|
| **result** | `result` (with `resultSource` + `resultAt`, enforced by the loader) | none | `<b>תוצאה:</b> {result} · עודכן ב־{when(resultAt)} · <a>מקור: {host(resultSource)}</a>` |
| **result, date only** (fallback from history) | result without `resultAt` | none | `<b>תוצאה:</b> {text} · <a>מקור: {host}</a>`, with no time |
| **before** | `now < startUtc`, or an untimed future day | `לפני התחרות` | the time column shows `HH:MM`, or `השעה תפורסם` / `תאריך בלבד` |
| **competing** | inside `[startUtc, +3h)`, or untimed today | `מתחרה היום` | none |
| **awaiting, fresh** | past the window, and the check time is **before** the window end | `◷ בהמתנה לתוצאה` | `התוצאה תתעדכן {NEXT_CHECK}` |
| **awaiting, checked** | past the window, and the check time is **after** the window end | `◷ בהמתנה לתוצאה` | `נבדק לאחרונה ב־{when(check)} · התוצאה עוד לא פורסמה במקור הרשמי` |
| **awaiting, long** | more than 48 h since the window end | `◷ בהמתנה לתוצאה` | `התוצאה טרם פורסמה · <a href="{session.source}">לוח התחרות הרשמי</a>` (no time; it would read as a promise) |

- **`NEXT_CHECK`** sits next to `CADENCE` in the same block:
  - today: `בעדכון היומי`;
  - after OD2: `בעדכון הבא, בערך כל שעתיים בימי תחרות`.

  It never says a clock time.
- **"התוצאה עוד לא פורסמה במקור הרשמי"** is only true because the job checked after the session. That's why the
  checked state needs `check > window end`.
- **The window end** is `startUtc + 3h`. For untimed sessions it is the end of that Israel day.

## 3. Page-level label (top of `#day` and `#c-<id>`, under the h1)
```html
<p class="fresh {stale?}"><i></i><span>נכון ל־<time datetime="…">29 באוק׳, 18:40</time> · מתעדכן פעם ביום</span></p>
```
It reuses the home `.fresh` dot style: green, or sun when stale.

**Stale** when the page shows any session today, or a competition running today, **and** the check time is older than:
- 26 h in phase 1;
- 3 h after OD2.

When stale, the line becomes:
`הנתונים לא עודכנו מאז {when} · ייתכן שיש תוצאות שעוד לא מופיעות כאן`.
- No banner and no alarm colour beyond the dot.
- Days without sessions never show stale.

**Auto-refresh (#152).** When new `data.json` arrives, the page re-renders in place. The re-render updates
`נכון ל־` and the rows, and it never moves focus or scroll. A new result gets no highlight of its own beyond the
row's normal result line:
- no flashing;
- `prefers-reduced-motion` doesn't matter, because nothing animates.

**Changed rows (#177, built in #193, `docs/design/changed-rows.md`).** The one allowed mark: a row whose content really
changed in an auto-refresh gets `<span class="pill chg">השתנה ב־<time datetime="{ISO}">{HH:MM}</time></span>` until the
next navigation.
- **A timestamp, never "עכשיו":** it stays true however long the page stays open.
- **Only a real change:** the row's content differs from the previous render. Clock-driven chips (`מתחרה היום` →
  `◷ בהמתנה לתוצאה`), first renders, ordinary navigation and editors' live snapshots never mark.
- **Quiet:** out of the text flow, so marking moves nothing. One polite note announces the count; the pills are not
  live regions.

#152's "יש עדכון" notice, if kept, is a polite `aria-live` text, not a toast with a timer.

## 4. Source labels
- **Result:** `מקור: {host(resultSource)}`, via `linkOut(url, "מקור: " + host)`, which includes "(נפתח בחלון חדש)"
  for screen readers.
  - **Reason:** the host tells the reader whether it's the federation (`ijf.org`) or media.
  - **Fallback history results** use `history.source` the same way.
- **Schedule and time:** on `#c-<id>`, the competition footer reads `לוח הזמנים: {host(source of the first session)}`.
  On `#day`, the competition header's foot already carries the competition source and gets no extra label.
- **Never** a source-less result. The loader already drops those (day.js). Keep that rule in the shared function.

## 5. Shared functions (in `day.js` now; move to `sessions.js` with the #c refactor)
```js
whenIL(iso)               // "18:40" | "29 באוק׳, 18:40" | with year; wraps <time datetime>
sessionState(s, now, checkIso) // "result" | "resultDate" | "before" | "competing" | "awaitFresh" | "awaitChecked" | "awaitLong"
sessionDetail(s, state, checkIso)  // the detail line HTML per §2 (escaped)
statusChip(state)         // the chip HTML (none for result states)
freshLine(rowsToday)      // §3 line, stale-aware
```
- **`#day`** keeps its layout and replaces its inline logic with these functions.
- **`#c-<id>`** uses the same functions on every row and in "בקצרה". Its counts follow the states: `תוצאות` is
  `result + resultDate`, and `בהמתנה` is every `await*` state.

## 6. 400px and themes
- **Wrapping:** the detail line wraps under the names (`.t` already does `overflow-wrap:anywhere`). At 400px the
  longest line, "awaiting checked", takes 2–3 lines at 14px. That's acceptable; don't truncate.
- **Colour:**
  - the detail line is `--muted`, except `<b>תוצאה:</b>`, which is `--ink`;
  - the source link uses the normal link colour.
  - No new colours: contrast is as in phase 1 (`--muted` on `--surface` is 5.6:1 light, 6.6:1 dark).
- **Time column:** `HH:MM` fits the 70px column. `השעה תפורסם` wraps onto two lines, which is fine.

## 7. Copy table (for Shira's review)
| Key | Hebrew |
|---|---|
| result | `תוצאה: {result} · עודכן ב־{when}` |
| source | `מקור: {host}` |
| awaiting chip | `◷ בהמתנה לתוצאה` |
| awaiting, fresh | `התוצאה תתעדכן בעדכון היומי` (after OD2: `…בעדכון הבא, בערך כל שעתיים בימי תחרות`) |
| awaiting, checked | `נבדק לאחרונה ב־{when} · התוצאה עוד לא פורסמה במקור הרשמי` |
| awaiting, long | `התוצאה טרם פורסמה · לוח התחרות הרשמי` |
| page fresh | `נכון ל־{when} · {CADENCE}` |
| page stale | `הנתונים לא עודכנו מאז {when} · ייתכן שיש תוצאות שעוד לא מופיעות כאן` |
| schedule source (#c) | `לוח הזמנים: {host}` |

## 8. Tests (pinned clocks, a fake session at 09:30 Israel time, check times injected)
- **Awaiting states:**
  - 13:00, check 08:00: "awaiting fresh" plus the `NEXT_CHECK` copy.
  - 14:00, check 13:00: "awaiting checked" with "נבדק לאחרונה ב־13:00".
  - Three days later: "awaiting long" with the schedule link, and no time.
- **Result:** `resultAt` today shows `עודכן ב־HH:MM`, and yesterday shows `{d}, HH:MM`. The source link text starts `מקור: ` and the host.
- **Date-only result:** a fallback history result has no "עודכן".
- **Stale page:** a session today with a check 27 h old shows the stale line (the sun dot). A day with no sessions
  never shows it.
- **Shared functions:** `#c-<id>` and `#day` render the same row identically.
- **Markup and wording:** every time is inside `<time datetime>`, and no output contains "חי", "בזמן אמת" or "לפני X דקות".
