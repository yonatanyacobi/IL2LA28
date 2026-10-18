# Runbook: result nights 29–31.10, Grand Slam Abu Dhabi (judo)

For the coordinator (the only DB writer). Texts come unchanged from Roni's plans: the judo checklist in
[publishing.md](publishing.md) (history and "מה התעדכן"), [abu-dhabi-outcomes.md](abu-dhabi-outcomes.md) (quota
`stakes`), and `data/sessions/roni.json` / `docs/research/sessions-roni.md` (sessions). This file only orders them.
All times are Israel time: from 25.10 Israel is on winter time, so Israel = Abu Dhabi − 2.

No quota is decided here: `israelStatus` stays `in-contention`, no `stage` change, and `rankNum` waits for the next
IJF WRL PDF.

| Day | Athlete | id | Category |
|---|---|---|---|
| 29.10 | יצחק אשפיז | `izhak-ashpiz` | 60- ק״ג (גברים) |
| 29.10 | גפן פרימו | `gefen-primo` | 52- ק״ג (נשים) |
| 29.10 | תמנע נלסון לוי | `timna-nelson-levy` | 57- ק״ג (נשים) |
| 30.10 | יהונתן אלבז | `yonatan-elbaz` | 73- ק״ג (גברים) |
| 31.10 | רז הרשקו | `raz-hershko` | 78+ ק״ג (נשים) |

Not entered (IJF list, 18.10): כרם פרימו (63-), ענבר לניר (78-). Re-check all of this after the draw.

## Sequence

| When | Step | Who |
|---|---|---|
| by 28.10 | Each judoka's `nextDate` = their actual day (29.10: Ashpiz, G. Primo, Nelson Levy; 30.10: Elbaz; 31.10: Hershko) | Roni |
| 28.10, 12:00 | Online draw (judotv.com). Re-check entries on https://www.ijf.org/competition/3157/judoka_athletes. A withdrawal: no history entry, out of the session's `athleteIds`, and outcome (ד) on 1.11 | Roni |
| 28.10, after the draw | Fill `timeLocal` of the three prelim sessions from the IJF/judobase schedule (the Outlines say "TBC"); Dana signs them (`review` is `unchecked` today) and they load through `job/load_sessions.py`. No time published: keep them out | Roni → Dana → coordinator |
| each day, prelims (time per the draw) | Watch https://www.ijf.org/competition/3157/results. That page only; no news, no judobase live | Roni |
| an Israeli reaches the final block (semi-final or repechage) | Move that day's block from `pendingFinalBlocks` to `sessions` (17:00 Asia/Dubai = 15:00 Israel) with their `athleteIds`; Dana signs | Roni → Dana → coordinator |
| each day, 15:00 → end of the final block | Final block | – |
| each evening, once IJF shows the day's results | Values below → Dana | Roni |
| after Dana, **before the 23:45 daily run** | Steps 1–3 below | coordinator |
| next morning | `runs/<next day>`: no second Abu Dhabi entry for that athlete. There is no judo results script, so the job's wording can differ; if it wrote one, delete the job's entry and tell Maya | Roni |
| 1.11 | One quotas.json PR for all 7 judo items (`stakes`, `nextQuotaEvent`) per abu-dhabi-outcomes.md, through result-night.md. Until it is live the items show "◷ בהמתנה לתוצאות" | Roni → Dana → lead |

## Coordinator steps (per judoka, on their day)

1. **Athlete write** through `job/athlete_patch.py` (cur.json = the athlete as read), then `update` with its
   `if_version`: `"result": {"at": "<YYYY-MM-DD of their day>", "text": <history text>, "source": "https://www.ijf.org/competition/3157/results"}`.
   `rank` and `rankNum` don't change; `next`/`nextDate` per Values.
2. **Session**: `result`, `resultSource` = https://www.ijf.org/competition/3157/results, `resultAt` =
   `date -u +%Y-%m-%dT%H:%M:%SZ`; all three, or the export blanks the result. Day 1 holds three judoka: join as
   `<name>: <result> · <name>: <result> · <name>: <result>`. A final-block session gets only the judoka in it.
3. **"מה התעדכן"**: medals only. Prepend `{"at": "<their day>", "text": "ג׳ודו: <name> – <history text>", "athleteId": …}`
   to `meta/status` `changes`, `if_version` from your read, keep 30. The digest shows it once (publishing.md D3).

## Values

History text (publishing.md):

`<זהב|כסף|ארד|מקום 5|מקום 7|הודח/ה <ROUND>> בגרנד סלאם אבו דאבי, <weight> (<DD> באוק׳ 2026)`

- `<weight>` = the category without the bracket, e.g. `57- ק״ג`; `<DD>` = 29, 30 or 31. The date is in the job's
  style, so the job doesn't record it twice.
- `<ROUND>` as in abu-dhabi-outcomes.md, e.g. `בסיבוב הראשון`, `ברבע הגמר`.
- Gender: הודח for Ashpiz and Elbaz, הודחה for G. Primo, Nelson Levy and Hershko.
- Session `result`: the same outcome words (`זהב`, `כסף`, `ארד`, `מקום 5`, `מקום 7`, `הודח/ה <ROUND>`).
- Didn't fight (withdrew, DNS): no entry.
- In the same write: `next` = `""`, `nextDate` = `""`, unless an official entry list for the next event already
  has them (then that event and its start date).

Example (made up): `ארד בגרנד סלאם אבו דאבי, 57- ק״ג (29 באוק׳ 2026)`; "מה התעדכן":
`ג׳ודו: תמנע נלסון לוי – ארד בגרנד סלאם אבו דאבי, 57- ק״ג (29 באוק׳ 2026)`.

Quota `stakes` after the event: the texts (א)–(ד) in abu-dhabi-outcomes.md, with `<PTS>` from its IJF table.

## Decided (coordinator, 18.10)

Date in the job's style; rounds from abu-dhabi-outcomes.md; `next`/`nextDate` cleared unless an official entry
exists; Elbaz is יהונתן (the DB name; abu-dhabi-outcomes.md has יונתן).
