# Runbook: result day 24.10, Tongyeong triathlon + Rotterdam men's floor final

For the coordinator (the only DB writer). Values and texts come unchanged from Ofir's
`docs/research/result-watch-tongyeong.md` (#160, not yet on `main`) and Roni's
[result-watch-rotterdam-floor.md](../research/result-watch-rotterdam-floor.md); this file only orders them.
All times are Israel time (24.10 is still summer time: Seoul − 6, Rotterdam + 1).

| Athlete | id | Event | Start | Plan |
|---|---|---|---|---|
| שחר שגיב | `shachar-sagiv` | World Cup Tongyeong, elite men, sprint | 04:30 | Ofir |
| איתמר לבנון | `itamar-levanon` | same race (added 19.10, same session row) | 04:30 | Ofir |
| ארטיום דולגופיאט | `artem-dolgopyat` | Worlds Rotterdam, men's floor final | 15:00 | Roni, **only if #134 confirms Q** |
| נועם ברקוביץ | `noam-berkovich` | same | 15:00 | same |

## Sequence

| When | Step | Who |
|---|---|---|
| 22.10 | Sagiv in the elite men start list? Yes: apply the session row from `data/sessions/ofir.json` (without `notes`) and the item 34 `stakes` from #135. No: outcome D in #95, no session row | Ofir → Tamar → editor |
| as soon as #134 has the official FIG source | Q for one or both: move the floor final from `pendingFinalBlocks` in `data/sessions/roni.json` to `sessions` (`ag-worlds-2026-20261024-mag-fx-final`, 14:00 Europe/Amsterdam, `athleteIds` = the confirmed ones, `phase` `גמר קרקע גברים`). No Q: no session, and their `next`/`nextDate` → `""` | Roni → Dana signs the session |
| 24.10, 04:30–~05:30 | Tongyeong men's race | – |
| from ~06:00 | Results tab on https://triathlon.org/events/2026-world-triathlon-cup-tongyeong, **final list only** (every row validated). TriathlonLIVE and news are not sources | Ofir |
| final + 30 min | Values below → Tamar | Ofir |
| after Tamar | Tongyeong steps 1–3 below. Item 34 (quotas.json) goes through the result-night runbook PR, not here | coordinator; owner for item 34 |
| 24.10 morning | Floor final start list on FIG's live site (https://live.gymnastics.sport/schedule.php?idevent=17247 → Men's Apparatus Finals → Start List): a withdrawn Israeli comes out of `athleteIds`; a reserve (R1) can step in | Roni |
| 15:00–15:30 | Men's floor final | – |
| from ~15:30 | **Official** result on FIG's live site (https://live.gymnastics.sport/schedule.php?idevent=17247): first the Results PDF, Men's Apparatus Finals → Results → Floor (`link.php?id=<N>`, a PDF titled "Men's Floor Exercise Final", footer "Official Results Provider"); fallback, the floor-final standings page there once it says OFFICIAL. Longines, Phase/Ranking pages and news are not sources. Details: [rotterdam-outcomes.md](rotterdam-outcomes.md) | Roni |
| Official + 30 min | Values below → Tamar (values) | Roni |
| after Tamar | Floor steps 1–3 below, **before the 25.10 run** | coordinator |
| 25.10 run | `runs/2026-10-25`: no second Tongyeong or Rotterdam entry. A second Tongyeong entry: delete the **manual** one (the job's text is the API's) and tell Omer. A second Rotterdam entry: delete the **job's** one and tell Maya | Ofir, Roni |

No final/Official list by the 25.10 run: wait. Nothing is recorded from another source.

## Coordinator steps (per athlete)

1. **Athlete write** through `job/athlete_patch.py` (cur.json = the athlete as read), then `update` with its
   `if_version`. One write per athlete, `result.at` = `"2026-10-24"`:
   - Tongyeong: `"result": {"at": "2026-10-24", "text": …, "source": "https://triathlon.org/events/2026-world-triathlon-cup-tongyeong"}`,
     plus `next` = WTCS Abu Dhabi / `nextDate` = `2026-11-13` only if his entry there is shown, and `notes` on a podium.
     Sagiv: entered for Abu Dhabi on WT's entry list (19.10), so set it. Levanon: `next`/`nextDate` → `""`; he is only
     wait-listed (54th) for the Hong Kong World Cup (7.11), which has no competition record.
   - Floor: `"result": {"at": "2026-10-24", "text": …, "source": <Official PDF>}`, plus `rank` per the table,
     and `next` = `""`, `nextDate` = `""` in every case.
2. **Session**: `result` from the table, `resultSource` (Tongyeong: the results tab URL as it is on the night;
   floor: the Official PDF), `resultAt` = `date -u +%Y-%m-%dT%H:%M:%SZ`. All three, or the export blanks the result.
   Floor session with both athletes: `ארטיום דולגופיאט: <result> · נועם ברקוביץ: <result>`.
