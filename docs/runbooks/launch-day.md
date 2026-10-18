# Runbook: public launch day, Thu 22.10.2026

Artifact: https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT. The gates G1–G8 are in the launch checklist (PR #43).
The **coordinator** makes the calls; the owner has delegated approvals. The owner keeps only the account actions:
the sharing setting, the contact inbox and posting in their own channels.

## Roles
| Who | Launch-day job |
|---|---|
| Coordinator | Runs the 12:00 go/no-go and any rollback call; marks verified records |
| PM | Gate report at 11:00, day-1 metrics, owns this runbook |
| Lead | Release freeze, tag, publish, rollback |
| Omer (publisher) | Data fixes after reports: run the daily task, check the published data.json |
| Gil | Final QA on the live site, signed out |
| Dana, Tamar | Error-report triage, on call in shifts (Dana 12:00–18:00, Tamar 18:00–23:00) |
| Owner | Sharing setting, dedicated inbox (D2), announcement posts (copy: PR #46) |

## Timeline
| When | Step | Who |
|---|---|---|
| 21.10 18:00 | **Freeze.** Only launch-blocker fixes merge to main. Verification batch B3 logged | Lead, Dana |
| 21.10 evening | QA regression on main; the lead tags it `launch-rc` | Gil, Lead |
| 22.10 morning | The daily job has run and published. Check `#admin` last run (G7) and spot-check 3 corrected records in data.json (G1) | Lead, Omer |
| 09:30 | **Save the rollback copies** (see Rollback) | Lead |
| 10:00 | Final QA on the **live** artifact, signed out, on a phone and a desktop: home, today strip, `#quotas`, `#digest`, one athlete page, and the error box showing the dedicated address (G5, G6) | Gil |
| 11:00 | **Gate report:** G1–G8 status table plus M2 (verified/30), posted to the coordinator | PM |
| **12:00** | **Go/no-go.** GO needs all gates green and G3 at ≥ 27/30 including all of B1. NO-GO → launch moves to Tue 27.10; the PM records the red gates and their owners | Coordinator |
| 12:15 | If main changed since `launch-rc`, the lead publishes it (as in `result-night.md` step 8, with every changed site file). Tag `launch-2026-10-22` | Lead |
| 12:30 | Live check again, signed out (2 minutes, same list as at 10:00) | Gil |
| 13:00 | The owner makes sure the link opens for signed-out visitors (sharing setting), then posts the announcement (PR #46) with the `#digest` text in the D6 channels | Owner |
| 13:00–23:00 | Watch: inbox triage at least hourly, the today strip at the day's events | Dana/Tamar, Omer |
| 23.10 09:00 | **Day-1 review:** reports received/fixed, corrections, anything rolled back. One line in the weekly metrics log | PM |

Don't launch while a result night is in progress, or during the daily job's publish step.

**If the launch moves to 27.10:** re-check every date-based line before posting:
- the announcement copy (PR #46), e.g. a days-to-opening count or "this week" lines;
- the `#digest` text;
- `LAUNCH_AT` (`2026-10-27T10:00:00Z`, since Israel is on UTC+2 after 25.10);
- the dates in this runbook's timeline.

## Gate report, 22.10 11:00 (template)
The PM fills it in and posts it to the coordinator. One screen only: the status is 🟢/🟡/🔴, every status names
where it was checked, and anything not green has an owner and an ETA before 12:00.
Pre-filled values are as of 18.10 ~16:30; **re-check every row on the day**.

| Gate | Status | Checked in (source) | Owner | If not green |
|---|---|---|---|---|
| G1 audit corrections in the DB | 🟢 (applied 18.10) | Spot-check 3 top-harm records (flag football, Shoshani, basketball men) in the published data.json | Coordinator | – |
| G2 no ❓ record shown as checked | 🟢 | Drive log `docs/audit/2026-10-verification-drive.md`: every marked record has a ✅ row | Dana, Tamar → coordinator | Unmark it |
| G3 drive ≥ 27/30, all of B1 | 🔴 **28/30, B1 incomplete**: missing `ilia-liubimov`, `celia-gold` | DB `athletes.verifiedAt` vs the drive list (Tashtchiev not in DB; `israel-basketball-women` counts as the alternate) | Dana → coordinator | Sign off and mark both by 11:30, or NO-GO |
| G4 5 ❓ quota items unpublished | 🟢 (`site/quotas.json`: 55 published, `unpublished`: 5) | `#admin` launch panel / `site/quotas.json` | Roni, Ofir; Dana, Tamar | – |
| G5 dedicated contact address | 🔴 `CONTACT_EMAIL` is still the personal Gmail; memo #53 open | `site/app.js` on the launch commit, and the error box on the live page | Owner (address) → dev (swap) | NO-GO unless swapped and published by 11:45 |
| G6 QA regression green | ⬜ | Gil's live check at 10:00 (`docs/qa/`) | Gil | Any P0/P1 → NO-GO |
| G7 pipeline publishes cleanly | ⬜ (`check_live_sync.py` merged, #91) | `#admin` last 2 runs + `python3 job/check_live_sync.py` | Lead | Run it now; NO-GO only if data.json is invalid |
| G8 Rotterdam result live | ⬜ | `#sport-artistic-gymnastics`, `#quotas`, home agree; official FIG URL. `earned` per owner decision D4 (pending) | Omer; Dana, Tamar | Not live → NO-GO |
| M2 (for the record) | 28/99 verified | DB | PM | – |

**Recommendation:** GO / NO-GO (fallback 27.10), plus one line naming the reason and the reddest gate.

## Rollback
**Save these at 09:30** (lead, in a Claude Code session at the repo root):
- `git tag pre-launch origin/main`. This is the site code currently live, if nothing merged since the last publish.
  Otherwise, tag the commit that was last published.
- Read the artifact with path `data.json` and save it as `/tmp/la28-data-prelaunch.json`.
- Note the artifact's current version label.

Decide which case you're in:
| Trigger | Action | Within |
|---|---|---|
| The page doesn't load signed out, is blank, or throws JS errors on home | **Republish the previous version:** the page and site files from `pre-launch` (`git show pre-launch:site/<file>`), published the same way as `result-night.md` step 8 | 15 min |
| data.json is broken (validator fails, records missing) | Republish `/tmp/la28-data-prelaunch.json` as `data.json`. Pause the daily task until it's fixed | 15 min |
| A false `earned`/`selected`, or harmful personal content | Fix the record in the DB (editor) and run the daily task now. If that takes more than 30 min, republish the previous data.json first | 30 min |
| A single wrong fact | No rollback. Use the error-report flow below | – |
| Something severe that can't be fixed quickly | **Kill switch:** the owner sets the artifact back to private. The coordinator posts in the channels: `האתר בתחזוקה קצרה ויחזור בקרוב. תודה על הסבלנות.` | Immediately |

Never hand-edit a published file, and never pass `force`. After any rollback, the fix goes through a normal branch and
PR, and the lead re-tags.

## The first error reports
Reports reach the dedicated inbox from the "מצאתם טעות?" box.

1. **Acknowledge** within 4 h during the day:
   - Hebrew: `תודה על הדיווח. אנחנו בודקים מול המקור הרשמי, והתיקון יופיע באתר וביומן התיקונים.`
     Until `#corrections` is live, end it at `באתר.`
   - English, for reports written in English: `Thanks for the report. We're checking it against the official source and will update the site.`
2. **Classify:**
   - **P0:** a wrong quota, stage or selection, a wrong retirement or injury, or personal details. Take the claim
     down first (editor edit), then verify. Within 2 h.
   - **P1:** a factual error in a record (rank, result, date, spelling). Verify against a primary source and fix
     within 24 h. The target is 48 h end to end (M7).
   - **P2:** a typo, a suggestion or a missing athlete. Goes to the backlog; new athletes become proposals (D5 rules).
3. **Fix:** the fact-checker on shift verifies, the coordinator edits the record, and Omer runs the daily task and
   checks the published data.json. A fix to a verified record turns its chip to "עודכן מאז"; it's re-checked in the
   next drive.
4. **Close:** reply to the reporter. Add a corrections-log line with the date, record, wrong → right, and source. The log
   is `#corrections` once built (UX round 4); until then, `docs/audit/corrections.md`. Don't copy reporters' names
   or email addresses into the repo.
5. **Escalate to the owner, and don't reply as the team:** requests from athletes or families to remove content (take the
   content down first), media, and anything legal or about the trademark.
