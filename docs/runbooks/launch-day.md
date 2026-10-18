# Runbook: readiness check (22.10) and public launch day (date set by the owner)

Artifact: https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT. The gates G1–G8 are in the launch checklist (PR #43); the
decisions are in PR #57.
- **No launch date yet:** the owner decides it (D1), and no announcement is planned (D6).
- **Approvals are delegated:** the coordinator makes the team's calls, and `earned` is approved by Dana + Tamar (D4).
- **The owner keeps the account actions:** the sharing setting and the dedicated contact inbox (D2).

## Part 1: readiness check, Thu 22.10
A report to the owner, not a go/no-go.

| When | Step | Who |
|---|---|---|
| 22.10 morning | The daily job has run and published. Check `#admin` last run (G7) and spot-check 3 corrected records in data.json (G1) | Lead, Omer |
| 10:00 | QA on the **live** artifact, signed out, on a phone and a desktop: home, today strip, `#quotas`, `#digest`, one athlete page, the error box (G6) | Gil |
| 11:00 | Fill in the gate report below, with a source per row | PM |
| 12:00 | Review the report with the coordinator; every red gate gets an owner and an ETA | PM, coordinator |
| 12:30 | **Send the report to the owner**, with the recommendation: "ready", or "ready once X, Y are done" | Coordinator |

The check is repeated on request, or when a red gate turns green.

### Gate report (template)
The PM fills it in; it fits on one screen. Each status is 🟢/🟡/🔴, names where it was checked, and anything not green
has an owner and an ETA. Pre-filled values are as of 18.10 ~16:30; **re-check every row on the day**.

| Gate | Status | Checked in (source) | Owner | If not green |
|---|---|---|---|---|
| G1 audit corrections in the DB | 🟢 (applied 18.10) | Spot-check 3 top-harm records (flag football, Shoshani, basketball men) in the published data.json | Coordinator | – |
| G2 no ❓ record shown as checked | 🟢 | Drive log `docs/audit/2026-10-verification-drive.md`: every marked record has a ✅ row | Dana, Tamar → coordinator | Unmark it |
| G3 drive ≥ 27/30, all of B1 | 🔴 **28/30, B1 incomplete**: missing `ilia-liubimov`, `celia-gold` | DB `athletes.verifiedAt` vs the drive list (Tashtchiev not in DB; `israel-basketball-women` counts as the alternate) | Dana → coordinator | Sign off and mark both; ETA in the report |
| G4 5 ❓ quota items unpublished | 🟢 (`site/quotas.json`: 55 published, `unpublished`: 5) | `#admin` launch panel / `site/quotas.json` | Roni, Ofir; Dana, Tamar | – |
| G5 dedicated contact address | 🟡 `il2la28.site@gmail.com` opened (D2); green once Shira's swap is published | `site/app.js` on main and the error box on the live page | Shira → lead | Publish the swap |
| G6 QA regression green | ⬜ | Gil's live check at 10:00 (`docs/qa/`) | Gil | List each P0/P1 with an owner |
| G7 pipeline publishes cleanly | ⬜ (`check_live_sync.py` merged, #91) | `#admin` last 2 runs + `python3 job/check_live_sync.py` | Lead | Run it now; red only if data.json is invalid |
| G8 Rotterdam result live | ⬜ | `#sport-artistic-gymnastics`, `#quotas`, home agree; official FIG URL. `earned` approved by Dana + Tamar (D4) | Omer; Dana, Tamar | Red until live |
| M2 (for the record) | 28/99 verified | DB | PM | – |

**Recommendation to the owner:** ready / ready once {gates} are done (ETA {date}), plus one line on the reddest gate.

## Part 2: launch day L (the owner's date)

### Roles
| Who | Launch-day job |
|---|---|
| Coordinator | Final ready call and any rollback call; marks verified records |
| PM | Morning gate re-check, day-1 metrics, owns this runbook |
| Lead | Release freeze, launch PR (`LAUNCH_AT`; check the dedicated address is live), tag, publish, rollback |
| Omer (publisher) | Data fixes after reports: run the daily task, check the published data.json |
| Gil | Final QA on the live site, signed out |
| Dana, Tamar | Error-report triage, on call in shifts (Dana 12:00–18:00, Tamar 18:00–23:00) |
| Owner | Sharing setting (link opens signed out), dedicated inbox (D2) |

### Timeline
| When | Step | Who |
|---|---|---|
| L−1, 18:00 | **Freeze.** Only launch-blocker fixes merge to main | Lead |
| L−1 evening | QA regression on main; the lead tags it `launch-rc`. Launch PR ready: `LAUNCH_AT` = L 12:00 Israel time in UTC (`+03:00` until 25.10, `+02:00` after), and the dedicated address | Gil, Lead |
| L 09:30 | **Save the rollback copies** (see Rollback) | Lead |
| L 10:00 | Live QA, signed out (as in Part 1) | Gil |
| L 11:00 | Re-run the gate report; all gates green, or the coordinator holds the launch and tells the owner | PM, coordinator |
| L 12:00 | Merge and publish the launch PR (`result-night.md` step 8, every changed site file). Tag `launch-<YYYY-MM-DD>` | Lead |
| L 12:30 | Live check again, signed out (2 minutes) | Gil |
| L 13:00 | The owner opens the link to signed-out visitors (sharing setting). No announcement (D6) | Owner |
| L 13:00–23:00 | Watch: inbox triage at least hourly, the today strip at the day's events | Dana/Tamar, Omer |
| L+1 09:00 | **Day-1 review:** reports received/fixed, corrections, anything rolled back. One line in the weekly metrics log | PM |

### Sharing settings (owner)
The artifact is private today, so a signed-out visitor can't open it at all. Only the owner can change this. Before
the signed-out checks, the artifact's sharing must give:
1. **A link anyone can open while signed out, as a viewer:** not "people in the organization" and not signed-in
   accounts only. If no such option is offered for this artifact, stop: the site can't launch publicly. Tell the
   coordinator.
2. **View only for that link:** no edit or admin access. Editors keep their own edit access. `#admin`, the review
   queue and the live DB depend on it, and visitors never get the `db` capability.
3. **The same URL as today**, https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT. Every shared link and `SITE_URL`
   point to it.

**Check, in a private window, signed out:** the page loads and shows data, not "האתר לא זמין עבורך כרגע" (the site
shows this when `data.json` answers 401/403, a sign-in page or JSON that isn't the export) and not a skeleton. `#home`,
`#calendar`, `#quotas` and an athlete page all render.

**Timing:** the 10:00 and 12:30 checks above are signed out, so they need the link open first. Either the owner
opens it at L 09:45 with no announcement (D6 still holds until 13:00), or Gil runs those checks signed in through
"צפייה כגולש/ת" and repeats the signed-out check right after 13:00. The PM picks one before L.

Don't launch on a result night, or during the daily job's publish step. When L is set, re-check every date-based line:
the `#digest` text, `LAUNCH_AT` and this timeline.

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
