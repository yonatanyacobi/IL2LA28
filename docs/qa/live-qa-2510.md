# Live QA, Sun 25.10.2026 (sprint 7, item 8)

Owner: Gil. The live-browser leftovers from #237 §E–§F, plus the returning-visitor path, on the live artifact
(https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT). Report pass/fail per section on #237; file every fail as an
issue with an owner. P0 = wrong or missing data, a crash, or content that can't be reached by keyboard; P1 = a broken
state or a11y defect with a workaround; P2 = cosmetic.

## 0. Setup

| | |
|---|---|
| When | **24.10 from 22:00** (open the tabs, §5), **25.10 10:00–12:00** (the site-publish freeze ends at 10:00) |
| Data | The 25.10 daily run (07:00–07:13) has published `data.json` with the 24.10 results (`docs/runbooks/result-night-2410.md`) |
| Clock | **25.10 is the first day of winter time (UTC+2).** Every time on the site is Israel time; an export at 05:00Z reads 07:00 |
| Viewer | The **test viewer** (`docs/runbooks/launch-day.md`, "Test viewer"): signed in with the view-only test account, not an editor. The site isn't open to signed-out visitors before launch. Stop if the page shows "מצב עריכה" or edit controls (wrong account), or "האתר לא זמין עבורך כרגע" (the test share is missing): either is a setup fail, not a site fail |
| Sizes | 400×800 and 1280×800, each in light and dark (the OS setting; the page follows `prefers-color-scheme`) |
| Tools | DevTools console (preserve log) and the Network tab filtered to `data.json`; VoiceOver for §2 and §7 |

Before starting, run the automated checks on main so that a live fail isn't something the suite already shows:
`node tests/smoke.test.js` (N/N passed) and `node tests/probe.js <published data.json> site/quotas.json 2026-10-24 2026-10-25`
(0 findings).

## 1. Console (all of §2–§8)
1. Open the console before loading the page, with "Preserve log" on.
2. Visit, in order: `#home`, `#today`, `#day-2026-10-24`, `#c-tri-world-cup-tongyeong-2026`, `#a-shachar-sagiv`,
   `#sport-judo`, `#a-iosif-simin`, `#following`, `#digest`, `#about`.

**Pass:** no errors and no warnings from `app.js`, `sessions.js`, `day.js`, `event.js`, `home.js`, `gamelog.js`,
`standings.js` or `following.js`; every script and `quotas.json` loads with 200. Messages from the claude.ai host
frame don't count; note them once.

## 2. Tab order (400px light, then 1280px dark)
Start from the address bar and press Tab only.

| Page | Expected order |
|---|---|
| `#home` | skip link "דילוג לתוכן" → brand → nav (ראשי, היום, מעקב, ענפים, לוח, עדכונים) → hero links → "היום, {day}" heading link → each row: names, then the competition link → "תוצאות אחרונות" rows and their source links → "השבוע" day links → the rest top to bottom |
| `#day-2026-10-24` | skip link → nav → h1 → prev/next day → day strip → per sport: the sport link, the competition link, rows |
| `#a-shachar-sagiv` | skip link → nav → follow button → facts links → "תוצאות בתחרויות": competition link, source link → history → share |
| `#sport-judo` | skip link → nav → follow button → method → "דירוג מול קו המכסה": per block the list link, then "שיטת ההעפלה", then athlete links in rank order |

**Pass:** the order matches the visual order (right to left, top to bottom); nothing hidden takes focus (the
`.won-compact` line on desktop, `aria-hidden` cut lines, collapsed `<details>` content); Enter on the skip link moves
focus to the main content without changing the URL. After any link, the new page's h1 has focus (VoiceOver reads it).

## 3. Focus ring (both sizes, both themes)
Tab through `#home`, `#sport-judo` and `#a-shachar-sagiv` once more, looking only at the ring.

**Pass:** every focused link and button shows the 3px `--focus` outline, fully visible (not clipped by a panel, the
sticky nav or a horizontally scrolling row such as the nav links or the day strip). In dark, the ring is the light
amber and readable on `.daystrip a[aria-current]` (blue) and on `.pill` rows. Heading links (`.hlink`) underline on
focus.

## 4. Freshness and the stale state
1. At 10:00, `#home` and `#today`: the line under the h1 reads `נכון ל־{time of the 25.10 export} · …`.
2. Compare with `generatedAt` in the Network tab's `data.json` response (converted to UTC+2).

**Pass:** the time matches the export to the minute; the dot is green (`.fresh`, not `.fresh.stale`).
**Stale** appears only on a page showing sessions today when the last check is over 26 h old. On 25.10 that happens
only if the morning run failed. If the line reads `הנתונים לא עודכנו מאז …`, that's a P0 for the daily run (tell the
coordinator), not a site bug. The stale → fresh switch on an auto-refresh is covered by the smoke test "stale line
turns fresh after an auto-refresh on an event day".

## 5. Auto-refresh and "השתנה ב־" marks (the morning after)
The tab must hold the pre-run export, so it is opened the evening before.

1. **24.10, 22:00–23:59:** in one window, open three tabs: `#home`, `#a-shachar-sagiv`, `#day-2026-10-24`. Leave the
   window open. Hidden tabs don't poll; the laptop may sleep.
2. **25.10, 10:00:** bring each tab to the front, one at a time, without reloading.

