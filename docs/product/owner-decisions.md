# Owner decisions (as of 18.10.2026, after the owner's answers)

This is the single list of decisions that need the owner, from the launch checklist (#43), the company strategy (PR #58, §6)
and results automation (PR #76). It's one batched ask a week, per the strategy. To decide, reply with the number
and an option letter. The PM keeps this page current.

## Open

| # | Decision | Decide by | Options | Recommendation | If no decision |
|---|---|---|---|---|---|
| D1 | **Public launch date** | The owner's call | Any date after a green readiness check (first one: 22.10 12:00, reported to the owner) | Launch on a day that isn't a result night, ideally before Abu Dhabi (29–31.10) | The site stays unshared. Everything else continues |
| D8 | **Digest-copy counter** (needs DB writes; only signed-in viewers can write) | 25.10 | A: allow it for signed-in viewers · B: don't count; use the share log | **B**: it would count only claude.ai users and adds a DB write path to a read-only site | B |
| D9 | **Scope**: no English version and no Paralympics until mid-2027 | 25.10 | A: confirm · B: reopen | **A** | Treated as confirmed |
| D-R2 | **New `quota` proposal kind** (PR #76): the daily job proposes quota-item updates from official results; the publisher applies them through the result-night runbook after fact-checker sign-off | 25.10 (to be built before the Doha results on 3–4.11) | A: approve · B: keep quota updates fully manual | **A**: it's the core of the strategy's results-assist theme | B: every quota update waits for a researcher to notice it, which puts the ≤ 24 h result target at risk |

## Decided
| # | Decision | Decided | Consequence |
|---|---|---|---|
| D2 | Contact address | Owner, 18.10: the owner opens a dedicated address | Until it exists, new code uses the `{REPORT_EMAIL}` placeholder; nothing new hard-codes the personal Gmail. Launch gate G5 stays red until the address is live |
| D3 | Marking records verified | Delegated, 18.10 | The coordinator writes `verifiedAt`/`verifiedBy` after a fact-checker's sign-off (verification drive, PR #71) |
| D4 | Result-night approvals | Owner, 18.10: "the team decides alone" | `earned` (and stage 2–3) is approved by **both fact-checkers (Dana + Tamar)**, with no owner approval. Omer publishes per `docs/runbooks/result-night.md` |
| D5 | New athletes (incl. Olga Tashtchiev) | Owner, 18.10: added without the owner | A fact-checker signs off and the coordinator writes the record. A Hebrew name without a source is marked as a transliteration in `notes` |
| D6 | Launch announcement | Owner, 18.10: none planned | No announcement work. PR #46's copy stays a draft |
| D7 | Hires | 18.10 | Tamar (second fact-checker) and Ofir (athletics and water-sports researcher) are hired |
| D-R1 | World Triathlon API key | Owner, 18.10: will register | The key lives only in the scheduled-task folder, never in the repo or a chat. Maya wires it up once it exists |

## Defaults (no decision needed)
- The 5 partial quota items stay unpublished until they're sourced. The build enforces this.
- Unverified athlete records keep the "אוטומטי" chip.
- 18.10: the 25 audit corrections were applied to the DB by the coordinator under the owner's delegation (gate G1).
