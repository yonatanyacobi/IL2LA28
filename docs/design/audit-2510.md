# UX audit, Sun 25.10: a returning visitor the morning after a result night

Owner: UX. Live site, signed out, **25.10, 10:00–12:00**, the same window as Gil's live QA (sprint 7 item 8). The two
don't overlap:
- **Gil checks that each piece works:** his pass/fail list is the "new home" checklist on #237 (§E result night and
  auto-refresh, §F dark and a11y).
- **This audit checks whether a reader can get answers:** tasks, time to answer, and where they got stuck.

Both use the same setup, the same viewport (400×800, light then dark) and the same reporting thread.

## Setup (the evening before is part of the script)
| When | Step | Who |
|---|---|---|
| 23.10 evening | In a fresh browser profile (the "returning" one), open the site and follow: **Lihie Raz**, **Shachar Sagiv**, and the sport **ג׳ודו**. Open `#following` once. This sets the baselines (`la28.seen`, `la28.followingSeen`) | UX |
| 24.10 | Don't open the site in that profile. The result day (Tongyeong 04:30; the floor final 15:00 if there was a Q) and the 25.10 07:13 run happen | – |
| 25.10, 09:50 | Gil and UX: same profile type, signed out, 400×800. Note `generatedAt` from `#about` (the "נכון ל־" time) | Gil, UX |
| 25.10, 10:00 | Open a second tab on home and leave it open for the whole session (for task T6) | UX |

If 24.10 has no publishable result (no Official list yet, or no Q), run the script anyway: T1–T2 then test the
"waiting" states, which is just as useful.

## Tasks
Read each task as a question and time it from page load to the first correct answer. Over the target counts as a
finding. "Got stuck" means a wrong tap or a scroll back up.

| # | Question (as a returning reader) | Start | Target | Correct answer looks like |
|---|---|---|---|---|
| T1 | "What happened since I was last here?" | home, top | 10 s, no more than 1 scroll | "תוצאות אחרונות" with the 24.10 rows (Sagiv, and the floor final if any), each with "מקור"; or a clear "nothing yet" |
| T2 | "How did Sagiv do, and where is that from?" | T1's row | 20 s | `#a-shachar-sagiv`: "תוצאות בתחרויות" has the result with the competition link and "מקור: <bdi>triathlon.org</bdi>"; "היסטוריה" doesn't repeat it |
| T3 | "Is Raz Hershko inside the quota places?" | home → search "הרשקו" | 30 s | athlete page "מול קו המכסה: מקום N · הקו: מקום M" → sport page "דירוג מול קו המכסה" with the cut line; a stale rank reads "דירוג מ־{date}" |
| T4 | "What does that cut line mean for her?" | T3's standings panel | 20 s, without leaving the panel | the reader can say it in their own words (above/below, list name, date); "ללא דירוג" is understood as "no official rank", not "bad" |
| T5 | "What's new for the people I follow?" | nav "מעקב" (with the badge) | 15 s | the badge count = the "מאז הביקור הקודם" rows; Raz's 19.10 result and Sagiv's 24.10 result are there; judo rows are labelled "ענף במעקב: ג׳ודו"; "הבא בתור במעקב שלי" shows Abu Dhabi 29.10 |
| T6 | "Did anything change while I was reading?" | the tab open since 10:00 | – | if a publish happens in the window: "השתנה ב־HH:MM" on the changed rows and one note at the top; otherwise note "no publish" (Gil checks the mechanics) |
| T7 | "Is this live? Can I trust it?" | any page | 15 s | the reader finds "נכון ל־… · מתעדכן פעם ביום" and "איך אנחנו בודקים", and doesn't think the results are live |

## Look for (things the earlier audits couldn't check without a browser)
- The first screen at 400px on a "results, no sessions today" Sunday: does "תוצאות אחרונות" start above the fold?
- Tapping: a 44px target on every row link; nothing under the sticky nav after jumping to a `#c-` day.
- Dark: the cut line, `pill ended` and `.res` text are readable.
- Copy drift: "סשן", "השעה תפורסם", "במעקב" for anything other than the visitor's follow, "חי" or "live".

## Reporting
- Before 13:00 on 25.10, the "Findings" table below is filled in and linked on #238. Gil's pass/fail goes on #237.
- Each finding has a severity (4 = blocks the task, 3 = major, 2 = minor, 1 = cosmetic) and, for 2 and above, a
  fix small enough to be one PR, as in sprint6-ux-specs.md.
- The PM takes 3s and 4s into sprint 7 and the rest into the next backlog.

## Findings (25.10)
| # | Task | Sev | What happened | Fix (one PR) |
|---|---|---|---|---|
| | | | | |
