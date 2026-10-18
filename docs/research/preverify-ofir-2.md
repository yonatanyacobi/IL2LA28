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
shachar-sagiv, matan-ivri, maru-teferi, selamawit-teferi, tamar-steinberg, anat-lelior: still being checked; they
follow in the next commit on this branch. Two items are already known:
- **selamawit-teferi:** Amsterdam 2026-10-18, 9th in 2:22:58 (https://worldathletics.org/news/report/amsterdam-marathon-2026-diriba-berhanu).
- **maru-teferi:** no official Amsterdam result yet. Neither his WA profile nor a WA results page shows it on
  2026-10-18; only one media report has "20th, 2:07:22". So no session row or result is added.
