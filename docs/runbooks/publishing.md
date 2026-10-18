# Runbook: publishing

Owner: **Omer (Publisher)**. Covers everything from the fact-checker's sign-off until the change is live, the
digest text that goes out after it, and the Sunday digest. How a quota result is verified, edited and signed off
is in [result-night.md](result-night.md) (steps 1–4). This file picks up from there.

Roles: **Publisher** runs this checklist. **Lead** merges. **Coordinator** presses publish.
**Owner** posts the digest text. **Fact-checker** (Dana) signs off.

Paths are relative to the repo root (`~/workspace/IL2LA28`). The artifact is
https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT.

## Hard rules

- Publish only from `main`, after the lead has merged. Never publish from a branch or a dirty tree.
- Never publish `site/data.json`. It is a local preview copy and may be the test fixture. The public `data.json`
  comes only from the export (step 3).
- `data.json` with the stage change goes live **before** a `quotas.json` that says `earned` (the validator enforces
  this, step 4).
- A failed check stops the run. Don't skip it, don't weaken it, and don't publish "just the safe part".
- Never pass `force`, `capabilities`, `icon` or `contract` to the publish call.

## Checklist

Copy this list into the PR thread and tick the items as you go.

```
[ ] 0. Sign-off: check_signoff.py shows no STOP; stage approved (earned only)
[ ] 1. Merged by the lead; local main == origin/main; tree clean
[ ] 2. build_quotas on main: no diff in site/quotas.json
[ ] 3. Export: data.json published by the daily task, copied to /tmp/la28-data.json, stage visible
[ ] 4. Validators: data, quotas, quota_due, node --check, unit, smoke, preview_at (today + next event day)
[ ] 5. Republish: call prepared, coordinator published, main SHA noted in the PR
[ ] 6. Live check at 400px, light and dark, signed out
[ ] 7. Digest text copied from #digest, checked, handed to the owner
```

### 0. Sign-off (before merge)

