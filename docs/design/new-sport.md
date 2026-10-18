# Adding a new sport — tennis as the example (from Yael's #74)

Status: ready for review · Owner: UX (for PM) · Due 25.10 · Base: `main` @ 90591a1
Covers three things: the flow for adding any sport, an honest "far from qualifying" state, and the tennis page.
Existing tokens only. Works at 400px, in light and dark.

## 0. The honesty problem to solve first
Today a sport is either "with Israelis tracked" (a card on `#sports`) or "without" (a chip). Tennis fits
neither. There are Israeli players worth following (Vales 589, Glushko 528), but nobody is near the 56
direct places or even the top-500 floor for ITF places. Two current rules would mislead:
- `#about` defines stage 0 "במעקב" as "סיכוי ריאלי". Adding Vales at stage 0 would claim that.
- The sports index sorts by the next competition. A far sport with a dated event would sit among the real contenders.

Decision (UX): **far is a sport-level state derived from quota data, not a new stage.** Athletes stay at
stage 0, and the About wording changes (§4).

## 1. "Far from qualifying" — the derived state

```js
// null when there's no quota data, or nothing is known yet.
function sportOutlook(sid){
  const st = quotasOf(sid).map(q => q.israelStatus);
  if (!st.length) return null;
  if (st.includes("earned")) return "earned";
  if (st.includes("in-contention")) return "contention";
  return st.includes("outside") ? "far" : null;   // `unknown` items don't block "far"
}
```
Visitors see only `far`; `earned` and `contention` are already shown by the quota summary.

| Where | Render when `far` |
|---|---|
| `#sport-<id>` header | after the h1: `<span class="pill q-outside"><span aria-hidden="true">○</span> רחוק מהעפלה כרגע</span>` |
| `#sports` card | the same pill in `.top`, in place of the window pill. The window pill moves into `.meta`. |
| `#sports` order | within the cards, `far` sports go last, after sorting by next competition. Contenders stay on top. |
| Home | no change: the KPIs count only earned and in-contention items. |

Copy rules: "רחוק מהעפלה כרגע", "הפער", "מה צריך לקרות". Never use "אין סיכוי", "חסר סיכוי" or "נכשל".
Every number carries its date ("נכון ל־").

### Optional quota field `gap` (any sport, introduced here)
```json
"gap": {"now": "589 בדירוג ATP", "need": "בערך מקום 56 לכניסה ישירה, או טופ 500 למקומות ITF", "asOf": "2026-09-30"}
```
- **Validation:** `now` and `need` are strings ≤ 80 chars; `asOf` passes `isDate`. Otherwise the whole `gap` is dropped and the item is kept.
- **Render:** a `q-meta` line on the quota row, sport page and `#quotas`:
  `המצב: {now} · נדרש: {need} · נכון ל־{fmt(asOf)}`.
- **Text, not a bar:** rank scales are non-linear and cut-offs approximate, so a bar would overstate precision.

## 2. Tennis sport page at 400px

The order changes **only for `far` sports**: "איפה ישראל עומדת" comes first. Otherwise the page is unchanged.

```
┌──────────────────────────────────────┐
│                        כל הענפים →   │
│ טניס       [○ רחוק מהעפלה כרגע]      │
│ ┌ איפה ישראל עומדת ─────────────────┐│
│ │ כרגע אין ישראלי/ת בטווח ההעפלה     ││
│ │ בטניס.                            ││
│ │ יחידים גברים                       ││
│ │ המצב: 589 בדירוג ATP · נדרש: בערך  ││
│ │ מקום 56, או טופ 500 · נכון ל־ספט׳  ││
│ │ יחידים נשים                        ││
│ │ המצב: 528 בדירוג WTA · נדרש: …     ││
│ │ ┃ תנאי סף: שני זימונים לנבחרת בדייוויס││
│ │ ┃ או בבילי ג׳ין קינג, אחד ב־2027–28. ││
│ │ ┃ נבחרת הנשים לא השתתפה ב־2026.     ││
│ └────────────────────────────────────┘│
│ ┌ שיטת ההעפלה ──── [חלון העפלה טרם נפתח]┐
│ │ 14 ביוני 2027 – 12 ביוני 2028       ││
│ │ דירוגי ATP/WTA ב־12.6.2028: 56 …    ││
│ └────────────────────────────────────┘│
│ ספורטאים ונבחרות (2)                  │
│ [עמית וולס · יחידים · במעקב]          │
│ [לינה גלושקו · יחידים · במעקב]        │
│ תחרויות קרובות בענף                   │
│ אין תחרויות מתוזמנות במאגר. הצפוי:    │
│ פלייאוף דייוויס, פבר׳ 2027 (טרם נקבע) │
└──────────────────────────────────────┘
```

**"איפה ישראל עומדת"**: `section.panel` with `aria-labelledby`. Only for `far` sports.
1. Lead line: `כרגע אין ישראלי/ת בטווח ההעפלה ב{s.he}.`
2. One `.qlist` row per `outside` item, using the quota row markup with `gap`. `unknown` items are omitted
   here and still appear in the quota section below.
