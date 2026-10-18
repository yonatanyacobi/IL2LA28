# Owner decisions (as of 18.10.2026)

This is the single list of decisions needed from the owner, merged from the launch checklist (#43) and the company
strategy (PR #58, §6). It's one batched ask, per the strategy.
Decisions D1–D9 come from the launch and strategy work; D-R1 and D-R2 come from the results-automation design (PR #76).
To decide, reply with the number and an option letter, e.g. "D1-A". The PM keeps this page current.

| # | Decision | Decide by | Options | Recommendation | If no decision |
|---|---|---|---|---|---|
| D1 | **Launch date** | 20.10 | A: Thu 22.10, go/no-go at 12:00 on the gates in the launch checklist (PR #43) · B: Tue 27.10 | **A**, with B as the automatic fallback if a gate is red. This leaves a full day of buffer after Rotterdam | No launch. Abu Dhabi (29–31.10) passes without a public audience |
| D2 | **Dedicated public contact address** instead of the personal Gmail (memo: PR #53) | 20.10 | A: create a dedicated address (~10 min) · B: keep the Gmail | **A** | Gate G5 stays red, so the launch slips to 27.10 |
| D3 | ~~Marking the first-seen records as verified~~ | – | – | **Decided:** delegated. The coordinator writes `verifiedAt` after each fact-checker's sign-off (verification drive, PR #71) | – |
| D4 | **Approval and publishing on result nights** | 19.10 | A: the owner edits, builds and publishes everything · B: Omer becomes publisher (runs `docs/runbooks/result-night.md`, publishes fact-checked quota changes); `earned`/stage 2–3 needs both fact-checkers plus the owner, or the lead plus both fact-checkers if the owner can't be reached. | **B** | A by default: the owner is the bottleneck on 20.10 and on Doha (3–4.11). An unapproved result stays `in-contention` with a factual note |
| D5 | **Add Olga Tashtchiev** (10 m air rifle women; on the ISSF Doha entry list, competing 3.11) | 28.10 | A: approve once Dana verifies the Hebrew spelling · B: approve with the English name only · C: don't track | **A** | She's missing on Israel's first quota day, in the strip, digest and calendar |
| D6 | **Launch announcement and channels** (copy: PR #46) | 20.10 | A: approve the copy and pick 2–3 channels (federation WhatsApp groups, X, personal network) · B: soft launch | **A**: lead with `#quotas` and `#digest` | Soft launch, so reach depends on chance shares |
| D7 | ~~Hires~~ | – | – | **Decided:** both hired. Tamar is the second fact-checker; Ofir is the athletics and water-sports researcher | – |
| D8 | **Digest-copy counter** (needs DB writes; only signed-in viewers can write) | 25.10 | A: allow it for signed-in viewers · B: don't count; use the owner's share log | **B**: it would count only claude.ai users, and it adds a DB write path to a read-only site | B |
| D9 | **Scope**: no English version and no Paralympics until mid-2027 | 25.10 | A: confirm · B: reopen | **A** | Treated as confirmed |
| D-R1 | **World Triathlon API key** (results automation, PR #76): the owner registers for a key; it's stored only in the scheduled-task folder, never in the repo or a chat | 8.11 (before WTCS Abu Dhabi 13–14.11) | A: register and read the API terms first · B: no key; the job reads the official event pages | **A**: it's the only documented results API among our sports. Low urgency, since the triathlon results until then come from 1–2 events | B by default: triathlon results are read from pages like every other sport |
| D-R2 | **New `quota` proposal kind** (PR #76): the daily job proposes quota-item updates (`israelStatus`, `israelNote`, `nextQuotaEvent`, `source`) from official results; the publisher applies them through the result-night runbook, and the fact-checkers sign off | 25.10 (so it's built before the Doha results on 3–4.11) | A: approve · B: keep quota updates fully manual | **A**: it's the core of the strategy's results-assist theme, and `earned` still needs both fact-checkers | B by default: every quota update waits for a researcher to notice it, which puts the ≤ 24 h result target at risk |

## Defaults (no decision needed)
- The 5 partial quota items (athletics ×2, sailing ×3) stay unpublished until they're sourced. The build enforces this.
- Unverified athlete records keep the "אוטומטי" chip.

## Decided
- 18.10: the 25 audit corrections were applied to the DB by the coordinator under the owner's delegation (gate G1).
- 18.10: Tamar (second fact-checker) and Ofir (athletics and water-sports researcher) are hired (D7).
- 18.10: approvals are delegated to the coordinator, including writing `verifiedAt` after fact-checker sign-off (D3).
