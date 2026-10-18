# Role charters (2026-10-18)

There are 14 workers plus the coordinator. Each role lists what it **owns** and its **standing duty** (work that never
runs out). Every change goes through a PR on `dev/<name>/<slug>`. Each file has one owner at a time.

## Coordination
- **Coordinator (Claude).**
  - Owns dispatch and the team board.
  - Standing duty: keep no row idle; dispatch from the queue in the same turn; send the owner a summary at each
    check-in.
- **CEO.**
  - Owns direction, the role charters and the work queues (`docs/company/`).
  - Standing duty: keep 2 tasks queued per worker; review workload monthly against event density.

## Development
- **Team lead.**
  - Owns `main`, reviews and merges.
  - Standing duty: review every PR within 15 minutes; repo hygiene; keep the live job in sync with `job/`.
  - Backup: Noa reviews doc-only PRs when the lead is unavailable.
- **Noa.**
  - Owns quota rendering (`site/quotas.js`, stakes lines, result states).
  - Standing duty: correctness of quota-event days.
- **Itai.**
  - Owns `#admin` and the editor flows (`site/admin.js`).
  - Standing duty: editor tooling for each audit and each result night.
- **Maya.**
  - Owns `job/` and `tests/`.
  - Standing duty: test coverage for every merged feature, and the validators.
  - Season focus: results-assist (the job drafts quota updates as proposals).
- **Shira.**
  - Owns Hebrew copy and accessibility.
  - Standing duty: a copy and a11y pass on every new string and view.

## Publishing
- **Omer, publisher** (after the earned banner ships; until then he is a developer owning `site/digest.js`).
  - Owns the publishing pipeline: steps 2 and 5–9 of `docs/runbooks/result-night.md` (edit the master after
    sign-off, build, validate, open the PR, publish after merge, check it live). Also owns the Sunday `#digest`.
  - Standing duty: put every signed-off quota change live within 24 hours, and publish the digest every Sunday.
  - He never sets `earned` without the owner's approval (or the fallback the owner picks in D4). He does not
    research or sign off.
  - `site/digest.js` stays his.

## Product
- **Product manager.**
  - Owns the roadmap, the backlog, launch gates and owner decisions (`docs/product/`).
  - Standing duty: map the rolling 2-week event calendar into the backlog; publish metrics weekly (coverage,
    freshness, sign-off latency, corrections).
- **UX designer.**
  - Owns `docs/design/`.
  - Standing duty: one spec ahead of development. After round 3, one design a month, prioritised by the PM.
- **Roni, researcher.**
  - Owns combat sports, gymnastics and aquatics: judo, taekwondo, wrestling, boxing, artistic, rhythmic
    and trampoline gymnastics, swimming, open water, diving, artistic swimming and water polo.
  - Standing duty: event-watch, with entries before each event and results after it, and stakes lines up 48 hours
    before every quota event in her sports.
- **Yael, researcher.**
  - Owns the remaining sports: fencing, shooting, weightlifting, cycling, archery, equestrian, golf, climbing, badminton,
    beach volleyball, basketball, 3x3, baseball, flag football and lacrosse.
  - Standing duty: the same as Roni's.
- **Ofir, researcher (new).**
  - Owns athletics, sailing, rowing, canoe, surfing and triathlon.
  - Standing duty: the same as Roni's.
  - First tasks: the World Athletics LA28 system and the 5 ❓ quota items; quota items for canoe and rowing.
- **Dana, fact-checker.**
  - Owns sign-off for Roni's sports, plus the second sign-off on every `earned` (proposed; pending D4).
  - Standing duty: the weekly audit (data.json and quotas) in odd ISO weeks.
- **Tamar, fact-checker (new).**
  - Owns sign-off for Yael's and Ofir's sports.
  - Standing duty: the weekly audit in even ISO weeks, and the remaining ❓ athlete records.
  - First task: PR #55 (judo), as an onboarding exception to the split.
- **Gil, QA.**
  - Owns `docs/qa/`.
  - Standing duty: regression on every publish, and date-shifted tests 1–2 days before each quota event.

## Fact-check queue rules
- A sign-off goes to the fact-checker who owns the sport. If the PR mixes sports, it goes to the owner of the
  first item's sport.
- **Overflow:** if a PR waits longer than 4 hours (1 hour on event days), the other fact-checker takes it. The
  coordinator moves it on the board.
- **`earned`, retirements and selection claims:** both fact-checkers must sign off (proposed for `earned`;
  who approves it is D4, pending the owner).
- **Neither fact-checker signs off their own edits.** A fix made during checking needs the other fact-checker's
  sign-off.
- **The audit alternates weekly.** The checker not on audit duty that week takes event-day sign-offs first.
