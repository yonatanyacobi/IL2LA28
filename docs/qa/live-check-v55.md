# Live check: v55, Tue 20.10.2026 after the 09:17 publish

Owner: Gil. On the live artifact (https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT), right after the coordinator's
publish. Report go/rollback on the release thread within 45 minutes; rollback is "republish the previous build"
(publishing.md). P0 = rollback now; P1 = fix today; P2 = issue.

## 0. Before 09:17
- **The 07:13 daily run happened.** `runs/2026-10-20` exists (ArtifactData get), `meta/status.lastRun` is today, and the
  published `data.json` has today's `generatedAt`. On 19.10 the run didn't fire at all (scheduler: 0 runs). If it
  didn't run, tell the coordinator before the publish: v55 would go out on the 18.10 data, without the 9 Abu Dhabi
  sessions in the DB.
- On the `data.json` that will be live: `node tests/probe.js <data.json> site/quotas.json` (0 findings) and
  `node tests/preview_at.js <data.json> site/quotas.json 2026-10-20` (exit 0), on the SHA being published.

## 1. The publish landed (5 min)
1. Artifact `list` with scope `files`: the 12 scripts in `site/index.html` (app, admin, quotas, digest, corrections,
   **sessions**, day, event, **home**, **gamelog**, **standings**, following), `styles.css`, `quotas.json`, `data.json`.
   Each published file's size equals the file on the published SHA.
2. Artifact `read` of the page: its body equals `site/index.html` on that SHA.

**P0** if any script is missing: `day.js`, `event.js`, `home.js` and `following.js` need `sessions.js`, so the site
won't render.

## 2. Signed-out view
In a private window, not signed in to claude.ai, open the artifact URL.

- **Pass:** the home renders with data.
- **Sign-in screen from claude.ai:** sharing isn't open yet. That's the owner's launch item (launch-day.md, sharing),
  not a v55 regression; note it.
- **"האתר לא זמין עבורך כרגע":** the page loaded but `data.json` didn't (#304). This is the same sharing item.
- **Endless skeleton for over 15 s:** P0. #304's deadline should end it in "הטעינה נמשכת יותר מדי".

## 3. Routes (400×800 light, then 1280×800 dark)
DevTools console open with "Preserve log"; **pass on every route:** no error from the site's scripts, no
`undefined`/`NaN`, no horizontal scroll at 400px, text readable in dark.

| Route | Check |
|---|---|
| `#home` | Hero: h1 + tag, one freshness line `נכון ל־{today's export}`. "היום, יום ג׳, 20 באוק׳"; "השבוע" with day links; no "ישראלים בפעולה ב־14 הימים", no "תחרויות קרובות" |
| `#today` | Same day as home, "היום" in the nav marked current |
| `#day-2026-10-29` | Abu Dhabi day 1: judo rows (from sessions if the run exported them), "תאריך בלבד" once in the heading when no row has a time |
| `#c-judo-gs-abu-dhabi-2026` | 3 days, per-day headings linking to `#day-`, no "השעה תפורסם" |
| `#c-ag-worlds-2026` | Rotterdam: 24.10 floor final for Dolgopyat and Berkovich |
| `#sport-judo` | "דירוג מול קו המכסה": 100- ק״ג with `7 יוסיף סימין` above the dashed line at 17; 70- ק״ג with the line above `35 מאיה גושן`; other classes "בדירוג אחר"; rank column stays put at 400px |
| `#sport-fencing` | Standings: "תקופת הדירוג להעפלה נפתחת ב־1 באפר׳ 2027." only |
| `#a-iosif-simin` | Facts: "דירוג ההעפלה האולימפי" and "מול קו המכסה"; "תוצאות בתחרויות" section |
| `#a-yali-shoshani` | If `data.json` has her 19.10 result: it is in "תוצאות בתחרויות" with its source and not in "היסטוריה". If not: "עוד לא תועדו תוצאות של יהלי שושני בתחרויות." |
| `#following`, `#following-sports` | Follow one athlete and one sport first: the open tab is visibly selected; sport-only feed rows say "ענף במעקב: …" |
| `#quotas`, `#calendar`, `#updates`, `#digest`, `#about`, `#about-trust` | Render; the digest is under 3,500 characters |
| `#nope`, `#a-nope`, `#day-2026-02-30` | "הדף לא נמצא" |

## 4. Regressions found since v52 (each must stay fixed)

| # | Fixed in | Check on the live site |
|---|---|---|
| 1 | #242 | `#following` tabs: the current tab is filled blue, not only `aria-current` |
| 2 | #242 | `#day-` of a past result day with no known competition is titled by the sport, not the athlete's later "next" |
| 3 | #208 | No "השעה תפורסם" anywhere; untimed rows say "תאריך בלבד" |
| 4 | #208 | No plain green "מתקיימת עכשיו" text (`.now`); status is a pill |
| 5 | #246 | Home "השבוע" and closest-chances names link to `#c-` |
| 6 | #272 | No row repeats a competition's name ("…, רוטרדם · …2026") |
| 7 | #237 | Home "היום" heading is a link (`hlink`, underline on focus) |
| 8 | #247 | Home "במעקב שלי" shows a followed sport as a chip, also with no athlete followed |
| 9 | #266 | No "LA28" in visible text on athlete pages |
| 10 | #268 | A result shows in "תוצאות בתחרויות", not twice (log and history) |
| 11 | #281 | "אתמול" count reads "{n} הופעות ממתינות לתוצאה" / "הופעה אחת ממתינה לתוצאה" |
| 12 | #304 | No endless skeleton; a failed load ends in a Hebrew message with "נסו שוב" |

## 5. Auto-refresh (if an export happens while checking)
Keep `#home` open in a background tab. When a new `data.json` is published, bring it to the front: the note
`הנתונים עודכנו ב־HH:MM` appears, changed rows get `השתנה ב־HH:MM`, focus and scroll stay. 20.10 is still summer
time (UTC+3). Otherwise leave this to live-qa-2510.md §5.

## Report
One comment on the release thread: the published SHA, §0–§5 pass/fail, and each fail as an issue with an owner.
