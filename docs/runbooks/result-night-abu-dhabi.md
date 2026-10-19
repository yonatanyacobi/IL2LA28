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
| 29.10 | מתן קוקולייב | `matan-kokolayev` | 66- ק״ג (גברים) |
| 29.10 | טום שמחייב | `tom-simkhaev` | 66- ק״ג (גברים) |
| 30.10 | יהונתן אלבז | `yonatan-elbaz` | 73- ק״ג (גברים) |
| 30.10 | אוהד מוריץ | `ohad-moritz` | 73- ק״ג (גברים) |
| 30.10 | מאיה גושן | `maya-goshen` | 70- ק״ג (נשים) |
| 31.10 | יוסיף סימין | `iosif-simin` | 100- ק״ג (גברים) |
| 31.10 | רוי סיון | `roy-sivan` | 90- ק״ג (גברים) |
| 31.10 | רז הרשקו | `raz-hershko` | 78+ ק״ג (נשים) |

Not entered (IJF list, 18.10): כרם פרימו (63-), ענבר לניר (78-). Goshen, Simin, Kokolayev, Simkhaev, Moritz and
Sivan were added to the DB after abu-dhabi-outcomes.md; their entries, like everyone's, are re-checked after the draw. Quota
items exist for 70- and 100- (9 judo items on 19.10) but not for 66- or 90-, so the 1.11 quotas PR doesn't change
for Kokolayev, Simkhaev or Sivan. Two categories hold two judoka each: 66- (Kokolayev, Simkhaev) and 73- (Elbaz,
Moritz).

## Sequence

