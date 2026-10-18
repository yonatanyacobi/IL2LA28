# Sessions, 2026-10-18 to 2026-10-31: Ofir's sports

Checked on 2026-10-18. All times are local, with Israel time alongside. Israel moves from UTC+3 to UTC+2 on
2026-10-25. Rowing, canoe, sailing and surfing have no sessions in this window: the next is the ISA World Surfing
Games from 2026-11-06 (see `docs/research/2026-10-18-radar-ofir.md`).

| Date | Event | Session | Local time | Israel time | Israelis | LA28 weight | Source |
|---|---|---|---|---|---|---|---|
| 2026-10-18 | Amsterdam Marathon | Marathon (mass start) | 09:00 CEST | 10:00 | Maru Teferi, Selamawit Teferi (`next` in data.json) | Unknown: World Athletics LA28 system unpublished | Time only from a third-party listing (runabc.co.uk), not the organiser. **Unverified** |
| 2026-10-24 | World Triathlon Cup Tongyeong | Elite women | 08:00 KST | 02:00 | none | n/a | data.json fixture `tri-world-cup-tongyeong-2026` (from the race-info page) |
| 2026-10-24 | World Triathlon Cup Tongyeong | **Elite men, sprint** | 10:30 KST | **04:30** | Shachar Sagiv. Start list not published on 2026-10-18 | Ranking: up to 500 Olympic qualification ranking points | https://triathlon.org/events/2026-world-triathlon-cup-tongyeong/start-lists ("Oct 24, 2026, 10:30") |
| 2026-10-30 | Big Ten Cross Country Championships, Madison | Men's and women's races; the first race starts at 10:45 CDT, the men's time is not listed separately | 10:45 CDT | 17:45 | Matan Ivri (`next` in data.json) | None | https://uwbadgers.com/news/2026/7/29/mens-cross-country-wisconsin-announces-2026-cross-country-schedule (via search) |

## Tongyeong: Sagiv's entry and the results job

**Entry:** not confirmed yet. On 2026-10-18 the start-list page showed the men's time (10:30) but no names.
Recheck on 2026-10-22 and record the bib here. Note from main's audit (docs/audit/2026-10-18.md): he did not
finish (DNF) in Beijing on 2026-10-17, a week before Tongyeong.

**Profile id vs `job/tri_results.py`:** this matches. The job finds the athlete through
`PROFILE = triathlon.org/athletes/profile/(\d+)` in the athlete's `source`, and then through `name_en`
equal to the result's `athlete_title`.
- `shachar-sagiv.source` = https://triathlon.org/athletes/profile/41870. That page is Sagiv's profile, with
  "World Ranking 63" and "Individual Olympic Qualification 91".
- The test fixture (`tests/test_tri_results.py`) uses `athlete_id=41870`.
- `name_en` = "Shachar Sagiv", the same spelling as the profile.
- `tri-world-cup-tongyeong-2026.source` (…/events/2026-world-triathlon-cup-tongyeong/race-info) yields the slug
  `2026-world-triathlon-cup-tongyeong`, the same as the event page URL.
- `nextDate` = 2026-10-24, inside the competition dates, so `entrants()` picks him up.

Risks:
1. I did not query the API. The key is the job's, and the public site's profile id is assumed to be the API's
   `athlete_id`. The name fallback covers a mismatch.
2. If a rank update changes `source` away from the profile URL, only the name match remains. Keep the profile
   URL in `source` and put the ranking-list URL in the history entry.

## Item 34 `stakes`: proposed wording (Tamar signs off by 2026-10-22)

The current text says "שגיב רשום לתחרות (World Triathlon)". On 2026-10-18 that is backed only by his profile's
"next events", not by a start list.

| When | `stakes` |
|---|---|
| Now, until the start list | "גביע העולם בטונגיונג (2026-10-24, ספרינט; גברים ב־10:30 שעון קוריאה, 04:30 בישראל): עד 500 נקודות לדירוג ההעפלה האישי, שב־2028-05-18 יחלק 21 מקומות; רשימת המזנקים טרם פורסמה" |
| Sagiv on the start list | Same, ending "…21 מקומות; שגיב ברשימת המזנקים (World Triathlon)" |
| Not on the list | Move `stakes` and `nextQuotaEvent` to WTCS Abu Dhabi (2026-11-13), as in #95's outcome D |

The source for the time is the start-lists page above. `nextQuotaEvent` gets `"end": "2026-10-24"`. Set `review`
to unchecked when applying.
