# Runbook: European Sixes, Salou (lacrosse), women 2–9.11, men 10–18.11

For the coordinator (the only DB writer). Sources: the lacrosse quota item in `data/quotas/quotas.json` (Salou top-5
path, signed off by Dana), Yael's session row in `data/sessions/yael.json`, and her radars. No plan has result
wording yet, so the texts below are **drafts for Yael and Shira**, not approved copy.
Israel = Salou + 1 (both on winter time).

| Team | id | Competition | Dates |
|---|---|---|---|
| נבחרת ישראל בלקרוס סיקסס (נשים) | `israel-lacrosse-women-sixes` | `lacrosse-european-sixes-2026-women` | 2–9.11 |
| נבחרת ישראל בלקרוס סיקסס (גברים) | `israel-lacrosse-men-sixes` | `lacrosse-european-sixes-2026-men` | 10–18.11 |

**What's at stake:** the top 5 at Salou go straight to the World Sixes 2027, where 4 Olympic places per gender are
decided. Salou gives **no Olympic quota**: the quota item stays `in-contention`, no `stage` change.

## Before

| By | Step | Who |
|---|---|---|
| 26.10 | The women's session row is on HOLD (no schedule as of 18.10). Once ELF/World Lacrosse publish groups and times: one session per Israeli game day, `timeLocal` as printed, `tz` Europe/Madrid; Dana signs. Same for the men before 10.11 | Yael → Dana → coordinator |
| 26.10 | Name the **official results source** (ELF/World Lacrosse game pages). None is named in any plan yet; nothing is recorded without one | Yael |
| 26.10 | Where ELF will officially confirm the World Sixes 2027 qualifiers; "עלתה לאליפות העולם" waits for that confirmation | Yael |
| 1.11 | Wording for the drafts below approved | Yael → Shira |

## Each game day

| When | Step | Who |
|---|---|---|
| after each Israeli game | Final score from the official source | Yael |
| + 30 min | Session `result` → Dana | Yael |
| after Dana, before the 23:45 run | Session `result`, `resultSource`, `resultAt` (`date -u +%Y-%m-%dT%H:%M:%SZ`); all three | coordinator |

## End of the tournament (9.11 women, 18.11 men)

| Step | Who |
|---|---|
| Final placing from the official standings → Dana | Yael |
| Team write through `job/athlete_patch.py`: `"result": {"at": "<last day>", "text": …, "source": <standings>}`; `next`/`nextDate` → `""` unless an official entry for the next event exists | coordinator |
| Top 5: "מה התעדכן" line (below), `athleteId` = the team id, **only after ELF's official confirmation** that the team is in the World Sixes 2027; the final standings alone are not enough | Yael → Dana → coordinator |
| quotas.json PR: the item's `israelNote` / `stakes` / `nextQuotaEvent` after both tournaments (men's ends 18.11), `review` `unchecked`, through result-night.md | Yael → Dana → lead |

## Drafts (Yael / Shira to approve)

Dates in the job's style. Score as `<HI>:<LO>`, the higher score first (a dash flips in RTL).
- Session `result` per game: `ניצחון <HI>:<LO> על <נבחרת>` / `הפסד <HI>:<LO> ל<נבחרת>`
- History (women): `מקום <N> באליפות אירופה בלקרוס סיקסס – נשים, סאלו (9 בנוב׳ 2026)`
- History (men): `מקום <N> באליפות אירופה בלקרוס סיקסס – גברים, סאלו (18 בנוב׳ 2026)`
- "מה התעדכן", top 5 only:
  - `לקרוס: נבחרת הנשים בסיקסס עלתה לאליפות העולם 2027 (מקום <N> באליפות אירופה בסאלו)`
  - `לקרוס: נבחרת הגברים בסיקסס עלתה לאליפות העולם 2027 (מקום <N> באליפות אירופה בסאלו)`

## Open

- No results source and no approved wording (above).
- Which official source exists for scores and standings (ELF or World Lacrosse)? Asked Yael on #214.
