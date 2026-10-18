# Pre-verification: `next` / `nextDate` of the 8 new athletes without a next competition

Source of the list: the published data.json (generatedAt 2026-10-18T15:25:51Z). It has 11 athletes added on 18.10,
and 8 of them have an empty `next`. These 8 are covered below.

The other 3 already have an official `next`:
- Goshen: Abu Dhabi, 30.10, IJF entries;
- Simin: Abu Dhabi, 31.10, IJF entries;
- Tashtchiev: Doha, 3.11, ISSF entry list.

Rules:
- `next` is set only from an **official entry list** (IF, organiser or national federation). A calendar date or a
  report that someone "plans to compete" isn't enough.
- If no official entry list has been found, `next`/`nextDate` stay `""`. The finding is recorded so that a check
  of empty `next` values can treat them as **checked, not missing**.
- Checked on 2026-10-18. Nothing is written to the DB; Tamar signs off.

✅ = final value confirmed · ⏸ = stays `""` (checked; no official entry list found) · re-check date in brackets

## Sailing: 5 athletes
The next major Olympic-class event in the calendar is the **2027 World Sailing Championships, Fortaleza, 22–30.1.2027**
(windsurf, kite and dinghy). Its Notice of Race is published, but no entry list has been found.
Sources: https://www.sailing.org/2025/09/22/fortaleza-2027-world-sailing-championships-and-test-event-dates-announced ·
https://sailing.org/2026/06/10/notice-of-race-published-for-2027-world-sailing-championships-in-fortaleza/

No official entry list for an Israeli sailor before that was found, from World Sailing or the Israel Sailing
Association. So all five are ⏸:

| athleteId | class | `next` / `nextDate` | re-check |
|---|---|---|---|
| tomer-vardimon | iQFoil men | `""` / `""` | when the Fortaleza 2027 entry list is published |
| yoav-cohen | iQFoil men | `""` / `""` | same |
| carmel-avisar | Formula Kite men | `""` / `""` | same |
| dor-zarka | Formula Kite men | `""` / `""` | same |
| rem-pulci-magen | ILCA 7 men | `""` / `""` | same |

**Don't** set Fortaleza as `next` from the calendar alone. Being a national selection, it needs the entry list or an
Israel Sailing Association announcement.

## Athletics: 1
| athleteId | `next` / `nextDate` | note |
|---|---|---|
| yitayew-abuhay | ⏸ `""` / `""` | His World Athletics profile has no announced race. Of the autumn marathons, Valencia (6.12.2026) has published an elite field, and he isn't in it. Re-check when the Valencia, Fukuoka and Tel Aviv elite lists are out |

Sources: https://worldathletics.org/athletes/israel/yitayew-abuhay-14683161 · https://aims-worldrunning.org/articles/3082-kejelcha-and-tesfay-lead-elite-lineup-for-valencia.html

## Tennis: 2
| athleteId | `next` / `nextDate` | note |
|---|---|---|
| lina-glushko | ⏸ `""` / `""` | The WTA profile marks her **Inactive**, so there is no next tournament to expect. Re-check only if the status changes |
| amit-vales | ⏸ `""` / `""` | The ATP and ITF entry lists can't be read here (the ATP site returns 403). His last known tournaments are ITF events in May–June 2026, from secondary sites. Tamar or an editor can check the ITF "entry list" pages by hand |

Sources: https://www.wtatennis.com/players/323091/lina-glushko · https://www.atptour.com/en/players/amit-vales/v0g2/overview

## Proposal for the gap check
For all 8, `next` is empty **on purpose**: it was checked and no official entry list exists yet.

To keep them from being flagged again on each run, I suggest the editor add one line to each record's `notes`, or that
the check can read a `nextCheckedAt` field (a decision for Maya):
- `notes`: "לא נמצאה הרשמה רשמית לתחרות הבאה (נבדק 18.10.2026)".

The second option means a field not yet in the model. If the gap check only reads `next`, the first option is enough
for a human reader, but it won't stop the flag.

## Count
✅ 0 · ⏸ 8. All are empty on purpose, with a re-check point for each.
