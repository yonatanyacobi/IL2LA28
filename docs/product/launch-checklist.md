# Public launch: readiness checklist

Owner of this list: PM. Status as of 2026-10-18 16:45 (sprint 2).
"Public launch" means sharing the artifact link outside the team. The site stays read-only for visitors; every gate
below is about what they see.

**No launch date yet: the owner decides it (D1).** On **Thu 22.10 at 12:00** the team runs a **readiness check**
against the gates below and reports the result to the owner. That's a report, not a go/no-go; no announcement is
planned (D6). The check is repeated on request, or after any red gate turns green.
- Don't launch on a result night. A wrong quota on day 1 is the worst outcome for this site.

The decisions these gates rely on (PR #57):
- **`earned`:** approved by both fact-checkers, Dana and Tamar, with no owner approval (D4).
- **New athletes:** a fact-checker signs off and the coordinator writes the record (D5).
- **Contact:** the owner opens a dedicated address (D2). Until then, new code uses the `{REPORT_EMAIL}` placeholder.

## Hard gates (all must be green)

| # | Gate | Status | Owner |
|---|---|---|---|
| G1 | **Audit corrections applied.** All 25 ✏️ corrections from `docs/audit/2026-10-18.md` are in the DB, including the 5 top-harm items (flag football, Bluman/Bond, Vered-Vilenchik, Shoshani, basketball men) | 🟢 applied 18.10 by the coordinator under the owner's delegation; spot-check the next published data.json | Coordinator |
| G2 | **❓ records aren't shown as checked.** None of the 27 ❓ records has `verifiedAt` unless its open claim was checked. Unverified records keep the "אוטומטי" chip, which is acceptable for launch | 🟡 coordinator marks only ✅ rows (drive rule) | Dana, Tamar → coordinator |
| G3 | **First-seen records verified.** ≥ 27 of the 30 records in the verification drive are marked "נבדק ידנית", including all 10 in batch B1 (the Rotterdam gymnasts, Sagiv and Gold). Dana and Tamar sign off; the coordinator writes `verifiedAt`. Batches due 19–21.10 (plan in PR #71) | 🟡 17/30 on 18.10 afternoon | Dana, Tamar → coordinator |
| G4 | **5 ❓ quota items stay unpublished** (athletics ×2: no WA system yet; sailing ×3: 2026 placings not verified). `build_quotas.py` publishes only `ok`/`fixed`, so this is green while nobody flips them without sources | 🟢 enforced by build | Roni/Yael, Dana |
| G5 | **Dedicated contact address live.** `CONTACT_EMAIL` is replaced by the owner's dedicated address (D2); no `{REPORT_EMAIL}` placeholder left in the published code | 🔴 the owner is opening the address | Owner → dev |
| G6 | **QA final regression is green** on the launch commit: no P0/P1, smoke + Python tests pass, 400px and 1280px, light and dark | 🟡 15:00 round pending; R2-1 fixed | Gil |
| G7 | **The pipeline publishes cleanly.** The last 2 daily runs published with no `#admin` errors, the validator ran, and the live job copy equals `job/` on main | 🟡 job copy synced after #45/#49; re-check on 21.10, since every `job/` merge needs a re-sync | Lead |
| G8 | **Result night 20.10 handled.** The Rotterdam outcome is live with an official FIG source. The publisher (Omer) runs `docs/runbooks/result-night.md`; `earned` is approved by Dana + Tamar (D4) | 🟡 | Omer, Dana + Tamar |

## Should-have (doesn't block, fix in the first launch week)
- `generatedAt` freshness banner seen once in a real stale state (not only in fake-date QA).
- Weightlifting quota item "נשים – קטגוריה לא אומתה" shows `unknown` during the Worlds. Research it before 27.10.

## Already green
- Disclaimer and independence statement on `#about` and in the hero ("מעקב לא רשמי"). The brand reads "הדרך ללוס
  אנג׳לס" without LA28 marks or rings.
- Source link on every athlete, competition and quota item. Stage 2/3 only via human-approved proposals.
- Error reporting: "מצאתם טעות?" box with copyable address and prefilled subject, on athlete pages and `#about`.
- Deep links (`#a-<id>`, `#sport-<id>`, `#quotas`, `#digest`) and a copy-link fallback.
- Hebrew copy/a11y pass merged (skip link, 44px targets, contrast). Mobile nav is now 92px.
- Quota tracker publishes 52 fact-checked items. The validator blocks `earned` without a stage ≥ 2 athlete.

## Readiness check and launch day
Both are in `docs/runbooks/launch-day.md` (PR #88):
- the 22.10 readiness check, a gate report to the owner;
- the launch-day sequence, run on the date the owner sets.

## Launch metrics
Measured without analytics (plan and baseline in PR #71). Launch-relevant ones: records checked (M2), result
latency ≤ 24 h (M3), public corrections (M7).
