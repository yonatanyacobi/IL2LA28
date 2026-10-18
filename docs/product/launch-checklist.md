# Public launch: go/no-go checklist

Owner of this list: PM. Status as of 2026-10-18 15:30, main @ 2701d63.
"Public launch" means sharing the artifact link outside the team (WhatsApp groups, social, federations).
The site stays read-only for visitors; every gate below is about what they see.

**Launch date: Thu 22.10.2026** (agreed with `docs/company/strategy.md`). Go/no-go call at 12:00 on 22.10; if any
hard gate is red, the fallback is Tue 27.10, before Abu Dhabi (29–31.10). The owner decisions behind this list are in
`docs/product/owner-decisions.md`.
- 22.10 leaves a full day of buffer after the Rotterdam team final (20.10), and the launch opens with a real, sourced result.
- Don't launch on a result night. A wrong quota on day 1 is the worst outcome for this site.

## Hard gates (all must be green)

| # | Gate | Status | Owner |
|---|---|---|---|
| G1 | **Audit corrections applied.** All 25 ✏️ corrections from `docs/audit/2026-10-18.md` are in the DB, including the 5 top-harm items (flag football, Bluman/Bond, Vered-Vilenchik, Shoshani, basketball men) | 🟢 applied 18.10 by the coordinator under the owner's delegation; spot-check the next published data.json | Owner |
| G2 | **❓ records aren't shown as checked.** None of the 27 ❓ records has `verifiedAt` unless its open claim was checked. Unverified records keep the "אוטומטי" chip, which is acceptable for launch | 🟡 owner to confirm | Owner + Dana |
| G3 | **Launch-week records verified.** Everyone in the strip or digest 22–27.10 is ✅ and marked "נבדק ידנית": the 8 Rotterdam gymnasts, Shahar Sagiv (Tongyeong), Celia Gold (weightlifting). Abu Dhabi entrants by 28.10, Doha shooters by 31.10 (not launch-blocking) | 🔴 not started | Dana → owner |
| G4 | **5 ❓ quota items stay unpublished** (athletics ×2: no WA system yet; sailing ×3: 2026 placings not verified). `build_quotas.py` publishes only `ok`/`fixed`, so this is green while nobody flips them without sources | 🟢 enforced by build | Roni/Yael, Dana |
| G5 | **Dedicated contact address live.** `CONTACT_EMAIL` is replaced by a dedicated address (memo: PR #53; strategy decision 2) | 🔴 owner to create the address | Owner → dev |
| G6 | **QA final regression is green** on the launch commit: no P0/P1, smoke + Python tests pass, 400px and 1280px, light and dark | 🟡 15:00 round pending; R2-1 fixed | Gil |
| G7 | **The pipeline publishes cleanly.** The last 2 daily runs published with no `#admin` errors, the validator ran, and the live job copy equals `job/` on main | 🟡 check on 21.10 | Lead |
| G8 | **Result night 20.10 handled.** The Rotterdam outcome is live with an official FIG source. The publisher (Omer) runs `docs/runbooks/result-night.md`; `earned` needs both fact-checkers plus the owner (or the lead if the owner can't be reached), per D4 | 🟡 | Omer + Dana, owner for `earned` |

## Should-have (doesn't block, fix in the first launch week)
- `generatedAt` freshness banner seen once in a real stale state (not only in fake-date QA).
- Calendar/strip gap: the Tongyeong triathlon (24.10) is a quota event in quotas.json, but there's no competition in
  data.json, so it won't appear in the today strip or the calendar. Add the competition (job or editor).
- Weightlifting quota item "נשים – קטגוריה לא אומתה" shows `unknown` during the Worlds. Research it before 27.10.
- QA open P2s: 63 apostrophes instead of geresh in the data (P2-8), singular forms in the quota KPI, empty allocation details.

## Already green
- Disclaimer and independence statement on `#about` and in the hero ("מעקב לא רשמי"). The brand reads "הדרך ללוס
  אנג׳לס" without LA28 marks or rings.
- Source link on every athlete, competition and quota item. Stage 2/3 only via human-approved proposals.
- Error reporting: "מצאתם טעות?" box with copyable address and prefilled subject, on athlete pages and `#about`.
- Deep links (`#a-<id>`, `#sport-<id>`, `#quotas`, `#digest`) and a copy-link fallback.
- Hebrew copy/a11y pass merged (skip link, 44px targets, contrast). Mobile nav is now 92px.
- Quota tracker publishes 52 fact-checked items. The validator blocks `earned` without a stage ≥ 2 athlete.

## Launch-day steps (owner)
1. 12:00 go/no-go on G1–G8; the lead merges and the publisher publishes.
2. Open the artifact signed out on a phone. Check the home strip, `#quotas` and one athlete page.
3. Share `#digest` text plus the link. Start the metrics log (below).

## Launch metrics
See `docs/product/metrics-plan.md` (measured without analytics, per the strategy).