3. **"מה התעדכן"**: Tongyeong: a podium only. Floor (and every other final): **every finisher gets a line**, medal or
   not, so the 25.10 digest shows how everyone finished (coordinator's decision, 18.10). Prepend the line below to
   `meta/status` `changes` (`{"at": "2026-10-24", "text": …, "athleteId": …}`), `if_version` from your read, keep 30.

**Don't change:** `stage` (both); `rankNum`; `quotas.json` for gymnastics (no individual quotas at the 2026 Worlds).
Sagiv's rank waits for the first Olympic qualification ranking list dated after 24.10.

## Values: Tongyeong (`<N>` = his place)

`result.text` must match `tri_results.result_text()` character for character, or the 25.10 run adds a second entry.
The same table applies to Levanon. The distance is ספרינט (WT event data: 'Events Specification' Sprint).
The session row lists both athletes, so its `result` is `שחר שגיב: <result> · איתמר לבנון: <result>`.

| Outcome | `result.text` | session `result` | `notes` |
|---|---|---|---|
| 4th or lower | `מקום <N> בגביע העולם בטריאתלון טונגיונג (ספרינט, 24 באוק׳ 2026)` | `מקום <N>` | no change |
| Podium (1–3) | same text | `מקום <N>` | append `מקום <N> בגביע העולם בטריאתלון טונגיונג 2026` |
| DNF | `לא סיים/ה את גביע העולם בטריאתלון טונגיונג (24 באוק׳ 2026)` | `לא סיים` | no change |
| DSQ | `נפסל/ה בגביע העולם בטריאתלון טונגיונג (24 באוק׳ 2026)` | `נפסל` | no change |
| Lapped (LAP) | `הוקף ולא סיים את גביע העולם בטריאתלון טונגיונג (24 באוק׳ 2026)`. Manual only: `tri_results` writes nothing for LAP, so this can't duplicate | `הוקף` | no change |
| DNS / not on the list | no entry, no session row | – | no change |

## Values: floor final (`<N>` = 4–8, from the Official list)

| Outcome | `result.text` | session `result` | `rank` |
|---|---|---|---|
| Gold | `זהב בגמר הקרקע באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)` | `זהב` | `זהב בקרקע, אליפות העולם 2026 (מיקום, לא דירוג)` |
| Silver | `כסף בגמר הקרקע באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)` | `כסף` | `כסף בקרקע, אליפות העולם 2026 (מיקום, לא דירוג)` |
| Bronze | `ארד בגמר הקרקע באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)` | `ארד` | `ארד בקרקע, אליפות העולם 2026 (מיקום, לא דירוג)` |
| 4–8 | `מקום <N> בגמר הקרקע באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)` | `מקום <N>` | unchanged; for Berkovich Roni proposes `מקום <N> בקרקע, אליפות העולם 2026 (מיקום, לא דירוג)`, **Tamar decides** |
| Withdrew / DNS | no entry | session without him | – |

## Drafts for "מה התעדכן" (`meta/status`)

Tongyeong: podium only. Finals: every finisher. The date is in `at`; keep the sport prefix exactly
(`changeSport()` in digest.js matches it). No trailing period.

**שחר שגיב** (`shachar-sagiv`), Tongyeong 1–3:
- `טריאתלון: שחר שגיב סיים <ראשון/שני/שלישי> בגביע העולם בטונגיונג (ספרינט)`

**ארטיום דולגופיאט** (`artem-dolgopyat`) / **נועם ברקוביץ** (`noam-berkovich`), floor:
- Gold: `התעמלות מכשירים: <name> זכה בזהב בגמר הקרקע באליפות העולם ברוטרדם`
- Silver: `התעמלות מכשירים: <name> זכה בכסף בגמר הקרקע באליפות העולם ברוטרדם`
- Bronze: `התעמלות מכשירים: <name> זכה בארד בגמר הקרקע באליפות העולם ברוטרדם`
- 4–8: `התעמלות מכשירים: <name> סיים במקום <N> בגמר הקרקע באליפות העולם ברוטרדם`

The same form covers the other Rotterdam finals (women's all-around 23.10, bars 24.10, day 2 on 25.10): see
"Finals results" in [result-night.md](result-night.md).

Rotterdam stays in "מה התעדכן" until 1.11 (results of a running competition don't reach "תוצאות השבוע").

## Not covered yet

- **Women's bars final, also 24.10 at 15:00** (14:00 Rotterdam), if Shoshani (or Raz/Shamay) qualifies on 19.10.
  The "מה התעדכן" line follows the template in result-night.md; the history `result.text` still needs Roni's wording.
- **#134 unresolved by 24.10:** no floor session and no floor result; their `next`/`nextDate` stay until it is.
