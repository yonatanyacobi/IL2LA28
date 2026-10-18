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
| D10 | **Trampoline athletes' Hebrew names.** Nanadze: DB "בנימין ננדזה"; FIG entry list "NANADZE Benyamin"; Israel Hayom (24.3.2026) and Makor Rishon (7.8.2025) "בן ננדזה". Amiel: DB "שם טוב עמיאל"; the only Hebrew source, Makor Rishon, writes "שם־טוב" | before launch (D1) | A: keep the DB spelling · B: follow the press ("בן ננדזה", "שם־טוב עמיאל") · C: the owner asks the gymnastics federation | **C** for a final answer, with **A** meanwhile: "בנימין" matches FIG's "Benyamin", and one press source is too thin to change Amiel | A. Both records stay unverified ("טרם נבדק ידנית") until decided |
| D11 | **Two checks in the owner's browser** (the company proxy and DLP block the team's tools). (1) Sporthive, Maru Teferi's official Amsterdam result, 20th in 2:07:22, on hold: https://sporthive.com/events/s/e5066f0f-f66c-405f-9983-15fbf286ec7d. (2) lpga.com, The ANNIKA entries for Beck: **optional**, as Dana accepted Yael's quoted read | before launch (D1) | A: the owner opens (1), and optionally (2), and replies with place and time as shown · B: skip | **A** for (1): a minute's look releases a held result | B: Teferi's result stays off the site; Beck is unaffected |

## Decided
| # | Decision | Decided | Consequence |
|---|---|---|---|
| D2 | Contact address | Owner, 18.10: dedicated address `il2la28.site@gmail.com` opened | Shira swaps it into the site in place of the personal Gmail and the `{REPORT_EMAIL}` placeholder. Launch gate G5 turns green once that is merged and published |
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
