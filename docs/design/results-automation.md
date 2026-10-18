# Results automation (results-assist): design note

Owner: Maya. Status: draft, 2026-10-18. Strategy context: #58, Season theme "Results-assist", with the target
"results live within 24 hours".

## Constraints we keep
- No scraping and no live scores (#58 "We will NOT"). The job reads one official page, PDF or documented API per
  finished event. It doesn't crawl, and it doesn't build on undocumented endpoints.
- Nothing public without an official source. "earned" and stages 2–3 always need a person, and "earned" needs two.
- The job never edits quotas.json (CLAUDE.md, SKILL.md). It drafts, and people apply.

## What is machine-readable (checked 2026-10-18)
| Sport | Official result source | Machine-readable? | Job can |
|---|---|---|---|
| Triathlon | World Triathlon API (developers.triathlon.org): `/v1/events/{id}/programs/{prog}/results` | Yes. Documented JSON, but needs an `apikey` header. How a production key is issued isn't documented. | Pull structured results once we have a key (owner decision D-R1). Until then, read the event page. |
| Judo | ijf.org competition and results pages | HTML only. JudoBase JSON exists but is undocumented, with no public terms. | Read the official results page. Don't call JudoBase. |
| Artistic gymnastics | FIG results books (PDF) | PDF | Read the PDF. People check team and rank lines. |
| Shooting | issf-sports.org results and the Results Book PDF | HTML and PDF | Read them. The Results Book also lists ranking points. |
| Weightlifting | iwf.sport "Results by Events" and the results book PDF | HTML and PDF | Read them. |
| Athletics | worldathletics.org pages | API only under a federation agreement | Read result and ranking pages. No API. |
| Surfing, sailing, lacrosse, others | Not checked yet | ? | The researcher hire checks these (#58 hire 2). |

So: one documented API (triathlon, behind a key). Everything else is an official page or PDF that the job reads
with WebFetch, which is already how step 2a works.

## What the daily job does (proposed)
1. **Trigger.** Use the `quota_due.py` lines: qualifying competitions and quota events that ended in the last 4
   days. These are already logged to `runs.warnings`.
2. **Fetch.** One official source per event: the API for triathlon if we have a key, otherwise the result page or
   PDF named in the competition or quota item `source`. Record its URL and whether it is marked official or final.
3. **Extract.** Israeli rows only: NOC `ISR`, matched to `athletes.name_en`. Keep rank, round reached and score.
   An unmatched or ambiguous name becomes a warning, never a write.
4. **Write.**
   - Results and ranks: direct writes as today (`rank`/`notes` plus a `result` history entry, with source).
   - Stage changes: a stage proposal only when the official source states the quota or berth (SKILL rule).
   - Quota items: a new proposal kind `quota`, keyed by `sportId` + `event`, with a patch for `israelStatus`,
     `israelNote`, `nextQuotaEvent` and `source`, plus evidence URLs. The publisher applies it to the master via
     `docs/runbooks/result-night.md`, then Dana signs off.
5. **Measure.** Log the time from `end` to the proposal in `runs`. That gives the freshness metric in #58.

## What stays human
- Checking that a result is final: protests, provisional lists and reallocations.
- Every "earned" and stage 2–3 change (two people for "earned"), team line-ups, and quota-to-athlete mapping.
- Editing the quotas master, signing it off, building and publishing (publisher role, runbook).
- Any source that isn't the IF, NOC or IOC. New athletes and retirements.

## Phases
- **P0 (done or in review):** `quota_due.py` warnings, the stage-proposal rule, the date-matrix tests, the
  upcoming-event coverage test.
- **P1:**
  - The `quota` proposal kind, with a validator schema and tests.
  - `#admin` renders `runs.warnings` and quota proposals (today it shows only `errors`).
  - An extraction prompt with a fixed output schema, tested on saved copies of real result pages and PDFs (Rotterdam,
    Abu Dhabi).
- **P2:**
  - World Triathlon API pull. The client is in place: `job/triathlon_api.py`, read-only, with tests. Wiring it into
    SKILL.md waits for the key.
  - A per-sport source table moved into `sports/<id>.resultsSource` so the job doesn't guess.

## World Triathlon API key (D-R1, approved)
- **Location.** `~/.config/il2la28/triathlon_api_key` holds the key on one line. The file belongs to the user who
  runs the job and has mode 600. It sits outside the repo and outside the scheduled-task folder, so
  `check_live_sync.py` and git never see it.
- **Setup (owner, once).**
  ```sh
  mkdir -p ~/.config/il2la28 && chmod 700 ~/.config/il2la28
  printf '%s\n' '<key>' > ~/.config/il2la28/triathlon_api_key
  chmod 600 ~/.config/il2la28/triathlon_api_key
  ```
  Paste the key in the terminal only, never into chat, a ticket or a PR. If it ends up anywhere else, rotate it
  with World Triathlon.
- **No fallback in code.** `load_key()` refuses a missing, empty, multi-line, symlinked, foreign-owned or
  group/world-readable file. It doesn't read environment variables, and there is no default key: the documentation
  example key is never used. When the key is unavailable, the job falls back to the process, not to another key: it
  reads the official event page as for other sports.
- **Nothing in logs.** The key goes only in the `apikey` request header. Errors carry the path, the HTTP status or
  the exception type, never the key, the headers or the response body. Tests cover this. The job must not print
  request objects.

## Owner decisions
- **D-R1: approved.** The owner is registering for a key; storage and handling are described above.
- **D-R2:** approve the `quota` proposal kind, and the publisher (Omer) applying it.

## Risks
- **A misread PDF or a name transliteration.** Mitigation: proposals only, with the evidence link next to the
  approve button.
- **Source format changes.** Mitigation: the job falls back to a warning, and fixtures of real pages catch
  extraction regressions.
- **API terms.** Mitigation: we use only what is documented, and nothing until D-R1.
