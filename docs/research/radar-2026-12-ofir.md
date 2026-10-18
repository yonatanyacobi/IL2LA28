# December 2026 radar: Ofir's sports

Window: 2026-12-01 to 2026-12-31. Sports: athletics, sailing, rowing, canoe, surfing and triathlon. Same format as
`radar-2026-11-ofir.md`. "DB record" is checked against `tests/fixtures/data.json` on main.

**Sessions:** none yet. No official entry list names an Israeli for a December event.

| Competition | Dates | Israelis | Official source | DB record | Status |
|---|---|---|---|---|---|
| Valencia Marathon | 2026-12-06 | No Israeli in the organiser's elite-field announcement. Candidates: the marathon group (Teferi set the NR 2:04:44 here on 2024-12-01) | https://www.valenciaciudaddelrunning.com/en/kejelcha-tesfay-lead-elite-lineup-big-ambitions-valencia-marathon-2026/ | `valencia-marathon-2026` | **Unknown** for LA28 (WA LA28 system unpublished). Recheck the organiser's final elite list in the week before; a session (tz `Europe/Madrid`) only for a named Israeli |
| WSL CT Stop 12: Lexus Pipe Masters, Oahu | 2026-12-08 to 2026-12-20 (waiting period) | `anat-lelior`: the full 24-woman field returns at Pipe | https://www.worldsurfleague.com/events/2026/ct/446/lexus-pipe-masters/main | **none** | **None** for LA28 (only the 2028 CT counts, item 42). Create a record if we want it on `#day`. Heats are called day by day, so a session gets a time only when WSL publishes the day's call (tz `Pacific/Honolulu`) |
| SPAR European Cross Country Championships, Belgrade | 2026-12-13 | None confirmed. Candidate: `matan-ivri`, who was 62nd at the 2025 edition per his WA profile | https://www.birmingham26.com/news/belgrade-awarded-2026-spar-european-cross-country-championships (date); European Athletics entries not yet published | **none** | **None** (cross country is not on the LA28 programme). Low priority |
| Dubai Women's Cup (World Triathlon Cup) | 2026-12-05 to 2026-12-06 | No Israeli woman tracked | https://triathlon.org/news/world-triathlon-expands-the-2026-world-cup-calendar-and-confirms-winter-championships-in-padola | **none** | Women's OQR points; no tracked athlete |
| World Rowing: continental qualification regatta venues announced | by 2026-12-31 | None tracked | https://cdn.nocnsf.nl/media/li4hvuq4/row-la28-qualification-system.pdf §H | n/a | Milestone. When announced, add the European regatta (3 places per gender in the single scull) to the radar |

## Proposed competition record: `wsl-pipe-masters-2026` (for Tamar's sign-off)
For Lelior on `#day`. The fields match the existing records. Dates and venue come from the official WSL event
page: "Upcoming Dec 8 - Dec 20", CT Stop 12, Banzai Pipeline, Oahu. The full 24-woman field returns, per WSL's
schedule post. `qualifying: false`: only the 2028 CT counts for LA28 (item 42).

```json
{
 "id": "wsl-pipe-masters-2026",
 "sportId": "surfing",
 "name": "Lexus Pipe Masters – סיום סבב ה-CT של ה-WSL",
 "location": "באנזאי פייפליין, אואהו, הוואי, ארה״ב",
 "start": "2026-12-08",
 "end": "2026-12-20",
 "notes": "תקופת המתנה: מקצים נקבעים מדי יום לפי הגלים",
 "source": "https://www.worldsurfleague.com/events/2026/ct/446/lexus-pipe-masters/main",
 "qualifying": false,
 "review": {"status": "unchecked", "by": "ofir", "at": "2026-10-18"}
}
```
Sessions: none until WSL publishes a day's call with Lelior's heat (tz `Pacific/Honolulu`). After the record exists,
`anat-lelior.next`/`nextDate` (Pipe Masters, 2026-12-08) points to a known competition.
Schedule source: https://www.worldsurfleague.com/posts/546310/world-surf-league-releases-2026-championship-tour-schedule-and-formats

## Checked, nothing for Israelis in December
- **Triathlon (men):** no Olympic-route event. The only men's elite event in December is the T100 Qatar Finals
  (2026-12-11 to 2026-12-12), long distance and outside the LA28 ranking. Sagiv's next is decided after Abu Dhabi.
- **Sailing:** no quota event. The 2027 Worlds in Fortaleza (January) are the first. December is pre-Worlds
  training; no official Israeli entry was found for a December regatta.
- **Canoe:** none. The sprint ranking runs to 2027-12-31, but there are no December ranking events and no Israeli
  athletes are identified.
- **Athletics (track):** off-season.

## Watch for January (just after the window)
- **Sailing Worlds, Fortaleza (single-handed events):** the first LA28 quota event in sailing (iQFoil, Formula
  Kite, ILCA). The dates conflict between sources: the World Sailing calendar says from 2027-01-15, while the QS
  gives 20–22 and 22–30 Jan. Verify before the January radar. Many tracked Israelis (Steinberg, Kantor, Peleg,
  Tibi, Reuveny, Omer, Ashkenazi, Zukerman, Haruvi, Vered Vilenchik).
