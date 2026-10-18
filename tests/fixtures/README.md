# Test fixtures

- `data.json`: the published `data.json` exported at 2026-10-18T15:48:47Z (artifact version 1792340277-d8b2), as is.
  To refresh it, see `../README.md`.
- `site-quotas-2026-10-18.json`: `site/quotas.json` frozen on 18.10, for date and scenario tests. Don't refresh it
  along with `data.json`: those tests pin dates against it.
- `quotas.json`, `quotas-sport.json`: hand-made quota fixtures. They aren't real data.
- `dryrun/`: saved API answers for the publishing dry runs (Omer's runbooks).
