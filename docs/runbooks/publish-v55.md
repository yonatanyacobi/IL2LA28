# Runbook: v55 full publish, 20.10 at 09:17

The first full-site publish since v53: page, 12 scripts, `styles.css` and `quotas.json` from `main`, on top of the
`data.json` that the 07:13 run published. General rules: [publishing.md](publishing.md) step 5. Omer prepares the
call and the coordinator publishes. Dry run on 18.10, 21:46, `main` 9bbdfcb: every step except the publish took
about 15 s.

Work only in the scratchpad (the publish tool takes no `/tmp` paths) and in a folder of your own: shared folders
were wiped by other agents' cleanups.

## 0. Before 09:00

```
[ ] Everything meant for v55 is merged; note the main SHA: git fetch && git rev-parse --short origin/main
[ ] The 07:13 run published: runs/2026-10-20 has published: true, and #home's freshness line shows 20.10
[ ] No PR merges between step 1 and step 6 (tell the lead)
```

## 1. Rollback point (≈1 min)

1. Artifact `list` with `scope: "files"`. Write down the **version id** from the header (on 18.10:
   `1792343791-b882`, 12 files) and the file list. This is `<PREV>` for the rollback.
2. Artifact `read` with `path: "index.html"` and `out_dir: <P>/prev`, then strip the host's wrapper, keeping only
   what's between `<body>` and `</body>`:
   ```sh
   python3 -c 'import sys; s=open(sys.argv[1]).read(); i=s.index("<body>\n")+7; open(sys.argv[2],"w").write(s[i:s.rindex("</body></html>")])' <P>/prev/index.html <P>/prev/page.html
   ```
   On 18.10 the live page differed from every `site/index.html` in git (nav order), so the rollback uses this saved
   page, not a git commit.

## 2. Clean tree (≈5 s)

```sh
cd ~/workspace/IL2LA28 && git fetch -q
SHA=$(git rev-parse --short origin/main)
P=<scratchpad>/publish-v55-$SHA && rm -rf "$P" && mkdir -p "$P/main" "$P/live" "$P/prev"
git archive origin/main | tar -x -C "$P/main"
```

## 3. The 07:13 data.json (≈1 min)

Artifact `read` with `paths: ["data.json", "quotas.json"]` and `out_dir: <P>/live`. Check `generatedAt` is
2026-10-20 (≈04:13Z). It is **not** republished: `data.json` stays out of the files map and is kept.

## 4. Checks on the archive (≈15 s)

```sh
cd "$P/main"
for f in site/*.js; do node --check "$f" || echo "SYNTAX ERROR: $f"; done
python3 job/build_quotas.py data/quotas/quotas.json "$P/quotas.built.json" && cmp "$P/quotas.built.json" site/quotas.json
python3 job/validate_data.py "$P/live/data.json"
python3 job/validate_data.py --quotas site/quotas.json "$P/live/data.json"
python3 -m unittest discover -s tests -q
node tests/smoke.test.js
node tests/preview_at.js "$P/live/data.json" site/quotas.json 2026-10-20
node tests/preview_at.js "$P/live/data.json" site/quotas.json 2026-10-24
```

Every line OK, `cmp` silent, both previews exit 0. Dry run on 18.10: smoke 146/146, unittest OK, previews exit 0.

## 5. Files map against index.html (≈1 s)

```sh
python3 - "$P" <<'EOF'
import json, os, re, sys
P = sys.argv[1]; A = f"{P}/main"
scripts = re.findall(r'<script src="([\w.-]+\.js)"></script>', open(f"{A}/site/index.html").read())
book = open(f"{A}/docs/runbooks/publishing.md").read().split("> files = ")[1].split("Don't pass")[0]
mapped = dict(re.findall(r'"([\w.-]+)": "site/([\w.-]+)"', book))
files = {f: f"{A}/site/{f}" for f in scripts + ["styles.css", "quotas.json"]}
assert len(scripts) == 12 and set(files) == set(mapped), set(files) ^ set(mapped)
assert all(os.path.isfile(p) for p in files.values())
json.dump({"file_path": f"{A}/site/index.html", "files": files}, open(f"{P}/publish-call.json", "w"), indent=1)
print(len(scripts), "scripts:", ", ".join(scripts))
EOF
```

Expected: `12 scripts: app.js, admin.js, quotas.js, digest.js, corrections.js, sessions.js, day.js, event.js,
home.js, gamelog.js, standings.js, following.js`. New since v53: `sessions.js`, `home.js`, `gamelog.js`,
`standings.js`. `quotas.json` on 18.10: 61 items on `main` against 59 live, 17 new or changed (all signed off;
the build drops the rest). Look at that diff before publishing.

## 6. Publish (coordinator, 09:17)

Artifact publish with `url` = https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT and `file_path` / `files` from
`$P/publish-call.json` (14 files: 12 scripts, `styles.css`, `quotas.json`). Don't pass `force`, `capabilities`,
`icon`, `contract` or `data.json`. Note the new version id and the SHA in the PR thread.

## 7. After (≈5 min)

```
[ ] list scope files: 16 files (page, 12 scripts, styles.css, quotas.json, data.json); data.json bytes unchanged
[ ] Live check per publishing.md step 6: 400px, light and dark, as the test viewer (launch-day.md); #home, #today, #c-ag-worlds-2026,
    an athlete page with results (game log), #sport-judo (standings), #digest
[ ] Browser console: no errors
```

## Rollback (≈2 min)

If step 7 fails, the coordinator republishes `<PREV>` without touching `data.json`:

- `file_path` = `<P>/prev/page.html` (step 1; HTML can't be copied from a version);
- `files` = each script, `styles.css` and `quotas.json` copied from `<PREV>`, and `null` for the four new
  scripts:
  ```json
  {"app.js": {"artifact": "https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT", "path": "app.js", "ver": "<PREV>"},
   "...": "the same for admin.js, quotas.js, digest.js, corrections.js, day.js, event.js, following.js, styles.css, quotas.json",
   "sessions.js": null, "home.js": null, "gamelog.js": null, "standings.js": null}
  ```
- Then `list scope files`: 12 files again, and the live check. Fix on a branch; the next attempt starts at step 0.
