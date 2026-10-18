# Fact-check cadence: keeping verified records true

Owners: Tamar and Dana (fact-checkers). The coordinator writes to the DB, as in
[verification-drive.md](../product/verification-drive.md); the checkers only sign off.

A verified record goes stale without anyone editing it: its `rank` belongs to a list that is republished, and its
`notes` describe a season that moves on. This runbook says what is re-read, how often, against which source and by whom.
Result nights are not covered here. They have their own flow ([result-night.md](result-night.md)).

## Rules
- Same source rules as the verification drive: the IF's own list, profile or results first; the national federation
  or the OCI for Hebrew names; two independent outlets only for facts no official body publishes.
- Re-read the list, don't trust the record: compare `rankNum` and `rankAsOf` with the list's own date. If the list
  has not been republished, there is nothing to do.
- A changed `rank` is an ordinary edit (the daily job's direct-write fields). A changed stage never is; it goes to
  `proposals`.
- A source that refuses automated reads (403, bot-check, our network filter) is not bypassed. Note it in the log and
  hand it to someone who can read it in a browser, or leave the claim as it is and mark the row ❓.
- Log every check in `docs/audit/fact-check-log.md`: date, record id, list date read, verdict (✅ unchanged /
  ✏️ edit sent / ❓ unreadable), source URL, checker.

## Weekly: ranks (Tuesday, done by 18:00)
Tuesday, because most weekly lists are out by then (IJF, WTA/ATP on Monday; World Athletics on Tuesday).
Only records with a `rankNum`, or a `rank` text that cites a list.

| List | Sports | Published | How to read it |
|---|---|---|---|
| IJF World Ranking + Olympic list | judo | weekly | `ijf.org/internal_api/wrl_olympic?…&category=<n>` (JSON feed), profile `ijf.org/judoka/<id>` (WRL with its date) |
| World Athletics World Rankings | athletics | weekly | athlete page `worldathletics.org/athletes/israel/<slug>` (`worldRankings.current`) |
| World Archery World Ranking | archery | after events | `api.worldarchery.sport/v3/ATHLETEBIOGRAPHY/?Id=<id>` (`RnkDtIssued`) |
| WTA / ATP | tennis | weekly | WTA profile (readable); ATP is blocked (❓) |
| World Triathlon ranking | triathlon | weekly | `job/triathlon_api.py` (key file only; never print it) |
| FIE ranking | fencing | after events | `fie.org/athletes/<id>`. The LA28 list (AOR) opens 1.4.2027; until then this is context |

## Monthly: monthly lists, notes, names (first Tuesday of the month)
Every verified record gets a full read: each fact in `notes`, `next`/`nextDate`, the name and the source link.
Monthly lists are re-read at the same time.

| List | Sports | Published | How to read it |
|---|---|---|---|
| ISSF World Ranking | shooting | monthly (1st) | `issf-sports.org/competitions/worldranking/<event>` ("Version: dd.mm.yyyy") |
| World Taekwondo Olympic Ranking | taekwondo | monthly | Seeding table of the latest WT result book (`results.worldtaekwondo.org`); simplycompete is blocked |
| World Sailing ranking | sailing (incl. Formula Kite) | about monthly | `datafeed.sailing.org/stats/api/rankingReference?filter[rankDate]=…&include=rankings.sailor` |
| FIBA World Ranking | basketball | after windows | `fiba.basketball/en/ranking/men` / `women` |
| no ranking: results only | swimming, open water, artistic swimming, water polo, gymnastics, trampoline, weightlifting, team sports | – | World Aquatics `api.worldaquatics.com/fina/athletes/<id>/results`; FIG / European Gymnastics result books; IWF/EWF result books |

Also monthly:
- `next`/`nextDate` that are more than 14 days away: still on the IF calendar or the athlete's profile?
- Records with a "תעתיק, לא אומת" name: look again for an OCI or federation spelling.
- Sources that were unreadable last month (BWF, ATP, FEI, IFSC, the ITF PDF): try again; if still blocked, leave ❓.

## Who checks what
Split by sport so each checker learns a set of IF sources. About 50 records each.

| Checker | Sports |
|---|---|
| **Tamar** | judo, taekwondo, fencing, shooting, archery, sailing, triathlon, surfing, swimming, open water, artistic swimming, water polo |
| **Dana** | artistic and rhythmic gymnastics, trampoline, athletics, weightlifting, cycling, tennis, golf, badminton, climbing, equestrian, beach volleyball, basketball, 3x3, baseball, flag football, lacrosse |

Cross-check: on the monthly run each checker re-reads a random 10% of the other's records (fixed seed, logged), and
reports only what is wrong. A new sport goes to whoever has fewer records.

## Escalation
- A rank that changes the quota picture (crossing a cutoff in `quotas.json`): tell the coordinator the same day.
- A claim that can no longer be supported: send the cut, don't wait for the monthly run.