**Pass, per tab:**
- Within a few seconds the note at the bottom shows `הנתונים עודכנו ב־{HH:MM} · {N} פריטים השתנו בדף הזה` (or
  `פריט אחד`), with HH:MM the export's Israel time, and it hides itself after about 8 s.
- Each changed row carries a `השתנה ב־{HH:MM}` pill on its top edge: on `#home` the new rows under "תוצאות אחרונות";
  on `#a-shachar-sagiv` the result line in "תוצאות בתחרויות" and changed facts; on `#day-2026-10-24` only the rows
  whose result arrived. N equals the number of pills.
- The pills don't overlap text or each other and don't move text (they sit out of the flow), at 400px too.
- The scroll position and the focused element are where they were; an open `<details>` stays open.
- Navigating away and back clears every pill.
- No pill on "השבוע" rows (by design).

If no new export arrives between the evening and the check (the tab already has the 25.10 data), mark §5 "not run" and
repeat it on the next publish. The same flow is covered by the smoke tests "25.10 morning: a result landing by
auto-refresh…" and "changed rows: marked after auto-refresh…".

## 6. Result night: "אתמול" on `#home`
Expected: the 24.10 starts are Sagiv (Tongyeong) and, if they qualified, Dolgopyat and Berkovich (floor final).

1. On `#home` (400px light), find the "השבוע" panel.
2. Open `#day-2026-10-24` and count the rows with `◷ בהמתנה לתוצאה`.

**Pass:**
- Every 24.10 result is published: there is **no** "אתמול" row, and each result is under "תוצאות אחרונות" in a
  `שבת, 24 באוק׳` group with `תוצאה: … · מקור: {host}` and no status pill.
- Some are missing: the "אתמול" row comes first, links to `#day-2026-10-24`, names the competitions, says
  `{n} הופעות ממתינות לתוצאה` (or `הופעה אחת ממתינה לתוצאה`), shows the `◷ בהמתנה לתוצאה` pill, and n equals the
  count on `#day-2026-10-24`.
- A result never appears both under "תוצאות אחרונות" and as awaited.

## 7. Standings (`#sport-judo`, `#sport-taekwondo`, `#sport-fencing`)
Expected from the published data of 18.10 and the cutoffs on main (re-check against the 25.10 export):

| Page | Block | Expected |
|---|---|---|
| `#sport-judo` | 100- ק״ג גברים | `7 יוסיף סימין · 18 באוק׳ 2026`, then the dashed line `קו המכסה: מקום 17` |
| | 70- ק״ג נשים | the line first, then `35 מאיה גושן` |
| | the other 7 classes | no rows and no line; `בדירוג אחר: {name}, מקום {n} ב־IJF World Ranking List` |
| `#sport-taekwondo` | 49-, 57- women, 68- men | `ללא דירוג: …` only |
| `#sport-fencing` | both épée items | only `תקופת הדירוג להעפלה נפתחת ב־1 באפר׳ 2027.` |

**Pass:**
- Each panel sits right after "שיטת ההעפלה", has one h3 per item, ends each block with `הדירוג הסופי נקבע ב־…` and
  the panel with the caveat once.
- 400px: the rank number stays on the row (3.5ch column), the name doesn't wrap under it, the cut line spans the
  row. Dark: the cut line and its text are amber and readable.
- VoiceOver on a row reads the name and `, מעל קו המכסה` or `, מתחת לקו המכסה`; the cut line itself is skipped.
- The list name opens the official ranking page and "שיטת ההעפלה" the qualification system, each in a new tab.
- `#a-iosif-simin` and `#a-maya-goshen` show `מול קו המכסה` with the rank, the line, the list and the date, linking to
  `#sport-judo`. An athlete under "בדירוג אחר" has no such fact.
- No word from standings.md §5 "Never" anywhere in the panel.

## 8. Returning visitor, the morning after (UX audit, with Shira)
Follow `#a-shachar-sagiv` and `#sport-judo` (☆) on 24.10 evening in the §5 window, then on 25.10:
`#home` → "תוצאות אחרונות" → Sagiv's row → `#a-shachar-sagiv` "תוצאות בתחרויות" → `#sport-judo` standings →
`#following`.

**Pass:** each step is one click from the previous; ★ marks the followed athlete on every page; `#following` lists
the new result under "מאז הביקור הקודם" with its source, judo-only rows say `ענף במעקב: ג׳ודו`, and the nav badge
count equals the visible feed rows before opening `#following` and clears after.

## Automated coverage (run before §1)

| Live section | Smoke test |
|---|---|
| §4 stale → fresh | "stale line turns fresh after an auto-refresh on an event day (home and #day)" |
| §5 refresh, focus, scroll, polling | "auto-refresh: re-renders on a new export…", "refresh keeps focus without an id…" |
| §5 marks | "changed rows: marked after auto-refresh…", "game log: two results added to one row…", "25.10 morning…" |
| §6 "אתמול" clears as results land | "25.10 morning: a result landing by auto-refresh leaves 'אתמול'…" |
| §7 rules | "standings UX QA…", "standings (Noa on #266)…" |
| every route | `tests/probe.js` (throws, junk, banned copy, duplicate ids, aria references, links) |

What stays manual: real focus rendering, tab order, the console, VoiceOver, hidden-tab wake-up, and pixel layout.
