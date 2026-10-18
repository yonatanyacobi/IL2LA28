# Laetitia Beck – LPGA entries recheck (October–November 2026)

Checked on lpga.com on 18.10 (entries pages; the dates are as printed there):
| Event | Dates | Beck | Entries page |
|---|---|---|---|
| BMW Ladies Championship, Korea | 22–25.10.2026 | Reserve #31 | https://www.lpga.com/tournaments/bmw-lpga-championship/entries |
| Maybank Championship, Kuala Lumpur | 29.10–1.11.2026 | Reserve #29 | https://www.lpga.com/tournaments/maybank-championship/entries |
| TOTO Japan Classic | 5–8.11.2026 | not listed | https://www.lpga.com/tournaments/toto-japan-classic/entries |
| **The ANNIKA, Belleair FL** | **12–15.11.2026** | **Entered** | https://www.lpga.com/tournaments/the-annika-driven-by-gainbridge-at-pelican/entries |

## Checks
- [ ] **20.10 and again 21.10 (late alternates) – BMW Ladies:** open the BMW entries page.
- [ ] **27.10 and again 28.10 (late alternates) – Maybank and TOTO:** open both entries pages.
- [ ] **Each check:** if she's still only "Reserve #", change nothing in the DB. If she's in a field, do all of "When she's in a field" below the same day.
- [ ] **The ANNIKA:** she's already entered. The draft is with the fact-checkers. Tee times come out the day before each round.

## When she's in a field
1. **Competition record**, if there's none for the event. Example: the ANNIKA draft.
   - id: `golf-lpga-<event-slug>-2026`, e.g. `golf-lpga-annika-2026`, `golf-lpga-bmw-ladies-2026`.
   - `sportId`: `golf`.
   - `name`: as LPGA writes it, plus "(LPGA)". `location`: Hebrew city and country.
   - `start`/`end`: the dates on the entries page.
   - `qualifying: true`: LPGA events count toward the Olympic Golf Ranking (IGF: tournaments on tours recognised by the Women's World Golf Rankings; https://www.igfgolf.org/news/2026/06/09/olympic-golf-qualification-process-officially-underway-for-la28-olympic-games).
   - `source`: the entries page.
2. **Sessions** (per `docs/design/sessions-contract.md`):
   - One per round day, id `<competitionId>-<YYYYMMDD>-r<n>`, `athleteIds: ["laetitia-beck"]`, `phase` "סיבוב ראשון" etc., review unchecked.
   - **Only rounds with published tee times get `timeLocal`** (with tz `Asia/Seoul`, `Asia/Kuala_Lumpur` or `America/New_York`), and source = the tee-times page.
   - Later rounds go in **untimed** (`timeLocal ""`, `tz ""`, date only) until their tee times are out. Never guess a time.
   - Rounds 3–4 only after she makes the cut.
3. **Athlete record:** set `next` and `nextDate` on `laetitia-beck`. Home's 14-day list and the digest read only these, not sessions.
   Use `next` = "<event> (LPGA), <city>" and `nextDate` = round 1, with source = the entries page. Send it through `job/athlete_patch.py` (cur.json/new.json) or as an editor edit.
   Example for the ANNIKA: `{"next": "The ANNIKA (LPGA), בלאייר, פלורידה", "nextDate": "2026-11-12", "source": "<entries page>"}`. `athlete_patch.build()` returns next, nextDate, source, updatedAt and updatedBy.
4. **Reserve numbers:** note them in `docs/research/radar-2026-11-yael.md` only if they move into single digits.
