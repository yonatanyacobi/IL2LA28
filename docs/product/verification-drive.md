# Verification drive before launch (19–22.10.2026)

Owner: PM. Closes launch gate G3 and moves metric M2 off 0/99.
**Goal:** the 30 records a visitor sees first are "נבדק ידנית" before the go/no-go at 12:00 on 22.10.

## What "verified" means
A record is verified only when all of these hold:
1. **Every visible claim is checked.** That covers the name (Hebrew and English spelling), sport and event, stage, `rank`,
   `next` + `nextDate`, and each fact in `notes`.
2. **Each claim is checked against a primary source.** That means the IF (ranking page, entry list, results, athlete
   profile), the national federation or the Olympic Committee of Israel. Media count only for facts no official body
   publishes, and then only when two independent outlets agree.
   - `rank`: the official list page, and the text names the list and its month.
   - `next`: an official entry list, or the IF athlete profile's next events.
   - No "probably" or "expected" without a source.
3. **Nothing is left unverified.** A claim that can't be verified is removed or reworded through an editor edit or a
   proposal before marking. A record with an open ❓ is never marked.
4. **The sign-off is logged.** The fact-checker adds one row per record to `docs/audit/2026-10-verification-drive.md`:
   record id, verdict (✅ / ✏️ fix needed), claims checked, source URLs, date and time, and checker name.
5. **The coordinator marks it.** The owner has delegated approvals, so after each fact-checker's sign-off the
   coordinator writes `verifiedAt`/`verifiedBy`, for ✅ rows only. If the record changes afterwards, the chip turns to
   "עודכן מאז" by itself and the record returns to the next drive.

**✅ records from Dana's 18.10 audit:** the check is a delta. Look at what changed since the audit (`history`,
`updatedAt`, `next`), plus anything the audit marked optional. This should take about 5 minutes a record.

## Which 30 records
They're chosen by where they appear between 22.10 and 1.11:
- the today strip and "14 הימים הקרובים", for `nextDate` up to 5.11;
- athletes at the quota events through 1.11 (Rotterdam, Tongyeong, weightlifting Worlds, Abu Dhabi, Doha);
- the updates feed.

| Batch | Checker | Due | Records (audit verdict 18.10) |
|---|---|---|---|
| **B1: Rotterdam + launch week** | Dana | **Mon 19.10, 20:00** (before the 20.10 team final) | artem-dolgopyat ✅, ilia-liubimov ✅, noam-berkovich ✏️, ron-ortal ✅, ron-pyatov ✅, lihie-raz ✅, roni-shamay ✅, yali-shoshani ✏️, shachar-sagiv ✅, celia-gold ✏️ |
| **B2: judo (Abu Dhabi) + Doha** | Tamar | **Tue 20.10, 20:00** | raz-hershko ✅, gefen-primo ✅, izhak-ashpiz ✅, timna-nelson-levy ✅, yonatan-elbaz ✏️, inbal-shemesh ✏️, inbar-lanir ✏️, kerem-primo ❓, yuli-alma-mishiner ✏️, sergey-richter ❓ |
| **B3: home lists + updates feed** | Dana | **Wed 21.10, 18:00** | matan-ivri ✅, maru-teferi ✏️, selamawit-teferi ✏️, israel-lacrosse-women-sixes ✅, israel-lacrosse-men-sixes ✅, israel-flag-football-men ✏️, tamar-steinberg ❓, anat-lelior ❓, israel-basketball-men ✏️, olga-tashtchiev (new; only if D5 is approved, else israel-basketball-women) |

- Tamar takes judo, which has 4 records corrected on 18.10, so a second checker sees the corrections independently. This
  also gets her up to speed on the ranking-heavy sport before the rank backfill (PR #73).
- ❓ records (kerem-primo, sergey-richter, tamar-steinberg, anat-lelior) come first in each batch. If one can't be resolved
  by the due time, the claim is cut (rule 3) and the record still gets marked.
- Fixes found during the drive go to the editors the same day. The record is marked only after the fix is published.

## Schedule
| When | What | Who |
|---|---|---|
| 19.10 20:00 | B1 logged, then its ✅ marked | Dana; coordinator |
| 20.10 20:00 | B2 logged, then its ✅ marked | Tamar; coordinator |
| 21.10 18:00 | B3 logged, then its ✅ marked | Dana; coordinator |
| 22.10 11:00 | PM reports M2 for the go/no-go | PM |
| 22.10 12:00 | **Go/no-go.** G3 passes at ≥ 27/30 marked, with none of the 10 B1 records missing | Coordinator (delegated) |

Expected after the drive: M2 = 30/99 (30%). The remaining 69 go through the weekly audit rotation (Dana and Tamar
on alternate weeks), aiming for ≥ 80% by 1.11.
