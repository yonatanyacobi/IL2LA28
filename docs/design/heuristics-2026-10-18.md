# Heuristic review — first visit from the launch post (2026-10-18)

Reviewed: `main` @ 62bbd53 (it contains edc5405 / v14 plus test, data and copy merges only), with
`site/*.js` + `styles.css` read at 400px and ~1100px. Data: `tests/fixtures/data.json` and `site/quotas.json`
(99 athletes: 61 at stage 0, 38 at stage 1, none at 2–3; 52 quota items: 25 in contention across 14 sports, 27 unknown).
There was no browser, so layout is judged from CSS.
Severity: 4 = blocks the task, 3 = major, 2 = minor, 1 = cosmetic.

**The 10-second test.** A visitor arriving from the launch post wants three answers:

| Question | Answer today |
|---|---|
| What is this? | **Pass.** The h1, the description line, the "מעקב לא רשמי" tag and the countdown all sit in the first screen. |
| Who is close to a quota? | **Fail.** Home shows counts only ("0 עם מכסה", "25 מקצים במרוץ") and never names anyone. |
| When is the next event? | **Partial.** On days with a running competition the today strip answers it. On other days, at 400px, the first dated item sits below the search box, the follow tip and the KPI panel. |

## Top 10, ranked

| # | Sev | Issue (where) | Fix — one PR each |
|---|---|---|---|
| 1 | 3 | **No names behind "close to a quota."** `viewHome()` has a KPI line and a stage bar; the 25 in-contention items and their athletes (`quotaAthletes()`) are only on sport pages and `#quotas`. | **"הכי קרובים למכסה" panel** right after the today strip. Up to 5 in-contention items with a future `nxt(q)`, nearest event first. Each row: athlete link(s) or `{sport} · <bdi>{event}</bdi>`, `{event name} · {fmtShort}`, `stakesLine(q, "stakes", "small")`. Footer link `<a href="#quotas">לכל תמונת המכסות</a>`. Omitted when empty. Wireframe below. |
| 2 | 3 | **The next event is below the fold at 400px** whenever the strip is empty (most days). Order: hero → search → tip → KPI → "14 ימים" → upcoming. | **"הבא בתור" line in the hero**, under `freshness()`: `הבא בתור: <a href="#sport-{id}">{sport}</a> · {comp name} · {fmtShort(start)}` plus ` · {n} ישראלים במעקב`. Use the first upcoming competition that isn't running, isn't a series (see #3) and has a tracked athlete. Hidden when the strip shows. |
| 3 | 3 | **A season series leads "תחרויות קרובות" as "מתקיימת עכשיו."** `upcoming()` has no length cap, so "סדרת גביעי העולם בהתעמלות אמנותית 2026–2027" (since 1.3.2026) sorts first on home and on `#calendar`. | Reuse `SERIES_DAYS`. Home upcoming list: skip competitions longer than 31 days. Calendar and sport page: keep them, but replace "מתקיימת עכשיו" with `<span class="pill ended">סדרה עונתית</span>` and sort them by end date. |
| 4 | 3 | **The progress panel opens with zeros and jargon.** One line holds four numbers ("…<b>0</b> עם מכסה · <b>{V}</b> מתוך 99 נבדקו ידנית"). The legend lists "מכסה הושגה 0" and "נבחר/ה לנבחרת 0", and Paris 88 sits beside it. It reads as failure, and at 400px the line wraps into three. | Lead with one sentence: `<b>99</b> ספורטאים ונבחרות במעקב, <b>38</b> מהם כבר בחלון ההעפלה. טרם הושגו מכסות.` Then `quotaKpi()`. Hide zero legend items. Move "נבדקו ידנית" to `#about` (the trust block). Keep the Paris line as is. |
| 5 | 2 | **The nav doesn't fit 400px and lacks "מכסות."** Brand plus 5 links (~380px of text and padding in 368px) wraps into a two-row sticky bar (~95px). The `.links` overflow can clip "אודות" with no affordance. `#quotas`, the site's key concept, is reachable only from deep links. | Nav: `ראשי · ענפים · מכסות · לוח · עדכונים`, with "אודות" moving to the footer and the hero tag (`מעקב לא רשמי` → link to `#about`). `.links a{padding-inline:8px}` under 640px. One row at 400px. |
| 6 | 2 | **"מכסה" and "חלון העפלה" aren't explained on home.** A first-time visitor meets both in the KPI line. | One `.foot` line under the KPI: `מכסה = מקום אולימפי שמדינה משיגה בתחרויות ההעפלה. <a href="#about">איך זה עובד</a>`. No tooltip: it is unreliable on touch. |
| 7 | 2 | **Ops messages in "מה התעדכן."** "טעינה ראשונית: 100 ספורטאים…" and "נוספו דירוגים… ל־76 ספורטאים…" are bookkeeping, not news. They take two of the five home rows. | Home shows only changes with an `athleteId` (or a sport prefix), limited to 5. `#updates` keeps everything. Add a `job/SKILL.md` rule: bulk-run summaries go to `runs/`, not `changes`. |
| 8 | 2 | **The "14 ימים" list can run to 17 rows, and rows don't say why they matter.** On desktop this unbalances `grid2`; on mobile it pushes everything down. | Cap at 8 with `ועוד {n} — <a href="#calendar">בלוח התחרויות</a>`. When `nextDate` matches an in-contention item's quota event (sport plus date, the stakes rule), add `<span class="pill q-in-contention"><span aria-hidden="true">◐</span> אירוע מכסה</span>`. |
| 9 | 2 | **The follow tip comes before any content** ("טיפ: לחצו על ☆…") for every first-time visitor, between search and the KPI. | Show the tip only on a return visit (`S.seenBefore` set) with no follows, and place it after the "14 ימים" panel. |
| 10 | 1 | **Every panel has the same visual weight.** Same border, h2 size and padding, so nothing signals "start here." Desktop shows it most (a long flat column). | Give the strip and the #1 panel the existing accent (`.today`, `border-inline-start:4px solid var(--sun)`). Shrink the secondary panels' h2 to 18px (`.panel.minor h2`). No new tokens. |

Suggested order: #3 (bug-like, S), #1, #2, #4, #5, then the rest. #1, #2 and #4 together turn the 10-second test into three passes.

## Wireframe — home at 400px after #1, #2, #4, #5

```
┌──────────────────────────────────────┐
│ הדרך ללוס אנג׳לס                     │
│ ראשי ענפים מכסות לוח עדכונים         │
├──────────────────────────────────────┤
│ הדרך ללוס אנג׳לס 28                  │
│ מעקב אחרי מסלול ההעפלה… [מעקב לא רשמי]│
│ ● הנתונים עודכנו: 18 באוק׳ 14:00      │
│ הבא בתור: ג׳ודו · גרנד סלאם אבו דאבי │  ← #2 (hidden when the strip shows)
│           · 29 באוק׳ · 9 ישראלים      │
│ ┌──────────────┐                     │
│ │ 635 ימים לטקס│                     │
│ └──────────────┘                     │
│ ┃ ישראלים מתחרים היום                 │  ← existing strip (event days)
│ ┃ …                                   │
│ ┃ הכי קרובים למכסה                    │  ← #1
│ ┃ 20 באוק׳ · התעמלות · קבוצתי גברים   │
│ ┃ ┃ מה זה אומר: …                     │
│ ┃ 24 באוק׳ · {שם} · טריאתלון          │
│ ┃ 29 באוק׳ · רז הרשקו · 57- ק״ג       │
│ ┃ לכל תמונת המכסות                    │
│ [ חיפוש ספורטאי/ת, נבחרת או ענף    ] │
│ ┌ 99 ספורטאים ונבחרות במעקב, 38 מהם  ┐│  ← #4
│ │ כבר בחלון ההעפלה. טרם הושגו מכסות. ││
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░                ││
│ │ מכסה = מקום אולימפי… איך זה עובד   ││  ← #6
│ └────────────────────────────────────┘│
```

## Not issues (checked)
- The first screen answers "what is this" in both widths. The countdown and the "unofficial" tag are visible without scrolling.
- The today strip's wording ("לפי הנתונים מ־…, תוצאות יתעדכנו בעדכון היומי") is honest about not being live.
- Skip link, h1 focus on navigation, `aria-hidden` status symbols, and 44px chips are all in place.
