# Spec: break stakes ties by world rank

Status: draft for the researchers (Roni, Yael) and the lead. Owner: PM.

## Problem
On a busy competition day the today strip shows only `STAKES_MAX` stakes lines per competition. They're ordered
followed → listed in the row → file order (`site/app.js`, the strip's `rank()` helper). File order is arbitrary. On 29.10
(Abu Dhabi, 7 judo items) the visible lines may skip the world #1 (Raz Hershko) for an unranked athlete. Today's
`rank` field is free Hebrew text ("41 בעולם ב-3000 מ׳ מכשולים (World Athletics, אוק׳ 2026)", or a placing such as
"מקום 7 בגמר"), so it can't be sorted.

## Data: three new athlete fields
| Field | Type | Rule |
|---|---|---|
| `rankNum` | int ≥ 1, or `null` | Position on the ranking named in `rankList`. `null` when only a placing is known; never derive it from a placing |
| `rankList` | short string | The official list name, in English as the IF writes it (e.g. "IJF World Ranking List"). Required when `rankNum` is set |
| `rankAsOf` | `YYYY-MM-DD` | The list's publication date. Required when `rankNum` is set |

- The free-text `rank` stays, unchanged, as the display string. `rankNum` is never shown on its own in v1.
- The source is the record's `source`, or the `history` entry of kind `rank` written in the same update.
- **Which list:** the ranking that drives LA28 qualification in that sport, if one exists (e.g. the Olympic
  qualification ranking); otherwise the IF's official world ranking. One list per sport, recorded in the table below.
  Teams use the team ranking (FIBA, WBSC, etc.).
- **Comparisons are only within one sport.** The strip groups by competition, so this always holds.

## Behaviour
1. **Today strip stakes order:** followed → listed in the row → **best (lowest) `rankNum` among the item's athletes** →
   file order. An item whose athletes have no usable `rankNum` sorts after ranked items.
2. A `rankNum` with `rankAsOf` more than 60 days old is ignored for sorting.
3. The same tie-break applies to the digest's per-quota-event athlete lists. Sport pages and `#quotas` keep their
   status order (no change).
4. Known weakness: `quotaAthletes()` matches athletes to items by name inside `israelNote`/`stakes`. Ranking makes a bad
   match visible, so the dev also adds a smoke test that each judo stakes item resolves to its athlete. An explicit
   `athleteIds` on quota items is a separate, later story.

## Who fills it
- **Daily job (direct write, like `rank`):** in its sport rotation, when it reads a number from the official list page in
  that run, it sets `rankNum`/`rankList`/`rankAsOf` together with `rank` and the history entry. If it can't read a
  number, it leaves the fields untouched (never sets 0 or a guess). Human edits win, as today. SKILL.md + export + validator.
- **Researchers, one-off backfill** for the athletes in the next 2 weeks' events. Each row gives the number, list, date and URL:
  - Roni: judo (Abu Dhabi 29.10), plus taekwondo and fencing (the strategy's ranking-tracker sports).
  - Yael: triathlon (Sagiv), weightlifting (Gold), shooting (Richter, Tashtchiev if D5 is approved).
  - Everyone else is filled by the job's rotation over the following ~7 days.
- **Dana:** spot-checks 1 in 5 backfilled values against the list URL.
- **Editors:** the 3 fields are added to the edit dialog (`EDIT_FIELDS`) as an optional row.

## Ranking list per sport (researchers fill; first draft for the near-term sports)
| Sport | List (`rankList`) | Confirmed by |
|---|---|---|
| judo | IJF World Ranking List | Roni |
| athletics | World Athletics World Rankings (event-specific) | Yael |
| triathlon | World Triathlon Olympic Qualification Ranking (if published), else World Ranking | Yael |
| weightlifting | IWF ranking used by the LA28 system: **to confirm** | Yael |
| shooting | ISSF World Ranking (quotas come from results, so the rank is a tie-break only) | Yael |
| others | the IF's world ranking | the job, gradually |

## Build split (after the researchers confirm the lists)
- Maya (S): export, validator and SKILL.md fields (int ≥ 1 or null, both companions required, date format).
- Noa (S): strip and digest sort, smoke tests (Abu Dhabi fixture: Hershko's item is visible), edit dialog row.
- Done when on fake 29.10 the strip shows the ranked judo items first, and nothing changes for sports without `rankNum`.
