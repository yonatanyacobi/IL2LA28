# Tests

Run both before a PR:
```sh
python3 -m unittest discover -s tests     # job/ scripts (stdlib only)
node tests/smoke.test.js                  # site/*.js in a vm with a DOM shim
```

`smoke.test.js` also runs `tests/probe.js` on the fixture (every route, 7 dates, visitor and with follows; ~1 s).
Before a publish, run it on the real export: `node tests/probe.js <data.json> <quotas.json> [YYYY-MM-DD ...]`.

## Refreshing `tests/fixtures/data.json`

The fixture is a real public export. Refresh it when it misses records that people's dry runs need (new athletes,
sports, competitions or sessions). Use only a published file: never a hand edit, and never a local export.

1. **Get the published file.** In a Claude Code session: Artifact action "read" with
   https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT and path `data.json`. Or ask the coordinator for a copy.
2. **Validate it:** `python3 job/validate_data.py <file>` must print `OK`.
3. **Copy it as is** over `tests/fixtures/data.json`. Don't reformat it: it's the exporter's compact JSON.
4. **Run both suites.** When a test fails because the real data changed (a count, a date, ranks now present, sessions
   now present), don't loosen the assertion and don't edit the fixture. Instead:
   - If the test needs a precondition, set it on the test's own copy with the helpers in `smoke.test.js`:
     `clone()`, `withoutRanks()`, `setAthlete(data, id, fields)`.
   - If the test checks a count from the data, derive the count from `FIXTURE` instead of hard-coding it.
   - If a failure points at the site's behaviour rather than at the test's assumptions, report it, don't patch the
     test.
5. **Update `tests/fixtures/README.md`** with the export's `generatedAt` and the artifact version.
6. Commit as "Refresh data fixture from the <generatedAt> export", with a short list of what changed (counts, new ids)
   and which tests needed a precondition.

`tests/fixtures/site-quotas-2026-10-18.json` is deliberately frozen; leave it out of a `data.json` refresh.
