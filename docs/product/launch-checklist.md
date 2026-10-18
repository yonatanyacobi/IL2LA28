# Public launch: go/no-go checklist

Owner of this list: PM. Status as of 2026-10-18 15:30, main @ 2701d63.
"Public launch" means sharing the artifact link outside the team (WhatsApp groups, social, federations).
The site stays read-only for visitors; every gate below is about what they see.

**Recommendation: GO on Thu 22.10.2026 if every gate below is green, otherwise slip to Tue 27.10.**
- 22.10 comes after the Rotterdam team final (20.10). That gives the owner 20–21.10 to handle result night and
  clear the audit queue, and the launch then opens with a real story (Rotterdam and Tongyeong).
- The latest date is 27.10. Abu Dhabi (29–31.10, Raz Hershko world #1) is the first big traffic moment, and we
  want a few days of public data and error reports before it.
- Don't launch on a result night. A wrong quota on day 1 is the worst outcome for this site.

## Hard gates (all must be green)

| # | Gate | Status | Owner |
|---|---|---|---|
| G1 | **Audit corrections decided.** All 25 ✏️ proposals in the review queue are approved or rejected, none pending. The 5 top-harm items in `docs/audit/2026-10-18.md` (flag football, Bluman/Bond, Vered-Vilenchik, Shoshani, basketball men) are approved and in the published data.json | 🔴 25 pending | Owner |
| G2 | **❓ records aren't shown as checked.** None of the 27 ❓ records has `verifiedAt` unless its open claim was checked. Unverified records keep the "אוטומטי" chip, which is acceptable for launch | 🟡 owner to confirm | Owner + Dana |
| G3 | **High-visibility records verified.** Everyone who appears in the home strip or the digest between 20.10 and 1.11 is ✅ and marked "נבדק ידנית": the 8 Rotterdam gymnasts, the triathletes in Tongyeong, the weightlifters, the 7 judo entrants in Abu Dhabi and the Doha shooters | 🔴 not started | Dana → owner |
| G4 | **5 ❓ quota items stay unpublished** (athletics ×2: no WA system yet; sailing ×3: 2026 placings not verified). `build_quotas.py` publishes only `ok`/`fixed`, so this is green while nobody flips them without sources | 🟢 enforced by build | Roni/Yael, Dana |
| G5 | **Contact address decided.** `CONTACT_EMAIL` is currently a personal Gmail. The owner reads the lead's memo and either keeps it knowingly (a public, spam-exposed address) or swaps in a dedicated one. Either way, the decision is recorded in the PR | 🔴 waiting on memo | Lead → owner |
| G6 | **QA final regression is green** on the launch commit: no P0/P1, smoke + Python tests pass, 400px and 1280px, light and dark | 🟡 15:00 round pending; R2-1 fixed | Gil |
| G7 | **The pipeline publishes cleanly.** The last 2 daily runs published with no `#admin` errors, the validator ran, and the live job copy equals `job/` on main | 🟡 check on 21.10 | Lead |
| G8 | **Result-night readiness.** The owner has read `docs/runbooks/result-night.md` and is reachable on 20.10 evening | 🟡 | Owner |

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
1. Confirm G1–G8 in the launch PR; the lead merges and publishes.
2. Open the artifact signed out on a phone. Check the home strip, `#quotas` and one athlete page.
3. Share `#digest` text plus the link. Start the metrics log (below).

## Launch metrics (first 4 weeks)
- **Accuracy:** fewer than 2 public factual corrections a week from week 2 on, each fixed within 48 h of the report.
- **Freshness:** a published data.json less than 36 h old every day. Every quota decision in quotas.json within 24 h
  of the official IF result.
- **Trust coverage:** at least 80% of records ✅ and "נבדק ידנית" by 1.11, 90% by 15.11.
- **Reach (proxy, no analytics in the artifact):** error reports and replies received, digest shares by the
  owner, and follows mentioned in feedback. We have no visitor counts, so judge reach on the qualitative signals.
