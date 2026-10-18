# Triathlon: Sagiv's rank and result night for Tongyeong (2026-10-18)

Researcher: Ofir. Proposals only. Nothing is written to the DB or to `quotas.json`. Dana or Tamar signs off.

Sources:
- [PROFILE] https://triathlon.org/athletes/profile/41870 shows "World Ranking 63" and "Individual Olympic
  Qualification 91". Upcoming events: World Cup Tongyeong 2026-10-24, then WTCS Abu Dhabi 2026-11-13 to 2026-11-14.
- [OQR] https://triathlon.org/world-rankings/olympic/men, "World Triathlon Individual Olympic Qualification Ranking
  Elite Men", updated 2026-10-12, with 282 ranked.
- [QS] https://triathlon.org/news/the-olympic-qualification-pathways-to-the-la28-start-line (2026-05-19).
  Periods 2026-05-18 to 2027-05-18 and 2027-05-19 to 2028-05-18. The best 12 results count, and at most 8 of them
  can be shorter than Olympic distance. A World Cup is worth 500 points, WTCS 1000. On 2028-05-18 the top 21
  eligible athletes get places. Max 3 per NOC only with 3 in the top 30.
- [EVENT] https://triathlon.org/events/2026-world-triathlon-cup-tongyeong. Sprint distance, 2026-10-24.

## 1. Sagiv: 63 or 91?

**Recommendation:** use 91 (OQR) as the main figure, and keep 63 as context.

- PR #73's spec says the list behind `rankNum` must be the one that drives LA28 qualification. For triathlon that
  is the OQR. Only the OQR decides the 21 places, so a reader asking "is he on the way to LA28" needs 91.
- Likely cause of the gap: the OQR counts only results from 2026-05-18 [QS]. His 2025 results (World Cup win in
  Huatulco, World Cup bronze in Tongyeong) still help his World Ranking but not the OQR. This is an inference;
  the fact-checker should treat it as such, and it does not go in the public text.
- Context, not to publish: 91 is far from the 21 places. But the OQR has only five months of a two-year
  window in it, so the gap means little yet.

Proposed fields for `shachar-sagiv`:

| field | current | proposed |
|---|---|---|
| `rank` | "63 בעולם (World Triathlon, אוק׳ 2026)" | "91 בדירוג ההעפלה האולימפי, 63 בדירוג העולמי (World Triathlon, 2026-10-12)" |
| `rankNum` / `rankList` / `rankAsOf` | – | 91 / "World Triathlon Individual Olympic Qualification Ranking" / "2026-10-12" (same as Yael's #84) |
| `source` | [PROFILE] | Keep. It shows both numbers. |

[PROFILE] has no date of its own, so the date comes from [OQR]. The World Ranking page date was not checked
separately; Yael's #84 says it was also updated on 2026-10-12. If Dana can't confirm that, drop "63" rather than
show it with an unchecked date.

## 2. Result night: Tongyeong World Cup, 2026-10-24

**What can and can't happen:** a World Cup awards no quota. It adds up to 500 OQR points [QS]. Since it is a
sprint, it counts toward the limit of 8 shorter-distance results. Expected outcome: no `earned` status, no stage
change, and no stage proposal. If the job proposes one, reject it.

**Before the race:**
- Confirm Sagiv is on the elite men start list (event page → Start Lists). He is listed in [PROFILE], but I did
  not see the start list itself.
- Get the race start time from the event's schedule. Korea is 6 hours ahead of Israel on 2026-10-24.
- The fixture has no 2026 Tongyeong or 2026 WTCS Abu Dhabi competition record, only 2027 events. Add both to
  `competitions` (qualifying: true, source [EVENT] / the WTCS event page) so the today strip and digest show them.

**Official source on the night:** the results tab on [EVENT] (World Triathlon results). Copy its exact URL when
it goes live. Use only a list marked final. TriathlonLIVE and news stories are not sources.

**Athlete record `shachar-sagiv`, same night:**

| field | change |
|---|---|
| `history` | Add `{"at": "2026-10-24", "kind": "result", "text": "מקום <N> בגביע העולם בטריאתלון טונגיונג (ספרינט)", "source": <results URL>}` |
| `next` / `nextDate` | "סבב האליפות העולמית (WTCS) אבו דאבי" / "2026-11-13". Check that he is on that start list first. Otherwise set `null`. |
| `notes` | Add the result only if it is a podium or a career best |
| `stage` | No change (stays 1) |
| `rank`, `rankNum`, `rankAsOf` | **Not on the night.** Update them from the first OQR list dated after the race (World Triathlon updates it weekly). `rankAsOf` = that list's date. |

**Quota item 34** (`triathlon` / `אישי גברים`), via the result-night runbook, steps 2, 3, 5 and 6 (no step 4):

| field | change |
|---|---|
| `israelStatus` | Keep `in-contention` |
| `israelNote` | Add "מקום <N> בטונגיונג (2026-10-24)" |
| `stakes` | Rewrite for the next event: "WTCS אבו דאבי (2026-11-13–2026-11-14): עד 1000 נקודות לדירוג ההעפלה האישי, שב-2028-05-18 יחלק 21 מקומות" |
| `nextQuotaEvent` | `{"name": "סבב האליפות העולמית בטריאתלון, אבו דאבי", "start": "2026-11-13", "end": "2026-11-14"}` |
| `review` | `{"status": "unchecked", ...}` until signed off |

If Sagiv does not start (DNS) or is not on the list, only `nextQuotaEvent` / `next` change, and the history
entry is skipped.

## Open
- Sagiv's entry on the Tongyeong and Abu Dhabi start lists (not seen yet).
- The race start time in Tongyeong.
- The World Cup points scale by place (only the winner's 500 is confirmed). Don't publish points per place
  until checked against the WT ranking rules.
