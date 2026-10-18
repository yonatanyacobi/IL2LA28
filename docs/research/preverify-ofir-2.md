# Pre-verification, batch 2: Ofir's unmarked records (sprint 4)

Scope: every record in my sports without `verifiedAt` in the published data.json (version read 2026-10-18). That
is 30 records: 15 athletics, 13 sailing, 1 surfing and 1 triathlon. Rowing and canoe have none.
The full per-field tables for 24 of them are in `docs/research/preverify-ofir.md` (merged in #135). This doc gives
the final values to apply, plus the 6 drive records.
Rules: `docs/product/verification-drive.md`. Nothing is written to the DB; Tamar signs off.

✅ = can be marked as is, or after the listed edits · ✏️ = an edit or cut is needed before marking (rule 3)

Rank date for every athletics `rank`: "(World Athletics, 2026-10-13)" (lists read "As of 13 Oct 2026").
Rank date for every sailing `rank`: "(World Sailing, 2026-09-15)" (datafeed release 2026-09-15).

## Athletics
- **adva-cohen** ✅ after edits. rank ← "41 בעולם ב-3000 מ׳ מכשולים (World Athletics, 2026-10-13)".
  notes ← "שיא ישראלי 9:19.90 באליפות העולם טוקיו 2025 (לא עלתה מהמוקדמות). מקום 10 בגמר אליפות אירופה 2026 (9:38.21); שיא עונתי 9:28.81".
  Source: https://worldathletics.org/athletes/israel/adva-cohen-14699069
- **blessing-afrifah** ✅ (rank date only).
  Source: https://worldathletics.org/athletes/israel/blessing-akwasi-afrifah-14897470
- **bukayawe-malede** ✅ after edits. name ← "בוקאיו מלדה"; notes ← "שיא אישי 2:07:38 (סביליה, 15.2.2026, מקום 9); מקום 35 באליפות אירופה 2026 (2:18:37)".
  Source: https://worldathletics.org/athletes/israel/bukayawe-malede-14792561 · OCI 2026-08-16 (URL in preverify-ofir.md, [OCI-EC26])
- **gashau-ayale** ✅ (rank date only).
  Source: https://worldathletics.org/world-rankings/marathon/men · https://worldathletics.org/athletes/israel/gashau-ayale-14714462
- **girmaw-amare** ✏️ name ← "גירמה אמרה"; source ← https://worldathletics.org/athletes/_/14427580 (not Wikipedia).
  notes ← "אולימפיאן פריז 2024 (2:12:51). פרש מספורט מקצועני (הודעת איגוד האתלטיקה)". **The retirement goes to `proposals`** (CLAUDE.md), so it is
  marked only after a person approves it.
  Source: https://iaa.co.il/31193/ · https://iaa.co.il/23183/
- **haimro-alame** ✅ after edits. notes ← "מקום 4 באליפות העולם טוקיו 2025 (2:10:03); מקום 8 וזהב קבוצתי באליפות אירופה 2026 (2:09:45); שיא אישי 2:06:04 (ולנסיה, 2023-12-03); ספורטאי השנה 2025 של איגוד האתלטיקה".
  Source: https://worldathletics.org/athletes/israel/haimro-alame-14584604 · https://worldathletics.org/world-rankings/marathon/men
- **lonah-chemtai-salpeter** ✅ after edits. notes ← "שיא ישראלי 2:17:45 (מרתון טוקיו, 1.3.2020); ארד עולם 2022; פריז 2024 2:26:08; לא סיימה באליפות העולם 2025; נבחרה לספורטאית השנה 2025. ללא מרתון ב-2026; חצי מרתון 1:10:51 (2026-03-15)".
  Source: https://worldathletics.org/athletes/israel/lonah-chemtai-salpeter-14523502
- **maor-tiyouri** ✅ (rank date only).
  Source: https://worldathletics.org/athletes/israel/maor-tiyouri-14283592
- **omri-shiff** ✅ (rank date only).
  Source: https://worldathletics.org/athletes/israel/omri-shiff-14808063
- **tadesse-getahon** ✅ (rank date only).
  Source: https://worldathletics.org/athletes/israel/tadesse-getahon-14737734
- **yonathan-kapitolnik** ✅ after edits. name_en ← "Jonathan Kapitolnik" (WA spelling); notes: add "מקום 5 באליפות אירופה 2026 (2.23 מ׳)".
  Source: https://worldathletics.org/athletes/israel/jonathan-kapitolnik-14899455 · https://worldathletics.org/world-rankings/high-jump/men

## Sailing
- **daniela-peleg** ✅ after edits. notes ← "מקום 4 באליפות העולם 2026; אלופת אירופה 2025".
  Source: https://assets.sailing.org/ranking_results/06c5bc7f-d407-4c3a-938e-29ae4c1e2e5f.json
- **gal-zukerman** ✏️ notes ← "השתתפה בפריז 2024; מקום 17 באליפות העולם 2026 בפורטוגל (מאי)". The 8th place has no official source (olympics.com timed out).
  Source: https://fir.com.pl/results/IKA/women.html · https://assets.sailing.org/ranking_results/e12afb2a-3d63-432c-b125-cc6e8b2890cb.json
- **ili-wright-yuval-barnon** ✅ after edits. notes ← "כסף בשבוע קיל (יוני 2026)".
  Source: https://49er.org/?p=48856 · https://assets.sailing.org/ranking_results/0fdfeb36-f18c-45ad-a632-1d6af7911d65.json
- **mia-ashkenazi** ✏️ name_en ← "Maya Ashkenazi". The Hebrew name ("מיה" or "מאיה") is unchecked; Tamar decides, or keep it as is.
  Source: https://fir.com.pl/results/IKA/women.html · https://assets.sailing.org/ranking_results/a5d2eab4-3e9a-4572-b4c5-5b5871eb7bba.json
- **nitai-hason-noga-tyano** ✏️ name_en helm ← "Nitai Hasson". No source names the crew "Noga Tyano" → keep the
  "not verified" flag or drop the crew name. notes ← "חסון השתתף בפריז 2024; מקום 16 באליפות העולם 2026 ביפן. איות אנגלי של טיאנו לא אומת".
  Source: https://assets.sailing.org/ranking_results/b1010385-0f65-4046-81d4-58effc87d2d4.json
- **omer-vered-vilenchik** ✅ after edits. notes ← "השתתף בפריז 2024; אלוף העולם עד 19 ב-2025 (מקום 10 באליפות העולם עד 21); מקום 6 באליפות העולם עד 21 בינואר 2026".
  Source: https://assets.sailing.org/ranking_results/da6baba0-5289-402b-a0f4-690267a05a10.json · https://ilcasailing.org/2025-ilca-under-21-worlds-final-results/
- **roy-levi-ariel-gal** ✅ after edits. name_en ← "Roy Levy & Ariel Gal" (the 470 class and media spelling; WS writes "Roi Levy"). The Hebrew name was not checked against an official source.
  notes ← "מקום 14 באליפות העולם 2026 ביפן (מקום 22 ב-2025); כסף באליפות העולם לג׳וניורים 2026; אלופי העולם לג׳וניורים 2025".
  Source: https://assets.sailing.org/ranking_results/28361529-cf0a-4856-b5d5-0f9d3e8e9701.json · https://www.jns.org/news/israel-news/israeli-sailors-win-silver-at-470-junior-world-championships · https://www.mysailing.com.au/?p=94399
- **shahar-tibi** ✅ after edits. notes ← "ארד באליפות אירופה 2026; מקום 10 באליפות העולם 2026".
  Source: https://assets.sailing.org/ranking_results/dfcfae27-3060-47cd-b08c-8c36645feb23.json
- **sharon-kantor** ✅ after edits. notes ← "מדליית כסף בפריז 2024, אלופת העולם 2024; כסף באליפות העולם 2026; לא השתתפה באליפות אירופה 2026" (the injury reason is not official).
  Source: https://assets.sailing.org/ranking_results/50981adc-0565-4d90-8d4b-c4076b167f54.json · https://www.iqfoilclassofficial.org/post/2026-musto-iqfoil-world-championships-tamar-steinberg-and-luuc-van-opzeeland-crowned-world-champions
- **tal-sade-maor-abo** ✏️ notes ← "ארד באליפות אירופה 2025 (סלוניקי); שדה התחרה ב-2026 (מקום 69 באליפות העולם, מאי)". This cuts the "first Israeli 49er medal" claim and the walla injury claim, which the WS results contradict. The crew spelling ("עבו" or "Abu") is unchecked.
  Source: https://assets.sailing.org/ranking_results/96ad9d70-513a-455b-92ba-95c2cda905f4.json · https://nationscircuit.worldofsailors.com/?p=18059
- **tom-reuveny** ✅ (rank date only).
  Source: https://assets.sailing.org/ranking_results/8e98d95f-8d7e-4f1b-ab70-882c16518d19.json
- **yoav-omer** ✅ after edits. notes ← "מקום 8 באליפות העולם 2026; מקום 5 באליפות אירופה 2026".
  Source: https://assets.sailing.org/ranking_results/3052cad8-02ed-4150-8073-2c1b7098fee4.json
- **zohar-harubi** ✅ after edits. name_en ← "Zohar Haruvi"; notes ← "הישראלי היחיד בבית הזהב באליפות העולם 2026, מקום 25".
  Source: https://fir.com.pl/results/IKA/men.html · https://assets.sailing.org/ranking_results/9a8de7e0-72ab-40cf-8040-06af65dd23ac.json

## Drive records (6)
Checked directly on 2026-10-18. For World Athletics, the facts come from the embedded data of each profile page
(results, honours and current ranking; the results list runs to 2026-10-14).

- **shachar-sagiv** ✅ after edits. rank ← "91 בדירוג ההעפלה האולימפי, 63 בדירוג העולמי (World Triathlon, 2026-10-12)";
  rankNum 91 / "World Triathlon Individual Olympic Qualification Ranking" / 2026-10-12 (as in #95 and Yael's #84).
  next/nextDate (Tongyeong, 2026-10-24) are on his IF profile's next events, which meets the drive rule; the start
  list is still unpublished. Notes were all confirmed in Dana's 2026-10-18 audit (docs/audit/2026-10-18.md) → no change.
  Source: https://triathlon.org/athletes/profile/41870 · https://triathlon.org/world-rankings/olympic/men
- **matan-ivri** ✅ after edits. rank ← "76 בעולם ב-1500 מ׳ (World Athletics, 2026-10-13)".
  notes ← "שיא ישראלי 3:34.51 (קורטרייק, 11.7.2026); מקום 14 במוקדמות 1500 מ׳ באליפות אירופה 2026 (3:36.93)".
  next/nextDate (Big Ten XC, 2026-10-30): the only source is his university's official team site, not an entry
  list. Tamar decides whether that meets the `next` rule; if not, clear next/nextDate until the meet's entry list.
  Source: https://worldathletics.org/athletes/israel/matan-ivri-14943253 · https://uwbadgers.com/sports/mens-cross-country/roster/matan-ivri/15841
- **maru-teferi** ✏️ next/nextDate ("מרתון אמסטרדם", 2026-10-18) is now past: clear both. Today no official source
  confirms he ran (see the Amsterdam note below). rank ← "238 בעולם במרתון (World Athletics, 2026-10-13)".
  Notes are all confirmed by WA: NR 2:04:44 (Valencia, 2024-12-01); Paris 2024 26th, 2:10:42; DNF at the 2025
  Worlds; 22nd at the 2026 Europeans, 2:13:36. Keep them; optionally add "מקום 7 במרתון קייפטאון (2026-05-24, 2:06:46)".
  Source: https://worldathletics.org/athletes/israel/maru-teferi-14526757
- **selamawit-teferi** ✅ after edits. rank ← "248 בעולם במרתון (World Athletics, 2026-10-13)"; next/nextDate (Amsterdam,
  2026-10-18) are past: clear both.
  notes ← "מקום 9 במרתון אמסטרדם (2026-10-18, 2:22:58); מקום 11 באליפות אירופה 2026 (2:28:26), הישראלית הטובה במרוץ".
  Tiyouri was 12th, so "best Israeli" holds. WA lists her as "Selamawit TEFERI"; the Hebrew/English double name
  was set in Dana's audit, so no change.
  Source: https://worldathletics.org/athletes/israel/selamawit-teferi-14794741 · https://worldathletics.org/news/report/amsterdam-marathon-2026-diriba-berhanu
- **tamar-steinberg** ✅ after edits. rank ← "1 בעולם (World Sailing, 2026-09-15)". Every note is confirmed by her
  WS breakdown: 2026 Worlds 1st of 70 (2026-09-12); 2026 Europeans 1st of 75 (2026-05-23); 2025 Worlds 2nd of 79;
  Princesa Sofia 2026 1st of 70. source ← her breakdown file instead of the generic rankings page.
  Source: https://assets.sailing.org/ranking_results/1fd2291d-b683-4498-9738-4fdc3e88ff65.json
- **anat-lelior** ✏️
  - source ← https://www.worldsurfleague.com/athletes/7491/anat-lelior (not Wikipedia).
  - rank ← "15 בדירוג סבב ה-CT (WSL, 2026-10-18)". The WSL page is a live ranking, so it may move during the
    Portugal event.
  - notes ← "השתתפה בטוקיו ובפריז; הישראלית הראשונה בסבב ה-CT של ה-WSL (2026); מקום 2 בטהיטי פרו 2026". This
    cuts "דירוג CT נוכחי לא אומת". All three facts are on her WSL bio.
  - **next: keep Pipe Masters (2026-12-08), pending one check.** This corrects the previous commit. After Stop 9
    the CT narrows to 16 women for the postseason. That is now Portugal (2026-10-16 to 2026-10-25) and the
    Philippines Pro (2026-10-31 to 2026-11-10), since Abu Dhabi was dropped. The full 24-woman field returns at
    Pipe Masters.
    - Portugal: her official WSL page for the women's event shows **no heats** ("Standby", place "-"). The women's
      Round 1 (2026-10-16) and quarterfinals (2026-10-17) have already been surfed, so she is not in the Portugal
      field. No session or result is added.
    - Philippines Pro: check its draw when WSL publishes it. If she is in it, next ← Philippines Pro / 2026-10-31,
      and a session row follows.
  Source: https://www.worldsurfleague.com/athletes/7491/anat-lelior/eventresults?eventId=5115 · https://www.worldsurfleague.com/events/2026/ct/445/meo-rip-curl-pro-portugal/main · https://www.worldsurfleague.com/posts/546310/world-surf-league-releases-2026-championship-tour-schedule-and-formats · https://www.worldsurfleague.com/posts/559746/surf-abu-dhabi-pro-removed-from-2026-championship-tour-calendar · https://www.worldsurfleague.com/athletes/tour/wct

**Amsterdam, Maru Teferi:** no official result yet. His WA profile (results to 2026-10-14) and the WA race report
don't list him; only one media report has "20th, 2:07:22". So no session row or result. Recheck WA on 2026-10-19
in the morning.

**Correction to my radar (#111):** it misses the Portugal and
Philippines CT stops (postseason, 16 women). Fixed in #111.
