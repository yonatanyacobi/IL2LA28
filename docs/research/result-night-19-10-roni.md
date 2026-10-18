# Result night 19.10.2026: Rotterdam women's qualification. Copy sheet (Roni)

Only `<N>`, `<OFFICIAL_PDF>` and, after a Q, the order of finals need filling in. Everything else is final.
The plan and its rules are in `result-watch-rotterdam-wag.md` (#184). Texts are the output of
`gym_results.result_text("qual", …)` (#219), and every one passes `athlete_patch.result_entry()`.

## Sessions (start list checked on Longines, 18.10)
| Sub | Rotterdam | Israel | Who | Session id |
|---|---|---|---|---|
| 7 | 16:00–17:20 | **17:00–18:20** | Shoshani (bars, AS 1). Same sub as GBR, NED, AS 2 | `ag-worlds-2026-20261019-wag-q-sub7` |
| 10 | 21:10–22:30 | **22:10–23:30** | Raz, Shamai (AA 1). Same sub as CHN, AA 5, KOR | `ag-worlds-2026-20261019-wag-q-sub10` |

The start list (https://gym.longinestiming.com/2026/Artistic-17247/en-us/Default/Phase/StartList/000018010002000100)
puts Shoshani with KUNDRAT and KUNAVER (AS 1) and the British team, and Raz and Shamai with the Chinese team. This
matches FIG's Drawing of Lots.

## Where to look
**To follow live (not a source):** the Longines women's qualification ranking pages. They answer `curl` with its
default UA (Maya, #219) and carry no "Official" mark.
- vault: https://gym.longinestiming.com/2026/Artistic-17247/en-us/Default/Phase/Ranking/00001801000200010001
- unevenbars: https://gym.longinestiming.com/2026/Artistic-17247/en-us/Default/Phase/Ranking/00001801000200010002
- balancebeam: https://gym.longinestiming.com/2026/Artistic-17247/en-us/Default/Phase/Ranking/00001801000200010003
- floor: https://gym.longinestiming.com/2026/Artistic-17247/en-us/Default/Phase/Ranking/00001801000200010004
- allaround: https://gym.longinestiming.com/2026/Artistic-17247/en-us/Default/Phase/Ranking/00001801000200010011

**Sources to record:**
1. **FIG Official result PDFs** on the event page https://www.gymnastics.sport/site/events/detail.php?id=17247
   (`asset.php?id=fidb_…` links). To list them: `python3 job/gym_results.py fig-docs "https://www.gymnastics.sport/site/events/detail.php?id=17247"`.
   Take only a document whose title is a results document.
2. Or the Longines PDF stamped "Official": Women's Qualifications → "Select file to download" → All-Around / Uneven
   Bars / Vault / Balance Beam / Floor Exercise Results.

If neither exists after sub 10, **enter nothing**. Raz and Shamai's ranks depend on all 10 subs, and so does
Shoshani's rank on bars.

Reading the rows: `python3 job/gym_results.py ranking <url>` (dry, JSON). Then check the number against the Official
PDF.

## Copy payloads: `new.json` for `athlete_patch.py` (one result per write)
### yali-shoshani (bars)
| Outcome | new.json | session `result` |
|---|---|---|
| Q to the bars final | `{"result": {"at": "2026-10-19", "text": "מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלה/תה לגמר", "source": "<OFFICIAL_PDF>"}, "source": "<OFFICIAL_PDF>", "next": "אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר מקבילים מדורגים נשים", "nextDate": "2026-10-24"}` | `מקום <N> במקבילים, עלתה לגמר` |
| Reserve R1–R3 | `{"result": {"at": "2026-10-19", "text": "מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלה/תה לגמר", "source": "<OFFICIAL_PDF>"}, "source": "<OFFICIAL_PDF>"}` plus `"next": "אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר מקבילים מדורגים נשים (מחליפה)", "nextDate": "2026-10-24"` | `מקום <N> במקבילים, מחליפה <R>` |
| Not qualified | `{"result": {"at": "2026-10-19", "text": "מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלה/תה לגמר", "source": "<OFFICIAL_PDF>"}, "source": "<OFFICIAL_PDF>", "next": "", "nextDate": ""}` | `מקום <N> במקבילים, לא עלתה לגמר` |

### lihie-raz and roni-shamay (all-around): one write each
| Outcome | new.json | session `result` |
|---|---|---|
| Q to the AA final | `{"result": {"at": "2026-10-19", "text": "מקום <N> בקרב־רב במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלה/תה לגמר", "source": "<OFFICIAL_PDF>"}, "source": "<OFFICIAL_PDF>", "next": "אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר קרב־רב נשים", "nextDate": "2026-10-23"}` | `מקום <N> בקרב־רב, עלתה לגמר` |
| Reserve R1–R3 | `{"result": {"at": "2026-10-19", "text": "מקום <N> בקרב־רב במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלה/תה לגמר", "source": "<OFFICIAL_PDF>"}, "source": "<OFFICIAL_PDF>"}` plus `"next": "אליפות העולם בהתעמלות מכשירים, רוטרדם – גמר קרב־רב נשים (מחליפה)", "nextDate": "2026-10-23"` | `מקום <N> בקרב־רב, מחליפה <R>` |
| Not qualified | `{"result": {"at": "2026-10-19", "text": "מקום <N> בקרב־רב במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלה/תה לגמר", "source": "<OFFICIAL_PDF>"}, "source": "<OFFICIAL_PDF>", "next": "", "nextDate": ""}` | `מקום <N> בקרב־רב, לא עלתה לגמר` |

**Apparatus final as well** (a separate write after the AA write; no `next`, the AA write already set the nearest):
- vault: `{"result": {"at": "2026-10-19", "text": "מקום <N> בקפיצות במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלה/תה לגמר", "source": "<OFFICIAL_PDF>"}, "source": "<OFFICIAL_PDF>"}`
- unevenbars: `{"result": {"at": "2026-10-19", "text": "מקום <N> במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלה/תה לגמר", "source": "<OFFICIAL_PDF>"}, "source": "<OFFICIAL_PDF>"}`
- balancebeam: `{"result": {"at": "2026-10-19", "text": "מקום <N> בקורה במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלה/תה לגמר", "source": "<OFFICIAL_PDF>"}, "source": "<OFFICIAL_PDF>"}`
- floor: `{"result": {"at": "2026-10-19", "text": "מקום <N> בקרקע במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלה/תה לגמר", "source": "<OFFICIAL_PDF>"}, "source": "<OFFICIAL_PDF>"}`

- **`next` when there is more than one final:** the nearest one (23 → 24 → 25.10).
- **If she has an apparatus final but no AA final:** the apparatus write also carries `next` and `nextDate` for that
  final.

## Session results (DB → sessions/<id>)
For each Israeli outcome:
- `result` as in the tables;
- `resultSource` = `<OFFICIAL_PDF>`;
- `resultAt` = `date -u +%Y-%m-%dT%H:%M:%SZ` at entry.

Two athletes share sub 10's single `result` field, so write both: `רז: מקום <N> בקרב־רב, …; שמאי: מקום <N> בקרב־רב, …`
(at most 120 characters).

## After a Q
Move the final from `pendingFinalBlocks` to `sessions`, with that athlete only and review `unchecked`. Dana signs.

## Order of work
1. Sub 7 ends at 18:20. Shoshani's rank is still provisional, so enter nothing.
2. Sub 10 ends at 23:30. Wait for the Official PDF.
3. Fill in the payloads.
4. Tamar checks the numbers against the PDF.
5. The editor applies them before the 20.10 run.
