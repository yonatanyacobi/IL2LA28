# "עודכן עכשיו": what changed on an open page (#177, roadmap P3)

When auto-refresh picks up a newer `data.json`, the rows it changed get a `עודכן עכשיו` pill. Marks stay
until the viewer navigates to another page.

## Rows
| Page | Row | Changed when |
|---|---|---|
| `#day`, `#c-` | session row (`sessionRow`) | result, its source/time, start time or athlete names differ, or the row is new |
| `#a-<id>` | rank, next competition, each history entry | the value differs; a history entry is new |
| `#following` | feed entry, "הבא בתור" row | the row is new or its text/date differs |

A row is keyed by identity (day + competition + athletes + phase for a session) and compared by a signature that
leaves out clock-driven parts (the "מתחרה היום" / "בהמתנה" chip), so a status flip at the start time is not a change.

## Rules
- Only an auto-refresh render compares (`diffRender`). Other re-renders (the minute tick, follow clicks, editors'
  live snapshots) update the baseline without marking. Editors therefore see no marks.
- **One announcement:** the existing `#updateNote` (`role="status"`, polite) adds the count of newly marked rows:
  `הנתונים עודכנו ב־21:40 · 2 שורות סומנו „עודכן עכשיו”`. The pills themselves are not live regions, so a refresh
  that changes ten rows is read once. Without newly marked rows the note is unchanged.
- Focus and scroll are kept by the existing `refresh()`. The pill is inline at the end of the row text. At ~400px
  it can wrap that row onto one more line, which moves the rows below it (Gil's "nothing moves" check).

Not in scope: the "יש עדכון" wording in #177 (the note keeps Shira's current text), home and sport pages.
