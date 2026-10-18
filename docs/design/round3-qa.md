# Round 3 design QA — main @ 3e5f5b7

Reviewed against `docs/design/round3.md` (§1–§6, PR #72) by reading `site/app.js`, `site/quotas.js`,
`site/index.html` and `styles.css`. There was no browser, so layout is judged from CSS.
Severity: **P1** wrong on result night or misleading · **P2** spec gap or a11y · **P3** polish.
Each issue is sized as one PR.

## Summary
| § | State |
|---|---|
| §1 Awaiting | **Shipped, matches the spec**: rule, pill, verb-free line, sort, `#quotas` panel, plural KPI, strip, athlete line. |
| §2 Earned | **Partly shipped.** The sport-page foot works. The home panel and the strip line aren't built, and `earnedAt` is dropped by the loader (QA-1, QA-3). |
| §3 Athlete line | **Shipped**, apart from QA-1 (date never shows) and a small spacing issue (QA-7). |
| §5 Panel + "הבא בתור" | **Shipped, matches the spec**: grouping, sort, limits, `when`, stakes rule and strip exclusion. |
| Visitor toggle (not in round3.md) | Works. Three UX gaps (QA-8–QA-10). |

## Issues

**QA-1 · P1 · `earnedAt` never reaches the UI.** `applyQuotas()` (app.js:891–894) maps a fixed field list
without `earnedAt`. That makes "הושגה ב־…" on the sport page (app.js:170) and "היא הושגה ב־…" on the athlete page
(app.js:225) dead code in production; only the smoke test sets it on `S.quotas` directly (smoke.test.js:422).
Fix: add `earnedAt: isDate(q.earnedAt) ? q.earnedAt : ""` to the map, and a loader test. Size: XS.
Coordinate with dev/omer/earned-banner, which the test comment says will do this.

**QA-2 · P1 · Stale "מה זה אומר" after a quota is earned.** `stakesLine()` checks only `q.stakes && nxt(q)`, not
the status. An item flipped to `earned` before its listed event ends keeps showing the pre-event stakes. It appears on:
- the sport page (app.js:173);
- `#quotas` "אירועי המכסה הקרובים" (quotas.js:32);
- the today strip, where the filter at app.js:272 doesn't check status either.

The strip is where it hurts most on result night.
§2 says an earned item's stakes are replaced by `✓ מכסה הושגה: {event}`. Fix:
- `stakesLine` returns `""` unless the item is `in-contention` (or `unknown`);
- the strip renders the §2 `won-line` for earned items.
Size: S.

**QA-3 · P2 · §2 home panel "מכסה חדשה לישראל" not built.** Neither `.won` nor the panel exists. It depends on
QA-1. If dev/omer/earned-banner covers it, link that PR to §2. Otherwise it's an S, using the §2 markup as written.

**QA-4 · P2 · §2 strip `won-line` CSS missing.** `.stakes.won-line` isn't in `styles.css`. It's part of the QA-2 fix. Size: XS.

**QA-5 · P3 · Home KPI: "במרוץ" count without `plural()` when earned > 0** (app.js:91). It reads
`<b>1</b> במרוץ למכסה`, while the other two clauses go through the `events()` helper. Fix: use `events()` for
consistency, giving "מקצה אחד במרוץ למכסה". Size: XS.

**QA-6 · P3 · Closest panel: no cap on matched names per item** (app.js:333). A weight class matched by
`weightKey()` and by name can list several athletes. With 3 items that makes a long `<small>` at 400px.
Fix: at most 2 names per item, then `+{n}`. Size: XS.

**QA-7 · P3 · Athlete quota line: the awaiting pill touches the event name** (app.js:229, `</bdi>${AWAIT_PILL}`).
There's no space, so the pills don't wrap as a group. Fix: wrap both pills in `<span class="actions">` as on the
sport page, or add a space. Size: XS.

**QA-8 · P2 · Visitor toggle: the mode is easy to forget.** It persists in localStorage across sessions
(app.js:937–944), but `.visitor-bar` isn't sticky and sits under the nav. After scrolling, an editor can't tell
they're in visitor mode, and can read "nothing to review" as an empty queue. Fix:
- make the bar sticky under the nav (`position:sticky; top:<nav height>`), or move a short label into the nav,
  in place of the hidden admin chip: `<span class="admin-chip">תצוגת גולש/ת</span>`;
- keep the bar's full sentence.

Size: S.

**QA-9 · P2 · Visitor toggle buttons are below the 44px target.** `#visitorBtn` and `#editModeBtn` use
`.btn.small` (4px padding, about 30px tall; styles.css:168). The nav button also adds width to a nav that
already wraps at 400px (heuristics #5). Fix: `min-height:44px` on both, and at ≤640px put `#visitorBtn` in the
second nav row or shorten it to `כגולש/ת`. Size: XS.

**QA-10 · P3 · Visitor bar announcement on every load.** `role="status"` on a bar that is unhidden at load makes
some screen readers announce it on each page load. That is mild, but repetitive for editors who stay in the mode.
Fix: drop `role="status"` (the bar is static text) and keep it as the first focusable region after the skip link.
Size: XS.

## Verified as matching the spec (no action)
- **§1:**
  - `awaitingOf` uses the 14-day cap and the file-date rule, and never applies to `earned`;
  - the pill is `aria-hidden` ◷ + text;
  - the line uses `fmtRange`;
  - sort puts earned, then awaiting;
  - `#quotas` panel `qWaitH`;
  - KPI "מקצה אחד/N מקצים בהמתנה לתוצאות";
  - the strip shows the awaiting line instead of stakes;
  - the athlete line shows awaiting before the status text.
- **§2:** the sport-page foot "המכסה הושגה/המכסות הושגו למדינה…" appears only when no athlete is at stage ≥ 2.
- **§3:** max 3 items in status order; the outside/unknown/earned copy is as reviewed; the "לכל המכסות בענף" link appears once.
- **§5 panel:**
  - `closestGroups` excludes strip items;
  - groups by sport+date+name;
  - date → followed → matched → sport sort;
  - limits 5/3, "ועוד N מקצים";
  - stakes only on single-item groups;
  - `when` copy;
  - omitted on `quotasError`.
- **§5 line:** `nextUpLine` shows only without the strip; prefers entrants; fallback copy never says "מתחרים";
  qualifying pill; CSS tokens.

Not reviewed here: §4 (`#admin`, not shipped) and §6 (verification display, not shipped; `trustChip` is unchanged).
Unrelated, already tracked: the footer still shows the personal address (index.html, D2).
