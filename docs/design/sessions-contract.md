# Sessions: data contract (DB → data.json → #day)

Owner: Maya (data). Consumers: `#day` and `#following` (Itai, Noa; spec `docs/design/daily-and-following.md`, #130).
Inputs reconciled: Yael's proposal (#136, Doha shooting), Ofir's (#135, Tongyeong) and UX's (#130). This file is the
one contract. `job/export_data.py` and `job/validate_data.py` implement it, and a change to one is a change to all three.

## 1. DB: `sessions/<id>`
One document per session (one start on one day) of a competition with at least one Israeli. It stores **what the
official schedule prints**: the venue's local time and its IANA time zone. Nobody converts to Israel time by hand
(DST changes on 25.10 in Israel, and on other dates elsewhere).

| Field | Type | Rule |
|---|---|---|
| id | doc id | `<competitionId>-<YYYYMMDD>-<slug>`, e.g. `issf-wch-doha-2026-20261103-arm-q1` |
| competitionId | string | an existing `competitions` id |
| date | `YYYY-MM-DD` | the local day at the venue, inside the competition's `start`–`end` |
| timeLocal | `HH:MM` or `""` | the start in venue-local time, as printed. `""` if not published |
| tz | IANA name or `""` | e.g. `Asia/Qatar`, `Asia/Seoul`. Required with `timeLocal` |
| athleteIds | string[] | Israeli athlete ids, at least 1. A heat is listed per athlete only once the start list confirms it |
| phase | Hebrew, ≤ 120 | e.g. `רובה אוויר 10 מ׳ גברים – מוקדמות, מקצה 1` |
| source | https | the official schedule or start list |
| result | Hebrew, ≤ 120, or `""` | e.g. `מקום 12 במוקדמות, לא עלה לגמר`. Not a field of results, only the Israelis' outcome |
| resultSource | https or `""` | the official result list. Required with `result` |
| resultAt | ISO with Z, or `""` | when the result was recorded (UTC). Required with `result` |
| review | `{status, by, at}` | the fact-check. Only `ok` / `fixed` rows are exported (as for quota items); internal, never exported |
| updatedBy, notes, … | anything | internal. **Never exported** (whitelist) |

**Who writes:** research data (times, entrants) reaches the DB through a reviewed research PR, applied by an editor.
The daily job fills `result` / `resultSource` / `resultAt` from official lists only (phase 1.3), and never `athleteIds`
from a guess.

## 2. `data.json.sessions[]` (export, whitelist)
```json
{"id": "issf-wch-doha-2026-20261103-arm-q1", "competitionId": "issf-wch-doha-2026", "date": "2026-11-03",
 "startUtc": "2026-11-03T06:15:00Z", "athleteIds": ["sergey-richter"],
 "phase": "רובה אוויר 10 מ׳ גברים – מוקדמות, מקצה 1", "source": "https://…",
 "result": "", "resultSource": "", "resultAt": ""}
```
- **Exactly these keys.** Any other DB field is dropped.
- **`startUtc`** is computed by the export with `zoneinfo` from `date` + `timeLocal` + `tz`, as ISO with Z. It is
  `null` when the time isn't published, or when `timeLocal`/`tz` are invalid (the export reports that). The page never
  converts zones.
- **Text** goes through the export's `text()` (strip, geresh); `phase` and `result` are cut at 120 characters.
- **Order:** by `date`, then `startUtc` (untimed last), then `id`.
- **Dropped and reported** (the export's `dropped` list) when:
  - `review.status` isn't `ok` or `fixed` (unchecked, HOLD, partial, or missing): the fact-check gate;
  - `competitionId` is unknown or not exported;
  - `date` is invalid or outside the competition's dates;
  - `source` isn't https;
  - no `athleteIds` is left after removing unknown or archived athletes. Unknown ids are removed silently, and the
    session stays if any are left.
- **A result without its proof is not published.** If `result` is set but `resultSource` isn't https or `resultAt` isn't
  ISO with Z, all three export as `""` and the session id is reported.
- **Shrink guard:** `sessions` is counted like the other collections, so the export refuses to drop it by more than 20%
  (a dump that misses the collection can't empty `#day`).

## 3. Validator (`validate_data.py`, strict, blocks publishing)
- `sessions` is optional; when present it must be a list. Each entry has **exactly** the keys above.
- `id`: a unique, non-empty string.
- `competitionId`: in `competitions`; `date` within that competition's `start`–`end`.
- `startUtc`: `null` or ISO with Z.
- `athleteIds`: a non-empty list of unique ids, all in `athletes`.
- `phase`: a non-empty string; `phase` and `result`: ≤ 120 characters.
- `source`: https.
- `result`: `""` with `resultSource`/`resultAt` `""`, **or** non-empty with `resultSource` https and `resultAt` ISO with Z.
- Order: as in §2.

## 4. Page rules (from #130, for reference)
- Day key: the Israel date of `startUtc`, else `date`.
- "now": `startUtc` to `+3h`.
- The page still drops a session with an unknown competition or athletes, as defense in depth.
- `resultAt` feeds `#following` ("new since the last visit").

## 5. Mapping the research proposals
- **Yael's Doha rows:** `date` stays. `timeLocal` is the **Doha time from the ISSF schedule** (not the Israel time she
  computed), and `tz` = `Asia/Qatar`. `label` → `phase`; `israelis` → `athleteIds`. Rows with no Israeli (finals)
  aren't stored until someone qualifies. `quota` isn't stored (stakes come from `quotas.json`).
- **Ofir's Tongyeong row:** `date` 2026-10-24, `timeLocal` 10:30, `tz` `Asia/Seoul`. The session is entered only once
  the start list shows Sagiv.

## 6. Batches: `data/sessions/<name>.json` → DB (`job/load_sessions.py`)
Research reaches the DB as a reviewed batch file, never as hand-typed DB writes. The batch uses the quotas master's
convention: each session carries its own fact-check `review`.
```json
{"updatedAt": "2026-10-18T14:05:09Z",
 "sessions": [{"id": "ag-worlds-2026-20261019-wag-q7", "competitionId": "ag-worlds-2026", "date": "2026-10-19",
   "timeLocal": "16:00", "tz": "Europe/Amsterdam", "athleteIds": ["yali-shoshani"],
   "phase": "מוקדמות נשים, סבב 7 (מקבילים מדורגים)", "source": "https://…",
   "review": {"status": "ok", "by": "tamar", "at": "2026-10-19"}, "notes": "…"}]}
```
- **Top level:** `sessions` is required. `updatedAt` and `pendingFinalBlocks` are optional; the latter is the
  researcher's notes for blocks that are added only once an Israeli advances, and it isn't loaded. Nothing else is
  allowed.
- **Sign-off per session:** `review.status` must be `ok` or `fixed`, with a `by` and an `at` (YYYY-MM-DD).
  Otherwise the session is *skipped*: it isn't an error, and it isn't loaded.
- **Rules per session (errors; any error exits 1, and nothing should be written):**
  - The required keys are the 8 contract fields plus `review`.
  - The optional keys are `notes` (≤ 2000 characters, internal, never exported) and `result` / `resultSource` /
    `resultAt`. These are allowed **only empty**: the job writes results from official lists.
  - `id` is `<competitionId>-<YYYYMMDD of date>-<slug>`, with the slug in lowercase a-z, 0-9 and `-`. Ids are unique
    across all batches in the run.
  - `competitionId` is in the DB, and `date` is a real YYYY-MM-DD inside that competition's dates.
  - `timeLocal` is `HH:MM` venue time together with a valid IANA `tz`, or both are `""`.
  - `athleteIds` is a non-empty list of unique ids of non-archived DB athletes.
  - `phase` is non-empty and ≤ 120 characters. `source` is https.
- **The plan** (dry run, writes nothing):
  - `creates` are ready ArtifactData `set` entries for new ids. They have empty result fields, the `review` and
    `loadedFrom: <batch>`.
  - `changes` are existing ids with different fields. The coordinator reads each one and updates it with
    `if_version`. Results are never overwritten.
  - `unchanged` and `skipped` are listed.
  - `preview` gives `startUtc` and Israel time, to check against the research table before writing.
- **Run:**
  1. Dump the DB with `out_dir`: athletes, competitions and sessions.
  2. `python3 job/load_sessions.py <dump> data/sessions/*.json`
  3. With `errors = 0`, the coordinator writes `creates` as one ArtifactData batch, then the `changes`.
