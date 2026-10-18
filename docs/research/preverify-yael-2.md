# Pre-verification, batch 2 – Yael's unverified records (sprint 4)

Scope: every record in my sports without `verifiedAt` after B1–B4: 25 athletes/teams.
Richter and the women's basketball team are already marked; water polo is Roni's.
This builds on `docs/research/preverify-yael.md` (merged) and adds what was confirmed since: fencing Hebrew names, archery ranks, tennis, Tashtchiev and Gold.
Rules: `docs/product/verification-drive.md`. Each record has a verdict, final values (field ← value) and one **source** line.
Nothing is written to the DB; Tamar signs off.

✅ = can be marked as is, or after the listed edits · ✏️ = an edit or cut is needed before marking (rule 3)

## Shooting
- **olga-tashtchiev** ✅ after edits. rank ← "22 בעולם ברובה אוויר 10 מ׳ (ISSF, 1.10.2026)"; rankNum 22, rankList "ISSF World Ranking", rankAsOf 2026-10-01; next ← "אליפות העולם בקליעה, דוחא – רובה אוויר 10 מ׳", nextDate ← 2026-11-03. The name stays a transliteration that `notes` flags (D5, Dana).
  Source: https://www.issf-sports.org/competitions/worldranking/ARW · entry list https://backoffice.issf-sports.org/getfile.aspx?mod=docf&pane=1&inst=783&iist=366&file=WCH-RPSH-Doha-2026-Entry-List-by-NOC-03.10.2026.pdf

## Weightlifting
- **celia-gold** ✏️ (the B4 blocker)
  - **Cut** the "ארד בדו-קרב (230 ק״ג) באליפות אירופה 2025" sentence (rule 3). The only source is Wikipedia, and the 76 kg podium totals reported elsewhere (226, 231) don't fit a 230 bronze. EWF and IWF return 403.
  - notes ← "מחזיקת שיאי ישראל ב-71 ק״ג. לא נמצאו תוצאות 2026".
  - **Lead, not for publishing:** Weightlifting House lists her in **W77** at the Batumi European Championships (23.4.2026). That points to 77 kg as her Olympic category, but it's a secondary source.
  Source: records https://en.wikipedia.org/wiki/List_of_Israeli_records_in_Olympic_weightlifting (secondary; IWF blocked) · lead https://row.weightliftinghouse.com/blogs/news/european-weightlifting-championships-results

## Fencing
- **yuval-freilich** ✅ rank 262 (FIE). The Hebrew name matches the OCI. notes ← cut "פעילות 2025–2026 לא ברורה" (opinion).
  Source: https://fie.org/athletes/24944 · https://www.olympicsil.co.il/%d7%a1%d7%99%d7%95%d7%a3/%d7%a1%d7%99%d7%95%d7%a3-%d7%9e%d7%a7%d7%95%d7%9d-%d7%a8%d7%91%d7%99%d7%a2%d7%99-%d7%9c%d7%a0%d7%91%d7%97%d7%a8%d7%aa-%d7%99%d7%a9%d7%a8%d7%90%d7%9c-%d7%91%d7%93%d7%a7%d7%a8-%d7%92%d7%91%d7%a8%d7%99/
- **alon-sarid, dov-vilensky, yonatan-cohen, yehonatan-mesika** ✅ after one edit each: notes ← remove "איות עברי משוער". The OCI article in Hebrew (29.7.2026) names all four and their 4th place at the 2026 Worlds.
  Source: https://www.olympicsil.co.il/%d7%a1%d7%99%d7%95%d7%a3/%d7%a1%d7%99%d7%95%d7%a3-%d7%a0%d7%91%d7%97%d7%a8%d7%aa-%d7%93%d7%a7%d7%a8-%d7%94%d7%92%d7%91%d7%a8%d7%99%d7%9d-%d7%a9%d7%9c-%d7%99%d7%a9%d7%a8%d7%90%d7%9c-%d7%a1%d7%99%d7%99%d7%9e%d7%94-%d7%90%d7%aa/

## Archery
- **roi-dror** ✅ after edits. rank ← "22 בעולם (World Archery, 12.10.2026)"; rankNum 22 / "World Archery World Ranking" / 2026-10-12. name_en ← "Roy Dror" (World Archery spelling).
  notes ← cut "כנראה באולם - לא אומת" unless a World Archery Europe result confirms it.
  Source: https://api.worldarchery.sport/v3/ATHLETEBIOGRAPHY/?Id=44855
- **michaela-moshe** ✅ after edits. rank ← "74 בעולם (World Archery, 12.10.2026)"; rankNum 74 / same list / 2026-10-12.
  name_en: World Archery writes "Mikaella Moshe". Change it only if Tamar accepts the IF spelling.
  Source: https://api.worldarchery.sport/v3/ATHLETEBIOGRAPHY/?Id=46668

