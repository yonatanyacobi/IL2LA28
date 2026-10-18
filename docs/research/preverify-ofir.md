# Pre-verify: Ofir's records outside the drive (2026-10-18)

Scope: the 24 records in my sports that are not among the drive's 30: 11 athletics and 13 sailing. Rowing and canoe
have no tracked athletes. Surfing (Lelior) and triathlon (Sagiv) are already in the drive. Proposals only:
nothing is written to the DB. Tamar signs off.

**Status:** complete for all 24 records. Athletics: 53 ✅, 13 ✏️, 0 ❓. Sailing: about 46 ✅, 15 ✏️, 13 ❓.

## Athletics (full, 11 records)

### Method and source notes
- World Athletics (WA) athlete profiles: the page's embedded data was read (current world rankings, PBs with record flags, 2026 results, honours).
- WA World Rankings lists opened directly, both showing **"As of 13 Oct 2026"**:
  - https://worldathletics.org/world-rankings/marathon/men (Ayale #49, Alame #86)
  - https://worldathletics.org/world-rankings/high-jump/men (Kapitolnik #34)
  - For the other events the rank comes from the WA profile's current ranking. Those profile values match the two lists above, but the per-event list pages were not opened.
- WA profiles only include the current year's results. 2025 and 2024 facts were checked on WA competition results pages.
- european-athletics.com returned **HTTP 403** (men's marathon report and day-six pages). The Birmingham 2026 men's marathon team gold is verified from the Olympic Committee of Israel (OCI) instead.
- `next` / `nextDate` are empty in all 11 records. Nothing is claimed there, so they count as ✅ and are omitted from the tables.

### Source URLs
**WA athlete profiles**
- Adva Cohen: https://worldathletics.org/athletes/israel/adva-cohen-14699069
- Blessing Akwasi Afrifah: https://worldathletics.org/athletes/israel/blessing-akwasi-afrifah-14897470
- Bukayawe Malede: https://worldathletics.org/athletes/israel/bukayawe-malede-14792561
- Gashau Ayale: https://worldathletics.org/athletes/israel/gashau-ayale-14714462
- Girmaw Amare: https://worldathletics.org/athletes/_/14427580
- Haimro Alame: https://worldathletics.org/athletes/israel/haimro-alame-14584604
- Lonah Chemtai Salpeter: https://worldathletics.org/athletes/israel/lonah-chemtai-salpeter-14523502
- Maor Tiyouri: https://worldathletics.org/athletes/israel/maor-tiyouri-14283592
- Omri Shiff: https://worldathletics.org/athletes/israel/omri-shiff-14808063
- Tadesse Getahon: https://worldathletics.org/athletes/israel/tadesse-getahon-14737734
- Jonathan Kapitolnik: https://worldathletics.org/athletes/israel/jonathan-kapitolnik-14899455

**WA results pages**
- [T25-200] https://worldathletics.org/competitions/world-athletics-championships/tokyo25/results/men/200-metres/heats/summary
- [T25-SC] https://worldathletics.org/competitions/world-athletics-championships/tokyo25/results/women/3000-metres-steeplechase/heats/summary
- [T25-HJ] https://worldathletics.org/competitions/world-athletics-championships/tokyo25/results/men/high-jump/qualification/summary
- [T25-WMAR] https://worldathletics.org/competitions/world-athletics-championships/tokyo25/results/women/marathon/final/result
- [P24-MMAR] https://worldathletics.org/competitions/olympic-games/paris24/results/men/marathon/final/result
- [P24-WMAR] https://worldathletics.org/competitions/olympic-games/paris24/results/women/marathon/final/result
- [P24-200] https://worldathletics.org/competitions/olympic-games/paris24/results/men/200-metres/heats/summary

**OCI / IAA**
- [OCI-EC26] OCI, 2026-08-16. Men's marathon team gold at the European Championships, with the Hebrew spellings of all six team members: https://www.olympicsil.co.il/%D7%90%D7%AA%D7%9C%D7%98%D7%99%D7%A7%D7%94/%D7%94%D7%99%D7%A9%D7%92-%D7%90%D7%93%D7%99%D7%A8-%D7%9C%D7%A0%D7%91%D7%97%D7%A8%D7%AA-%D7%94%D7%9E%D7%A8%D7%AA%D7%95%D7%9F-%D7%A9%D7%9C-%D7%99%D7%A9%D7%A8%D7%90%D7%9C-%D7%9E%D7%93%D7%9C%D7%99%D7%99/
- [OCI-EN] OCI English daily page, 2026-08-16: https://www.olympicsil.co.il/en/2026/08/16/
- [IAA-AOY] IAA, Athletes of the Year 2025 (איימרו עלמיה, לונה צ׳מטאי סלפטר): https://www.iaa.co.il/31881/
- [IAA-RET] IAA, "תודה לך גירמה אמרה" (retirement at 37; no date shown): https://iaa.co.il/31193/
- [IAA-P24] IAA, "גירמה אמרה יהיה הנציג השלישי במרתון הגברים בפריז 2024": https://iaa.co.il/23183/
- [IAA-AFR] IAA, "בלסינג אפריפה שביעי באירופה בריצת 200 מטר": https://iaa.co.il/24408/

### Per-record tables

#### adva-cohen
| field | current value | verified value | verdict | source URL |
|---|---|---|---|---|
| name / name_en | אדווה כהן / Adva Cohen | Adva COHEN | ✅ ok | https://worldathletics.org/athletes/israel/adva-cohen-14699069 |
| event | 3000 מ׳ מכשולים | Women's 3000mSC | ✅ ok | same |
| rank | 41 בעולם, אוק׳ 2026 | #41 Women's 3000mSC | ✅ ok | same |
| notes: NR 9:19.90 at Tokyo WC 2025 | 9:19.90 | 9:19.90 NR, 2025-09-15, heat 2, 6th (17th overall) | ✅ ok | [T25-SC] |
| notes: did not advance from the heats | — | not qualified | ✅ ok | [T25-SC] |
| notes: "לא נמצאה תוצאה בולטת ב-2026" | — | Euro Ch. Birmingham final 10th, 9:38.21 (2026-08-13); SB 9:28.81 (Xiamen DL, 2026-05-23) | ✏️ fix → "מקום 10 בגמר אליפות אירופה 2026 (9:38.21); שיא עונתי 9:28.81" | https://worldathletics.org/athletes/israel/adva-cohen-14699069 |

#### blessing-afrifah
| field | current value | verified value | verdict | source URL |
|---|---|---|---|---|
| name / name_en | בלסינג אפריפה / Blessing Akwasi Afrifah | WA "Blessing Akwasi AFRIFAH"; IAA "בלסינג אפריפה" | ✅ ok | https://worldathletics.org/athletes/israel/blessing-akwasi-afrifah-14897470 ; https://iaa.co.il/24408/ |
| event | 200 מ׳ | Men's 200m | ✅ ok | WA profile |
| rank | 148, אוק׳ 2026 | #148 Men's 200m | ✅ ok | WA profile |
| notes: NR 19.96 (2022) | 19.96 | 19.96 NR, 2022-08-04, Cali | ✅ ok | WA profile |
| notes: 100 m NR 10.09 (30.7.2025) | 10.09 | 10.09 NR, 2025-07-30, Jerusalem | ✅ ok | WA profile |
| notes: 200 m heats at WC 2025 (20.47) | 20.47 | heat 5, 4th, 20.47, did not advance | ✅ ok | [T25-200] |
| notes: 2nd at Grand Slam Jerusalem 2026 (20.36) | 20.36 | 2nd, 20.36, 2026-06-25 | ✅ ok | WA profile |
| notes: Paris Olympian | — | 200 m heats 20.78 (35th), went to repechage | ✅ ok | [P24-200] |

#### bukayawe-malede
| field | current value | verified value | verdict | source URL |
|---|---|---|---|---|
| name (Hebrew) | בוקיאווה מלדה | OCI: "בוקאיו מלדה" | ✏️ fix → בוקאיו מלדה | [OCI-EC26] |
| name_en | Bukayawe Malede | Bukayawe MALEDE | ✅ ok | https://worldathletics.org/athletes/israel/bukayawe-malede-14792561 |
| event / rank | מרתון / 377 | Men's Marathon #377 | ✅ ok | WA profile |
| notes: PB 2:07:38 (Seville, 15.2.2026, 9th) | — | 2:07:38, 2026-02-15, 9th | ✅ ok | WA profile |
| notes: 35th at Euro Ch. 2026 (2:18:37) | — | 35th, 2:18:37, 2026-08-16 | ✅ ok | WA profile |
| notes: "איות השם בעברית לא אומת" | — | spelling confirmed by OCI | ✏️ fix → cut the sentence. Optional: add "חבר בנבחרת שזכתה בזהב קבוצתי באליפות אירופה 2026" | [OCI-EC26] |

#### gashau-ayale
| field | current value | verified value | verdict | source URL |
|---|---|---|---|---|
| name / name_en | גשאו איילה / Gashau Ayale | OCI "גשאו איילה"; WA Gashau AYALE | ✅ ok | [OCI-EC26]; https://worldathletics.org/athletes/israel/gashau-ayale-14714462 |
| event / rank | מרתון / 49 | #49 (As of 13 Oct 2026) | ✅ ok | https://worldathletics.org/world-rankings/marathon/men |
| notes: individual bronze, Birmingham 2026 (2:09:21) | — | 3rd, 2:09:21, 2026-08-16 | ✅ ok | WA profile |
| notes: team gold | — | Israel men's team gold | ✅ ok | [OCI-EC26]; [OCI-EN] |
| notes: 7th at Tokyo WC 2025 | — | 7th, 2:10:27 | ✅ ok | WA profile (honours) |
| notes: PB 2:04:53 (Seville 2024) | — | 2:04:53, 2024-02-18 | ✅ ok | WA profile |
| notes: half-marathon NR 59:59 (Lisbon 2025) | — | 59:59 NR, 2025-03-09 | ✅ ok | WA profile |
| notes: Paris Olympian (31) | — | 31st, 2:11:36 | ✅ ok | [P24-MMAR] |

#### girmaw-amare
| field | current value | verified value | verdict | source URL |
|---|---|---|---|---|
| name (Hebrew) | גירמאו אמרה | IAA/OCI: "גירמה אמרה" | ✏️ fix → גירמה אמרה | [IAA-P24]; [IAA-RET] |
| name_en | Girmaw Amare | Girmaw AMARE | ✅ ok | https://worldathletics.org/athletes/_/14427580 |
| event | מרתון | marathon (PB 2:05:52, 2023-12-03) | ✅ ok | same |
| rank | (empty) | no current WA ranking | ✅ ok | same |
| source | en.wikipedia.org (not official) | — | ✏️ fix → https://worldathletics.org/athletes/_/14427580 | — |
| notes: Paris 2024 Olympian (2:12:51) | — | 44th, 2:12:51 SB | ✅ ok | [P24-MMAR] |
| notes: "לא נמצאו תוצאות 2025–2026; סטטוס לא ברור" | — | IAA announces his retirement at 37 (between 2024-10 and 2025-10; the page shows no date). WA has no 2025 results; 2026 has only two local races (Ashkelon 10 km 32:25; League Cup 5000 m 15:07.90) | ✏️ fix → "פרש מספורט מקצועני (הודעת איגוד האתלטיקה)". The retirement must go through `proposals`. | [IAA-RET]; WA profile |

#### haimro-alame
| field | current value | verified value | verdict | source URL |
|---|---|---|---|---|
| name / name_en | איימרו עלמיה / Haimro Alame | IAA/OCI "איימרו עלמיה"; WA Haimro ALAME | ✅ ok | [IAA-AOY]; https://worldathletics.org/athletes/israel/haimro-alame-14584604 |
| event / rank | מרתון / 86 | #86 (As of 13 Oct 2026) | ✅ ok | https://worldathletics.org/world-rankings/marathon/men |
| notes: 4th at Tokyo WC 2025 (2:10:03) | — | 4th, 2:10:03 | ✅ ok | WA profile (honours) |
| notes: 8th + team gold at Euro Ch. 2026 (2:09:45) | — | 8th, 2:09:45; team gold | ✅ ok | WA profile; [OCI-EC26] |
| notes: PB 2:06:04 "לפי Moyo Sports" | — | WA: 2:06:04, Valencia, 2023-12-03 | ✏️ fix → "שיא אישי 2:06:04 (ולנסיה, 2023-12-03)" | WA profile |
| notes: IAA Athlete of the Year 2025 | — | "אתלט השנה… איימרו עלמיה" | ✅ ok | [IAA-AOY] |

#### lonah-chemtai-salpeter
| field | current value | verified value | verdict | source URL |
|---|---|---|---|---|
| name / name_en | לונה צ׳מטאי סלפטר / Lonah Chemtai Salpeter | IAA "לונה צ׳מטאי סלפטר"; WA Lonah Chemtai SALPETER | ✅ ok | [IAA-AOY]; https://worldathletics.org/athletes/israel/lonah-chemtai-salpeter-14523502 |
| event / rank | מרתון / 187 | #187 Women's Marathon | ✅ ok | WA profile |
| notes: NR 2:17:45 (Tokyo Marathon, 1.3.2020) | — | 2:17:45 NR, 2020-03-01 | ✅ ok | WA profile |
| notes: World bronze 2022 | — | 3rd, Oregon, 2:20:18 | ✅ ok | WA profile (honours) |
| notes: Paris 2024 2:26:08 | — | 8th, 2:26:08 SB | ✅ ok | [P24-WMAR] |
| notes: DNF at WC 2025 | — | DNF | ✅ ok | [T25-WMAR] |
| notes: Athlete of the Year 2025 | — | confirmed | ✅ ok | [IAA-AOY] |
| notes: "לא נמצאה תוצאה ב-2026" | — | 2026 results: Or Yehuda 5 km 16:05 (2026-02-13); Meishan half marathon 1:10:51 (2026-03-15); Delhi half marathon 1:14:14 (2026-10-18) | ✏️ fix → "ללא מרתון ב-2026; חצי מרתון 1:10:51 (2026-03-15)" | WA profile |

#### maor-tiyouri
| field | current value | verified value | verdict | source URL |
|---|---|---|---|---|
| name / name_en | מאור טיורי / Maor Tiyouri | Maor TIYOURI | ✅ ok | https://worldathletics.org/athletes/israel/maor-tiyouri-14283592 |
| event / rank | מרתון / 268 | #268 Women's Marathon | ✅ ok | WA profile |
| notes: 12th at Euro Ch. 2026 (2:30:17) | — | 12th, 2:30:17 | ✅ ok | WA profile |
| notes: 23rd at WC 2025 (2:34:28) | — | 23rd, 2:34:28 | ✅ ok | [T25-WMAR] |
| notes: Paris Olympian (2:33:37) | — | 48th, 2:33:37 | ✅ ok | [P24-WMAR] |

#### omri-shiff
| field | current value | verified value | verdict | source URL |
|---|---|---|---|---|
| name / name_en | עומרי שיף / Omri Shiff | Omri SHIFF (Hebrew spelling not checked against an official page; standard spelling) | ✅ ok | https://worldathletics.org/athletes/israel/omri-shiff-14808063 |
| event / rank | 400 מ׳ משוכות / 177 | #177 Men's 400mH | ✅ ok | WA profile |
| notes: NR 49.82 (14.8.2025) | — | 49.82 NR, 2025-08-14, Jerusalem | ✅ ok | WA profile |
| notes: 5th at Grand Slam Jerusalem 2026 (50.92) | — | 5th, 50.92, 2026-06-25 | ✅ ok | WA profile |

#### tadesse-getahon
| field | current value | verified value | verdict | source URL |
|---|---|---|---|---|
| name / name_en | טדסה גטהון / Tadesse Getahon | OCI "טדסה גטהון"; WA Tadesse GETAHON | ✅ ok | [OCI-EC26]; https://worldathletics.org/athletes/israel/tadesse-getahon-14737734 |
| event / rank | מרתון / 5000-10000 מ׳ / 110 | Men's Marathon #110 | ✅ ok | WA profile |
| notes: 5th + team gold at Euro Ch. 2026 (2:09:31) | — | 5th, 2:09:31; team gold | ✅ ok | WA profile; [OCI-EC26] |
| notes: 5000 m NR 13:16.88 (2025) | — | 13:16.88 NR, 2025-07-19 | ✅ ok | WA profile |
| notes: 10,000 m NR 27:33.99 (2023) | — | 27:33.99 NR, 2023-05-20 | ✅ ok | WA profile |

#### yonathan-kapitolnik
| field | current value | verified value | verdict | source URL |
|---|---|---|---|---|
| name_en | Yonathan Kapitolnik | WA: "Jonathan KAPITOLNIK" | ✏️ fix → Jonathan Kapitolnik | https://worldathletics.org/athletes/israel/jonathan-kapitolnik-14899455 |
| name (Hebrew) / event | יונתן קפיטולניק / קפיצה לגובה | Men's High Jump | ✅ ok | WA profile |
| rank | 34, אוק׳ 2026 | #34 (As of 13 Oct 2026) | ✅ ok | https://worldathletics.org/world-rankings/high-jump/men |
| notes: 2.21 m in WC 2025 qualification | — | group A, 2.21, did not advance | ✅ ok | [T25-HJ] |
| notes: 2nd at Grand Slam Jerusalem 2026 (2.21 m) | — | 2nd, 2.21, 2026-06-25 | ✅ ok | WA profile |
| notes: (missing) | — | 5th in the Euro Ch. 2026 final, 2.23 m (2026-08-14) | ✏️ fix → add "מקום 5 באליפות אירופה 2026 (2.23 מ׳)" | WA profile |

### Summary
1. **Totals:** ✅ 53 · ✏️ 13 · ❓ 0. Every rank and every number claimed in the notes matches World Athletics.
2. **Most important fixes:** Girmaw Amare retired per the IAA (send it to `proposals`, rename to גירמה אמרה, replace the Wikipedia source with WA). Adva Cohen and Lonah Salpeter both have notes saying "no result in 2026", but both raced in 2026.
3. **Smaller fixes:** Malede's Hebrew name → בוקאיו מלדה; Kapitolnik's name_en → Jonathan, and his Euro 2026 5th place should be added; Alame's PB should cite WA instead of Moyo Sports.

## Sailing (full, 13 records)

### Sources and method
- World Sailing rankings: sailing.org/rankings is JS-rendered; data read from WS's own feed. Every class's latest final release is **2026-09-15**, so "ספט׳ 2026" is correct in all records. WS rankings list the helm only (no crew).
- Per-sailor breakdown files (assets.sailing.org/ranking_results/…) list each counted regatta with position/fleet size — official source for most event places below.
- Not loadable: olympics.com (timed out ×3, so Paris 2024 claims rest on media); 2026worlds.470.org results (loaded dynamically, so no 470 crew names verified officially).
- `next` / `nextDate` are empty in all 13 records — nothing to verify.

#### rankingReference URLs (release 2026-09-15)
| class | reference id | URL |
|---|---|---|
| iQFOiL Women | f90d76f8-080d-4c9f-8c01-8ecf68e22870 | https://datafeed.sailing.org/stats/api/rankingReference?filter%5BboatClass.id%5D=97f58788-3109-408a-a3c3-9addf8a145a1&filter%5Bstatus%5D=final&sort%5BrankDate%5D=desc&paginate=1&include=rankings.sailor%2CboatClass%2Ctype&filter%5Btype.id%5D=178b0c8c-49f4-4e99-9e4c-3ba2ede13cd7 |
| iQFOiL Men | 069011f4-6234-4d0e-bf8a-4b6c59473520 | https://datafeed.sailing.org/stats/api/rankingReference?filter%5BboatClass.id%5D=97f58788-3109-408a-a3c3-9addf8a145a1&filter%5Bstatus%5D=final&sort%5BrankDate%5D=desc&paginate=1&include=rankings.sailor%2CboatClass%2Ctype&filter%5Btype.id%5D=c483892d-e53b-4ad8-9692-4a52b50d14dd |
| Formula Kite Women | be5b49db-e952-4ee6-955d-572d9d990639 | https://datafeed.sailing.org/stats/api/rankingReference?filter%5BboatClass.id%5D=4e1f06bf-915e-404c-8d1a-aa6b83ae5d60&filter%5Bstatus%5D=final&sort%5BrankDate%5D=desc&paginate=1&include=rankings.sailor%2CboatClass%2Ctype&filter%5Btype.id%5D=178b0c8c-49f4-4e99-9e4c-3ba2ede13cd7 |
| Formula Kite Men | 42faa1fd-059e-4838-9c20-e42ed0fbc5aa | https://datafeed.sailing.org/stats/api/rankingReference?filter%5BboatClass.id%5D=4e1f06bf-915e-404c-8d1a-aa6b83ae5d60&filter%5Bstatus%5D=final&sort%5BrankDate%5D=desc&paginate=1&include=rankings.sailor%2CboatClass%2Ctype&filter%5Btype.id%5D=c483892d-e53b-4ad8-9692-4a52b50d14dd |
| ILCA 7 Men | 5b1cc493-c41a-46a1-9203-34f2e2251943 | https://datafeed.sailing.org/stats/api/rankingReference?filter%5BboatClass.id%5D=08f69112-1aef-40be-afeb-7e606f8b27a0&filter%5Bstatus%5D=final&sort%5BrankDate%5D=desc&paginate=1&include=rankings.sailor%2CboatClass%2Ctype&filter%5Btype.id%5D=c483892d-e53b-4ad8-9692-4a52b50d14dd |
| 470 Mixed | b023515c-4e28-4621-826a-ead093d6aa1a | https://datafeed.sailing.org/stats/api/rankingReference?filter%5BboatClass.id%5D=70949fd4-bc75-434c-ac1c-d1763b6d0e67&filter%5Bstatus%5D=final&sort%5BrankDate%5D=desc&paginate=1&include=rankings.sailor%2CboatClass%2Ctype |
| 49er Men | 8cc513a5-0106-4ae4-a141-6304b0ed78de | https://datafeed.sailing.org/stats/api/rankingReference?filter%5BboatClass.id%5D=e33a39e8-fbd3-45b4-a249-0ffbe429d69c&filter%5Bstatus%5D=final&sort%5BrankDate%5D=desc&paginate=1&include=rankings.sailor%2CboatClass%2Ctype |

#### Breakdown files used (WS ID → rank → file)
| record | WS ID | rank | breakdown file |
|---|---|---|---|
| daniela-peleg | ISRDP1 | 4 | https://assets.sailing.org/ranking_results/06c5bc7f-d407-4c3a-938e-29ae4c1e2e5f.json |
| sharon-kantor | ISRSK8 | 10 | https://assets.sailing.org/ranking_results/50981adc-0565-4d90-8d4b-c4076b167f54.json |
| shahar-tibi | ISRST5 | 15 | https://assets.sailing.org/ranking_results/dfcfae27-3060-47cd-b08c-8c36645feb23.json |
| yoav-omer | ISRYO2 | 5 | https://assets.sailing.org/ranking_results/3052cad8-02ed-4150-8073-2c1b7098fee4.json |
| tom-reuveny | ISRTR3 | 17 | https://assets.sailing.org/ranking_results/8e98d95f-8d7e-4f1b-ab70-882c16518d19.json |
| mia-ashkenazi | ISRMA9 | 16 | https://assets.sailing.org/ranking_results/a5d2eab4-3e9a-4572-b4c5-5b5871eb7bba.json |
| gal-zukerman | ISRGZ3 | 18 | https://assets.sailing.org/ranking_results/e12afb2a-3d63-432c-b125-cc6e8b2890cb.json |
| zohar-harubi | ISRZH1 | 25 | https://assets.sailing.org/ranking_results/9a8de7e0-72ab-40cf-8040-06af65dd23ac.json |
| omer-vered-vilenchik | ISROV4 | 56 | https://assets.sailing.org/ranking_results/da6baba0-5289-402b-a0f4-690267a05a10.json |
| roy-levi-ariel-gal | ISRRL4 | 21 | https://assets.sailing.org/ranking_results/28361529-cf0a-4856-b5d5-0f9d3e8e9701.json |
| nitai-hason-noga-tyano | ISRNH3 | 15 | https://assets.sailing.org/ranking_results/b1010385-0f65-4046-81d4-58effc87d2d4.json |
| ili-wright-yuval-barnon | ISRIW2 | 34 | https://assets.sailing.org/ranking_results/0fdfeb36-f18c-45ad-a632-1d6af7911d65.json |
| tal-sade-maor-abo | ISRTS4 | 84 | https://assets.sailing.org/ranking_results/96ad9d70-513a-455b-92ba-95c2cda905f4.json |

Below, "rankingReference (class)" means the matching URL above; "breakdown" means that record's file above.

---

### 1. daniela-peleg
| field | current | verified | verdict | source URL |
|---|---|---|---|---|
| name / name_en / event | דניאלה פלג / Daniela Peleg / iQFoil נשים | Daniela Peleg, iQFOiL Women | ✅ | rankingReference (iQFOiL Women) |
| rank | 4 (ספט׳ 2026) | 4 (2026-09-15) | ✅ | rankingReference (iQFOiL Women) |
| notes: 4th at 2026 Worlds | 4 | 4/70, Weymouth, 2026-09-12 | ✅ | https://assets.sailing.org/ranking_results/06c5bc7f-d407-4c3a-938e-29ae4c1e2e5f.json ; https://www.iqfoilclassofficial.org/post/2026-musto-iqfoil-world-championships-tamar-steinberg-and-luuc-van-opzeeland-crowned-world-champions |
| notes: earlier European title "(לפי mako)" | זכתה בעבר באליפות אירופה (לפי mako) | 1st/55 at iQFOiL Europeans, 2025-11-29 (official) | ✏️ `אלופת אירופה 2025` | https://assets.sailing.org/ranking_results/06c5bc7f-d407-4c3a-938e-29ae4c1e2e5f.json |

### 2. gal-zukerman
| field | current | verified | verdict | source URL |
|---|---|---|---|---|
| name / event | Gal Zukerman / Formula Kite נשים | matches | ✅ | https://fir.com.pl/results/IKA/women.html |
| rank | 18 | 18 | ✅ | rankingReference (Formula Kite Women) |
| notes: 8th at Paris 2024 | 8 | Not verified officially (olympics.com timed out); one search result says 8th; Hebrew media: knocked out in semifinal | ❓ `השתתפה בפריז 2024 (הודחה בחצי הגמר)` | https://sport1.maariv.co.il/?p=1353937 |
| notes: 17th at 2026 Worlds, Portugal, May | 17 | 17/31, Viana do Castelo, 2026-05-16 | ✅ | https://fir.com.pl/results/IKA/women.html ; https://assets.sailing.org/ranking_results/e12afb2a-3d63-432c-b125-cc6e8b2890cb.json |

### 3. ili-wright-yuval-barnon
| field | current | verified | verdict | source URL |
|---|---|---|---|---|
| name_en | Illy Wureit & Yuval Barnoon | matches | ✅ | https://49er.org/?p=48856 ; rankingReference (49er Men) |
| rank | 34 | 34 (helm) | ✅ | rankingReference (49er Men) |
| notes: silver at Kiel Week, June 2026 | silver | 2nd/90, ended 2026-06-28 | ✅ | https://49er.org/?p=48856 ; https://assets.sailing.org/ranking_results/0fdfeb36-f18c-45ad-a632-1d6af7911d65.json |
| notes: pair's first international medal | — | No official source; no podiums in ranking window (since 2025-10), earlier history unknown | ❓ cut "מדליה בינלאומית ראשונה לצמד" | — |

### 4. mia-ashkenazi
| field | current | verified | verdict | source URL |
|---|---|---|---|---|
| name_en | Mia Ashkenazi | Maya Ashkenazi | ✏️ `Maya Ashkenazi` | https://fir.com.pl/results/IKA/women.html ; rankingReference (Formula Kite Women) |
| name (Hebrew) | מיה אשכנזי | No Hebrew source checked; "Maya" usually מאיה | ❓ check `מאיה אשכנזי` | — |
| rank | 16 | 16 | ✅ | rankingReference (Formula Kite Women) |
| notes: top Israeli at 2026 Worlds, 14th of 31 | 14/31 | 14/31; Zukerman 17th | ✅ | https://fir.com.pl/results/IKA/women.html ; https://assets.sailing.org/ranking_results/a5d2eab4-3e9a-4572-b4c5-5b5871eb7bba.json |

### 5. nitai-hason-noga-tyano
| field | current | verified | verdict | source URL |
|---|---|---|---|---|
| name_en (helm) | Nitai Hason | Nitai Hasson | ✏️ `Nitai Hasson & …` | rankingReference (470 Mixed) |
| crew נגה טיאנו / Noga Tyano | — | Not found in any source; 470 results page not loadable | ❓ keep "not verified" flag or drop crew name | — |
| rank | 15 | 15 (helm) | ✅ | rankingReference (470 Mixed) |
| notes: Hasson sailed Paris 2024 | yes | Yes, with Noa Lasry, 7th (media) | ✅ | https://www.mako.co.il/news-sport/olympic_game-paris2024/q3_2024/Article-112e2aed2023191027.htm ; https://sport1.maariv.co.il/?p=1353937 |
| notes: Lasry retired | — | Not found | ❓ cut "(שותפתו נועה לסרי פרשה)" | — |
| notes: 16th at 2026 Worlds, Japan | 16 | 16/74, Enoshima, 2026-08-17 | ✅ | https://assets.sailing.org/ranking_results/b1010385-0f65-4046-81d4-58effc87d2d4.json ; https://www.sailing.org/2026/08/17/martin-wrigley-and-bettine-harris-crowned-2026-470-world-champions/ |

### 6. omer-vered-vilenchik
| field | current | verified | verdict | source URL |
|---|---|---|---|---|
| name / event | omer vered vilenchik / ILCA 7 | matches | ✅ | rankingReference (ILCA 7 Men) |
| rank | 56 | 56 | ✅ | rankingReference (ILCA 7 Men) |
| notes: sailed Paris 2024 | yes | Yes (media) | ✅ | https://sports.walla.co.il/item/3662392 |
| notes: first Israeli in the class | — | Not found | ❓ cut "(הנציג הישראלי הראשון בדגם)" | — |
| notes: 2025 U19 world champion, 10th at U21 Worlds | yes / 10 | Youth (U19) title + 10th overall, U21 Worlds, Dún Laoghaire, Aug 2025 | ✅ | https://ilcasailing.org/2025-ilca-under-21-worlds-final-results/ |
| notes: top 10 at U21 Worlds, Jan 2026 | top 10 | 6th/96, Lanzarote, 2026-01-24 | ✏️ `מקום 6 באליפות העולם עד 21 בינואר 2026` | https://assets.sailing.org/ranking_results/da6baba0-5289-402b-a0f4-690267a05a10.json |

### 7. roy-levi-ariel-gal
| field | current | verified | verdict | source URL |
|---|---|---|---|---|
| name_en | Roy Levi & Ariel Gal | WS: "Roi Levy"; 470 class/media: "Roy Levy"; "Levi" matches neither. Ariel Gal confirmed (media) | ✏️ `Roy Levy & Ariel Gal` (or WS `Roi Levy`) | rankingReference (470 Mixed) ; https://www.mysailing.com.au/roy-levy-and-ariel-gal-move-to-the-top-of-the-junior-world-championships/ |
| rank | 21 | 21 (helm) | ✅ | rankingReference (470 Mixed) |
| notes: 14th at 2026 Worlds, Japan | 14 | 14/74, Enoshima | ✅ | https://assets.sailing.org/ranking_results/28361529-cf0a-4856-b5d5-0f9d3e8e9701.json |
| notes: personal best | — | Only 2025 checkable: 22nd at 2025 Worlds | ❓ `שיפור ממקום 22 ב-2025` | https://assets.sailing.org/ranking_results/28361529-cf0a-4856-b5d5-0f9d3e8e9701.json |
| notes: silver at 2026 youth Worlds | נוער | Silver at 470 **Junior** Worlds, Gdynia, July 2026 (media; 470.org not checked) | ✏️ `כסף באליפות העולם לג׳וניורים 2026` | https://www.jns.org/news/israel-news/israeli-sailors-win-silver-at-470-junior-world-championships ; https://www.mysailing.com.au/?p=94399 |
| notes: 2025 youth world champions | — | 2025 Junior World Champions (two outlets) | ✏️ `אלופי העולם לג׳וניורים 2025` | https://www.jns.org/news/israel-news/israeli-sailors-win-silver-at-470-junior-world-championships ; https://www.mysailing.com.au/?p=94399 |

### 8. shahar-tibi
| field | current | verified | verdict | source URL |
|---|---|---|---|---|
| rank | 15 | 15 | ✅ | rankingReference (iQFOiL Women) |
| notes: silver at 2026 Europeans | silver | **Bronze** (3rd/75, Portimão, 2026-05-23) | ✏️ `ארד באליפות אירופה 2026` | https://www.iqfoilclassofficial.org/post/iqfoil-open-european-championships-luuc-van-opzeeland-and-tamar-steinberg-crowned-european-champion ; https://assets.sailing.org/ranking_results/dfcfae27-3060-47cd-b08c-8c36645feb23.json |
| notes: 10th at 2026 Worlds | 10 | 10/70 | ✅ | https://assets.sailing.org/ranking_results/dfcfae27-3060-47cd-b08c-8c36645feb23.json |

### 9. sharon-kantor
| field | current | verified | verdict | source URL |
|---|---|---|---|---|
| rank | 10 | 10 | ✅ | rankingReference (iQFOiL Women) |
| notes: Paris 2024 silver | yes | Silver (widely reported; olympics.com timed out) | ✅ | https://www.ynetnews.com/sport/article/r178fcfffl |
| notes: 2024 world champion | yes | Won 2024 Worlds, Lanzarote | ✅ | https://www.iqfoilclassofficial.org/post/sharon-kantor-isr-and-nicolo-renna-ita-are-the-new-iqfoil-world-champions |
| notes: silver at 2026 Worlds | yes | 2nd/70 | ✅ | https://www.iqfoilclassofficial.org/post/2026-musto-iqfoil-world-championships-tamar-steinberg-and-luuc-van-opzeeland-crowned-world-champions ; https://assets.sailing.org/ranking_results/50981adc-0565-4d90-8d4b-c4076b167f54.json |
| notes: missed 2026 Europeans through injury | — | No 2026 Europeans entry in WS record; injury not in any official source | ❓ `לא השתתפה באליפות אירופה 2026` | https://assets.sailing.org/ranking_results/50981adc-0565-4d90-8d4b-c4076b167f54.json |

### 10. tal-sade-maor-abo
| field | current | verified | verdict | source URL |
|---|---|---|---|---|
| name_en (crew) | Maor Abo | Reported as "Maor Abu"; no official crew listing found | ❓ check `Maor Abu` | https://nationscircuit.worldofsailors.com/?p=18059 |
| rank | 84 | 84 (helm) | ✅ | rankingReference (49er Men) |
| notes: bronze at 2025 Europeans, Thessaloniki | bronze | European bronze (3rd European crew, 7th overall), 3–8 June 2025 | ✅ (optionally add `מקום 7 כללי`) | https://nationscircuit.worldofsailors.com/?p=18059 |
| notes: first Israeli 49er medal | — | Not found | ❓ cut | — |
| notes: did not race in 2026 (Abo injury, walla) | — | **Contradicted**: Sade raced Portugal GP (Feb, 11/47), Princesa Sofia (Apr, 76/101), Worlds (May, 69/82); crew in those events not verified | ✏️ `שדה התחרה ב-2026 (מקום 69 באליפות העולם, מאי)` | https://assets.sailing.org/ranking_results/96ad9d70-513a-455b-92ba-95c2cda905f4.json |

### 11. tom-reuveny
| field | current | verified | verdict | source URL |
|---|---|---|---|---|
| rank | 17 | 17 | ✅ | rankingReference (iQFOiL Men) |
| notes: Paris 2024 Olympic champion | yes | yes | ✅ | https://www.ynetnews.com/sport/article/r178fcfffl |
| notes: 4th at 2026 Europeans | 4 | 4/117 | ✅ | https://assets.sailing.org/ranking_results/8e98d95f-8d7e-4f1b-ab70-882c16518d19.json |
| notes: 5th at 2026 Worlds after re-sailed semifinal | 5 | 5/109; men's semifinal re-sailed after a starting error; eliminated at that stage | ✅ | https://www.iqfoilclassofficial.org/post/2026-musto-iqfoil-world-championships-tamar-steinberg-and-luuc-van-opzeeland-crowned-world-champions ; https://assets.sailing.org/ranking_results/8e98d95f-8d7e-4f1b-ab70-882c16518d19.json |

### 12. yoav-omer
| field | current | verified | verdict | source URL |
|---|---|---|---|---|
| rank | 5 | 5 | ✅ | rankingReference (iQFOiL Men) |
| notes: 8th at 2026 Worlds | 8 | 8/109 | ✅ | https://assets.sailing.org/ranking_results/3052cad8-02ed-4150-8073-2c1b7098fee4.json |
| notes: 7th in early stage of 2026 Europeans | 7 (early stage) | Final **5th/117** | ✏️ `מקום 5 באליפות אירופה 2026` | https://assets.sailing.org/ranking_results/3052cad8-02ed-4150-8073-2c1b7098fee4.json |

### 13. zohar-harubi
| field | current | verified | verdict | source URL |
|---|---|---|---|---|
| name_en | Zohar Harubi | Zohar Haruvi | ✏️ `Zohar Haruvi` | https://fir.com.pl/results/IKA/men.html ; rankingReference (Formula Kite Men) |
| rank | 25 | 25 | ✅ | rankingReference (Formula Kite Men) |
| notes: only Israeli in 2026 Worlds gold fleet, 25th | yes | Yes; Dor Zarka and Carmel Avisar in silver fleet | ✅ | https://fir.com.pl/results/IKA/men.html ; https://assets.sailing.org/ranking_results/9a8de7e0-72ab-40cf-8040-06af65dd23ac.json |
| notes: "איות אנגלי לא אומת" | — | Spelling now verified | ✏️ remove the sentence | https://fir.com.pl/results/IKA/men.html |

---

**Not tracked here:** Tamar Steinberg (ISR) is world no. 1 in iQFOiL Women and won both the 2026 Worlds and 2026 Europeans. Also ranked: Rem Pulci Magen (ILCA 7, 25th), Tomer Vardimon (iQFOiL Men, 28th), Carmel Avisar (Formula Kite Men, 29th).

### Summary
- About 46 ✅, 15 ✏️, 13 ❓. All 13 ranks match the WS release of 2026-09-15.
- Key fixes: Tibi **bronze** (not silver) at 2026 Europeans; Omer **5th** at 2026 Europeans; Sade/Abo "didn't race in 2026" contradicted by WS; English names → Maya Ashkenazi, Zohar Haruvi, Nitai Hasson, Roy (or Roi) Levy; Levy/Gal medals are **junior** (ג׳וניורים), not youth; Peleg → `אלופת אירופה 2025`.
- Still unverifiable: crew names Tyano and Abu, all "first ever" claims, Zukerman 8th at Paris, Lasry's retirement, Kantor's injury.

### Side effect: quota item 41 (470) is resolved
The WS breakdown files confirm item 41's israelNote: Levy/Gal 14th of 74 and Hasson/Tyano 16th of 74 at the 2026
470 Worlds in Enoshima (2026-08-17). Sources:
https://assets.sailing.org/ranking_results/28361529-cf0a-4856-b5d5-0f9d3e8e9701.json and
https://assets.sailing.org/ranking_results/b1010385-0f65-4046-81d4-58effc87d2d4.json.
The ranks are verified for the helms. The crew names are not.

## Next
1. Tamar signs off; the editors apply the ✏️ rows. The retirement of `girmaw-amare` goes through a proposal.
2. The ❓ rows are cut or reworded as proposed before marking (drive rule 3).
3. Item 41: move `review` to unchecked with the two breakdown URLs (a separate quotas PR).