| When | Step | Who |
|---|---|---|
| by 28.10 | Each judoka's `nextDate` = their actual day (29.10: Ashpiz, G. Primo, Nelson Levy, Kokolayev, Simkhaev; 30.10: Elbaz, Moritz, Goshen; 31.10: Simin, Sivan, Hershko; already so in the DB on 19.10) | Roni |
| 28.10, 12:00 | Online draw (judotv.com). Re-check entries on https://www.ijf.org/competition/3157/judoka_athletes. A withdrawal: no history entry, out of the session's `athleteIds`, and outcome (ד) on 1.11 | Roni |
| 28.10, after the draw | The prelims are 9 signed sessions, one per category (`judo-gs-abu-dhabi-2026-<day>-<category>-prelims`), with no time yet. Fill each `timeLocal` from the IJF/judobase schedule (the Outlines say "TBC"); Dana re-signs, and they load through `job/load_sessions.py`. Step by step: the draw-day checklist in [abu-dhabi-outcomes.md](abu-dhabi-outcomes.md#יום-ההגרלה-28102026-שעות-ההתחלה-של-סשני-המוקדמות). No time published: keep `timeLocal` `""` | Roni → Dana → coordinator |
| each day, prelims (time per the draw) | Watch https://www.ijf.org/competition/3157/results. That page only; no news, no judobase live | Roni |
| an Israeli reaches the final block (semi-final or repechage) | Move that day's block from `pendingFinalBlocks` to `sessions` (17:00 Asia/Dubai = 15:00 Israel) with their `athleteIds`; Dana signs | Roni → Dana → coordinator |
| each day, 15:00 → end of the final block | Final block | – |
| each evening, once IJF shows the day's results | Values below → Dana | Roni |
| after Dana, **before the next morning's 07:13 daily run** | Steps 1–3 below | coordinator |
| next morning | `runs/<next day>`: no second Abu Dhabi entry for that athlete. The job (`judo_results.py`, SKILL 2g) writes only places 1–7 from the IJF results page, in the same words as step 1 below, so a place entered on the night is skipped; a different one is a warning, not a second entry. Eliminations are only ever entered on the night | Roni |
| 1.11 | One quotas.json PR for all 9 judo items (`stakes`, `nextQuotaEvent`) per abu-dhabi-outcomes.md, through result-night.md. Until it is live the items show "◷ בהמתנה לתוצאות" | Roni → Dana → lead |

## Coordinator steps (per judoka, on their day)

1. **Athlete write** through `job/athlete_patch.py` (cur.json = the athlete as read), then `update` with its
   `if_version`: `"result": {"at": "<YYYY-MM-DD of their day>", "text": <history text>, "source": "https://www.ijf.org/competition/3157/results"}`.
   `rank` and `rankNum` don't change; `next`/`nextDate` per Values.
2. **Session**: `result`, `resultSource` = https://www.ijf.org/competition/3157/results, `resultAt` =
   `date -u +%Y-%m-%dT%H:%M:%SZ`; all three, or the export blanks the result. Each category has its own session; 66- (29.10) holds Kokolayev and
   Simkhaev, 73- (30.10) Elbaz and Moritz: join as `<name>: <result> · <name>: <result>`. A final-block session gets only the judoka in it.
3. **"מה התעדכן"**: medals only. Prepend `{"at": "<their day>", "text": "ג׳ודו: <name> <זכה/זכתה> ב<זהב/כסף/ארד> בגרנד סלאם אבו דאבי, <weight>", "athleteId": …}`
   (the finals template in result-night.md: gendered verb, no date, since it's in `at`, no trailing period)
   to `meta/status` `changes`, `if_version` from your read, keep 30. The digest shows it once (publishing.md D3).

## Values

History text (publishing.md):

`<זהב|כסף|ארד|מקום 5|מקום 7|הודח/ה <ROUND>> בגרנד סלאם אבו דאבי, <weight> (<DD> באוק׳ 2026)`

Build it with the job's own function, so the morning run matches it:
`python3 job/judo_results.py text <1|2|3|5|7|out> "גרנד סלאם אבו דאבי" <-66> <2026-10-29> <m|f> ["<ROUND>"] [bye]`.
The round is required with `out` and must be one of the forms in `judo_results.ROUNDS` (before the quarter-final: a
quarter-final loser goes to the repechage and gets a place). Read it from the IJF draw page for the category
(`/competition/3157/draw?id_weight=…`): the bracket column of their last bout. The results page lists places only.
**Bye** (Shira, #381): when the draw shows no bout for them in column 1, add `bye`. Only with `בסיבוב השני`, it gives
`הודח בקרב הפתיחה בסיבוב השני` / `הודחה בקרב הפתיחה בסיבוב השני`. For the shared session (66-, 73-),
`judo_results.join_session` builds `<name>: <result> · <name>: <result>`.

- `<weight>` = the category without the bracket, e.g. `57- ק״ג`; `<DD>` = 29, 30 or 31. The date is in the job's
  style, so the job doesn't record it twice.
- `<ROUND>` as in abu-dhabi-outcomes.md, e.g. `בסיבוב הראשון`, `בסיבוב השני` (never `ברבע הגמר`; see above).
- Gender: הודח for Ashpiz, Kokolayev, Simkhaev, Elbaz, Moritz, Simin and Sivan; הודחה for G. Primo, Nelson Levy, Goshen and Hershko.
- Session `result`: the same outcome words (`זהב`, `כסף`, `ארד`, `מקום 5`, `מקום 7`, `הודח <ROUND>` / `הודחה <ROUND>`),
  in the athlete's own form as above, never the slash.
- Didn't fight (withdrew, DNS): no entry.
- In the same write: `next` = `""`, `nextDate` = `""`, unless an official entry list for the next event already
  has them (then that event and its start date).

Example (made up): `ארד בגרנד סלאם אבו דאבי, 57- ק״ג (29 באוק׳ 2026)`; "מה התעדכן":
`ג׳ודו: תמנע נלסון לוי – ארד בגרנד סלאם אבו דאבי, 57- ק״ג (29 באוק׳ 2026)`.

Quota `stakes` after the event: the texts (א)–(ד) in abu-dhabi-outcomes.md, with `<PTS>` from its IJF table.

## Decided (coordinator, 18.10)

Date in the job's style; rounds from abu-dhabi-outcomes.md; `next`/`nextDate` cleared unless an official entry
exists; Elbaz is יהונתן (the DB name; abu-dhabi-outcomes.md has יונתן).
