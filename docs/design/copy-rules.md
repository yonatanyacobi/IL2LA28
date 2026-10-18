# Copy rules (Hebrew UI): check yourself before review

Owner: Shira (copy and a11y). This covers every string a visitor can see or hear: `site/*.js`, `index.html`,
`data.json` text the job writes (`history`, `meta/status`, `sessions`), `quotas.json`, the digest, and announcement
texts. It's one page on purpose; the reasoning lives in the PR threads it cites.

## 1. Characters
| Rule | Yes | No |
|---|---|---|
| Maqaf `־` (U+05BE) after a prefix letter before a digit or Latin; plain prefix before a Hebrew word | `ב־14`, `כש־FIG`, `ו־3 ענפים`, `וענף אחד` | `ב-14`, `ב־תחרות` |
| Maqaf in compounds | `קרב־רב`, `בין־לאומי` | `קרב-רב` (Maya's stakes lint rejects it) |
| Geresh `׳` (U+05F3), never `'` | `אוק׳`, `צ׳לנג׳`, `מ׳`, `ג׳ודו` | `אוק'`, `צ'לנג'` |
| Gershayim `״` (U+05F4), never `"` | `ק״ג`, `ארה״ב`, `ק״מ` | `ק"ג` |
| Quotation marks `„…”` | `„מכסה הושגה”` | `"מכסה הושגה"` |
| En dash with spaces for ranges in text; `fmtRange()` for dates | `29 באוק׳ – 31 באוק׳ 2026` | `29-31/10` |
| Scores: a colon, higher score first (an en dash between two numbers flips them in RTL: `78–65` shows as `65–78`) | `ניצחון 78:65 על פולין`, `הפסד 78:65 לפולין` | `ניצחון 78–65` |

The job follows the same rule (`job/SKILL.md`, #85). The export normalises `data.json`, but the DB doesn't.

## 2. Numbers and plurals
- **Every count goes through `plural(n, one, many)`**, including admin-only text: `תוצאה אחת` / `3 תוצאות`, `מקצה אחד`, `נושא פתוח אחד`.
- **Feminine nouns take `אחת`, and `אחד/ת` is never used for a count:** `ספורטאי/ת או נבחרת אחת`.
- **When the number would need agreement in a mixed list, put the label first:** `בהמתנה לתוצאה: 1` (#182).
- **2 has its own words** when it's natural: `בעוד יומיים`, `לפני יומיים`.
- **Counts after 10 may use the singular noun:** `14 יום` is correct.

## 3. Gender-neutral
- **People:** `ספורטאי/ת`, `נבחר/ה`, `את/ה`. Use at most one slash form per clause; if a sentence needs more, rewrite it
  without people ("כל מדינה יכולה לקבל…").
- **Groups:** `ספורטאים ונבחרות` (a team counts as one record). After a negation use `או`: `אין ספורטאים או נבחרות…`.
- **Addressing the reader:** plural imperative (`לחצו`, `נסו שוב`), or `שלך`. Never a masculine singular (`לחץ`).
- **No subjectless gendered plural verbs:** `ממתינים לתוצאות` → `בהמתנה לתוצאות`; `ממתינים לאישורך` → `הצעות לאישורך`.
- **A named athlete** gets her or his own gender (`עלתה לגמר`).

## 4. Say only what we know (near-live.md, #156)
- **Never** `חי`, `בזמן אמת`, `live`, or `לפני X דקות`. Never `עכשיו` on anything that stays on screen after the moment
  passes (a result, a "changed" mark). `מתקיימת עכשיו` / `מתחרה היום` are allowed: they describe the schedule.
- **Every time is absolute and in Israel time:** `עודכן ב־18:40`, `נכון ל־29 באוק׳, 18:40`. Use `whenIL()` (#182) or `hhmm()`.
- **Report what the job saw, not the world:** `התוצאה עוד לא נמצאה במקור הרשמי`, not `לא פורסמה`. `נבדק לאחרונה`
  only uses the session's own `checkedAt`.
- **No promises:** `נבדוק שוב בעדכון היומי הבא`, not `התוצאה תתעדכן`.
- **Never a result without its source**, and never a verdict we wrote ourselves.
- **Never-words** for positions and outcomes: `בטוח`, `כנראה`, `היסטורי`, `עולה`, `בפנים`, `הבטיח/ה`, `מעפיל/ה`,
  `כמעט`, `מכסה בדרך`. No exclamation marks.
- **Ownership:** a quota belongs to the country (`המכסה שייכת למדינה`), never to the athlete.
- **Claims about our own checking match the data:** `{V} מתוך {N} נבדקו ידנית מול המקור`. Never "all" and never
  "official sources" unless that is literally true.
- **Tests:** match banned words whole-word on visible text (`/(^|[\s,.·:])חי($|[\s,.·:])/`), or `שחייה` fails.

## 5. Site terms (one term per concept)
| Concept | Use | Not |
|---|---|---|
| manual verification | `בדיקה ידנית`, `נבדק/ה ידנית` | `אימות ידני`, `אישור ידני`, `בדיקת עובדות` |
| the quota sign-off step (editors only, #admin) | `בדיקת עובדות`: the fact-checker's sign-off on a quota item, a separate process from a record's manual check. Never in public copy. | `בדיקה ידנית` for this step |
| qualification window | `חלון העפלה` | `חלון` alone |
| the Games | `אולימפיאדת לוס אנג׳לס 2028` | `LA28` in public text |
| next competition | `התחרות הבאה` | `התחרות הבאה שלו/ה` |
| rank field | `דירוג או הישג`; place-not-rank is marked `(מיקום, לא דירוג)` | `דירוג נוכחי` |
| runbook link | `מדריך` | `ראנבוק` |
| schedule | `לוח הזמנים` | `לו״ז` |
| an athlete's start in a competition (a `session` in code) | `הופעה` (`הופעה אחת`, `3 הופעות`); a competition's list: `לוח הזמנים של הישראלים` | `סשן`, `לוח הסשנים` |
| what a stage means | one sentence from `STAGE_HELP` (app.js), the same text on the athlete page and in About | a paraphrase written on the page |
| the visitor's own follow | `מעקב`, `במעקב שלך`, `במעקב שלי`, `☆ מעקב אחרי…` (the only meaning of מעקב) | `מעקב` for anything else |
| stage 0 | `לפני חלון ההעפלה` | `במעקב` |
| on the site's list | `ברשימה`: `110 ספורטאים ונבחרות ברשימה`, `3 ברשימה בענף` | `במעקב`, `שבמעקב` |

## 6. Markup that carries meaning
- **`<bdi>`** around any mixed or LTR fragment inside Hebrew: event names (`60- ק״ג`), hosts (`מקור: <bdi>ijf.org</bdi>`), list names.
  In WhatsApp text, put a URL on its own line.
- **`<time datetime="…">`** around every rendered time and date in near-live and log views.
- **Symbols** (`◷ ◐ ✓ ★ ☆ → ←`) go in `<span aria-hidden="true">`, and the words carry the meaning. ★ has
  sr text: `במעקב שלך`.
- **Label-in-name (WCAG 2.5.3):** no `aria-label` that replaces visible text. Add extra context in `<span class="sr">`.
- **One polite announcement per update** (`role="status"`); errors that replace the view use `role="alert"` and an h1.
- **Status is never colour alone**, and every pill has words. New colours need the contrast table (AA 4.5:1, or 3:1 for borders).

## Self-check before opening a PR
1. `grep -nE "[א-ת]-[א-ת0-9]|[א-ת]'|[א-ת]\"[א-ת]|LA28"` on your changed strings; fix anything not in a URL or code.
2. Every `${n}` next to a noun → `plural()`.
3. Read each new string aloud at count 1, at count 2, for a team, and the next day. Is it still true?
