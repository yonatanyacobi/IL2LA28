# Pre-verify: Ofir's records outside the drive (2026-10-18)

Scope: the 24 records in my sports that are not among the drive's 30: 11 athletics and 13 sailing. Rowing and canoe
have no tracked athletes. Surfing (Lelior) and triathlon (Sagiv) are already in the drive. Proposals only:
nothing is written to the DB. Tamar signs off.

**Status:** athletics is complete (full per-field tables below). Sailing still has key findings only; its full tables, with the exact URL of each breakdown file, follow in the next commit.

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

## Sailing: sources
- World Sailing ranking: the official datafeed, `datafeed.sailing.org/stats/api/rankingReference`, **release
  2026-09-15**. Every `rank` text should name it: "(World Sailing, 2026-09-15)" instead of "ספט׳ 2026".
- Per-sailor results: World Sailing ranking breakdown files on `assets.sailing.org/ranking_results/` (exact file
  URLs to follow).
- 2026 Formula Kite Worlds: https://fir.com.pl/results/IKA/women.html, https://fir.com.pl/results/IKA/men.html
  (linked from https://www.kiteclasses.org/2026worlds).

## Sailing: key fields

| record | field | finding | source |
|---|---|---|---|
| `shahar-tibi` | `notes` | Bronze at the 2026 European Championships | WS ranking breakdown |
| `yoav-omer` | `notes` | 5th of 117 at the 2026 European Championships | WS ranking breakdown |
| `daniela-peleg` | `notes` | 1st of 55 at the 2025 European Championships | WS ranking breakdown |
| `tal-sade-maor-abo` | `notes` | Raced in 2026, so a "no 2026 results" type claim must go | WS ranking breakdown |
| `nitai-hason-noga-tyano` | `name_en` | "Hasson" (WS sailor id ISRNH3) | WS datafeed |
| `roy-levi-ariel-gal` | `name_en` | "Roi/Roy Levy" (WS sailor id ISRRL4). Use the WS spelling | WS datafeed |
| `roy-levi-ariel-gal` | `notes` | Their medals are **junior** level (470 Junior Worlds), not senior. Say "באליפות העולם לנוער" explicitly | https://jns.org/news/israel-news/israeli-sailors-win-silver-at-470-junior-world-championships, https://www.mysailing.com.au/?p=94399 (media; two independent outlets) |
| `zohar-harubi` | `name_en` | "Haruvi" (as in the 2026 Formula Kite Worlds results) | https://fir.com.pl/results/IKA/men.html |
| `mia-ashkenazi` | `name_en` | "Maya Ashkenazi" (results spelling) | https://fir.com.pl/results/IKA/women.html |
| all 13 | `rank` date | "(World Sailing, 2026-09-15)" | WS datafeed, release 2026-09-15 |

## Next
1. Add the full sailing tables, with the exact breakdown-file URLs.
2. Tamar signs off; the editors apply the ✏️ rows. The retirement of `girmaw-amare` goes through a proposal.
