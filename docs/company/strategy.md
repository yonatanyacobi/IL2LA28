# Company strategy (2026-10-18)

Baseline: 99 athletes in 33 sports and 82 qualifying competitions. There are 57 quota items, 52 of them
published, covering 31 of 33 sports. Canoe and rowing have none.

## 1. Mission and audience
We are the trustworthy Hebrew answer to "who from Israel is on the way to LA28, and what's at stake this week".
The audience is:
- Israeli fans who follow a few athletes or sports;
- journalists and federation people who need a sourced overview;
- families and communities who share news on WhatsApp.

Until the Games (14–30.7.2028) we compete on trust and timeliness, not volume. Every claim has an official source
and a fact-check, and results go up within a day.

## 2. Goals and targets
There are no analytics, so we measure what we control:
- **Coverage**: the % of sports with quota items, and the % of athletes with checked records.
- **Freshness**: hours from an official result to the site, and the age of quotas.json.
- **Fact-check latency**: the time a PR waits for sign-off.
- **Corrections**: errors found after publishing.
- **Digest copies**: a per-viewer DB counter. This needs owner approval.

| Horizon | Targets |
|---|---|
| Launch (to 1.11.2026) | 0 open ✏️ audit fixes. At most 10 ❓ athletes, or the rest hidden. 33/33 sports have quota items. A stakes line is up 48 hours before every quota event. Results are live within 24 hours. |
| Season (to 30.6.2027) | About 60 qualifying events, peaking at about 3 a week. Results are live within 24 hours. Sign-off takes ≤4 hours on event days and ≤24 hours otherwise. A weekly audit runs. Fewer than 2 public corrections a month. A digest every Sunday. |
| Games (Jun–Jul 2028) | Every qualified Israeli has a schedule and stakes. Same-day results. Zero unsourced "earned" or "selected" claims. |

## 3. Roadmap themes
- **Launch:** apply the audit fixes; add canoe and rowing quota items; ship the "awaiting results" and "earned"
  states; add a trust block (sources, method, corrections).
- **Season:**
  - *Results-assist*: the daily job drafts quota-item updates as proposals from official results, and a human
    approves them.
  - A *ranking tracker* for ranking-based quotas (judo, taekwondo, fencing).
  - The *digest as our newsletter*, weekly and per followed sport, shared by copy and paste. It is the only push
    channel the platform allows.
  - A public *corrections log*.
- **Games:** a Games-mode home (today's Israelis and results), and a frozen *archive* of each athlete's path.
- **We will NOT:**
  - build an English version (it doubles the fact-check load for a Hebrew audience);
  - cover the Paralympics before mid-2027 (a separate system with no owner; we revisit then);
  - run live scores or scraping;
  - add comments or accounts;
  - publish predictions;
  - use official logos.

## 4. Organisation
Workload over the next 2 months, which hold about 14 qualifying events:
- **Dana: overloaded.** Every publish goes through her, and PRs #40 and #42 are already waiting on her today. In
  spring there will be 3 or more urgent sign-offs a week on top of the audit.
- **Yael: overloaded.** About 20 sports and 52 athletes, including athletics and sailing (most of the ❓) and every
  November event.
- **Roni: full but sustainable.** About 10 sports and 47 athletes.
- **Owner: a hidden single point of failure.** The result-night runbook has the owner edit, build and publish.
- **Five developers and UX: more capacity than work** after launch. The recurring work is results tooling and
  regression, not features.
- **Gil: fits.**

**Hires, in this order:**
1. **Second fact-checker.**
   - Why now: Dana gates everything, and November has 7 qualifying events.
   - Standing duty: sign-off for Yael's sports, and the weekly audit on alternate weeks.
   - First task: re-verify the 27 ❓ athletes.
   - What breaks without: results land late, or unchecked.
2. **Researcher for athletics and water sports.** Takes athletics, sailing, rowing, canoe, surfing and triathlon
   from Yael.
   - Standing duty: event-watch for those sports.
   - First task: the World Athletics LA28 system, and the 5 ❓ quota items.
   - What breaks without: Yael misses events in the June 2027 peak.
3. **Publisher: convert Omer, don't hire.**
   - Standing duty: result-night edit, build, PR, publish and live check, plus the Sunday digest.
   - The owner keeps only verification and approval of `earned` status.
   - What breaks without: the owner's evenings become the bottleneck.

**Not hiring:**
- a translator (no English version);
- a data engineer (Maya's standing duty becomes results-assist);
- a community editor (wait until reader reports actually arrive).

**Merge:** after round 3, UX moves to one design a month under the PM. The total becomes 14 workers.

## 5. Top risks
1. **A wrong public fact, above all a false "earned".** Mitigations: two-person sign-off on `earned`, the
   validator's stage cross-check, a weekly audit and a corrections log.
2. **Single points of failure** (Dana, the owner, the team lead). Mitigations: the second fact-checker; the
   publisher role; Noa as backup reviewer for doc-only PRs.
3. **Platform limits** (no fetch, no push, no analytics, host changes). Mitigations: keep `site/` static and
   portable with data in the repo; the digest serves as push.
4. **Owner bandwidth.** Mitigations: at most one batched ask a week, each with a recommendation; the publisher role.
5. **Legal and brand.** Risks: unofficial status, athlete names, a personal email shown publicly. Mitigations: an
   "unofficial" tag, no logos, a dedicated contact address, and a corrections and removal policy on `#about`.

## 6. Owner decisions (recommendation in brackets)
1. Go public on 21.10, after the Rotterdam result is live and the ✏️ fixes are applied. [Yes]
2. Replace the public personal Gmail with a dedicated address before launch. [Yes]
3. Approve two hires (a second fact-checker and a researcher), and convert Omer to publisher. [Yes]
4. Delegate publishing of fact-checked quota changes; the owner approves only `earned`. [Yes]
5. No English version and no Paralympics until mid-2027. [Confirm]