## Tennis (records added today)
- **lina-glushko** ✅ rank 528 and "Inactive" both come from the WTA page; the Hebrew name is in two outlets.
  Source: https://www.wtatennis.com/players/323091/lina-glushko · https://www.kan.org.il/content/kan-news/sport/709884/ · https://sport1.maariv.co.il/tennis/article/1442302
- **amit-vales** ✏️ The name "עמית ולס" has Sport5 (7.2.2026) plus Walla (13.4.2024, a pro-am; same player not certain). rank stays empty (ATP blocked). notes "חבר נבחרת ישראל בגביע דייויס 2026" rests on Sport5 alone; keep it only if Tamar accepts one outlet plus the ATP profile.
  Source: https://www.atptour.com/en/players/amit-vales/v0g2/overview · https://www.sport5.co.il/articles.aspx?FolderId=411&DocId=533829 · https://sports.walla.co.il/item/3657745

## Equestrian
- **daniel-bluman** ✏️ rank 9 conflicts with a secondary report of 6 (July 2026) → cut it until the FEI ranking is read.
  source ← FEI Aachen 2026 results (the current WoS link supports neither the rank nor the notes). notes ← fix the garbled "(עם מארק ודניאל בלומן)" or cut.
  Source (conflict): https://tumundoecuestre.com/world-show-jumping-ranking-top-20/?lang=en
- **ashlee-bond** ✏️ The Paris 2024 facts need an official result page (TOI is blocked). Her 2026 activity is unverified.
  Source: none official reachable (olympics.com and FEI are blocked).

## Beach volleyball
- **elazar-cuzmiciov** ✏️ rank 17 comes from Wikipedia → cut. The 2026 Challenge medals need the Volleyball World result pages.
  Source: https://en.wikipedia.org/wiki/FIVB_Beach_Volleyball_World_Rankings (secondary)

## Cycling
- **itamar-einhorn** ✏️ rank 514 (ProCyclingStats) → cut or confirm on UCI DataRide.
  Source: https://www.procyclingstats.com/rider/itamar-einhorn (secondary)
- **tomer-zaltsman** ✏️ rank 57 (ProCyclingStats) → cut or confirm on UCI.
  Source: https://mtb.procyclingstats.com/rider/tomer-zaltsman (secondary)
- **mikhail-iakovlev** ✏️ source is Wikipedia → use UCI results. "זכייה בגרנד פרי בפולין 2026" → source it or cut. The Shanghai results (14–18.10) are missing.
  Source: https://en.wikipedia.org/wiki/Mikhail_Iakovlev (secondary)
- **rotem-gafinovitz** ✏️ source is Wikipedia (Israel at Paris) → use the official Paris road race results.
  Source: https://en.wikipedia.org/wiki/Israel_at_the_2024_Summer_Olympics (secondary)

## Golf, badminton, climbing
- **laetitia-beck** ✏️ The OGR position is unverified, and the notes say so. Her 2026 results have one press source.
  Source: https://wtop.com/news/2026/05/laetitia-beck-has-career-low-63-and-leads-new-mom-estrup-by-1-shot-at-shoprite-lpga/
- **misha-zilberman** ✏️ rank 75 (June 2026, Wikipedia) is older than 60 days → cut or update from BWF (blocked).
  Source: https://en.wikipedia.org/wiki/Misha_Zilberman (secondary)
- **oren-prihed** ✏️ rank 57: the IFSC API now requires authorisation, so it can't be re-read. The Hebrew spelling is unverified.
  Source: https://ifsc.results.info/api/v1/cuwr/3 (returns "Not Authorized")

## Team records
- **israel-baseball-men** ✏️ rank 21 (26.3.2026, yagoonara) is secondary and older than 60 days → cut.
  Source: https://www.yagoonara.com/en/national-team/countries/israel (secondary)
- **israel-3x3-men / israel-3x3-women** ✏️ Reword "כנראה זכאית" using the BK3 rule: the universality OQT is for NOCs without 5v5 basketball in the last two Games. Women: cut "ויקיפדיה מציינת 'דירוג 17'".
  Source: https://cdn.nocnsf.nl/media/a3vagxnn/bk3-la28-qualification-system.pdf
- **israel-flag-football-women** ✏️ "לא השתתפה באליפות העולם 2026" → confirm on the IFAF results page.
  Source: https://www.americanfootballinternational.com/?p=196134 (press)

## Count
✅ 9 (Tashtchiev, Freilich, the 4 épée fencers, Dror, Moshe, Glushko) · ✏️ 16. Gold can be marked as soon as her one cut is applied.
