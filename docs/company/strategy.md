# Company strategy: הדרך ללוס אנג׳לס 28 (2026-10-18)

Author: CEO. Baseline: main f51e599, 99 athletes in 33 sports, 82 qualifying competitions, 57 quota items
(52 published, 31 of 33 sports; canoe and rowing have none).

## 1. Mission and audience
Be the most trustworthy Hebrew place to answer "who from Israel is on the way to LA28, and what's at stake this week".
We serve Israeli sports fans who follow a few athletes or sports, sports journalists and club/federation people who
need a checked, sourced overview, and the athletes' families and communities who share news on WhatsApp. Until the
Games (14–30.7.2028) we compete on **trust and timeliness**, not on breadth of content: every claim has an official
source and a fact-check, and results appear within a day.

## 2. Goals and measurable targets
The artifact has no analytics, so we measure what we control from the repo, the DB and `runs/`:
- **Coverage**: the share of sports that have quota items, and the share of athletes that have a fact-checked record.
- **Freshness**: hours from an official result to the site, and the age of quotas.json.
- **Fact-check latency**: the time a PR waits for sign-off.
- **Corrections**: errors found after publishing, from reports and audits.
- **Reach proxy**: digest copies. We can log a copy event to a per-viewer DB counter, which needs owner approval.

| Horizon | Targets |
|---|---|
| **Launch (to 1.11.2026)** | 0 open ✏️ audit fixes. ❓ athletes ≤10 or hidden. 33/33 sports have quota items. Every quota event has a stakes line 48 hours before it starts. Rotterdam, Abu Dhabi and Doha results are live within 24 hours. |
| **Qualification season (to 30.6.2027)** | Results are live in ≤24 hours for every qualifying event (≈60 events, peaking at ~3 per week in Feb–Mar and June). Fact-check latency is ≤4 hours on event days and ≤24 hours otherwise. A full weekly audit runs every week. Fewer than 2 public corrections a month. A digest is published every Sunday. |
| **Games (Jun–Jul 2028)** | Every Israeli qualified athlete has a page with schedule and stakes. Same-day results during the Games. Zero unsourced "earned" or "selected" claims. |

## 3. Roadmap themes
**Launch**
- Owner-approved public sharing.
- Apply the audit fixes.
- Quota items for canoe and rowing.
- The round-3 result states: "awaiting results" and "earned".
- A trust block: sources, method and corrections.

**Qualification season**
- **Results-assist automation**: the daily job already proposes stage changes. Extend it to draft quota-item updates
  as proposals from official result pages. A human always approves.
- A **ranking tracker** for ranking-based quotas (judo, taekwondo, fencing): a stored ranking snapshot per item
  and its trend.
- A **digest as the "newsletter"**: weekly text plus per-sport follow digests, shared by copy and paste. This is
  the only push channel the platform allows.
- A **corrections log** page. Publicly owning our errors is cheaper than hiding them.

**Games**
- A Games-mode home: schedule, today's Israelis and results.
- An **archive** of the qualification path, frozen per athlete. It is cheap because the data already exists.

**We will NOT:**
- build an English version (the audience is Hebrew; it would double the fact-check load);
- cover the Paralympics before 2027-07 (a separate qualification system and sources, with no researcher to own it;
  we revisit at the season's midpoint);
- run live scores or scraping;
- add comments or user accounts;
- show odds or predictions presented as fact;
- use logos or official marks.

## 4. Organisation
**Workload, next 2 months (18.10–18.12, ~14 qualifying events):**
- **Dana: overloaded.** Every quota PR, every athlete audit and every result night passes through her. PRs #40
  and #42 are already queued behind her today. In spring 2027, about 3 events a week mean 3+ urgent sign-offs a
  week on top of the weekly audit.
- **Yael: overloaded.** She covers about 20 sports and about 52 athletes, including athletics and sailing (14 each,
  most of the ❓) and the November quota events (shooting, surfing, triathlon, weightlifting).
- **Roni: full.** About 10 sports, 47 athletes, judo and gymnastics. Manageable.
- **Owner: a hidden single point of failure.** The result-night runbook makes the owner edit, build and publish.
- **Developers (5) and UX: more capacity than work** once the launch work lands. The feature backlog is finite. The recurring
  work is results tooling and regression, not features.
- **Gil: fits.** Regression on every publish plus date-shifted tests.

**Hire (in this order):**
1. **Second fact-checker, "Tamar".** Why now: Dana gates every publish, and November has 7 qualifying events.
   - Standing duty: sign-off for Yael's sports, and the weekly audit on alternate weeks.
   - First task: re-verify the 27 ❓ athlete records, starting with athletics and sailing.
   - Without her: results go live 1–2 days late, or unchecked.
2. **Researcher for athletics and water sports, "Ori".** Takes athletics, sailing, rowing, canoe,
   surfing and triathlon from Yael.
   - Standing duty: event-watch for those 6 sports.
   - First task: World Athletics LA28 qualification system, and the 5 ❓ quota items.
   - Without him: Yael misses events in the June 2027 peak.
3. **Publisher / release operator.** Convert an existing worker; do not hire. **Convert Omer** once the digest
   work is done.
   - Standing duty: run result-night steps 2 and 5–9 (edit the master, build, validate, PR, publish, check live),
     and the Sunday digest. The owner keeps verify and approve only.
   - Without this: the owner's evenings become the bottleneck.

**Do not hire:** a translator (no English version), a separate data engineer (Maya already owns `job/`; her standing
duty becomes results-assist automation), or a community editor (wait until reports arrive).

**Merge or cut:** shrink development from 5 to 4 by converting Omer to publisher. Fold UX into the PM's track after
round 3; UX keeps one design per month (the trust block, then Games mode). Total: 14 workers with 2 hires and 1
conversion.

## 5. Top risks
1. **A wrong public fact**, especially a false "earned" claim. Mitigations: two-person sign-off on any `earned`
   status; the validator's stage ≥ 2 cross-check; a corrections log; a weekly audit.
2. **Single points of failure** (Dana, the owner, the team lead). Mitigations: hire Tamar; the publisher role; the
   lead names a backup reviewer (Noa) for doc-only PRs.
3. **Platform limits**: no fetch, no push, no analytics, and the artifact host could change. Mitigations: keep
   `site/` static and portable, keep data in the repo, and treat the digest as our push channel.
4. **Owner bandwidth.** Mitigations: decisions in batches, at most one ask a week, each with a recommendation;
   the publisher role.
5. **Legal and brand**: unofficial status, athlete names, a personal email shown publicly. Mitigations: an "unofficial"
   tag on every page, no logos, a dedicated contact address before launch, and a corrections and removal policy on
   `#about`.

## 6. Owner decisions (recommendation first)
1. **Go public on 21.10**, after the Rotterdam result is live and the ✏️ fixes are applied. *Yes.*
2. **Replace the public personal Gmail** with a dedicated address. *Yes, before launch.*
3. **Approve 2 hires** (a fact-checker and a researcher) **and convert Omer to publisher.** *Yes.*
4. **Delegate publishing** of fact-checked quota changes to the publisher. *Yes. The owner keeps approval of
   `earned` status.*
5. **No English version and no Paralympics until mid-2027.** *Confirm.*
