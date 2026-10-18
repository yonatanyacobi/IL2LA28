# Event radar 2026-10-18 to 2026-12-31: Ofir's sports

Scope: athletics, sailing, rowing, canoe, surfing and triathlon. The format and the "LA28 weight" terms follow
Yael's radar:
- **quota**: places are awarded at the event.
- **ranking**: the event counts toward a qualification ranking.
- **unknown**: the LA28 system is not published.
- **none**: no LA28 effect.

Israelis are the athletes tracked in `data.json` (fixture). "Unverified" means the athlete is not yet confirmed
on an official start list.

## In the window

| Date | Event | Sport | Israelis | LA28 weight | Source |
|---|---|---|---|---|---|
| 2026-10-18 | Amsterdam Marathon | Athletics | Maru Teferi, Selamawit Teferi (`next` in data.json) | **Unknown**: the World Athletics LA28 system is not published (see the coverage doc). The race is inside the Beijing 27 marathon window (2025-11-03 to 2027-05-02), but that window is for the 2027 Worlds, not LA28 | data.json; https://worldathletics.org/competitions/world-athletics-championships/beijing27/news/press-releases/qualification-system-world-athletics-championships-beijing-27 |
| 2026-10-16 to 2026-10-25 | WSL CT Stop 10: MEO Rip Curl Pro Portugal, Peniche (postseason, 16 women) | Surfing | Anat Lelior is **not** in the field: her WSL page for the women's event shows no heats, although Round 1 (10-16) and the quarterfinals (10-17) have been surfed | **None**: only the 2028 CT counts for LA28 (item 42) | https://www.worldsurfleague.com/athletes/7491/anat-lelior/eventresults?eventId=5115 · https://www.worldsurfleague.com/events/2026/ct/445/meo-rip-curl-pro-portugal/main |
| 2026-10-24 | World Triathlon Cup Tongyeong (sprint) | Triathlon | Shachar Sagiv. He is on his profile, but the start list is not out yet; recheck 2026-10-22 | **Ranking**: up to 500 points on the individual Olympic qualification ranking (OQR). Sprint distance, so it counts toward the limit of 8 shorter-distance results | https://triathlon.org/events/2026-world-triathlon-cup-tongyeong; https://triathlon.org/news/the-olympic-qualification-pathways-to-the-la28-start-line |
| 2026-10-30 | Big Ten Cross Country Championships (NCAA) | Athletics | Matan Ivri (`next` in data.json) | **None** (college cross country) | data.json |
| 2026-10-31 to 2026-11-10 | WSL CT Stop 11: Philippines Pro (postseason, 16 women) | Surfing | Lelior is probably not in it (she wasn't in the Portugal postseason field); check the draw when published | **None** | https://www.worldsurfleague.com/posts/559746/surf-abu-dhabi-pro-removed-from-2026-championship-tour-calendar |
| 2026-11-06 to 2026-11-15 | ISA World Surfing Games, Punta Rocas, Peru | Surfing | Anat Lelior. Israel's entry is unverified (item 42 already says so) | **Quota**: 1 extra place to the top team per gender. The NOC chooses the surfer | https://isasurf.org/event/2026-isa-world-surfing-games/ (ISA announcement via search; isasurf.org returns 403 to the fetcher) |
| 2026-11-13 to 2026-11-14 | WTCS Abu Dhabi (individual sprint on 11-13, mixed relay on 11-14) | Triathlon | Sagiv (listed on his profile; start list unverified) | **Ranking**: up to 1000 OQR points. The relay counts toward the mixed relay ranking, but Israel has no tracked relay | https://triathlon.org/events/2026-wtcs-abu-dhabi; https://triathlon.org/athletes/profile/41870 |
| 2026-11-28 to 2026-11-29 | World Triathlon Cup Jeddah | Triathlon | Sagiv's entry is unknown | **Ranking**: up to 500 OQR points | https://triathlon.org/news/world-triathlon-announces-two-new-additions-to-2026-world-cup-calendar |
| 2026-12-06 | Valencia Marathon | Athletics | Possible for the marathon group. Teferi set the Israeli record here in 2024. No confirmed entries | **Unknown** (as for Amsterdam) | data.json (`valencia-marathon-2026`) |
| 2026-12-08 to 2026-12-20 | WSL CT Stop 12: Lexus Pipe Masters, Oahu (last CT event of 2026; the full 24-woman field returns) | Surfing | Anat Lelior (`next` in data.json) | **None**: only the 2028 CT counts for LA28 (item 42) | https://www.worldsurfleague.com/events/2026/ct/446/lexus-pipe-masters/main · `data/quotas/quotas.json` item 42 |
| 2026-12-13 | SPAR European Cross Country Championships, Belgrade | Athletics | None tracked or confirmed | **None** (cross country is not on the LA28 programme) | https://www.birmingham26.com/news/belgrade-awarded-2026-spar-european-cross-country-championships |
| by 2026-12-31 | World Rowing announces the venues of the continental Olympic qualification regattas | Rowing | None tracked | Milestone: sets the date and venue of the European regatta (3 places per gender in the single scull) | https://cdn.nocnsf.nl/media/li4hvuq4/row-la28-qualification-system.pdf §H |

## Quiet in the window
- **Sailing:** no quota event. The first quota event is the 2027 Worlds in Fortaleza (single-handed events,
  January 2027). The World Sailing calendar says 2027-01-15; the QS says 2027-01-20 to 2027-01-22 in one place and
  2027-01-22 to 2027-01-30 in another. I found no Olympic-class world or continental event for Israelis in
  Nov–Dec. The only LA28 requirement in play: athletes must appear on the World Sailing ranking at some point
  between 2026-07-01 and 2028-06-30 [SAL-QS §C.2].
- **Canoe:** the 2026 sprint ranking events still left are the African and Oceania championships (no dates in
  the QS, no Israelis). The slalom ranking resumes with the World Cup in Prague on 2027-06-04.
- **Rowing:** the first quota event is the Worlds in Lucerne, 2027-08-23 to 2027-08-29.
- **Athletics (track):** off-season. The LA28 system is still unpublished.

## Results to collect
- **Amsterdam, 2026-10-18 (today):** the Teferis' times, from the official race results.
- **Tongyeong, 2026-10-24:** follow the result-night wording in `docs/research/2026-10-18-ofir-triathlon.md`
  (PR #95).
- **ISA WSG, 2026-11-15:** the final team ranking per gender, and whether Israel competed.

## Proposed athlete `next` updates (not applied)
- `shachar-sagiv`: after Tongyeong, "סבב האליפות העולמית (WTCS) אבו דאבי" / 2026-11-13, once he is on the start list.
- `anat-lelior`: "משחקי הגלישה העולמיים של ISA, פונטה רוקאס" / 2026-11-06, but only if the ISA entry list shows
  Israel. Otherwise keep Pipe Masters. (Fixed 2026-10-18: the WSL postseason stops in Portugal and the
  Philippines were missing. She is not in the Portugal field; see `docs/research/preverify-ofir-2.md`.)
- `maru-teferi`, `selamawit-teferi`: clear `next` after Amsterdam unless a later race is announced officially.
