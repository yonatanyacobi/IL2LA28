# Test fixtures

- `data.json`: the published `data.json` exported at 2026-10-19T06:28:50Z (artifact version 1792391362-ce83, the
  coordinator's manual publish on 19.10), as is: 113 athletes, 93 competitions, 33 sessions. It includes the D10 rename
  (`שם־טוב עמיאל`), the Olympic ranks and the new judoka. To refresh it, see `../README.md`.
  Tests that need a scenario the data no longer has (for example the nextDate fallback for Abu Dhabi, now that the
  judoka have real sessions) build it in the test, so they don't move with the next refresh.
- `site-quotas-2026-10-18.json`: `site/quotas.json` frozen on 18.10, for date and scenario tests. Don't refresh it
  along with `data.json`: those tests pin dates against it.
- `quotas.json`, `quotas-sport.json`: hand-made quota fixtures. They aren't real data.
- `dryrun/`: saved API answers for the publishing dry runs (Omer's runbooks).
