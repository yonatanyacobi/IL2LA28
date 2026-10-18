# Decision: following a competition (event-page spec §2)

Date: 18.10.2026 · Decided by: PM · For: Noa (event page), UX · Status: **No, not now.** Replaced by a lighter entry point.

## Decision
We don't build competition follows (`la28.followComps`, the third `#following` tab, competition items in the badge).
Instead, `#c-<id>` offers the follows we already have:
- **Follow the sport:** one ☆ button in the page header, using the existing `followsSport()` and storage.
  The label is "☆ מעקב אחרי {ענף}". If the sport is already followed: "★ הענף במעקב שלך".
- **Follow an athlete:** the existing ☆ on each athlete row in the page.

`#following` and the badge **don't change**. A followed sport already brings in its competitions' session results and
awaiting items, so nothing a competition follow would show is lost.

## Why
- **Almost no added value.** Every competition belongs to one sport, and we only list Israelis. Following the sport
  shows the same sessions, plus the next competitions. The only extra case is "this event only, not the whole sport",
  and we have no evidence anyone wants that.
- **Real cost.** It adds a third follow type that expires in days (pruning, a dedupe rule, a third tab, more badge logic,
  more QA states), all during the two sprints before Doha.
- **NBA parallel.** In the NBA app you follow teams and players, not games. Our equivalent is sports plus athletes, as already decided in `nba-style.md` §5.

## Revisit if
Two or more readers ask for it (error inbox, or the channel pilot if OD3 is approved), or a multi-sport event appears.
Then spec §2 is ready as written.

## Changes to the spec
- `docs/design/event-page.md` §2 is deferred. UX marks it "deferred: see decision-follow-competition.md".
- The page header gets the sport-follow button above. No other §1 changes.
