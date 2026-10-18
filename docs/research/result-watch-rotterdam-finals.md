# Result watch: Rotterdam finals after qualification (22–25.10.2026)

Owner: Roni. Sign-off: Tamar (values), Dana (sessions). Same format as `result-watch-rotterdam-wag.md` (#184) and
`result-watch-rotterdam-floor.md`. Covers Omer's gap (#216):
- the all-around finals of 22 and 23.10;
- the apparatus finals on 24.10 (women's vault and bars);
- the apparatus finals on 25.10 (women's beam and floor).

The men's floor final on 24.10 is in `result-watch-rotterdam-floor.md`.

## Who can be in a final
| Final | Israelis who may take part | Decided by |
|---|---|---|
| Men's AA, 22.10 | **Probably none.** In the unofficial Longines ranking Berkovich was 37th (77.065), and the 24th qualifier scored 78.998. Liubimov, Pyatov and Ortal didn't do all-around | the Official men's qualification PDF (#134) |
| Men's apparatus, 25.10 (vault, parallel bars, horizontal bar) | **Probably none** (Pyatov 35th on parallel bars, Ortal 100th on horizontal bar, unofficial) | same |
| Women's AA, 23.10 | Raz, Shamai | the Official women's qualification PDF, 19.10 (#184 texts) |
| Women's vault/bars, 24.10; beam/floor, 25.10 | Raz, Shamai, Shoshani (bars only) | same |

Rows for a final with no Israeli aren't needed. The men's rows are here only in case the Official PDF differs from
the unofficial ranking.

## Timing (Rotterdam time, Israel = +1 throughout)
- **Blocks:** from the FIG Work Plan. The all-around finals run 19:30–22:00, and the apparatus finals 14:00–18:00 each day.
- **Apparatus minutes:** from the Longines schedule (FIG's results provider). On 25.10 both countries change to winter
  time, but the gap stays one hour.

## Session row (add only for a confirmed finalist; review `unchecked`)
Move the matching block from `pendingFinalBlocks` in `data/sessions/roni.json` to `sessions`.
- `timeLocal`: the start above; `tz` Europe/Amsterdam.
- `athleteIds`: the confirmed Israelis only.
- `phase`: as in the table; for example `גמר קרב־רב נשים`, `גמר מקבילים מדורגים נשים`.
- `source`: the FIG Work Plan (fidb_23944).

## Values to enter, from the Official final PDF only
Use `job/athlete_patch.py` with `"result": {"at": <day>, "text": …, "source": <Official PDF>}`. Every text is the output of
`gym_results.result_text("final", …)` from #219, the one wording the job uses too (with `tri_results.he_date()`
and the data.json competition name). Each passes `athlete_patch.result_entry()`.

| Final (Rotterdam time) | Medal: `result.text` | Place `<N>`: `result.text` | Places | Official PDF (Longines → …) |
|---|---|---|---|---|
| קרב־רב גברים, 22.10, 19:30 (20:30 IL) | `<זהב / כסף / ארד> בגמר קרב־רב באליפות העולם בהתעמלות מכשירים 2026 (22 באוק׳ 2026)` | `מקום <N> בגמר קרב־רב באליפות העולם בהתעמלות מכשירים 2026 (22 באוק׳ 2026)` | 4–24 | Men's All-Around Final → Results |
| קרב־רב נשים, 23.10, 19:30 (20:30 IL) | `<זהב / כסף / ארד> בגמר קרב־רב באליפות העולם בהתעמלות מכשירים 2026 (23 באוק׳ 2026)` | `מקום <N> בגמר קרב־רב באליפות העולם בהתעמלות מכשירים 2026 (23 באוק׳ 2026)` | 4–24 | Women's All-Around Final → Results |
| קפיצות נשים, 24.10, 14:37 (15:37 IL) | `<זהב / כסף / ארד> בגמר קפיצות באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)` | `מקום <N> בגמר קפיצות באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)` | 4–8 | Apparatus Finals → Vault Results |
| מקבילים מדורגים נשים, 24.10, 16:30 (17:30 IL) | `<זהב / כסף / ארד> בגמר מקבילים מדורגים באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)` | `מקום <N> בגמר מקבילים מדורגים באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)` | 4–8 | Apparatus Finals → Uneven Bars Results |
| קורה נשים, 25.10, 14:42 (15:42 IL) | `<זהב / כסף / ארד> בגמר קורה באליפות העולם בהתעמלות מכשירים 2026 (25 באוק׳ 2026)` | `מקום <N> בגמר קורה באליפות העולם בהתעמלות מכשירים 2026 (25 באוק׳ 2026)` | 4–8 | Apparatus Finals → Balance Beam Results |
| קרקע נשים, 25.10, 16:30 (17:30 IL) | `<זהב / כסף / ארד> בגמר קרקע באליפות העולם בהתעמלות מכשירים 2026 (25 באוק׳ 2026)` | `מקום <N> בגמר קרקע באליפות העולם בהתעמלות מכשירים 2026 (25 באוק׳ 2026)` | 4–8 | Apparatus Finals → Floor Exercise Results |

- Write a medal as one word, for example `ארד בגמר קורה ב…`. This is the result_text wording, without ה.
- `<N>` is the official place.

**Other fields in the same write:**
- **Session `result`:** `זהב` / `כסף` / `ארד` / `מקום <N>`, with `resultSource` = the Official PDF and `resultAt` =
  UTC at entry.
- **`rank`:** after a medal only:
  - all-around: `<מדליה> בקרב־רב, אליפות העולם 2026 (מיקום, לא דירוג)`;
  - apparatus: `<מדליה> ב<מכשיר>, אליפות העולם 2026 (מיקום, לא דירוג)`.

  A place without a medal leaves `rank` alone. Raz and Shamai already show a Challenge Cup gold, so Tamar decides
  whether to replace it.
- **`next` / `nextDate`:** the next Rotterdam final she is still in, by the order rule in #184 (23 → 24 → 25.10). After
  her last final, `""` / `""`.
- **Not touched:** `stage`, `quotas.json`, `rankNum`. The 2026 Worlds give no individual quotas.
- **"מה התעדכן" (Omer):** send a medal to the coordinator as final values after sign-off.

## Risks
- **Official PDF:** the same problem as #134. Nothing is recorded from Live or Ranking pages.
- **A duplicate from the job's next run:** enter before the run, and delete any duplicate afterwards (#168).
- **A reserve called up:** if the start list of a final shows a reserve Israeli, add the session first and enter the
  result in the usual way.
