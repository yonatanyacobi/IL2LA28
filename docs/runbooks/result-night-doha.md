# Runbook: result days 3–4.11, ISSF World Championship, Doha (shooting)

For the coordinator (the only DB writer). Quota texts and rules come from
[doha-outcomes.md](doha-outcomes.md) (dates there are now `3 בנוב׳ 2026`, as in #190); sessions from `data/sessions/yael.json` and `docs/research/sessions-yael.md`;
the quota procedure from [result-night.md](result-night.md). This file only orders them.
All times are Israel time (winter time from 25.10: Israel = Doha − 1).

**Quotas are decided here, on 3.11 only:** 3 per event (men's and women's 10m air rifle), max one per country, MQS
613.0. The quota belongs to Israel, not the shooter. Who won one is read **only** from the ISSF quota tracker, never
worked out from the results. The mixed team on 4.11 has no quotas.

| Athlete | id | 3.11 | 4.11 |
|---|---|---|---|
| סרגיי ריכטר | `sergey-richter` | 10m air rifle men (quota item `רובה אוויר 10 מ׳ גברים`) | mixed team |
| אולגה טשצ׳ייב | `olga-tashtchiev` (in the live DB; her Hebrew name is an unverified transliteration, unchanged on the night) | 10m air rifle women (quota item `רובה אוויר 10 מ׳ נשים`) | mixed team |

## Before

| By | Step | Who |
|---|---|---|
| 2.11 evening | ISSF start lists: each Israeli's relay. Replace each `…-q` session with `-q1`/`-q2` and its `timeLocal` (Asia/Qatar), per the session `notes` in yael.json; Dana signs | Yael → Dana → coordinator |
| 2.11 | Re-check `nextQuotaEvent`: Tallinn 2027 if its date is out, else New Delhi 21–30.4.2027 (doha-outcomes.md) | Yael |

## Sequence, 3.11

| When | Step | Who |
|---|---|---|
| 08:15 / 10:15 | Men's qualification, relay 1 / 2 | – |
| 12:15 / 14:15 | Women's qualification, relay 1 / 2 | – |
| after each qualification | Top 8 → final: add the final as a session with that `athleteIds` (men 13:30, women 17:30), Dana signs | Yael → Dana → coordinator |
| 13:30–14:30 | Men's final | – |
| 17:30–18:15 | Women's final | – |
| after each final | Results: https://www.issf-sports.org/competitions/3421/results. Quota status: https://www.issf-sports.org/competitions/olympic-qualification-tracker/quota-place-by-nation-and-number | Yael |
| results + 30 min | Athlete and session values → Dana; quota item per doha-outcomes.md (א)–(ד) → Dana (+ Tamar for `earned`) | Yael |
| after sign-off, **before the next morning's 07:13 daily run** | Steps 1–3 below | coordinator |
| tracker not updated yet | "Provisional": facts only, no word "מכסה", no stage proposal; repeat when the tracker updates | Yael |

## Sequence, 4.11 (mixed team, no quotas)

Qualification 08:15 / 09:45, final 12:30–13:15. A history entry is optional (doha-outcomes.md); `quotas.json`
doesn't change.

## Coordinator steps (per athlete)

1. **Athlete write** through `job/athlete_patch.py`: `"result": {"at": "2026-11-03", "text": …, "source": <results URL>}`,
   with `next`/`nextDate` = the next event from doha-outcomes.md. `rank` waits for the ISSF ranking of 1.12.2026.
2. **Session**: `result`, `resultSource` = the results URL, `resultAt` = `date -u +%Y-%m-%dT%H:%M:%SZ`; all three.
3. **Quota (א) only:** a stage-2 proposal with the ISSF tracker link, approved by an editor
   (result-night.md step 4), then the quotas.json PR with `earned` (Dana + Tamar). (ב)–(ד): the quotas.json PR only.
4. **"מה התעדכן"**: only for a quota or a medal. Prepend to `meta/status` `changes` with `athleteId`, `at` = the day.

## "מה התעדכן" drafts

From doha-outcomes.md (א) without the date (it's in `at`). Prefix exactly `קליעה: `.

**סרגיי ריכטר** (`sergey-richter`)
- Quota: `קליעה: סרגיי ריכטר זכה במכסה לישראל ברובה אוויר 10 מ׳ באליפות העולם בדוחא, מקום <P> בגמר`
- Medal without a quota: `קליעה: סרגיי ריכטר זכה ב<זהב/כסף/ארד> ברובה אוויר 10 מ׳ באליפות העולם בדוחא`

**אולגה טשצ׳ייב** (`olga-tashtchiev`)
- Quota: `קליעה: אולגה טשצ׳ייב זכתה במכסה לישראל ברובה אוויר 10 מ׳ באליפות העולם בדוחא, מקום <P> בגמר`
- Medal without a quota: `קליעה: אולגה טשצ׳ייב זכתה ב<זהב/כסף/ארד> ברובה אוויר 10 מ׳ באליפות העולם בדוחא`

## Open (ask Yael / Shira)

- **No history (`result.text`) wording for the athletes.** doha-outcomes.md has only the quota items' `israelNote`.
  Yael is writing a line per outcome (final place, qualification place with score, didn't start), dates in the job's style
  `(3 בנוב׳ 2026)`. Until then the coordinator can't do step 1.
- **Medal line** above is mine; doha-outcomes.md has no medal wording. Shira is checking it.
