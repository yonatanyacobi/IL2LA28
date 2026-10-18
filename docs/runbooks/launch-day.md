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
| 13:00 | The owner makes sure the link opens for signed-out visitors (sharing setting), then posts the announcement with the `#digest` text in the D6 channels | Owner |
| 13:00–23:00 | Watch: inbox triage at least hourly, the today strip at the day's events | Dana/Tamar, Omer |
| 23.10 09:00 | **Day-1 review:** reports received/fixed, corrections, anything rolled back. One line in the weekly metrics log | PM |

Don't launch while a result night is in progress, or during the daily job's publish step.

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
| Something severe that can't be fixed quickly | **Kill switch:** the owner sets the artifact back to private. The coordinator tells the channels "תחזוקה קצרה" | Immediately |

Never hand-edit a published file, and never pass `force`. After any rollback, the fix goes through a normal branch and
PR, and the lead re-tags.

## The first error reports
Reports reach the dedicated inbox from the "מצאתם טעות?" box.

1. **Acknowledge** within 4 h during the day: "תודה, בודקים מול המקור הרשמי ונעדכן."
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
