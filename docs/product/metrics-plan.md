# Metrics plan (no analytics)

Owner: PM. Follows `docs/company/strategy.md` §2. The artifact has no visitor analytics and signed-out visitors can't
write to the DB, so we measure what we control: the data, the pipeline, the team's latency and the reports we get.
Weekly log: `docs/product/metrics/<YYYY-Www>.md`, written by the PM every Sunday next to the digest. The baseline
week is W42 (`metrics/2026-W42.md`). Post-launch counting (M7, M8) starts on the launch date the owner sets.

## The metrics

| # | Metric | Definition | Source (how it's counted) | Target to 1.11 | Season target |
|---|---|---|---|---|---|
| M1 | **Sport coverage** | Sports with ≥1 published quota item / 33 | `site/quotas.json` | 33/33 (canoe, rowing added) | 33/33 |
| M2 | **Checked records** | Athletes with `verifiedAt` newer than `updatedAt` / all athletes | `data.json` (`trustOf()` = ok), `#admin` launch panel (PR #49) | ≥ 80%; ≤ 10 ❓ athletes | ≥ 90% |
| M3 | **Result latency** | Hours from the official IF result to the published site, per quota-relevant result | Runbook log line: result URL time → publish time (artifact version) | ≤ 24 h | ≤ 24 h, same day at the Games |
| M4 | **Quota freshness** | Age of `quotas.json updatedAt`; items with a past `nextQuotaEvent` | `#admin` quota health | ≤ 7 days; 0 past items > 48 h | same |
| M5 | **Pipeline health** | Daily runs published / days | `runs/<date>` in the DB, `#admin` last-run panel | 7/7 | ≥ 95% |
| M6 | **Fact-check latency** | Time from a fact-check-needed PR's open to Dana's sign-off | `gh pr list` timestamps + sign-off commit | ≤ 4 h on event days, ≤ 24 h otherwise | same |
| M7 | **Public corrections** | Errors found after publishing (reports + our own audit) that changed public data | Corrections log (strategy roadmap), error inbox | Log them all | < 2 a month |
| M8 | **Reader signal** (proxy for reach) | Error reports received, replies to shared digests, follows mentioned in feedback | Dedicated contact inbox (D2), owner's share log | Log, no target | Trend up |

Not measured: visits, unique viewers, time on page and digest copies (D8 recommends no counter). Don't quote
readership numbers we don't have.

## How it's collected
- **M1, M2, M4, M5:** read from `#admin` in under 5 minutes. A small `job/metrics.py` that prints M1/M2/M4 from
  `data.json` + `quotas.json` would make the weekly log a copy-paste (Maya, S, next sprint).
- **M3:** the publisher (D4) adds one line to the runbook log per result: event, official result URL and time, publish time.
- **M6:** from PR timestamps. The PM tallies it weekly.
- **M7, M8:** a corrections log on `#about` (strategy) and a weekly count from the contact inbox, done by the owner or publisher.

## Review
- **Weekly (Sunday):** the PM fills the log. Anything off target becomes a backlog story in the same week.
- **1.11 checkpoint:** compare against the launch targets, then recommend to the owner whether to keep the cadence or change scope.
- **Alarms (act the same day):** a false `earned` or `selected` (M7), no publish for 36 h (M5), or a quota result
  older than 24 h (M3).
