# Team charter (2026-10-19)

One page: who does what. Standing duties and each researcher's sports are in `docs/company/roles.md`.

## Token economy (owner, 19.10)
Supersedes "no idle workers", the board keeper and the rollover/board crons.
- Dormant by default. Core: coordinator (merges, dispatch, board rows on status change only), Omer (publish), Dana (checks). Roni, Tamar and Maya wake only for a ticket; everyone else stays dormant.
- Work starts only from a ticket: a backlog item, event or failure with an owner and a done-when. No filler sweeps.
- A fresh agent per ticket with a brief of at most ~2k tokens; never resume a long-running agent. Cheaper models for publishing, data checks and board edits.
- One review per PR, by the coordinator. One checker per change; two only where the sign-off policy below requires it.

## Roles and ownership

| Role | Owns |
|---|---|
| Coordinator (team lead) | `main`: reviews and merges every PR; dispatch |
| CEO | Direction and this charter |
| Board keeper | The team board, kept current |
| Product lead (PM and UX merged) | Roadmap, backlog, launch gates, owner decisions, `docs/product/`, `docs/design/` |
| Noa | Quota rendering (`site/quotas.js`) |
| Itai | The home page (`site/home.js` and the home code in `site/app.js`); admin (`site/admin.js`) |
| Maya | `job/`, `tests/` |
| Shira | Hebrew copy and accessibility |
| Omer (publisher) | Result nights, the Sunday digest, `site/digest.js`, the scheduled tasks for result nights |
| Gil (QA) | `docs/qa/`, regression on every publish |
| Roni, Yael, Ofir (researchers) | Their sports as in `roles.md`; standing duty: the stale sweep of their athletes |
| Dana, Tamar (fact-checkers, two agents) | Sign-off, split by sport as in `roles.md` |
| Browser verifier (on trial) | Facts on pages that need a full browser. Blocked: the browser tool denies navigation |

Changes to the home page go through Itai. Pages behind bot checks stay on the owner's D11 list.

## Sign-off policy

- **Two checkers** (Dana and Tamar): new athletes, stage changes, quota data (including `earned`), retirements
  and selection claims.
- **One checker** (whoever owns the sport): every other data change.
- No one signs off on their own edit.

## WIP cap: 1

Each worker has at most one open PR. While it waits for review or sign-off, prepare the next queued task without
opening it, or work the standing duty.

## Merging

Only the coordinator merges, with `git merge --no-ff`, after review. Noa is the backup for PRs that change only
docs.
