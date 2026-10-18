# Pre-verification: Roni's sports (combat, gymnastics, aquatics), sprint 4

Scope:
- The 5 men's gymnasts whose verification log still has open items ("Official PDF pending" or ⚠️/❓ in
  `docs/audit/2026-10-verification-drive.md`). They are marked already, but some of their fields rest on secondary
  or unofficial sources.
- The 2 records in my sports with no `verifiedAt`, per the published data.json of 2026-10-18T14:24:57Z:
  `katy-konin-aya-mazor` and `yonatan-ahdut`.
- Every other record in my sports (judo, taekwondo, the women gymnasts, the rest of aquatics) was marked already.

Format: as `docs/research/preverify-yael-2.md`.
- Each record has a verdict, final values (field ← value) and one **source** line.
- Nothing is written to the DB; Tamar signs off.

✅ = can be marked as is, or after the listed edits · ✏️ = an edit or cut is needed before marking (rule 3)

**New official source for gymnastics:** the European Championships Zagreb 2026 result books (European Gymnastics,
"GARM1…QUAL", 19.8.2026), linked from
https://www.europeangymnastics.com/event/2026-european-championships-mens-artistic-gymnastics-zagreb-cro/results
- AA: https://new-backend.europeangymnastics.com/sites/default/files/paragraph/age-group-competition-info/competition-results/SENIORS%20-%20Individual%20-%20Qualification%20AllAroundResultsMag_7.pdf
- Parallel bars: https://new-backend.europeangymnastics.com/sites/default/files/paragraph/age-group-competition-info/competition-results/SENIORS%20-%20Individual%20-%20Qualification%20Parallel%20bars%20ApparatusResultsMag_6.pdf
- Floor: https://new-backend.europeangymnastics.com/sites/default/files/paragraph/age-group-competition-info/competition-results/SENIORS%20-%20Individual%20-%20Qualification%20Floor%20exercise%20ApparatusResultsMag_5.pdf

The finals PDFs aren't on that page yet; only the qualification books are.

**Rotterdam (#134):** the "Official" qualification PDF still isn't reachable. FIG's event page had only pre-event
documents at 14:20Z. So no Rotterdam fact below rests on Rotterdam results. Only the `next` value of
Dolgopyat/Berkovich comes from Rotterdam, from the unofficial Longines Q marks.

## Artistic gymnastics (men)
- **artem-dolgopyat** ✅
  - rank "זהב בקרקע, אליפות אירופה 2026 (זאגרב); מקום 9 בקרב-רב":
    - floor gold 14.466 from European Gymnastics news;
    - AA 9th, 80.597, in the official AA book.
  - next/nextDate (floor final 24.10) stay. If the Official Rotterdam PDF doesn't show Q, set them to `""`.
  Source: https://www.europeangymnastics.com/news/three-new-european-champions-crowned-zagreb · AA book above
- **noam-berkovich** ✅ after one edit
  - rank "מקום 31 בקרב-רב, אליפות אירופה 2026" is confirmed: 31st, 77.598, in the official AA book. This closes the
    log's ⚠️ ("iSport only").
  - source ← the AA book (instead of iSport).
  - next/nextDate (floor final 24.10): the same condition as Dolgopyat.
  Source: AA book above
- **ron-pyatov** ✏️
  - "מקום 4 במקבילים" in the final isn't confirmed:
    - European Gymnastics news (22.8.2026) lists only the podium, with Fraser 3rd on 14.300;
    - the finals PDF isn't published;
    - the official qualification book has him **8th, 13.966, Q**.
  - rank ← "עלה לגמר המקבילים, אליפות אירופה 2026 (מיקום, לא דירוג)".
  - notes ← "עלה לגמר המקבילים באליפות אירופה 2026 (מקום 8 במוקדמות, 13.966). בנבחרת לאליפות העולם ברוטרדם 2026".
  - **Cut** "ארד במקבילים בגביע האתגר בוורנה". It rests on Sport5, thegymter and karlobag only, and FIG's Varna
    results weren't found. Restore it if FIG publishes them.
  - source ← the parallel bars book.
  Source: parallel bars book above · https://new.europeangymnastics.com/news/cherpurnyi-kovtun-and-fraser-shine-zagreb
- **ron-ortal** ✏️
  - Varna horizontal bar bronze: the score conflicts. The record has **13.633**, while International Gymnast and
    karlobag give **13.566** (gold and silver 13.666).
  - notes ← cut the score: "ארד במתח בגביע האתגר בוורנה (מאי 2026). בנבחרת לאליפות העולם ברוטרדם 2026".
  - rank stays only if Tamar accepts two secondary outlets (Sport5 + International Gymnast). Otherwise
    rank ← "בנבחרת לאליפות העולם ברוטרדם 2026".
  - No FIG Varna results were found.
  Source: https://www.intlgymnast.com/news/eight-first-time-winners-crowned-at-world-challenge-cup-of-varna/ · https://www.sport5.co.il/articles.aspx?FolderId=8008&DocId=544078
- **ilia-liubimov** ✅ after one edit
  - The log's ❓ (name_en in no official document) is closed: the official AA book has "LIUBIMOV Ilia", ISR, 52nd,
    74.965.
  - source ← the AA book. The current Longines Ranking page isn't marked Official.
  - rank stays `""`.
  Source: AA book above

## Artistic swimming
- **katy-konin-aya-mazor** ✅
  - rank "מקום 8 בדואט חופשי, מקום 10 בדואט טכני – אליפות אירופה 2026" is confirmed for both athletes in World Aquatics
    results, European Aquatics Championships, Paris:
    - Duet Free 8th, 248.8000 (1.8.2026);
    - Duet Technical 10th, 260.6284 (31.7.2026).
  - name_en matches World Aquatics: "KUNIN Catherine", "MAZOR Aya".
  - The Hebrew names appear in mako (2026).
  - notes stay as they are. Other 2026 duet results in World Aquatics: Super Final Toronto Duet Free 11th
    (21.6), World Cup Duet Free 8th (2.5). Optional, if Tamar wants them.
  Source: https://api.worldaquatics.com/fina/athletes/1631143/results · https://api.worldaquatics.com/fina/athletes/1708200/results · https://www.mako.co.il/news-sport/sports_others-2026_q3/Article-22fe38194b3bf91027.htm

## Open water swimming
- **yonatan-ahdut** ✏️
  - rank is about the wrong distance. His event is 10 km, but rank quotes the 5 km. World Aquatics has the European
    Championships 2026: **10 km 25th (1:58:55.58)**, 5 km 27th, 3 km knockout sprint semifinal 9th.
  - rank ← "מקום 25 ב-10 ק״מ, אליפות אירופה 2026 (מיקום, לא דירוג)".
  - notes ← "אליפות אירופה 2026: מקום 25 ב-10 ק״מ ומקום 27 ב-5 ק״מ. מקום 29 ב-10 ק״מ באליפות העולם 2025".
    This removes "איות שם בעברית לא אומת": Maariv writes "יונתן אחדות", and World Aquatics has the same date of
    birth on both profiles (14.10.2003).
  - source ← World Aquatics results (instead of Wikipedia).
  Source: https://api.worldaquatics.com/fina/athletes/1206062/results · https://sport1.maariv.co.il/other-industries/article/1836611/

## Count
✅ 4 (Dolgopyat, Berkovich and Liubimov after their one edit each; the duet as is) · ✏️ 3 (Pyatov, Ortal, Ahdut).
Rotterdam-derived `next` values wait for #134.
