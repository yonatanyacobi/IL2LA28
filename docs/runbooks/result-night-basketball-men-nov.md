# Runbook: men's World Cup 2027 qualifiers, window 5 (27 and 30.11)

For the coordinator (the only DB writer). Owner: Yael. Games, times and FIBA game ids from her
`data/sessions/yael-2.json` and `docs/research/radar-2026-11-yael.md`; both sessions are already in the DB. Same
pattern and draft wording as the women's window (`result-night-basketball-women-nov.md`, #214); texts are
**drafts for Yael and Shira**.

Team: נבחרת ישראל בכדורסל (גברים), `israel-basketball-men`. Group K; after the August 2026 window Israel is 6th
(last), 2–6 (quota item `basketball` / `גברים`).

| Game | Session id | Local | Israel | FIBA game |
|---|---|---|---|---|
| 27.11 הולנד–ישראל, האג | `fiba-wc-2027-eq-w5-20261127-ned-isr` | 20:00 The Hague | 21:00 | 127123 |
| 30.11 ישראל–לטביה, ריגה | `fiba-wc-2027-eq-w5-20261130-isr-lat` | 19:30 Riga | 19:30 | 127126 |

**What's at stake:** the top 3 of each group go to the 2027 World Cup, whose results shape the routes to the 2028
Olympic qualifying tournaments; teams that miss it go to the August 2027 pre-qualifiers. No quota or `stage`
change. No "מה התעדכן" line for a single game.

## Before

| By | Step | Who |
|---|---|---|
| 24.11 | `next`/`nextDate` of the team = the 27.11 game | Yael |
| 24.11 | Wording approved (the women's drafts, once Shira has signed them) | Yael → Shira |

## Each game

| When | Step | Who |
|---|---|---|
| game + ~2h (27.11 ~23:00, 30.11 ~21:30) | Final score from the FIBA game page (id above). Other box scores and news are not sources | Yael |
| + 30 min | Values → Dana | Yael |
| after Dana, before the 23:45 run | Steps 1–2. On 27.11 the window is tight: if Dana hasn't signed by 23:30, enter after the run and delete any job entry next morning | coordinator |

1. **Team write** through `job/athlete_patch.py`: `"result": {"at": "<game day>", "text": …, "source": <FIBA game page>}`;
   `next`/`nextDate` → the 30.11 game after 27.11, and `""` after 30.11 until the next window is official.
2. **Session**: `result`, `resultSource` = the FIBA game page, `resultAt` = `date -u +%Y-%m-%dT%H:%M:%SZ`; all three.

Next morning: check `runs/` for a second entry from the job (there is no FIBA results script); delete the job's
and tell Maya.

## After 30.11: the quota item

Only from FIBA's official group standings, never worked out by us: if FIBA's standings show Israel can no longer
finish top 3, the item's `israelNote` / `stakes` / `nextQuotaEvent` move to the August 2027 pre-qualifiers, through
result-night.md (Yael → Dana → lead). Otherwise only `israelNote` with the new record.

## Drafts (Yael / Shira to approve)

Dates in the job's style; score `<HI>:<LO>`, higher first (a dash flips in RTL).
- History: `ניצחון <HI>:<LO> על הולנד במוקדמות מונדיאל 2027 (27 בנוב׳ 2026)` /
  `הפסד <HI>:<LO> להולנד במוקדמות מונדיאל 2027 (27 בנוב׳ 2026)`; same for לטביה (30 בנוב׳ 2026).
- Session `result`: `ניצחון <HI>:<LO> על הולנד` / `הפסד <HI>:<LO> להולנד` (לטביה on 30.11).
