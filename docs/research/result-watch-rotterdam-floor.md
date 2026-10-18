# Result watch: Rotterdam men's floor final, 2026-10-24 (Dolgopyat, Berkovich)

Owner: Roni. Sign-off: Tamar (values), Dana (session). Same style as `result-watch-rotterdam-wag.md`.
**Depends on #134:** the final is entered only after the **Official** qualification results confirm that both
qualified. The unofficial Longines Ranking shows Dolgopyat 3rd (14.300, Q) and Berkovich tied 7th (14.033, Q).

## Before the final
| When (IL) | What | Who |
|---|---|---|
| as soon as #134 has the Official PDF | If the PDF shows Q for one or both, move the floor final from `pendingFinalBlocks` in `data/sessions/roni.json` to `sessions`. If not, the session isn't added and their `next`/`nextDate` go to `""` | Roni → Dana |
| on adding the session | `id` = `ag-worlds-2026-20261024-mag-fx-final`, `date` 2026-10-24, `timeLocal` 14:00, `tz` Europe/Amsterdam (startUtc 12:00Z = 15:00 IL), `athleteIds` = the confirmed ones, `phase` = `גמר קרקע גברים`, `source` = FIG Work Plan (fidb_23944) | Roni |
| 24.10 morning | Check the final's start list (Longines → Men's Apparatus Finals → Start List) for withdrawals. A reserve (R1: Kovtun/Leykin, tied 9th) can step in. If an Israeli withdraws, remove them from `athleteIds` | Roni |

## The final
| When (IL) | What |
|---|---|
| 15:00–15:30 | Men's floor final: 14:00–14:30 Rotterdam. The block is in the FIG Work Plan, and the minutes come from the Longines schedule. On 24.10 both countries are still on summer time, so Israel is Rotterdam + 1 |
| from ~15:30 | Look for the **Official** final result on Longines, Men's Apparatus Finals → "Select file to download" → Floor Exercise Results. Live or Ranking pages and news are not a source |
| Official + 30 min | Fill in the values below and send them to Tamar. An editor applies them before the 25.10 run |

## Values to enter (`<N>` = 4–8, from the Official list)
Each athlete gets a write through `job/athlete_patch.py`:
- `"result": {"at": "2026-10-24", "text": …, "source": <Official PDF>}`
- `at` is the competition day.

The texts were built with `tri_results.he_date()` and the competition name from data.json, and pass
`athlete_patch.result_entry()` unchanged.

| Outcome | `result.text` | session `result` | other fields in the same write |
|---|---|---|---|
| Gold | `זהב בגמר הקרקע באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)` | `זהב` | `rank` → `זהב בקרקע, אליפות העולם 2026 (מיקום, לא דירוג)` |
| Silver | `כסף בגמר הקרקע באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)` | `כסף` | `rank` → `כסף בקרקע, אליפות העולם 2026 (מיקום, לא דירוג)` |
| Bronze | `ארד בגמר הקרקע באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)` | `ארד` | `rank` → `ארד בקרקע, אליפות העולם 2026 (מיקום, לא דירוג)` |
| 4–8 | `מקום <N> בגמר הקרקע באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)` | `מקום <N>` | `rank` is unchanged (a world final placing is weaker than the European gold) |
| Withdrew or DNS | no entry | session without that athlete | – |

- **In every case:**
  - `next` → `""`, `nextDate` → `""`, because no next competition is published. An editor can set a real one.
  - Session `resultSource` = the Official PDF, and `resultAt` = UTC at entry.
- **`rank` choice:** I picked the strongest recent placing. For Berkovich, a 4–8 in the world final is better than
  31st all-around at the Euros, so his `rank` → `מקום <N> בקרקע, אליפות העולם 2026 (מיקום, לא דירוג)`.
  Tamar decides.
- **No change to:**
  - `stage`;
  - `quotas.json`: the 2026 Worlds give no individual quotas (FIG criteria 4–7 are at the 2027 Worlds and the 2028 World Cups);
  - `rankNum`: FIG has no world ranking list in the #73 sense.
- **`meta/status` "מה התעדכן" (Omer):** a medal is a notable change. Send the final values to the coordinator after
  sign-off, as agreed. Rotterdam stays in "מה התעדכן" until 1.11.

## Risks
1. **#134 not resolved by 24.10.** Without Official qualification results, the session isn't added and the result
   isn't recorded. The result itself needs its own Official PDF anyway.
2. **Duplicate from the job** (the 25.10 run, step 2a): same risk as on 19.10. There is no gymnastics script, so the
   job's wording may differ. Enter before the run, and delete a duplicate after it. The longer-term fix is the
   proposed issue for `gym_results.py`.
3. **Clock change on the night of 25.10.** It doesn't affect 24.10. On 25.10 Israel is still Rotterdam + 1.