3. A `.stakes`-styled block for the sport's eligibility condition. It comes from a new optional sport field
   `s.eligibility` (one Hebrew sentence, ≤ 200 chars) and is rendered as
   `<p class="stakes"><b>תנאי סף:</b> {eligibility}</p>`.

**Quota section**: on `far` sports it is folded into the panel above, so the page doesn't repeat it. `#quotas`
still lists the tennis items under "מחוץ למכסות כרגע".

**Upcoming competitions, empty state**: a new optional sport field `expected: [{when: "2027-02", text, source}]`
covers events without a date yet (`when` is `YYYY-MM` or `YYYY`). The empty state becomes
`אין תחרויות מתוזמנות במאגר. הצפוי: {text}, {month-year} (טרם נקבע תאריך).` It shows only the first future
item. It never enters the calendar or the today strip, which need real dates.

**Window rendering fix (any sport)**: `fmt(w.from)` of `null` currently prints ` – …`. Rule:
- `from` and `to` both dates → `fmtRange`.
- Only `to` → `עד {fmt(to)}`.
- Only `from` → `מ־{fmt(from)}, מועד סיום טרם פורסם`.
- Neither → omit the line.

## 3. Flow: adding a sport, end to end

| # | Step | Who | Output | Gate |
|---|---|---|---|---|
| 1 | Research: qualification system, Israeli candidates, key dates | researcher (Yael) | `docs/research/<date>-<sport>.md` PR | lead review |
| 2 | Verify every number on an official source (ATP/WTA, IF) | fact-checker (Dana) | `review` on each item | unverified numbers never publish |
| 3 | Quota items, with `gap`, in `data/quotas/quotas.json` → `build_quotas.py` | curator | `site/quotas.json` PR | `review.status` ok/fixed |
| 4 | Sport doc `sports/<id>`: `he`, `en`, `window`, `eligibility`, `expected`, `addedAt` | editor (DB, by hand) | live DB | the daily job never creates sports |
| 5 | Athletes as `proposals` (kind `create`) | researcher or job | review queue | editor approves each |
| 6 | Announcement: `changes` entry `ענף חדש במעקב: {he}`, `sportId` | editor, on approving step 5 | home "מה התעדכן" | — |
| 7 | Smoke check at 400px plus dark mode on `#sport-<id>` | QA | QA note | — |

Order matters. Steps 2–3 before 4–5 mean a new sport never shows up with athletes but no honest context.
- **Before step 3:** if a sport needs to go live earlier, it shows the existing "עוד לא נאספו פרטים" texts, and no "far" claim is made.
- **Tennis:** Yael's rankings are marked unverified (ATP/ITF blocked access), so tennis waits at step 2.

**New-sport badge**: a sport with `addedAt` within 14 days gets `<span class="new">חדש</span>` on its `#sports` card.
**`changeRow()`**: when an entry has `sportId` and no `athleteId`, link to `#sport-<id>`. That is a one-line change.

## 4. Data and copy changes

| Item | Change |
|---|---|
| `sports/<id>` | New optional fields: `eligibility` (string ≤ 200), `expected` (array ≤ 3 of `{when, text ≤ 80, source}`), `addedAt` (date). All validated in `applySnapshot`; invalid fields are dropped, the sport is kept. |
| Quota items | Optional `gap` (§1). Passed through by `build_quotas.py`. |
| `changes` | Optional `sportId` (§3). |
| `job/SKILL.md` | "Never create `sports/` docs; propose them in the run log." |
| `#about`, stage 0 | `במעקב: ספורטאי/ת או נבחרת מישראל שאנחנו עוקבים אחריהם בדרך, גם כשהם עדיין רחוקים מהעפלה.` Then: `בענפים שבהם אף מתמודד/ת לא בטווח ההעפלה, דף הענף מסומן „רחוק מהעפלה כרגע”.` |
| Tennis athletes | Yael recommends adding only Vales and Glushko, and I agree. Glushko is marked inactive on the WTA site, so her `notes` must open with that fact. |

## 5. A11y, theme, tests
- **A11y:** the pill symbol is `aria-hidden`; the panel uses `aria-labelledby`; heading order stays h1 → h2.
- **CSS:** none new. The pills use `.pill.q-outside` and the block uses `.stakes`; both already work in both themes.
- **Tests:**
  - `sportOutlook()`:
    - outside + unknown → `far`;
    - unknown only → `null`;
    - one in-contention → `contention`.
  - A `far` sport renders the panel first and no quota section; its `#sports` card has the pill and sorts after a contending sport with a later competition.
  - Invalid `gap`, `eligibility` or `expected` → the field is dropped and the rest still renders.
  - Window rule: the `from: null` case prints `עד …`, not ` – …`.
  - A `changes` entry with `sportId` links to `#sport-<id>`.

## Open for PM
- Confirm the stage-0 wording change in `#about`. It affects all sports, not only tennis.
- Confirm that a sport may be published before any quota data (it then shows no "far" state).
