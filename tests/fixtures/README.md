# Test fixtures

- `data.json`: the published `data.json` exported at 2026-10-18T17:16:08Z (artifact version 1792343791-b882), as is.
  To refresh it, see `../README.md`. Refreshed on 19.10 from the latest published export. That export predates the
  18:58Z rename to `שם־טוב עמיאל` (D10), so the fixture still has `שם טוב עמיאל` until the next publish.
- `site-quotas-2026-10-18.json`: `site/quotas.json` frozen on 18.10, for date and scenario tests. Don't refresh it
  along with `data.json`: those tests pin dates against it.
- `quotas.json`, `quotas-sport.json`: hand-made quota fixtures. They aren't real data.
- `dryrun/`: saved API answers for the publishing dry runs (Omer's runbooks).
