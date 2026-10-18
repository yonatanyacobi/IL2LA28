# Radar for November 2026 – Yael's sports (beyond Doha and lacrosse)

Window 1–30.11.2026. Sports: shooting, cycling, fencing, archery, equestrian, weightlifting, beach volleyball, golf,
climbing, badminton, basketball, 3x3, flag football, baseball and tennis.
Doha shooting and the Salou lacrosse championships are covered in #159.
"DB record" is checked against `tests/fixtures/data.json` on main. The live DB may have more; check it before creating a record.

**Sessions:** `data/sessions/yael-2.json`, 5 FIBA games (review unchecked), read from the JSON that the FIBA games pages embed (game ids, local time and UTC match `export_data.start_utc`). The two competition records they need are in `docs/research/fiba-competitions-2026-11.json`; create those first, then load the sessions.

| Israel's November games (FIBA) | Local time | Israel time |
|---|---|---|
| 11.11 ישראל–פולין, ריגה (נשים) | 19:40 | 19:40 |
| 14.11 ישראל–טורקיה, ריגה (נשים) | 19:40 | 19:40 |
| 17.11 מונטנגרו–ישראל, בר (נשים) | 18:00 | 19:00 |
| 27.11 הולנד–ישראל, האג (גברים) | 20:00 | 21:00 |
| 30.11 ישראל–לטביה, ריגה (גברים) | 19:30 | 19:30 |

| Competition | Dates | Israelis | Official source | DB record | Status |
|---|---|---|---|---|---|
| FIBA Women's EuroBasket 2027 Qualifiers, 2nd round, November window | gamedays 11, 14 and 17.11 | women's national team (`israel-basketball-women`) | https://www.fiba.basketball/en/events/fiba-womens-eurobasket-2027-qualifiers/news/venues-and-tip-off-times-set-for-november-window-of-fiba-womens-eurobasket-2027-qualifiers | **none** | The window and gamedays are confirmed by FIBA. Games: Poland (11.11), Türkiye (14.11), Montenegro away (17.11); see the table above. Record proposed: `fiba-ebw-2027-q-nov-2026`. |
| FIBA Basketball World Cup 2027 European Qualifiers, Window 5 | 26–30.11 | men's national team (`israel-basketball-men`) | https://www.fiba.basketball/en/events/fiba-basketball-world-cup-2027-european-qualifiers/news/tip-off-times-locations-set-for-window-5-of-european-qualifiers | **none** | Games: Netherlands away (27.11, The Hague) and Latvia (30.11, Riga). The "Germany 28.11" snippet was the 2025 first-round game. Record proposed: `fiba-wc-2027-eq-w5`. |
| IWF World Championships, Ningbo | until 8.11 | none confirmed (lead: `celia-gold`, 77 kg) | https://en.wikipedia.org/wiki/2026_World_Weightlifting_Championships (dates); the IWF Start Book is behind a bot-check | `wl-worlds-2026` | HOLD; the owner is reading the Start Book |
| FIE World Cup, men's épée, Bern | 12–14.11 | not confirmed (team: Freilich, Sarid, Vilensky, Cohen, Mesika) | https://fie.org/tournaments/2026/124 | **none** | No entry list read. It has no LA28 effect (the ranking period starts 1.4.2027), so it's a low priority. |
| LPGA: TOTO Japan Classic / The ANNIKA / CME Group Tour Championship | 5–8.11 / 12–15.11 / 19–22.11 | `laetitia-beck`, entries not confirmed (CME is only for the top 60 of the season) | https://en.wikipedia.org/wiki/2026_LPGA_Tour (dates; LPGA field lists not read) | **none** | Unverified; it counts toward the Olympic Golf Ranking |
| UCI Urban Cycling Worlds, Riyadh (BMX freestyle) | 3–7.11 | none tracked | olympic.ca part 1 | `uci-urban-worlds-riyadh-2026` | No Israeli; this is a quota event for BMX freestyle |

## Checked, nothing found for Israelis in November
- **Archery:** the LA28 window opens 20.9.2027. No Israeli entry found for a November event.
- **Equestrian** (`daniel-bluman`, `ashlee-bond`): FEI calendars aren't readable by fetch, and no official entry was found.
- **Badminton** (`misha-zilberman`), **tennis** (`amit-vales`, `lina-glushko`): BWF, ATP and WTA calendars and entries are blocked or unreadable. Nothing confirmed.
- **Climbing, beach volleyball, 3x3, baseball, flag football:** no event with Israelis found. Beach volleyball's new "Beach World Series" (November) has no dates published.
- **Cycling (road/track/MTB):** off-season; no Israeli entry found.

## Next steps
1. Tamar signs off the two records in `docs/research/fiba-competitions-2026-11.json`; the coordinator creates them.
2. Then Tamar signs off the 5 sessions in `data/sessions/yael-2.json` and the coordinator loads them (`job/load_sessions.py`).
