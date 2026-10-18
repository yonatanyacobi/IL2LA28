# Pre-verification of Yael's records outside the 30-record drive (2026-10-18)

The records come from `tests/fixtures/data.json` on main (generatedAt 2026-10-18T11:01Z), so check the live DB for later edits.
Rules follow `docs/product/verification-drive.md`: every visible claim, a primary source, and no open ❓.
The verdict and fixes below are **proposals** for Dana or Tamar to sign off. Nothing is written to the DB.
Water polo is Roni's. Weightlifting, shooting, Sagiv and the drive's team records are inside the 30.
There is no tennis record.

Legend: ✅ checked against an official source · ✏️ fix proposed · ❓ claim could not be verified → cut or reword (rule 3).

## Summary
| Verdict | Records |
|---|---|
| ✅ after the fixes below | yuval-freilich, michaela-moshe, roi-dror, israel-basketball-women, alon-sarid, dov-vilensky, yonatan-cohen, yehonatan-mesika |
| ✏️ with ❓ cuts | daniel-bluman, ashlee-bond, elazar-cuzmiciov, israel-baseball-men, itamar-einhorn, tomer-zaltsman, misha-zilberman, oren-prihed, laetitia-beck, mikhail-iakovlev, rotem-gafinovitz, israel-3x3-men, israel-3x3-women, israel-flag-football-women |

## Per record (field → proposed value)

### Fencing
- **yuval-freilich** ✅ rank 262 matches FIE (4.250 pts). https://fie.org/athletes/24944
  - `name_en` → "Yuval Shalom Freilich" (FIE spelling). Optional; the current "Yuval Freilich" isn't wrong.
  - `notes` ❓ "פעילות 2025–2026 לא ברורה" is an opinion → cut.
