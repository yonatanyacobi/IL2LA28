# Sprint 2 goals (19–25.10.2026)

Theme: **ready to launch, on a real result.** The owner sets the launch date (D1). Five goals; each is measurable on 25.10 from the repo, the published data.json
or the metrics log (W43). Stories are in `sprint-backlog.md` (this branch). The coordinator holds delegated
owner approvals.

| # | Goal | Owner | Done when (checked 25.10) |
|---|---|---|---|
| G-1 | **Rotterdam 20.10 is on the site within 24 h, sourced** | Omer (publisher); Roni; Dana + Tamar | The men's team quota item has outcome (א) or (ב) from `rotterdam-outcomes.md`, with an official FIG URL, published by **21.10 20:00** (M3 ≤ 24 h). If (א): the 5 gymnasts are at stage 2 first, and `earned` is approved by Dana + Tamar (D4). `#sport-artistic-gymnastics`, `#quotas` and home agree |
| G-2 | **≥ 27 of the 30 drive records verified, including all 10 of B1** | Dana, Tamar; coordinator marks | By **22.10 11:00**, `verifiedAt` is set on ≥ 27 of the drive records, each with a logged sign-off (source URLs, checker, time). M2 ≥ 27% in the gate report |
| G-3 | **Readiness check held at 12:00 on 22.10 and reported to the owner** | PM (gate report); coordinator; lead | The gate report (G1–G8) is filled in, with a source per row (template in PR #88), and sent to the owner by 12:30. Every red gate has an owner and an ETA. If the owner sets a launch date, the launch-day runbook is scheduled for it. No announcement (D6) |
| G-4 | **Corrections log live** (#89) | Maya (data/export), Noa (page and form) | By **24.10**: `#corrections` is built and merged, with `LAUNCH_AT` as one constant that the launch PR sets once the owner picks the date; the editor form writes a correction doc; reporters' names and emails are never exported (test); smoke tests cover the empty state and `{speed}`. Once launched, every report is fixed or answered within 48 h |
| G-5 | **Tongyeong 24.10 shows up correctly** | Maya (#67 + competition); Ofir; Gil | By **23.10**: the Tongyeong World Cup is a competition in data.json, and the #67 test passes on main (every quota event in the next 14 days has a containing competition or an explicit `end`). On 24.10 the today strip shows Sagiv with the stakes line. His result is published by **25.10 20:00** with an official World Triathlon source |

## Not goals this sprint
These are tracked in the backlog without a sprint commitment:
- rank tie-break (needed by 28.10);
- quota proposal kind;
- Doha readiness;
- verification drive 2.

## Sprint review, Sun 25.10
The PM scores each goal ✅/❌ with evidence links in the W43 metrics log. The scores go out to the owner in the weekly
update, and missed goals become sprint 3 stories with a named cause.
