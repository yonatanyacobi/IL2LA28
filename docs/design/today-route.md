# `#today`

Status: spec · Owner: UX · Builder: Itai (`day.js`). Builds on `daily-and-following.md` §0–1, `home-today.md`,
`components.md`.

## Decision: an alias, not a separate page
`#today` renders exactly `viewDay(today())`, as the router already does. There is no time-ordered page of its own:
- **Time order already exists.** The home's "היום" list is today's sessions by time, with followed items first
  (`sessionOrder`). A second time-ordered page would duplicate it.
- **`#day` is the full view.** Its sport → competition grouping carries what the flat list drops: the competition
  heading, "יום n מתוך N", the stakes lines and the source. Followed sports and athletes already come first.
- **One page means one set of fixes.** Every `#day` fix (rows at 400px, headings, the freshness line) reaches
  `#today` for free.

The home's `ועוד {n} סשנים היום` → `#today` therefore leads from the short list to the full one.

## Behaviour
- **URL:** stays `#today`, with no redirect to `#day-<date>`. A shared `#today` link means "today, whenever it's opened".
  `#day-<date>` is the link for a fixed date. Strip chips and prev/next always go to dated `#day-<d>`.
- **Date:** Israel's `today()` at render. When an open `#today` page re-renders after Israel midnight (auto-refresh or
  navigation), it moves to the new day. A `#day-<date>` page never moves.
- **Nav:** `nav = "today"` (the `data-nav` of the "היום" link, #208) for `#today`, for `#day` and for `#day-<today>`;
  other dates use `nav = "calendar"`. The nav's "היום" link (review item 10, Shira)
  gets `aria-current="page"` on those three. Another date leaves it unmarked.
- **`#day-<today>` and `#today` render identically.** The only difference is the URL.

## Copy (changes to `#day` when the date is today; other dates unchanged)
| Where | Hebrew |
|---|---|
| h1 (date = today) | `היום, {dayTitle(d)}`, e.g. `היום, יום א׳, 18 באוק׳ 2026` |
| h1 (other dates) | `{dayTitle(d)}` (as now) |
| prev / next (date = today) | `→ אתמול` / `מחר ←` (as now) |
| strip link back to today (other dates) | `היום` → `#today` (as now) |
| empty day | `אין סשנים ידועים של ספורטאים או נבחרות מישראל ביום הזה.` ("או" after a negation, Shira) |
| empty, next | `הבא בתור: <a href="#day-{d}">{fmt(d)}</a>` (the home's wording) |

The tab title follows the h1 (`route()` already sets it). The freshness line and every other piece follow `components.md` (§5 `.fresh`, §4 arrows).

## Tests (pinned clock)
- `#today`, `#day` and `#day-<today>` produce the same HTML, with the h1 starting `היום, `.
- `#day-<yesterday>` has no `היום, ` prefix, and its strip shows the `היום` link to `#today`.
- Pin the clock at 23:59 Israel time, render `#today`, move to 00:01, re-render: the h1 shows the next day. A
  `#day-<date>` render stays on its date.
- Empty day: the new copy, and `הבא בתור` when a session falls within `DAY_LOOKAHEAD`.
- The nav "היום" link is `aria-current="page"` on `#today` and not on `#day-<yesterday>` (once item 10 lands).