On the PR branch, every item that changed in `data/quotas/quotas.json` has `review.status` `"ok"` or `"fixed"`
(`review` is multi-line JSON, so a `grep` of the diff doesn't show it):

```sh
git fetch origin
python3 job/check_signoff.py          # one line per changed item; exit 1 if any line says STOP
```

A `STOP` item is left out by the build, so it would silently not go live. No output means no quota item changed.

For an `earned` item, the athletes' stage-2 proposals have been approved in the page (result-night.md, step 4).
On the branch, before asking for review, the author runs steps 2 and 4 below and commits `site/quotas.json`.

`earned` is approved by Dana and Tamar together (result-night.md step 3). `check_signoff.py` says STOP on an `earned`
item unless `review.by` is `"dana+tamar"`.

### 1. Merge (lead)

The lead merges with `git merge --no-ff`. Then the Publisher runs, in the main checkout (`~/workspace/IL2LA28`, not
a worktree: git refuses to check out `main` in a second worktree):

```sh
git checkout main && git pull --ff-only
git status --short --untracked-files=no   # must print nothing; untracked files are never published
git log --oneline -1                      # note this SHA: it is what goes live
```

### 2. Build quotas on main

```sh
python3 job/build_quotas.py data/quotas/quotas.json site/quotas.json
git diff --exit-code site/quotas.json && echo "quotas.json in sync"
```

If there is a diff, the branch was merged without its build. Don't commit it on main. Stop, and ask the author for a
follow-up PR with the built file.

### 3. Export data.json

The daily task exports the database, validates the export and publishes `data.json` (job/SKILL.md, step 5). Use it
instead of a hand export, so that the export has a single code path.

1. Claude Code → Scheduled tasks → `la28-israel-daily-update` → **Run now**. Wait for its 3-line summary and check
   it says `published yes`. If it says no, read `errors` in `runs/<today>` (page → `#admin`) and stop.
2. Fetch what is live, in a Claude Code session at the repo root:
   > Read the artifact https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT with path "data.json" and copy the saved
   > file to /tmp/la28-data.json.
3. For an `earned` item, check that the stage is in the published data:
   ```sh
   python3 -c "import json,sys;d=json.load(open('/tmp/la28-data.json'));print([a['id'] for a in d['athletes'] if a['sportId']==sys.argv[1] and a['stage']>=2])" artistic-gymnastics
   ```
   Expect the athletes' ids. An empty list means the approval hasn't been exported yet: run the task again.

### 4. Validators

```sh
python3 job/validate_data.py /tmp/la28-data.json
python3 job/validate_data.py --quotas site/quotas.json /tmp/la28-data.json
python3 job/quota_due.py /tmp/la28-data.json site/quotas.json --days 4
for f in site/*.js; do node --check "$f" || echo "SYNTAX ERROR: $f"; done
python3 -m unittest discover -s tests
node tests/smoke.test.js
node tests/preview_at.js /tmp/la28-data.json site/quotas.json $(TZ=Asia/Jerusalem date +%F)
node tests/preview_at.js /tmp/la28-data.json site/quotas.json <next event day, YYYY-MM-DD>
node tests/probe.js /tmp/la28-data.json site/quotas.json
```

- The two `validate_data.py` runs print `OK: …` and must exit 0. `INVALID: … "earned" but no athlete … has
  stage >= 2` means step 3 isn't done yet.
- `quota_due.py` is informational, and it prints nothing when nothing is due. Every `לעדכן quotas.json: …` line it
  prints should be explained by this release, or already be on someone's list. Paste the output into the PR thread.
- The `node --check` loop prints nothing when all files parse. Its exit status only reflects the last file, so read
  the output.
- The unit tests end with `OK`, and the smoke tests end with `N/N passed`.
- `preview_at.js` renders every route with the real data and quotas as on that Israel date. It prints the today
  strip, the new-quota panel and the full digest text, and exits 1 on a crash, a not-found sport or athlete, or a
  digest over 3,500 characters. Read the strip and the digest for stale wording (for example, "מה זה אומר" about an
  event that has already happened).
- `probe.js` renders every route (including `#today`, `#day-`, `#c-`, `#following`, `#corrections`) on the export day
  and the 13 days after it, as a visitor and with follows. It prints `N renders in T s, 0 findings` and exits 1 on any
  `FINDING`: a crash, a not-found, `undefined`/`NaN`/`null` in the page, banned copy, a duplicate id, a dangling aria
  reference or a non-https link. Pass dates after the files to check specific days.

### 5. Republish (coordinator presses publish)

The Publisher prepares the call and the coordinator runs it. The page itself is published only when
`site/index.html` changed:

1. In a Claude Code session at the repo root, have Claude read the artifact (no path) and diff the saved page file
   against `site/index.html`.
   - If they are identical, or differ only by changes in this merge (`git log -p -1 -- site/index.html`), use
     `file_path = site/index.html`.
   - If the live page has anything that isn't in git, **stop** and ask the lead. Someone published outside this
     process.
2. Hand the coordinator this call (main checked out at the SHA from step 1):
   > Publish to https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT with file_path = site/index.html and
   > files = {"app.js": "site/app.js", "admin.js": "site/admin.js", "quotas.js": "site/quotas.js",
   > "digest.js": "site/digest.js", "corrections.js": "site/corrections.js", "sessions.js": "site/sessions.js",
   > "day.js": "site/day.js", "event.js": "site/event.js", "home.js": "site/home.js", "gamelog.js": "site/gamelog.js",
   > "following.js": "site/following.js",
   > "styles.css": "site/styles.css", "quotas.json": "site/quotas.json"}.
   > Don't pass force, capabilities, icon or contract.

   `data.json` is not in the list. It was published in step 3, and files left out are kept. The map must name every
   `<script src>` in `index.html` (`grep -o 'src="[^"]*"' site/index.html`; the smoke test checks this); a new
   `site/*.js` goes into both, and into `SCRIPTS` in `tests/smoke.test.js`.
3. Note in the PR thread: the published SHA and the time.

### 6. Live check at 400px

Open the artifact signed out (a private window). Set the width to 400px (DevTools device toolbar, or a narrow
window). Check in light, then in dark (DevTools → Rendering → `prefers-color-scheme`).

| Route | Expect |
|---|---|
| Home | No horizontal scroll. Header is two short rows, and the current tab is visible. The freshness line shows the time of step 3. On an event day the today strip shows the competition. A newly `earned` item appears in "מכסה חדשה לישראל" with its date. |
| `#sport-<id>` of the release | The new status pill and note. The quota footnote date matches `updatedAt`. |
| `#quotas` | The item is in the right group, and the summary counts it. |
| `#a-<athlete>` (earned only) | Stage shows "מכסה הושגה" with the official source. |
| `#digest` | Opens, and the text includes this release (step 7). |
| Console | No errors. |

If anything is wrong, roll back (below). Don't fix forward on the live site.

### 7. Digest text to send out

1. Open `#digest` on the live site (signed out) and press **העתקת התקציר**. If the clipboard is refused, the text
   is selected in the box, so copy it by hand.
2. Check before handing it over:
   - The release is in it: under "תוצאות השבוע" (a competition that ended) or "מה התעדכן" (the approved change).
     A competition with "התוצאות עוד לא עודכנו באתר." means the approval summary hasn't reached `meta/status`. Wait
     for the next export rather than editing the text.
   - The text has no outcome that isn't on the site, and no "בטוח" or "כנראה".
   - The counter shows at most 3,500 characters, and the text ends with the site link and the disclaimer.
3. Give the text to the owner, who posts it. For a single-result night, the owner may post only the relevant
   section plus the last two lines (site link and disclaimer). The Publisher doesn't edit the facts in the text.
   If a fact is wrong, it's wrong on the site too: roll back.

## Rehearsal log

### 2026-10-18: Rotterdam team final, made-up outcome "Israel 2nd" (`earned`)

Run on a local branch (main 8af47d3 + #68 + this branch; nothing pushed or published). `data/quotas` was edited per
rotterdam-outcomes.md (א), then sign-off was simulated, then the build ran. The export was simulated from the live
data.json with stage 2 for the five men. After that: validators, `preview_at.js` for 21.10, and the sport page,
`#quotas`, athlete page and home.

Worked as written: `check_signoff.py` (STOP before sign-off, OK after), the build, the expected `INVALID … stage >= 2`
before the stage change, both validators after it, `quota_due.py` (nothing due), the home banner, the sport page
("הושגה ב־20 באוק׳ 2026"), the `#quotas` earned group and its count, and the athlete page stage.

| # | Problem | Status / owner |
|---|---|---|
| 1 | (א) had no `earnedAt`, so there was no home banner and no strip line. | Fixed here: added to rotterdam-outcomes.md (א) and result-night.md step 2. |
| 2 | With `nextQuotaEvent: null` (as (א) says), the strip never matched the earned item, so there was no "✓ מכסה הושגה" line. | Fixed in #68 (cc8cd71): earned items are matched by `earnedAt` and sorted first. **#68 must merge before 20.10.** |
| 3 | The individual men's item → `outside` kept "אירוע המכסה הבא: 2027" next to "לא רלוונטי". | Fixed here: (א) now also sets its `nextQuotaEvent: null`. |
| 4 | `node tests/smoke.test.js` failed after the real result was built: two tests (date matrix, `#admin` result night) read `site/quotas.json` and expected the pre-final item. | Fixed: date and scenario tests read the frozen `tests/fixtures/site-quotas-2026-10-18.json`; only "all items load and render" reads the live file. Checked 18.10 (Gil): with Rotterdam men's team set to `earned`, smoke passes and `preview_at.js` for 20.10 shows the won panel. |
| 5 | `check_signoff.py` couldn't tell whether an `earned` item had both fact-checkers. | Fixed here: `earned` requires `review.by` `"dana+tamar"` (#102's D4 format). |
| 6 | After approval, the athletes' "התחרות הבאה" still showed the 18.10 qualifiers. | Open. The editor updates `next`/`nextDate` while approving (result-night.md step 4). Itai: an `#admin` hint. |
| 7 | The athlete page has no "מכסה" line for the team members, because the (א) note names no gymnasts and the matcher looks for names. | Open, UX (round3 §3). A team quota belongs to the NOC, so maybe that's correct. |
| 8 | Home shows "5 עם מכסה" (athletes at stage ≥ 2) next to "מקצה אחד עם מכסה לישראל". Two counts that read like they disagree. | Open, Shira / UX. |
| 9 | (א) copy uses "LA28", hyphens and dotted dates (`ב-20.10.2026`), unlike the site's style. Its `stakes` never shows on an earned item. | Open, Dana / Shira (wording). Drop `stakes` for earned items. |

## Event checklists (dry-run 2026-10-18)

These are dry runs on the live data.json of 18.10, with made-up results. No API key, no publishing. The general
steps 0–7 still apply. These lists cover only what is specific to each event.

### Tongyeong World Cup, triathlon (24.10): manual entry, checked by `job/tri_results.py`

No quota and no stage change (event-calendar.md). The result is entered by hand on 24.10 in the job's exact
string (`tri_results.result_text()`), so the 25.10 run sees it as already recorded and skips it
([result-night-2410.md](result-night-2410.md)).

```
[ ] By 23.10: the 2026 Tongyeong record (tri-world-cup-tongyeong-2026, in the DB since 18.10) is in the
    *published* data.json, with source https://triathlon.org/events/2026-world-triathlon-cup-tongyeong (the slug
    is what tri_results matches). tri_results reads the published file, not the DB, so check the file.
[ ] By 23.10 (Ofir): Sagiv's nextDate = 2026-10-24 and his source = his triathlon.org profile (id 41870), also in
    the published file
[ ] 24.10 (Ofir → Tamar → coordinator): enter the result per result-night-2410.md; on a podium also the job's
    notes string, so no "<id>-20261024-result" proposal is opened
[ ] 25.10 after the 07:13 run: runs/2026-10-25 has no "תוצאות טריאתלון" warning and no second Tongyeong entry
    (a second one: delete the manual entry, the job's text is the API's, and tell Omer)
[ ] Ofir: next/nextDate → WTCS Abu Dhabi 13.11 (if on the start list), and the quota item's israelNote,
    stakes and nextQuotaEvent per his plan, through result-night.md + steps 0–7
[ ] Step 4 preview for 25.10: the digest shows the result under "תוצאות השבוע"
```

Rehearse it the same way, without a key:

```sh
python3 tests/dryrun_tri_results.py /tmp/la28-data.json tests/fixtures/dryrun/tri-api-tongyeong-final.json \
  --today 2026-10-25 --add-competition tests/fixtures/dryrun/tongyeong-competition.json
```

Expected (made-up 7th place), with no warnings and no proposals:
`history`: `מקום 7 בגביע העולם בטריאתלון טונגיונג (ספרינט, 24 באוק׳ 2026)`. Digest of 25.10:
```
• 24 באוק׳ · גביע העולם בטריאתלון טונגיונג (טריאתלון)
  ישראלים: שחר שגיב
  – שחר שגיב: מקום 7 בגביע העולם בטריאתלון טונגיונג (ספרינט, 24 באוק׳ 2026)
```
With `tri-api-tongyeong-provisional.json`, the plan carries only the warning "הרשימה עוד לא סופית; לא נכתב דבר".

### Abu Dhabi Grand Slam, judo (29–31.10): results entered by editors

No quota (abu-dhabi-outcomes.md). There is no results tool for judo yet. Per day, Roni enters each Israeli's result
from https://www.ijf.org/competition/3157/results, and Dana signs off.

```
[ ] By 28.10 (Roni): each judoka's nextDate = their actual day from the IJF outlines
    (29.10: Ashpiz, G. Primo, Nelson Levy; 30.10: Elbaz; 31.10: Hershko), and the entries checked after the draw
[ ] Each evening (Roni): one history entry per Israeli who fought that day, kind "result", source = IJF results:
    "<זהב|כסף|ארד|מקום 5|מקום 7|הודח/ה <ROUND>> בגרנד סלאם אבו דאבי, <weight> (<DD> באוק׳ 2026)"
    (<ROUND> as in abu-dhabi-outcomes.md, e.g. "בסיבוב הראשון", "ברבע הגמר"; full rules in result-night-abu-dhabi.md)
[ ] Medals only: one meta/status change "ג׳ודו: <name> – <same text>" with athleteId (the digest shows it once)
[ ] No rank changes until the next IJF WRL PDF; no quota status changes
[ ] After 31.10, one PR for all 7 judo items (stakes, nextQuotaEvent → the next event), through steps 0–7.
    From 1.11 until it is live, the items show "◷ בהמתנה לתוצאות"
[ ] Step 4 previews: 30.10 (strip day 2), 1.11 (digest)
```

Digest of 1.11 in the dry run (made-up results):
```
• 31 באוק׳ · גרנד סלאם אבו דאבי (ג׳ודו)
  ישראלים: גפן פרימו, יהונתן אלבז, יצחק אשפיז, רז הרשקו, תמנע נלסון לוי
  – גפן פרימו: מקום 5 בגרנד סלאם אבו דאבי, 52- ק״ג (29 באוק׳ 2026)
  – יצחק אשפיז: ארד בגרנד סלאם אבו דאבי, 60- ק״ג (29 באוק׳ 2026)
  – תמנע נלסון לוי: זהב בגרנד סלאם אבו דאבי, 57- ק״ג (29 באוק׳ 2026)
  – יהונתן אלבז: הודח בסיבוב הראשון בגרנד סלאם אבו דאבי, 73- ק״ג (30 באוק׳ 2026)
  – רז הרשקו: כסף בגרנד סלאם אבו דאבי, 78+ ק״ג (31 באוק׳ 2026)
```

### Found in these dry runs

| # | Problem | Status / owner |
|---|---|---|
| D1 | The published data.json of 18.10 had no 2026 Tongyeong record. Without one, `tri_results.py` does nothing **and gives no warning**. The record has been in the DB since 18.10 and reaches data.json with the 19.10 export, so this is not a blocker for 25.10. | Checklist: confirm in the published file by 23.10. Maya: warn when an entrant's `nextDate` has no competition record. |
| D1b | `tri_results.py` reads the **last published** data.json (job/SKILL.md step 2d: `pub.json`), not the DB dump. A record or `nextDate` added in the DB after the last export is invisible to it. If the export fails (for example the >20% shrink guard), it stays invisible until an export succeeds. Its "already logged" check also only sees published history. | Bug, Maya: feed it the step-1 DB read (or the step-5 export), not `pub.json`. |
| D2 | The digest ignored results written into athlete history (where `tri_results.py` and editors put them). Results showed as "התוצאות עוד לא עודכנו". | Fixed on this branch (digest.js). |
| D3 | A medal entered both in history and as a meta/status change appeared twice in the digest. | Fixed on this branch: the change is dropped when the athlete's result is already listed. |
| D4 | All five judoka have `nextDate` 29.10, but Elbaz fights 30.10 and Hershko 31.10. On day 2 the strip still lists day-1 athletes and their "מה זה אומר". | Roni: the actual days (checklist). Noa: whether to rank items of athletes who already fought below the others. |
| D5 | The Rotterdam result bullet carries the 18.10 change "מתקיימת עכשיו…", a pre-event note, as if it were a result. | Open (Maya, job change wording). |
| D6 | `tri_results` history text had an ISO date `(ספרינט, 2026-10-24)`, unlike the site's date style. | Fixed: `he_date()` writes `24 באוק׳ 2026`. |
| D7 | Abu Dhabi runbook says "יונתן אלבז", while the data says "יהונתן אלבז". | Roni / Dana. |

## Rollback

Republish the previous build. Don't hand-edit published files.

```sh
rm -rf .rollback && mkdir .rollback
git archive <previous published SHA> site | tar -x -C .rollback     # → .rollback/site/…
```

Give the coordinator the step 5 call with every `site/` path replaced by `.rollback/site/` (page and files). The
publish tool only takes files under the repo or Claude's scratchpad, so don't use `/tmp`. Run `rm -rf .rollback`
afterwards. A wrong stage is reverted by an editor in the page and reaches the public with the next export (step 3).
Then fix it on a branch and run this checklist again.

## Sunday digest

Every Sunday by 10:00 Israel time. The digest covers the 7 days before Sunday plus the coming week.

1. Check that the morning daily run published (the `#home` freshness line shows today). If not, run step 3 first.
2. Do step 7 for the whole text, then hand it to the owner.
3. Before a big weekend (a world championship or a quota event), draft the accompanying message in
   `docs/runbooks/digest-<event>.md` during the week, with a variant for each possible outcome, so that Sunday is
   copy, check and send. For example, see [digest-rotterdam.md](digest-rotterdam.md).
