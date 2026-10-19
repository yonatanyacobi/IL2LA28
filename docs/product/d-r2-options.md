# D-R2: how quota updates get drafted after a result (options for the owner, decide by 25.10)

Owner: Maya. 19.10.2026. Context: `owner-decisions.md` (D-R2), `docs/design/results-automation.md`, sprint 8 item 10.

**The question.** When an official result can change a quota item (`data/quotas/quotas.json`), who drafts the update:
the daily job, or a person? Whatever the answer, people still decide. "earned" and stage changes always need Dana and
Tamar (team charter, enforced by `check_signoff.py`, #330/#335). The job never edits `quotas.json`.

**What already runs, under any option:**
- `quota_due.py` adds a warning to every run after a qualifying event ends: "לעדכן quotas.json: …".
- Results reach athlete histories from official sources: triathlon (`tri_results.py`) and FIG Results Books
  (`gym_results.py`, Paris dry run: 19 entries).

| | **A. Approve the `quota` proposal kind** (PM's recommendation) | **B. Keep quota updates manual** | **C. Drafts in the run log, no new kind** |
|---|---|---|---|
| What the job does | Files `proposals/<id>` of kind `quota`: a patch for `israelStatus`, `israelNote`, `nextQuotaEvent`, `source`, with evidence links. `#admin` shows it, and the publisher applies it to the master through the runbook. | Only today's warning line. A researcher reads the official page and edits the master. | Writes the same draft patch as a line in `runs.warnings` (already in `#admin`). The publisher copies it into the master by hand. |
| Gain | A draft within one run (≤ 24 h) next to its evidence, an approve button, and an audit trail in `proposals`. Researchers stop watching result pages. | No build, no new failure mode. Maya stays on results-to-history (Nanjing 8.11) and sprint 8. | Most of A's speed for about a third of the work. No new schema or `#admin` screen, and no site publish needed. |
| Risk | A misread page gives a wrong draft. Mitigated by people approving and two checkers, but drafts can look authoritative. The new kind needs a validator, `#admin` rendering and tests, and quota pages (ISSF tracker, IJF lists) change format. | The ≤ 24 h target depends on a researcher noticing and having time. On a night with several events (Abu Dhabi 29–31.10, Doha 3–4.11) items wait. | Copying by hand can slip. Drafts mixed with other warnings are easy to miss. No per-draft approve record beyond the PR. |
| Cost | Sprint-backlog PL3: Maya (M) + Itai (S), about 3 working days. The `#admin` part is a site publish: before 28.10 12:00 or after 1.11 10:00 (freeze). | None. | About 1 day, Maya only (job and tests). |
| Doha 3–4.11 | Helps only if the ISSF quota tracker reads cleanly as data, which isn't checked yet. Otherwise the job warns and a person does it, as in B. | `result-night-doha.md` as written: the quota is read from the ISSF tracker by hand. | Same caveat as A. |

**What changes for the owner.**
- A: you see drafts to approve in `#admin` after each event.
- B: nothing changes.
- C: you see draft lines in the run log, and the team copies them.

**Maya's view (engineering only).**
- C before Doha. It's cheap, it isn't blocked by the publish freeze, and it shows on real events how often drafts are
  right.
- Then A in sprint 9 if the drafts hold up. C's draft builder is the core of A, so little is lost.
- B is safe but leaves the ≤ 24 h target to people's availability during the busiest two weeks.

Reply with A, B or C (or "C then A"). Each one fits in sprint 8 as item 10.
