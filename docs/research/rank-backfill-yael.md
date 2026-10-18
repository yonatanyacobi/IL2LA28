# Rank backfill – Yael (triathlon, weightlifting, shooting)

Per `docs/product/spec-rank-tiebreak.md` (PR #73). Read on 2026-10-18 from official IF pages. Not written to the DB;
the coordinator applies these after Dana's check.

| athleteId | rankNum | rankList | rankAsOf | source |
|---|---|---|---|---|
| `shachar-sagiv` | 91 | World Triathlon Individual Olympic Qualification Ranking | 2026-10-12 | https://triathlon.org/world-rankings/olympic/men (page reads "Updated 12 Oct 2026"; Sagiv's row shows rank 91. The same 91 is on https://triathlon.org/athletes/profile/41870) |
| `sergey-richter` | 55 | ISSF World Ranking | 2026-10-01 | https://www.issf-sports.org/competitions/worldranking/ARM ("Version: 01.10.2026", 10m Air Rifle Men, rank 55, rating 706). Also the xlsx: https://backoffice.issf-sports.org/getfile.aspx?mod=docf&pane=1&inst=474&iist=385&file=World-Ranking-20261001.xlsx |
| `celia-gold` | null | IWF Olympic Qualification Ranking | – | Not readable: iwf.sport is behind a bot-check, and her Olympic category is unverified. Leave the fields empty |
| Olga Tashtchiev (not in DB; only if D5 is approved) | 22 | ISSF World Ranking | 2026-10-01 | https://www.issf-sports.org/competitions/worldranking/ARW (10m Air Rifle Women, rank 22, rating 1614) |

## Notes for the fact-checker / coordinator
- **Sagiv:** the display `rank` says "63 בעולם" (the World Triathlon *World Ranking*, also updated 12 Oct 2026). Per the spec,
  `rankNum` uses the Olympic qualification list, so it is 91. Suggest updating `rank` to match:
  "91 בדירוג ההעפלה האולימפי (World Triathlon, 12.10.2026)". Or keep 63 in the text and accept the mismatch.
  Triathlon now belongs to Ofir; flag it to him.
- **Richter:** matches the existing `rank` text (55, ISSF, Oct 2026).

## Ranking list per sport (fills the spec table)
| Sport | rankList | Note |
|---|---|---|
| triathlon | World Triathlon Individual Olympic Qualification Ranking | Published on triathlon.org, updated weekly |
| shooting | ISSF World Ranking | Monthly (1st of the month); per event |
| weightlifting | IWF Olympic Qualification Ranking (OQR) | Named in the IWF LA28 system (https://cdn.nocnsf.nl/media/nlsj0xsh/wlf-la28-qualification-system.pdf). Not fetchable here, so the daily job will likely fail too |
| athletics | – | Now Ofir's sport; left to him |
