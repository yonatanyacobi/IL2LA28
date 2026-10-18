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

## Proposed competition record: `wtcs-abu-dhabi-2026` (for Tamar's sign-off)
It uses the same fields as the existing records (e.g. `tri-world-cup-tongyeong-2026`). An editor creates it in the DB
after sign-off. Every value is from the World Triathlon race-info page, read on 2026-10-18: "Nov 13-14, 2026",
Hudayriyat Island, elite women 14:00, elite men 16:00, mixed relay 2026-11-14 16:15, all sprint distance.

```json
{
 "id": "wtcs-abu-dhabi-2026",
 "sportId": "triathlon",
 "name": "סבב האליפות העולמית בטריאתלון (WTCS) אבו דאבי",
 "location": "האי הודיירייאת, אבו דאבי, איחוד האמירויות",
 "start": "2026-11-13",
 "end": "2026-11-14",
 "notes": "ספרינט; נשים ב־14:00 וגברים ב־16:00 ב־13.11, שליחים מעורבים ב־14.11 ב־16:15 (שעון אבו דאבי)",
 "source": "https://triathlon.org/events/2026-wtcs-abu-dhabi/race-info",
 "qualifying": true,
 "review": {"status": "ok", "by": "tamar", "at": "2026-10-18"}
}
```
Signed off by Tamar (also checked against World Triathlon API event 195143). `review` is the fact-check marker, the
same as on quota items and sessions. `export_data.py` exports only `COMP_FIELDS` + `qualifying`, so it never reaches
data.json.
`qualifying: true`: it awards up to 1000 points on the individual Olympic qualification ranking (21 places on
2028-05-18). Source: https://triathlon.org/news/the-olympic-qualification-pathways-to-the-la28-start-line

The session that follows goes into `data/sessions/ofir.json` (contract §6 batch format) once the record exists. It
stays `unchecked` until the start list shows Sagiv:
`{"id": "wtcs-abu-dhabi-2026-20261113-men", "competitionId": "wtcs-abu-dhabi-2026", "date": "2026-11-13", "timeLocal": "16:00", "tz": "Asia/Dubai", "athleteIds": ["shachar-sagiv"], "phase": "סבב האליפות העולמית בטריאתלון – עלית גברים, ספרינט", "source": "https://triathlon.org/events/2026-wtcs-abu-dhabi/start-lists", "review": {"status": "unchecked", "by": "ofir", "at": "2026-10-18"}}`
That gives startUtc 2026-11-13T12:00:00Z, 14:00 in Israel (checked with `export_data.start_utc`).

## ISA World Surfing Games: Israel's entry (checked 2026-10-18)
**Not confirmed. The ISA has not published entries.**
- The official event page (https://isasurf.org/event/2026-isa-world-surfing-games/) and the participants' info page
  (https://isasurf.org/info-for-event-participants-2026-wsg/) list no nations, teams or names. Searching both
  pages for "Israel" finds nothing; they only describe the LA28 team slots.
- The only team announced anywhere is the USA (USA Surfing, via media). There is nothing from the Israel Surfing
  Association or the OCI in Hebrew or English.
- So `isa-wsg-2026` gets no session, and item 42's israelNote ("השתתפות ישראל במשחקי ISA 2026 לא אומתה") stays
  as is. Recheck the ISA page when the heat draw is published (usually a few days before 2026-11-06), and ask the
  OCI or the Israel Surfing Association directly.

## Next steps
1. Create competition records for `wtcs-abu-dhabi-2026` (and `wsl-philippines-pro-2026` only if Lelior is in the
   draw), with the official pages above as sources.
2. After the Tongyeong result (2026-10-24): recheck Sagiv's Abu Dhabi entry and add the held session.
3. Ask the Israel Surfing Association or the OCI whether Israel enters the ISA Games team. It is the only LA28
   quota event in my sports this month.