- **alon-sarid, dov-vilensky, yonatan-cohen, yehonatan-mesika** ✅ The team, its 4th place and all four English names are confirmed by the OCI (29.7.2026):
  https://www.olympicsil.co.il/en/news-en/fencing-israels-mens-epee-national-team-finished-fourth-at-the-world-championship/
  - Hebrew spellings have no Hebrew source. Keep "איות עברי משוער" in `notes`; it is honest, but Dana decides whether that blocks ✅.
  - `next` → "גביע העולם בדקר, ונקובר" / `nextDate` → 2026-12-03 **only if** the FIE entry list confirms them (https://fie.org/tournaments/2026/129). Otherwise leave it empty.

### Archery (World Archery API, rankings issued 2026-10-12)
- **roi-dror** ✅ rank 22 ✓. `name_en` → "Roy Dror" (World Archery spelling). `rank` → "22 בעולם (World Archery, 12.10.2026)".
  - `notes` ❓ "כנראה באולם – לא אומת" → reword after checking the World Archery Europe result, or cut "כנראה".
  - Source: https://api.worldarchery.sport/v3/ATHLETEBIOGRAPHY/?Id=44855
- **michaela-moshe** ✅ rank 74 ✓. `name_en` → "Mikaella Moshe" (World Archery spelling); confirm with the federation, since it differs from the DB. `rank` → "74 בעולם (World Archery, 12.10.2026)".
  - Source: https://api.worldarchery.sport/v3/ATHLETEBIOGRAPHY/?Id=46668

### Basketball
- **israel-basketball-women** ✅ rank 51 ✓, FIBA World Ranking Women, updated 14.9.2026. https://www.fiba.basketball/en/ranking/women
  - `next` (Israel–Poland, Riga, 11.11) comes from the FIBA schedule, which I didn't open. The checker should confirm it on the FIBA EuroBasket Women 2027 qualifiers page.

### Equestrian
- **daniel-bluman** ✏️
  - `rank` "9 בעולם (Longines FEI, יולי 2026)" conflicts with a secondary report of **6th** in July 2026 (https://tumundoecuestre.com/world-show-jumping-ranking-top-20/?lang=en). Read the FEI ranking page and use the latest month. If FEI can't be read → cut.
  - `source` (World of Showjumping, a HITS article) supports neither the rank nor the Aachen result. Replace it with FEI results for Aachen 2026.
  - `notes` "(עם מארק ודניאל בלומן)" reads garbled. Mark Bluman joined Israel in June 2026 and aimed for Aachen (https://www.worldofshowjumping.com/Scripts/Index.aspx?id=137363), but the team line-up isn't verified. Reword to "ישראל סיימה 9 בסיבוב הראשון של התחרות הקבוצתית ולא זכתה בקווטה" with the FEI results source, or cut.
  - **Possible missing record:** Mark Bluman, as a `proposals` create. Only after FEI confirms he rode for Israel.
- **ashlee-bond** ✏️ `source` (Times of Israel) isn't readable by fetch (Cloudflare). Paris 2024 facts → use the official Paris results (olympics.com) or the FEI. Her 2026 activity, Aachen included, is not verified.

### Beach volleyball
- **elazar-cuzmiciov** ✏️
  - `rank` "17 בעולם (FIVB, ספט׳ 2026)" uses Wikipedia as its source, and the notes themselves say "לא אומת" → cut the rank until it is read on volleyballworld.com.
  - `source` → the FIVB/Volleyball World team page.
  - The 2026 results (Bhubaneswar, Nayarit, Xiamen) need the Volleyball World results pages.

### Baseball
- **israel-baseball-men** ✏️ `rank` 21 (26.3.2026) comes from a secondary site (yagoonara), as the notes say. The WBSC page didn't load (404). The rank is older than 60 days → cut it, or confirm it on wbsc.org. `next` (European Championship 2027) matches the quota item source (worldbaseball.com).

### Cycling
- **itamar-einhorn** ✏️ `rank` 514 and **tomer-zaltsman** ✏️ `rank` 57 both come from ProCyclingStats. That is secondary, and the UCI ranking pages couldn't be read. Cut the ranks or confirm them on the UCI DataRide rankings.
  - Einhorn: "NSN Cycling (WorldTeam) 2026" → confirm on the UCI team page.
- **mikhail-iakovlev** ✏️ `source` is Wikipedia → use the UCI or results pages for the 2024 Worlds keirin silver and the 2025 Euro sprint silver. "זכייה בגרנד פרי בפולין 2026" ❓ → source it or cut it.
  - Note: the Shanghai Worlds (14–18.10.2026) count for the LA28 track ranking; his results are still missing.
- **rotem-gafinovitz** ✏️ `notes` "לא נמצא מידע על 2026" → fine, but the `source` is the Wikipedia Israel-at-2024 page. Use the official Paris results.

### Badminton
- **misha-zilberman** ✏️ `rank` "75 בעולם (BWF, יוני 2026)" is older than 60 days and its source is Wikipedia. bwfbadminton.com blocks fetch → update it from the BWF ranking or cut it.

### Climbing
- **oren-prihed** ✏️ `rank` 57 (IFSC, Oct 2026): the IFSC results API now needs authorisation, so the rank can't be re-verified. A human should check ifsc.results.info. The Hebrew spelling is unverified (no Hebrew source found).

### Golf
- **laetitia-beck** ✏️ The Olympic Golf Ranking position is unverified and the notes say so. Add the IGF ranking if it is readable. The 2026 results (T14 ShopRite, 63) are supported by press (https://wtop.com/news/2026/05/laetitia-beck-has-career-low-63-and-leads-new-mom-estrup-by-1-shot-at-shoprite-lpga/); prefer the LPGA results page.

### Team records with no ranking
- **israel-3x3-men / israel-3x3-women** ✏️
  - "כנראה זכאית... לא אומת" → reword with the official rule: "OQT האוניברסליות פתוח למדינות שלא שיחקו כדורסל 5v5 בשתי האולימפיאדות האחרונות". Source: the BK3 qualification system, https://cdn.nocnsf.nl/media/a3vagxnn/bk3-la28-qualification-system.pdf
  - Women: "ויקיפדיה מציינת 'דירוג 17'" ❓ → cut.
- **israel-flag-football-women** ✏️ `source` (americanfootballinternational) is press. "לא השתתפה באליפות העולם 2026" → verify on the IFAF results page.

## Could not reach (for the human checker)
FEI rankings, Volleyball World rankings, BWF, UCI DataRide, IFSC (now auth-only), WBSC and Times of Israel all returned 403/404 or a bot-check to automated fetch.
