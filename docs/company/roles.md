# Standing duties (2026-10-19)

Who owns what, the sign-off policy, the WIP cap and who merges are in
[`docs/product/team.md`](../product/team.md). This file lists only each role's **standing duty** (work that never
runs out), the researchers' sports and the fact-check queue mechanics. Every change goes through a PR on
`dev/<name>/<slug>`.

## Coordination
- **Coordinator (team lead).** Dispatch from the queue in the same turn; review every PR within 15 minutes; repo
  hygiene; keep the live job in sync with `job/`; send the owner a summary at each check-in.
- **CEO.** Keep 2 tasks queued per worker; at each 2-hourly sprint rollover, give the coordinator one concrete next
  task for each worker the Board keeper reports idle; review workload monthly against event density.
- **Board keeper.** Keep the team board current and report idle workers at each sprint rollover.

## Development
- **Noa.** Correctness of quota-event days.
- **Itai.** Home-page changes from other developers go through him; editor tooling for each audit and result night.
- **Maya.** Test coverage for every merged feature, and the validators. Season focus: results-assist (the job
  drafts quota updates as proposals).
- **Shira.** A copy and a11y pass on every new string and view.

## Publishing
- **Omer, publisher.** Steps 2 and 5–9 of `docs/runbooks/result-night.md` (edit the master after sign-off, build,
  validate, open the PR, publish after merge, check it live). Put every signed-off quota change live within 24
  hours; publish the digest every Sunday; keep the result-night scheduled tasks current. He does not research or
  sign off.

## Product
- **Product lead.** Map the rolling 2-week event calendar into the backlog; publish metrics weekly (coverage,
  freshness, sign-off latency, corrections); keep one design spec ahead of development.
- **Researchers.** Event-watch, with entries before each event and results after it; stakes lines up 48 hours
  before every quota event in their sports; when nothing is assigned, the stale sweep of their athletes.
  - **Roni:** judo, taekwondo, wrestling, boxing, artistic, rhythmic and trampoline gymnastics, swimming, open
    water, diving, artistic swimming and water polo.
  - **Yael:** fencing, shooting, weightlifting, cycling, archery, equestrian, golf, climbing, badminton, beach
    volleyball, basketball, 3x3, baseball, flag football and lacrosse.
  - **Ofir:** athletics, sailing, rowing, canoe, surfing and triathlon.
- **Dana, fact-checker.** Signs off Roni's sports first; the weekly audit (data.json and quotas) in odd ISO weeks.
- **Tamar, fact-checker.** Signs off Yael's and Ofir's sports first; the weekly audit in even ISO weeks.
- **Gil, QA.** Regression on every publish; date-shifted tests 1–2 days before each quota event.
- **Browser verifier (on trial).** Re-check browser-only sources, oldest first. Blocked until the browser tool
  allows navigation.

## Fact-check queue
- A sign-off request goes first to the checker who owns the sport. If the PR mixes sports, it goes to the owner of
  the first item's sport.
- **Overflow:** if a PR waits longer than 4 hours (1 hour on event days), the other checker takes it. The Board
  keeper moves it on the board.
- The checker not on audit duty that week takes event-day sign-offs first.

## Data-writing rules (everyone who edits data, the DB or a dated file)
- **New athletes:** after sign-off, the coordinator writes the record; the owner is not needed. A Hebrew name
  without a source is marked as a transliteration in `notes`.
- Timestamps (`updatedAt`, `verifiedAt`, `at`) are real UTC: `date -u +%Y-%m-%dT%H:%M:%SZ`. Israel local time
  with a `Z` appended lands 2–3 hours in the future. Reviewers reject any timestamp later than the commit time.
