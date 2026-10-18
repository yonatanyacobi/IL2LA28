# "עודכן ב־HH:MM": what changed on an open page (#177, roadmap P3)

When auto-refresh picks up a newer `data.json`, the rows it changed get a `עודכן ב־<time>HH:MM</time>` pill, with the
export's Israel time from the refresh that first marked the row (Shira: "עכשיו" goes stale). Marks stay until the
viewer navigates to another page.

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
  `הנתונים עודכנו ב־21:40 · 2 פריטים השתנו בדף הזה` (one: `פריט אחד השתנה בדף הזה`). The pills themselves are not live regions, so a refresh
  that changes ten rows is read once. Without newly marked rows the note is unchanged.
- Focus and scroll are kept by the existing `refresh()`. The pill is out of the flow (`position:absolute`), centred
  on the row's top edge at the inline end, in the padding between rows, so marking a row never moves text at any
  width. `.facts` rows get a 14px gap (was 6px) so the pill fits between them. `pointer-events:none`, so it never
  covers a link.

Not in scope: the "יש עדכון" wording in #177 (the note keeps Shira's current text); home (after #176) and sport pages.
