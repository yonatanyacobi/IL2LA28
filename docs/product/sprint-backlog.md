# Sprint backlog: stage 5 "quota story" MVP (2026-10-18, 13:15–15:15)

**Goal:** before the first quota events (shooting Worlds from 1 Nov, surfing ISA from 6 Nov), a visitor can see on
any sport page how many LA28 quotas exist, how they're allocated, and where Israel stands. On a competition day,
the home page also shows who is competing today. Nothing ships that states a quota fact without a source.

Sizes: S ≤ 30 min, M ≤ 1 h, L > 1 h (split it before starting). One PR per story; the lead reviews every PR.

## Decisions for this sprint
- `site/quotas.json` is curated by hand by the product team (Roni/Yael research, Dana fact-checks) and published
  alongside the site files. The daily job never writes it.
- File wrapper: `{"updatedAt": "YYYY-MM-DD", "items": [<agreed item schema>]}`. The page shows "נכון ל־<date>"
  because nothing refreshes this file automatically.
- `israelStatus: "earned"` requires an official IF/NOC/IOC source and must match an athlete at stage ≥ 2 in
  data.json. Dana blocks any item that doesn't.
- Status labels (Shira owns the final copy): earned "מכסה הושגה", in-contention "במאבק על מכסה",
  outside "מחוץ לתמונה כרגע", unknown "אין עדיין מידע".

## P0: the MVP

### 1. Load and validate quotas.json (Maya, S–M)
As a visitor, I see quota data when it exists, and the site works the same when it doesn't.
- quotas.json is fetched in parallel with data.json (`cache: "no-cache"`). If it's missing, malformed or fails to
  load, only the quota sections are hidden: no error banner, and the rest of the site is unchanged.
- Per item, the page drops any item with an unknown `sportId`, a status outside the 4 values, a non-https `source`, or a
  `nextQuotaEvent.start` that isn't YYYY-MM-DD. Counts are ints or null.
- `tests/validate_data.py` (PR #1) gets a `quotas` mode with the same rules plus a cross-check:
  "earned" ⇒ some athlete in that sport has stage ≥ 2.
- Add a `tests/fixtures/quotas.json` with all 4 statuses and one invalid item, and cover it in the smoke tests.

### 2. Quota section on the sport page (Noa, M)
As a fan of a sport, I see what's at stake and where Israel stands.
- A "מכסות ל־LA28" section on `#sport-<id>`, one row per event: event, total quotas, max per NOC, allocation
  text, status pill, Israel note, next quota event with its date, and a source link via `linkOut()`.
- `null` counts show "טרם פורסם", never 0 or blank.
- The status pill uses text and color (CSS tokens only) and works in light and dark themes at 400px.
- If a sport has no items, the section doesn't render. A "נכון ל־<updatedAt>" footnote is shown.
- Every string goes through `esc()`, and the smoke test covers an item with HTML in `israelNote`.

### 3. Quota overview page `#quotas` (Itai, M)
As a visitor, I get the national picture in one screen.
- A summary line, e.g. "X מכסות הושגו · Y אירועים במאבק · Z לא ידוע", then rows grouped by status
  (earned → in-contention → outside → unknown), each linking to `#sport-<id>`.
- A "מכסות הקרובות" list of the next 5 `nextQuotaEvent` items on or after today (Israel time).
- Linked from the home progress panel and the sports index, not from the nav (no room at 400px).
  `#quotas` deep links work.

### 4. "Israelis competing today" strip (Omer, M)
As a visitor on a competition day, I see who is competing right now.
- The strip shows at the top of home when there are any athletes with `nextDate == today()`, or with `nextDate` inside a
  competition in their sport where `start ≤ today ≤ end`. It's hidden otherwise, never as an empty box.
- Each entry shows the name (linking to `#a-<id>`), sport, event and competition, ordered by sport.
- The label says it's not live: "לפי הנתונים מ־<generatedAt>, תוצאות יתעדכנו בעדכון היומי".
- Smoke tests with a fixed `today()` cover both a hit inside a multi-day competition and an empty day.
  This must be in by 25 Oct (end of gymnastics Worlds) and 29 Oct (Abu Dhabi Grand Slam).

### 5. First quota data batch (Product: Roni, Yael; fact-check Dana, not a dev story)
- The sports with quota events before the end of 2026 go first (shooting, surfing, artistic gymnastics, judo), then the
  remaining sports with open windows.
- Every item has an official source (an IF qualification-system PDF or page). Dana signs off each item in the PR body.
- Hand it to the lead as a PR on `dev/pm/quotas-data`. It passes the story 1 validator.

### 6. Launch blockers from QA (Gil) and audit (Dana) (Shira + Omer, reserved capacity)
- Triage rule: a wrong public fact, a broken view at 400px or in either theme, an escaping or link-safety bug, or a dead
  route is P0 and is fixed this sprint. Everything else goes to the next sprint.
- A wrong fact in an athlete record is fixed in the DB by an editor. It's not a code change.

## P1
### 7. Quota copy and explainer (Shira, S)
- The final Hebrew labels for statuses and section headings.
- An "איך עובדות מכסות" paragraph on `#about`: most quotas belong to the country, not the athlete, and an "earned"
  quota is not the same as selection.

### 8. Quota checks in `#admin` (Itai, S)
- Flag quotas.json more than 14 days old, items whose `nextQuotaEvent.start` is in the past, and an
  "earned" item with no stage ≥ 2 athlete.

### 9. Daily job: flag quota events that ended (Maya, S)
- The job never writes quotas.json. When a competition with `qualifying: true` ended in the last 4 days, it adds a
  warning to `runs/<today>` ("לעדכן quotas.json: <sport>"), which `#admin` already shows. Sync the live job copy.

## P2: lead's open follow-ups
These are taken from the commit history and the working tree. There's no written list in the repo.
- Merge PRs #1 (export tests, validator) and #2 (copy/a11y) first. Stories 1 and 7 build on them.
- After #1 lands, sync `job/` to `~/.claude/scheduled-tasks/la28-israel-daily-update/` so the validation step
  actually gates publishing.
- Untracked `tests/smoke_shim_draft.js`: fold it into `tests/smoke.test.js` or delete it.
- Remove the merged worktrees and branches (itai/editor-dashboard, noa/manual-verification, omer/smoke-tests-ci).
  noa's branch lacks fixup 4f44a4b, so don't reuse it.
- `CONTACT_EMAIL` is a personal Gmail shown publicly. The owner should confirm this, or use a dedicated address before launch.
