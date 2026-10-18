# Radar for November 2026 – Yael's sports (beyond Doha and lacrosse)

Window 1–30.11.2026. Sports: shooting, cycling, fencing, archery, equestrian, weightlifting, beach volleyball, golf,
climbing, badminton, basketball, 3x3, flag football, baseball and tennis.
Doha shooting and the Salou lacrosse championships are covered in #159.
"DB record" is checked against `tests/fixtures/data.json` on main. The live DB may have more; check it before creating a record.

**Sessions:** no `data/sessions/yael-2.json`. None of these has an official schedule that names an Israeli with a time.
The two basketball windows have official dates, but not Israel's game times in a readable page.

| Competition | Dates | Israelis | Official source | DB record | Status |
|---|---|---|---|---|---|
| FIBA Women's EuroBasket 2027 Qualifiers, 2nd round, November window | gamedays 11, 14 and 17.11 | women's national team (`israel-basketball-women`) | https://www.fiba.basketball/en/events/fiba-womens-eurobasket-2027-qualifiers/news/venues-and-tip-off-times-set-for-november-window-of-fiba-womens-eurobasket-2027-qualifiers | **none** | The window and gamedays are confirmed by FIBA. Israel's games, venue (the athlete record says Israel–Poland in Riga, 11.11) and tip-off times are on the FIBA games page, which renders by script and wasn't readable. Create a competition record; add sessions once the times are read. |
| FIBA Basketball World Cup 2027 European Qualifiers, Window 5 | 26–30.11 | men's national team (`israel-basketball-men`) | https://www.fiba.basketball/en/events/fiba-basketball-world-cup-2027-european-qualifiers/news/tip-off-times-locations-set-for-window-5-of-european-qualifiers | **none** | FIBA confirms the window (each team plays twice). Israel's two opponents and dates aren't readable. The athlete record has Netherlands–Israel on 27.11 from a secondary source, and a search snippet mentions Germany–Israel on 28.11. Both are unverified. |
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
1. A coordinator or editor creates the two FIBA competition records (women's November window and men's Window 5), with the FIBA articles above as their sources.
2. Someone who can load the FIBA games pages in a browser reads Israel's game dates, venues and tip-off times (venue local time). After that I add sessions in `yael-2.json` (tz per venue) for sign-off.
