# Runbook: women's EuroBasket 2027 qualifiers, November window (11, 14, 17.11)

For the coordinator (the only DB writer). Games, times and FIBA game ids come from Yael's
`data/sessions/yael-2.json` and `docs/research/radar-2026-11-yael.md` (#172, not yet on `main`). No plan has
result wording, so the texts below are **drafts for Yael and Shira**.

Team: נבחרת ישראל בכדורסל (נשים), `israel-basketball-women`. Group I with Poland, Türkiye, Montenegro.

| Game | Session id | Local | Israel | FIBA game |
|---|---|---|---|---|
| 11.11 ישראל–פולין, ריגה | `fiba-ebw-2027-q-nov-2026-20261111-isr-pol` | 19:40 Riga | 19:40 | 129093 |
| 14.11 ישראל–טורקיה, ריגה | `fiba-ebw-2027-q-nov-2026-20261114-isr-tur` | 19:40 Riga | 19:40 | 129096 |
| 17.11 מונטנגרו–ישראל, בר | `fiba-ebw-2027-q-nov-2026-20261117-mne-isr` | 18:00 Bar | 19:00 | 129098 |

**What's at stake:** nothing is decided in this window. The top 2 of the group go to EuroBasket 2027, whose top 6
go to the Olympic qualifying tournaments (Feb 2028). The quota item stays as it is; no `stage` change; no
"מה התעדכן" line for a single game.

## Before

| By | Step | Who |
|---|---|---|
| 8.11 | #172 merged; the competition record `fiba-ebw-2027-q-nov-2026` created from `docs/research/fiba-competitions-2026-11.json`, then the three sessions loaded through `job/load_sessions.py` (Dana signs) | Yael → Dana → coordinator |
| 8.11 | `next`/`nextDate` of the team = the 11.11 game | Yael |
| 8.11 | Wording for the drafts below approved | Yael → Shira |

## Each game

| When | Step | Who |
|---|---|---|
| ~21:30 (game + 2h) | Final score from the FIBA game page (game id above). Box scores elsewhere and news are not sources | Yael |
| + 30 min | Values → Dana | Yael |
| after Dana, before the 23:45 run | Steps 1–2 | coordinator |

1. **Team write** through `job/athlete_patch.py`: `"result": {"at": "<game day>", "text": …, "source": <FIBA game page>}`,
   and `next`/`nextDate` = the next game in the table (after 17.11: `""` until the next window is official).
2. **Session**: `result`, `resultSource` = the FIBA game page, `resultAt` = `date -u +%Y-%m-%dT%H:%M:%SZ`; all three.

The job may write its own entry for the game (there is no FIBA results script). Next morning, check `runs/` for a
second entry; if there is one, delete the job's and tell Maya.

## Drafts (Yael / Shira to approve)

Dates in the job's style; Israel's points first.
- History: `ניצחון <IL>–<OPP> על פולין במוקדמות יורובאסקט נשים 2027 (11 בנוב׳ 2026)` /
  `הפסד <IL>–<OPP> לפולין במוקדמות יורובאסקט נשים 2027 (11 בנוב׳ 2026)`; same for טורקיה (14.11) and מונטנגרו (17.11).
- Session `result`: `ניצחון <IL>–<OPP>` / `הפסד <IL>–<OPP>`.

The men's window (27.11 The Hague, 30.11 Riga) gets its own runbook when it enters the 14-day window.
