# Sprint 6 UX specs (S1–S5)

Status: accepted by the coordinator, 18.10.2026 · Owner: UX · From a 400px read of `main` @ c02a71a (v52).
Each item is one PR. Copy follows copy-rules.md; markup follows components.md. Line numbers drift, so functions are named.

| # | Spec | Owner | Starts after |
|---|---|---|---|
| S1 | "מעקב" means only the personal follow | Shira | #208 |
| S2 | Following a sport is consistent | Maya | #228, #234 |
| S3 | Every competition mention links to `#c-` | Noa | #238 |
| S4 | One "השבוע" panel on home | — | sprint 7, after #237 is live |
| S5 | One empty-state pattern | Omer | now |

## S1. "מעקב" means only the personal follow
**Problem.** One word, three meanings: stage 0 (`STAGES[0]`, a pill on every card), the site's own list ("110 ספורטאים
ונבחרות במעקב", "היום בענפים שבמעקב") and the visitor's follow ("★ במעקב שלך"). A card can show both.

**Change** (terms: copy-rules §5):
- `STAGES[0]` → `לפני חלון ההעפלה`; same in the About stage list.
- Site-list counts → `ברשימה`: home KPI, `#sports` and `#following-sports` card meta (`N ברשימה`), "{n} ברשימה בענף"
  (home, `#c-`), the search count, `#day`/digest "בענפים שבמעקב" → "בענפים שברשימה".
- Untouched: personal-follow copy, and history text already stored ("נכנס/ה למעקב").

**Done when** `grep -n במעקב site/*.js` returns only personal-follow copy, and the smoke assertions pinning old copy are
updated.

## S2. Following a sport is consistent
**Problem.** `followedAthletes()` includes athletes of followed sports, so they drive the nav badge and the
"מאז הביקור הקודם" feed, yet they have no star, aren't in the `#following` athletes tab or home "במעקב שלי", and the home
tip names only athletes. The badge can say 3 while nothing on screen looks followed.

**Change:**
- A feed row that comes only from a sport follow gets `<small>ענף במעקב: {sport}</small>`.
- Home "במעקב שלי" shows followed sports as a `.chips` row (links to `#sport-`) above the cards; the panel shows when
  either list is non-empty.
- Tip: "לחצו על ☆ בדף של ספורטאי/ת, נבחרת או ענף…".
- ★ stays for direct athlete follows only.

**Done when**, with only a sport followed, the badge count equals the visible feed rows, each labelled
"ענף במעקב", and the sport shows on home.

## S3. Every competition mention links to `#c-`
**Problem.** Some lists use `compLink`, others print the name: `followUpcoming()` (competition rows link the sport
only), `closestPanel()` group names, and home "ישראלים בפעולה ב־14 הימים" (`a.next`). Home → competition and
following → competition dead-end.

**Change:** wrap them in `compLink(compOn(sportId, date), …)`; athlete rows reuse `nextCompFact(a)`. Inside a whole-card
link (`#sports` card, `athleteCard`) stays plain: no nested links.

**Done when** a smoke test finds every competition name on home and `#following` that `compOn` resolves inside an
`a[href^="#c-"]`.

## S4. One "השבוע" panel on home (sprint 7)
**Problem.** At 400px home stacks four to five "what's next" lists (hero/`homeNow`, "ההזדמנויות הקרובות למכסה",
"ישראלים בפעולה ב־14 הימים" with up to 17 rows, "תחרויות קרובות"), all answering what `#day` now answers.

**Change:** replace the 14-day list and "תחרויות קרובות" with "השבוע": 7 rows, `{weekday d} · {n} ישראלים`, each to
`#day-<d>` (`hasIsraelis`, the daystrip `.has` dot); days without Israelis are left out; foot link "ללוח התחרויות".

**Done when** home at 400px has at most one schedule panel after `homeNow`, and every row links to a `#day-`.

## S5. One empty-state pattern
**Problem.** "אין תחרויות קרובות במאגר." (home, sport, athlete; "במאגר" is jargon), `.empty` boxes and `p.muted`
lines used interchangeably, and only `#day` offers a way on.

**Change:** one helper, `emptyLine(text, href, label)`, rendering components §9 (`<p class="muted">` for a section,
`div.empty` stays for whole pages). Every empty list says what is known plus one way on:
| Where | Copy | Way on |
|---|---|---|
| sport / athlete "תחרויות קרובות" | `אין תחרויות קרובות ידועות בענף.` | `לוח התחרויות` → `#calendar-<sport>` |
| home "תחרויות קרובות" | `אין תחרויות קרובות ידועות.` | `לוח התחרויות` → `#calendar` |
| home 14 days | as today | `ליום התחרויות הבא: {date}` → next `#day` with Israelis |
| athlete history | `עוד אין אירועים מתועדים.` | none |

**Done when** `במאגר` appears nowhere in `site/`, and each row of the table renders its link in a smoke test.
