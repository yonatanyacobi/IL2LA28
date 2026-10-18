# November 2026 radar: Ofir's sports

Window: 2026-11-01 to 2026-11-30. Sports: athletics, sailing, rowing, canoe, surfing and triathlon.
"DB record" is checked against `tests/fixtures/data.json` on main; the live DB may have more, so check it before
creating a record. Times are venue-local, and each `tz` is the venue's IANA zone (sessions contract).

**Sessions:** none added yet. No official start or entry list names an Israeli for a November event. Each row says
what unblocks its session.

| Competition | Dates | Israelis | Official source | DB record | Status |
|---|---|---|---|---|---|
| WSL CT Stop 11: Philippines Pro (postseason, 16 women) | 2026-10-31 to 2026-11-10 | `anat-lelior`, unlikely: she is not in the Portugal postseason field | https://www.worldsurfleague.com/posts/559746/surf-abu-dhabi-pro-removed-from-2026-championship-tour-calendar | **none** | Check the women's draw when published. If she is in it: a competition record, then a session (tz `Asia/Manila`). No LA28 effect |
| ISA World Surfing Games, Punta Rocas, Peru | 2026-11-06 to 2026-11-15 | Israel's entry is unverified (candidate: `anat-lelior`) | https://isasurf.org/event/2026-isa-world-surfing-games/ (isasurf.org returns 403 to the fetcher) | `isa-wsg-2026` | **Quota**: the top team per gender earns 1 LA28 place (item 42). Ask the Israel Surfing Association or the OCI for the team; the ISA heat draw gives times (tz `America/Lima`) |
| WTCS Abu Dhabi, Hudayriyat Island: elite men (sprint) | 2026-11-13, 16:00 local | `shachar-sagiv` (on his IF profile's next events; start list not published) | https://triathlon.org/events/2026-wtcs-abu-dhabi/start-lists · https://triathlon.org/athletes/profile/41870 | **none** (only `wtcs-abu-dhabi-2027`) | **Ranking**: up to 1000 OQR points. Create `wtcs-abu-dhabi-2026` (2026-11-13 to 2026-11-14). Session: date 2026-11-13, timeLocal 16:00, tz `Asia/Dubai` (= 12:00Z, 14:00 Israel), held until the start list shows him. This is also the Tongyeong result-night `next` (#95) |
| World Triathlon Cup Jeddah | 2026-11-28 to 2026-11-29 | Sagiv's entry is unknown (not on his profile's next events on 2026-10-18) | https://triathlon.org/news/world-triathlon-announces-two-new-additions-to-2026-world-cup-calendar | **none** | **Ranking**: up to 500 OQR points. Recheck his profile after Abu Dhabi |
| NCAA DI Great Lakes Regional (XC), Michigan State | 2026-11-13 | `matan-ivri` (Wisconsin); entry depends on the Big Ten meet | https://www.ncaa.com/news/cross-country-women/article/2026-07-17/2026-ncaa-cross-country-national-championships-date-time-tv-channel-history (via search) | **none** | **None** for LA28. Low priority; a session only if the record's `next` points to it |
| NCAA DI Cross Country Championships, Terre Haute | 2026-11-21 | `matan-ivri`, only if Wisconsin or he qualifies | same | **none** | **None** for LA28 |
| TCS New York City Marathon | 2026-11-01 | No Israeli found in the professional field announcement | https://citiusmag.com/articles/new-york-city-marathon-2026-professional-elite-field-obiri-kipruto-hassan-mantz-talbi-mcclain-kelati (media; the NYRR list was not read) | **none** | **Unknown** (WA LA28 system unpublished). Check NYRR's elite list before adding anything |

## Checked, nothing for Israelis in November
- **Sailing:** no quota event. The first is the 2027 Worlds in Fortaleza (January). No Olympic-class event with
  Israeli entries was found for November.
- **Rowing:** none. The next milestone is World Rowing naming the continental regatta venues by 2026-12-31.
- **Canoe:** none. No Israeli athletes are identified, and the slalom ranking resumes 2027-06-04.
- **Athletics (track):** off-season.

## Corrections made with this radar
- `docs/research/2026-10-18-radar-ofir.md` (#111) missed the WSL postseason stops. It now lists Portugal
  (Lelior not in the field), the Philippines Pro, and Pipe Masters' real dates (2026-12-08 to 2026-12-20).

## Next steps
1. Create competition records for `wtcs-abu-dhabi-2026` (and `wsl-philippines-pro-2026` only if Lelior is in the
   draw), with the official pages above as sources.
2. After the Tongyeong result (2026-10-24): recheck Sagiv's Abu Dhabi entry and add the held session.
3. Ask the Israel Surfing Association or the OCI whether Israel enters the ISA Games team. It is the only LA28
   quota event in my sports this month.
