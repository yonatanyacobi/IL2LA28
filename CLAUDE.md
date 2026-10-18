# IL2LA28 — "הדרך ללוס אנג׳לס 28"

Unofficial, public, read-only Hebrew (RTL) site tracking Israeli athletes on the LA 2028 qualification path.
Published as a claude.ai Artifact: https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT

## Architecture
- `site/` — the published files: `index.html` (page body, no `<html>/<head>` — the artifact host wraps it),
  `styles.css`, `app.js` (vanilla JS, hash router, no build step). `site/data.json` is generated, not tracked.
- Public visitors read only `data.json` (works signed-out). Editors (`user.canEdit()`) also get the live
  artifact DB (`claude.use("db")`) with edit controls and a review queue. DB rules: root read/write = admin.
- `job/` — the daily scheduled Claude job: `SKILL.md` (its prompt) and `export_data.py` (DB dump → data.json,
  refuses to publish if a collection shrinks >20%). The live copy runs from
  `~/.claude/scheduled-tasks/la28-israel-daily-update/`; keep it in sync after merging changes here.
- `tests/fixtures/data.json` — a real snapshot used by tests.

## Platform constraints (artifact sandbox)
- No external fetch; scripts only from cdnjs/jsdelivr/unpkg; only bare `#token` hashes survive in shared links.
- No print, no reliable mailto, clipboard may be refused — always offer a copyable text fallback.
- localStorage only for per-viewer conveniences (follows, last visit), wrapped in try/catch.
- Must work at ~400px width and in light + dark themes (colors only via CSS tokens in `styles.css`).

## Code rules
- Escape every dynamic string with `esc()`; links only through `safeUrl()`/`linkOut()` (https only).
- Hebrew UI copy; gender-neutral forms (ספורטאי/ת); geresh ׳ not apostrophe.
- Dates are `YYYY-MM-DD`; "today" is Israel time (`today()`).
- Stage changes, new athletes and retirements are never written directly by automation — they go to
  `proposals` for human approval.

## Team process
- Every change lands through a PR reviewed by the team lead; nobody commits to `main` directly.
- Branch per change: `dev/<name>/<slug>`. One topic per PR, small commits, imperative subject lines.
- A PR description lives in the last commit body: what, why, how tested.
- Run before opening a PR: `node --check site/app.js`, `python3 -m py_compile job/export_data.py`, and the
  tests under `tests/` once they exist.
- The team lead merges with `git merge --no-ff` and may request changes instead.
