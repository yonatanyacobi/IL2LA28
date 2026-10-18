# Owner decisions (as of 18.10.2026)

This is the single list of decisions needed from the owner, merged from the launch checklist (#43) and the company
strategy (#58, `docs/company/strategy.md` §6). It's one batched ask, per the strategy.
To decide, reply with the number and an option letter, e.g. "1-A". The PM keeps this page current.

| # | Decision | Decide by | Options | Recommendation | If no decision |
|---|---|---|---|---|---|
| 1 | **Launch date** | 20.10 | A: Wed 21.10, go/no-go at 12:00 on the gates in `launch-checklist.md` · B: Tue 27.10 | **A**, with B as the automatic fallback if a gate is red | No launch. Abu Dhabi (29–31.10) passes without a public audience |
| 2 | **Dedicated public contact address** instead of the personal Gmail (memo: PR #53) | 20.10 | A: create a dedicated address (~10 min) · B: keep the Gmail | **A** | Gate G5 stays red, so the launch slips to 27.10 |
| 3 | **Approval and publishing on result nights** | 19.10 | A: the owner edits, builds and publishes everything · B: Omer becomes publisher (runs `result-night.md`, publishes fact-checked quota changes); the owner approves only `earned`/stage 2–3, with Dana as second signer | **B** | A by default: the owner is the bottleneck on 20.10 and on Doha (3–4.11). An unapproved result stays `in-contention` with a factual note |
| 4 | **Owner check of the launch-week records** (8 gymnasts, Sagiv, Gold, after Dana's ✅) | 21.10 12:00 | A: mark them "נבדק ידנית" in `#admin` (~15 min) · B: launch with the "אוטומטי" chip | **A** | Gate G3 stays red, so the launch slips to 27.10 |
| 5 | **Add Olga Tashtchiev** (10 m air rifle women; on the ISSF Doha entry list, competing 3.11) | 28.10 | A: approve once Dana verifies the Hebrew spelling · B: approve with the English name only · C: don't track | **A** | She's missing on Israel's first quota day, in the strip, digest and calendar |
| 6 | **Launch announcement and channels** (copy: PR #46) | 20.10 | A: approve the copy and pick 2–3 channels (federation WhatsApp groups, X, personal network) · B: soft launch | **A**: lead with `#quotas` and `#digest` | Soft launch, so reach depends on chance shares |
| 7 | **Hires**: a second fact-checker, then an athletics and water-sports researcher | 25.10 | A: approve both · B: the fact-checker only · C: neither | **A**: Dana gates every publish, and November has 7 qualifying events | Results land late or unchecked in November |
| 8 | **Scope**: no English version and no Paralympics until mid-2027 | 25.10 | A: confirm · B: reopen | **A** | Treated as confirmed |
| 9 | **Digest-copy counter** (needs DB writes; only signed-in viewers can write) | 25.10 | A: allow it for signed-in viewers · B: don't count; use the owner's share log | **B**: it would count only claude.ai users, and it adds a DB write path to a read-only site | B |

## Defaults (no decision needed)
- The 5 partial quota items (athletics ×2, sailing ×3) stay unpublished until they're sourced. The build enforces this.
- Unverified athlete records keep the "אוטומטי" chip.

## Decided
- 18.10: the 25 audit corrections were applied to the DB by the coordinator under the owner's delegation (gate G1).
