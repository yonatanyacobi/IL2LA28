# Event watch – 2026-10-18 (Yael)

Quota-relevant events in the next 30 days for shooting, surfing, triathlon and weightlifting.
"Not found" means no official entry list or team announcement was found today, not that Israel is absent.

| Event | Israeli entrants | Date | Quota at stake | Source |
|---|---|---|---|---|
| World Triathlon Cup Tongyeong (KOR), sprint | Shachar Sagiv – Elite Men (on his profile's "Next events"; the event page has no start list yet) | 2026-10-24 | No direct quota; points for the Individual Olympic Qualification ranking (21 places on 2028-05-18). Sagiv is 91st in that ranking and 63rd in the world ranking | https://triathlon.org/athletes/profile/41870 |
| ISSF World Championship Rifle/Pistol/Shotgun, Doha | Sergey Richter – 10m Air Rifle Men + Mixed Team; Olga Tashtchiev – 10m Air Rifle Women + Mixed Team. Israel has 2 entries in total | Air rifle M and W: qualification and finals 2026-11-03; mixed team 2026-11-04 | 3 quotas each in ARM and ARW, max 1 per NOC; no quotas in mixed team | Entries (as of 03.10.2026): https://backoffice.issf-sports.org/getfile.aspx?mod=docf&pane=1&inst=783&iist=366&file=WCH-RPSH-Doha-2026-Entry-List-by-NOC-03.10.2026.pdf · Schedule: https://backoffice.issf-sports.org/getfile.aspx?mod=docf&pane=1&inst=783&iist=365&file=WCH-RPSH-Doha-2026-Final-Competition-Schedule.pdf |
| ISA World Surfing Games, Punta Rocas (PER) | Not found: ISA has published no team list, and no Israeli announcement was found | 2026-11-06 – 2026-11-15 (managers' meeting 11-05) | 1 place per gender for the NOC of the top-ranked team, allocated to the NOC rather than by name | https://isasurf.org/?p=40330 |
| IWF World Championships, Ningbo (CHN) | **Not verified.** The IWF entry list (posted 4.10) and Start Book (17.10) exist, but iwf.sport sits behind a bot-check that blocks automated fetching. A human needs to open them. Tracked candidate: Celia Gold (competed at 71/76 kg; her Olympic category is unverified) | 2026-10-27 – 2026-11-08; her session date depends on her category | No direct quota. Worlds is 1 of 6 Period 1 events for the Olympic Qualification Ranking (OQR). A lifter needs 3 Totals in one Olympic category in Period 1, otherwise they are removed from the OQR. Places go to the top 8 in the OQR per category plus 1 continental place | Dates: https://en.wikipedia.org/wiki/2026_World_Weightlifting_Championships · Rules: https://cdn.nocnsf.nl/media/nlsj0xsh/wlf-la28-qualification-system.pdf · Entries: https://iwf.sport/wp-content/plugins/download-monitor/download.php?id=2956 · Start Book: https://iwf.sport/wp-content/plugins/download-monitor/download.php?id=3004 (links via https://totallympics.com/forums/topic/29817-weightlifting-iwf-world-championships-2026/) |
| WTCS Abu Dhabi (after the 30-day window, noted for context) | Shachar Sagiv – Elite Men (profile "Next events") | 2026-11-13 – 2026-11-14 | Qualification-ranking points | https://triathlon.org/athletes/profile/41870 |

## Proposed athlete updates (not applied; editors to review)

| Athlete id | Field | Current | Proposed | Basis |
|---|---|---|---|---|
| `sergey-richter` | next / nextDate | empty | "אליפות העולם בקליעה, דוחא – רובה אוויר 10 מ׳" / 2026-11-03 | ISSF entry list and schedule above |
| `shachar-sagiv` | next / nextDate | Tongyeong / 2026-10-24 | no change; after 10-24 → "סבב האליפות העולמית (WTCS) אבו דאבי" / 2026-11-13 | triathlon.org profile |
| `anat-lelior` | next / nextDate | Pipe Masters / 2026-12-08 | no change until ISA WSG participation is confirmed | – |
| Olga Tashtchiev (not tracked) | new athlete | – | proposal: shooting, 10m air rifle women, next = Doha / 2026-11-03 | ISSF entry list. Adding an athlete needs a `proposals` entry for human approval. Hebrew spelling not verified |

## Open checks
- ISA WSG 2026: look for the ISA team list or an Israel Surfing Association announcement closer to 11-05.
- Tongyeong: confirm Sagiv on the official start list once it is published, since a "Next events" listing may be a wait-list entry.
- The Doha entry list is dated 03.10.2026; recheck it for late changes.
- Ningbo: an editor should open the IWF Start Book (id=3004) in a browser. Note the Israeli names, categories and session dates, then set `celia-gold` next/nextDate (and add any new lifters via `proposals`).

## Olga Tashtchiev (D5): Hebrew name and Doha schedule (2026-10-18)
- **Hebrew name: no source found.** Searched the Israeli press (Walla, Sport1, Sport5), the Olympic Committee of Israel site and the Israel Shooting Federation, with Hebrew and English queries. None mentions her in Hebrew.
  The only official sources are ISSF ("TASHTCHIEV Olga", ISR, born 2004). The spelling "אולגה טשצ׳ייב" is a transliteration, not sourced.
  Next step: ask the Israel Shooting Federation, or hold D5 with `name` pending.
- **Doha events (ISSF entry list as of 03.10.2026):** 10m Air Rifle Women (ARW) and 10m Air Rifle Mixed Team (ARMT, with Richter). Local times:
  - ARW qualification on 2026-11-03, relay 1 at 13:00 and relay 2 at 15:00; final at 18:00.
  - ARMT qualification on 2026-11-04, relay 1 at 09:00 and relay 2 at 10:30; final at 13:00.
  - Only ARW carries a quota: 3 places, max 1 per NOC. The mixed team has no quota.
  - Sources: the entry list and final schedule links in the Doha row above.
- **Ranking:** ISSF World Ranking 22 (ARW, 2026-10-01), https://www.issf-sports.org/competitions/worldranking/ARW
- **Side note:** Walla spells the weightlifter "סיליה גולד" (https://sports.walla.co.il/item/3572237); the DB has "צליה גולד". Check the spelling.

## Sprint 2 (2026-10-18)

### Tashtchiev – Hebrew name: still no source → transliteration for the owner
- **Searched:** Hebrew press (Walla, Sport1, Sport5, Israel Hayom, Kan) and the Olympic Committee of Israel site. No site of the Israel Shooting Federation was found, and Facebook is not readable by fetch.
  None of these mentions her in Hebrew. ISSF is the only source: "TASHTCHIEV Olga", ISR, born 2004.
- **Proposed transliteration (labelled "תעתיק", for the owner's decision):** **אולגה טשצ׳ייב**.
  It follows the CLAUDE.md geresh rule, renders the "tch" of the ISSF spelling as טשצ׳, and "-iev" as ־ייב.
  If approved, the athlete's `notes` should say "איות עברי: תעתיק, לא אומת".

### Weightlifting Worlds, Ningbo (27.10–8.11) – Israeli entrants still not found
- **Searched:** Hebrew and English news, plus the Israel Weightlifting Federation (no website found). The Israeli press in the results covers only earlier championships, with nothing on Ningbo.
  The IWF entry list and Start Book remain behind a bot-check.
- **Lead for `celia-gold`'s category:** she won the Israeli championships in Herzliya in the **77 kg** class with a 228 kg total, beating Nicole Rubanovich.
  Source: https://www.juedische-allgemeine.de/kultur/228-kilogramm/ . This points to 77 kg as her Olympic category, but it is not an entry.
- **Spelling:** Israeli press writes **"סיליה גולד"** (Sport1: https://sport1.maariv.co.il/other-industries/article/1085514/ , Kan, Walla). The DB has "צליה גולד". Propose renaming her through `proposals`.
- **Still open:** an editor needs to open the IWF Start Book in a browser (link in the Ningbo row), or ask the federation directly.
