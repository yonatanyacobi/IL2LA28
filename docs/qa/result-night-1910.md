# QA plan: result night 19.10 (Rotterdam Worlds, women's qualifications)

**Sessions in `data.json`:**
- Yali Shoshani: 17:00 Israel time (subdivision 7).
- Lihie Raz and Roni Shamay: 22:10 Israel time (subdivision 10).

**Results** come from the job/editor:
- the session's `result`, `resultSource` (https) and `resultAt` (UTC);
- a `result` history entry per athlete;
- a line in `changes`.

**Run:** after the publish that carries the results, signed out (visitor view), at 400px light and 1280px dark.
**Baseline:** v44 (checked 18.10 against the published files). Before the results, #day-2026-10-19 shows 17:00 Shoshani and 22:10 Raz + Shamay. The status pill reads "לפני התחרות", then "מתחרה היום" from the start until +3 h, then "◷ בהמתנה לתוצאה".

## 1. Before publishing (data)
- Each result names only that Israeli's outcome (no field results). It is at most 120 characters, uses the geresh ׳ and maqaf ־, and has no dotted dates.
- `resultSource` is the official FIG results page (https). `resultAt` is ISO with Z. Without both, the page hides the result.
- On the Raz/Shamay shared session, each athlete gets her own history `result` entry. The session `result` should name both, e.g. "ליהיא רז: … · רוני שמאי: …".

## 2. `#day-2026-10-19`
- Each session row shows "תוצאה: {text} · עודכן ב־{HH:MM} · מקור" and **no** status pill. HH:MM is `resultAt` in Israel time.
- The source link opens the FIG page in a new tab.
- The order is unchanged: 17:00 first, then 22:10.
- The "נכון ל־… · מתעדכן פעם ביום" note shows the new publish time.
- `#day-2026-10-20`: a session without a result yet still shows "◷ בהמתנה לתוצאה".

## 3. Athlete pages (`#a-yali-shoshani`, `#a-lihie-raz`, `#a-roni-shamay`)
- "היסטוריה": the new result entry is at the top, dated 19 באוק׳ 2026, with its source link.
- "התחרות הבאה" has moved on, or is absent. It must not still say 19.10.
- "עודכן" shows the new date. Stage is unchanged: a stage change goes through proposals and sign-off, not the job.
- The quota line on these pages still shows the individual item's status. The team-final quota (20.10) is not decided on this night.

## 4. Competition page (`#c-ag-worlds-2026`; #167, only once `event.js` is published, since v44 doesn't have it)
- On day 3 (19.10), each session shows its result.
- "בקצרה" counts the new results.
- In "הישראלים בתחרות", the three athletes show no status pill. Their result appears in the schedule, by design.
- Raz and Shamay don't show each other's result.

## 5. `#following` (follow the three athletes first; visit `#following` **before** the publish)
- After the publish, the nav badge counts the new entries. Screen readers get ", N עדכונים חדשים".
- "מאז הביקור הקודם" lists each result with date and source, newest first.
- Opening `#following` clears the badge, and it stays cleared after a reload.

## 6. "מה התעדכן"
- **Home** (5 latest) and **`#updates`**: one line per result, linking to the athlete page.
- **`#digest`:** "תוצאות השבוע" lists Rotterdam (once it has ended) with the athletes and their result lines. The text is at most 3,500 characters, and no line starts LTR.

## 7. Open page and regression
- A tab left open on `#day-2026-10-19` picks up the publish within 5 minutes. It shows "הנתונים עודכנו ב־{HH:MM}" and keeps focus and scroll position.
- No overflow at 400px or 1280px. No console errors. The words "בזמן אמת" and "live" appear nowhere.
- Home today strip on 20.10: the gymnastics row shows "יום 4 מתוך 9", and the team-final stakes line until 20.10 ends.

**Report:** pass/fail per section to the coordinator. Any wrong result goes to the corrections log (`#corrections`) after launch.
