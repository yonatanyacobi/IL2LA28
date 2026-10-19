# Runbook: WTCS Abu Dhabi, 13.11 (triathlon, Sagiv)

For the coordinator (the only DB writer). Owner: Ofir. Built on his `docs/research/2026-10-18-ofir-triathlon.md` and
`2026-10-18-radar-ofir.md`, and on the Tongyeong pattern in [result-night-2410.md](result-night-2410.md): a manual
entry in the job's exact string, so the job's run sees it as recorded and skips it.
Israel = Abu Dhabi − 2 (winter time).

Sagiv (`shachar-sagiv`), elite men, individual **sprint on 13.11**. The mixed relay on 14.11 has no tracked
Israeli team. No quota is decided here: up to 1000 points on the individual Olympic qualification ranking; item 34
stays `in-contention`, no `stage` change.

## Why a manual entry
`tri_results.py` only reads a competition after its **end** date. The record ends 14.11, so the job would record
Sagiv's 13.11 result only on the 15.11 run. We enter it on 13.11 instead, in the string `tri_results.result_text()`
builds, which the job then skips (same `at` and `text`).

## Before

| By | Step | Who |
|---|---|---|
| after 24.10 | `next`/`nextDate` → `סבב האליפות העולמית (WTCS) אבו דאבי` / `2026-11-13`, only once the Abu Dhabi start list shows him (Ofir's plan) | Ofir → coordinator |
| done | Competition record `wtcs-abu-dhabi-2026` is in the DB (name above; source the triathlon.org race-info page, whose `2026-wtcs-abu-dhabi` slug is what `tri_results` matches). Confirm it reaches the **published** data.json | Ofir |
| 1.11 | Session row for the men's sprint, start time from the event's schedule, Dana signs | Ofir → Dana → coordinator |
| 11.11 | Start list: Sagiv on it? No: outcome DNS, no session, `next`/`nextDate` → `""` | Ofir |
| 11.11 | If the record's name changed since 18.10, regenerate the strings: `python3 -c "import sys; sys.path.insert(0,'job'); import tri_results as t; print(t.result_text({'position': 7}, '<record name>', 'sprint', '2026-11-13')[1])"` (and `'DNF'`, `'DSQ'`) | Ofir → Tamar |
| 11.11 | Item 34 after Abu Dhabi: `stakes` and `nextQuotaEvent` for the next event (not in Ofir's plan yet) | Ofir |
| 12.11 | Mixed relay (14.11, 16:15 Abu Dhabi time): "Team I Israel" is entered (team 126834), with no members named as of 19.10. Check the members on https://triathlon.org/events/api/startlist/195143/676642 (the data behind the Mixed Relay start list). No tracked athlete in it: nothing to do. A tracked athlete in it: add a relay session for Dana, and watch for risk 2 below. Untracked athletes only: note them for the coordinator; the team decides whether to track the relay | Ofir |

## 13.11

| When | Step | Who |
|---|---|---|
| race (per the schedule) | – | – |
| after the race | Results tab on https://triathlon.org/events/2026-wtcs-abu-dhabi, **final list only** (every row validated). TriathlonLIVE and news are not sources | Ofir |
| final + 30 min | Values → Tamar | Ofir |
| after Tamar, before the next morning's 07:13 daily run | Steps 1–3 below | coordinator |
| 15.11 run | `runs/2026-11-15`: no second Abu Dhabi entry and no "תוצאות טריאתלון" warning. A second entry: delete the **manual** one (the job's text is the API's) and tell Omer | Ofir |

## Coordinator steps

1. **Athlete write** through `job/athlete_patch.py`: `"result": {"at": "2026-11-13", "text": …, "source": "https://triathlon.org/events/2026-wtcs-abu-dhabi"}`.
   On a podium also the job's notes string (Values), so no proposal is opened.
   `rank` waits for the first OQR list after 13.11.
2. **Session**: `result`, `resultSource` (the results tab as on the night), `resultAt` = `date -u +%Y-%m-%dT%H:%M:%SZ`.
3. **"מה התעדכן"**, podium only: `טריאתלון: שחר שגיב סיים <ראשון/שני/שלישי> בסבב האליפות העולמית באבו דאבי (ספרינט)`
   (Shira's Tongyeong form; Shira to confirm).

## Values (`<N>` = his place)

Generated with `tri_results.result_text()` from the DB record's name, `סבב האליפות העולמית בטריאתלון (WTCS) אבו דאבי`:

| Outcome | `result.text` | session `result` |
|---|---|---|
| Finished | `מקום <N> בסבב האליפות העולמית בטריאתלון (WTCS) אבו דאבי (ספרינט, 13 בנוב׳ 2026)` | `מקום <N>` |
| DNF | `לא סיים/ה את סבב האליפות העולמית בטריאתלון (WTCS) אבו דאבי (13 בנוב׳ 2026)` | `לא סיים` |
| DSQ | `נפסל/ה בסבב האליפות העולמית בטריאתלון (WTCS) אבו דאבי (13 בנוב׳ 2026)` | `נפסל` |
| DNS | no entry | – |

Podium `notes` string (the job's): `מקום <N> בסבב האליפות העולמית בטריאתלון (WTCS) אבו דאבי 2026`. If the record's name changes, regenerate (command in Before).

## Risks
1. **Distance label:** "ספרינט, " appears only if the API's `prog_distance_category` is `sprint`. Otherwise the 15.11
   run adds a second entry (fix as above).
2. **Relay rows:** the job reads every "Elite…" program. If Sagiv also starts in the mixed relay on 14.11, the job
   may match his relay row; check `runs/2026-11-15`.
