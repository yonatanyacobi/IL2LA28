"""The daily job's run log (runs/<YYYY-MM-DD>, issue #158) and its clock. The job never types a timestamp.

  python3 run_log.py now                 → {"now": ISO-Z UTC, "today": Israel YYYY-MM-DD}   (meta lastRun, checkedAt)
  python3 run_log.py start               → {"id", "doc"}: write runs/<id> = doc at step 0
  python3 run_log.py finish <run.json>   → {"id", "doc"}: write runs/<id> = doc at step 6 (exit 2: fix and re-run)

run.json is what the job collected during the run:
  {"id", "started", "status"?, "published", "sportsChecked": [sportId], "writes": [{collection, id, fields}],
   "proposals": [id], "errors": [text], "warnings": [text], "changes": [the Hebrew meta lines added this run],
   "sources": [{"source": https url, "checkedAt": ISO-Z from `now`, "sportId"?}]}
Without "status", finish sets "failed" when there are errors and nothing was published, else "done".
"""
import json, os, re, sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_data import date, https

UTC = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", re.ASCII)
STATUSES = {"started", "done", "failed"}
LISTS = {"sportsChecked", "proposals", "errors", "warnings", "changes"}
KEYS = {"id", "started", "status", "published", "writes", "sources"} | LISTS
MAX_ITEMS = 200


def now(clock=None):
    t = clock or datetime.now(timezone.utc)
    from zoneinfo import ZoneInfo
    return {"now": t.strftime("%Y-%m-%dT%H:%M:%SZ"), "today": t.astimezone(ZoneInfo("Asia/Jerusalem")).strftime("%Y-%m-%d")}


def start(clock=None):
    n = now(clock)
    return {"id": n["today"], "doc": {"status": "started", "started": n["now"]}}


def finish(run, clock=None):
    """The final runs/<id> doc. Raises ValueError listing every problem, so the job fixes them in one go."""
    problems = []
    bad = problems.append
    if not isinstance(run, dict):
        raise ValueError("run.json must be an object")
    for k in sorted(set(run) - KEYS):
        bad(f"unknown key {k!r}")
    if not date(run.get("id")):
        bad(f"id must be the run's Israel date YYYY-MM-DD (from `start`), got {run.get('id')!r}")
    if not (isinstance(run.get("started"), str) and UTC.fullmatch(run["started"])):
        bad(f"started must be ISO with Z (from `start`), got {run.get('started')!r}")
    if not isinstance(run.get("published"), bool):
        bad("published must be true or false")
    for k in LISTS:
        v = run.get(k, [])
        if not (isinstance(v, list) and len(v) <= MAX_ITEMS and all(isinstance(x, str) and x.strip() for x in v)):
            bad(f"{k} must be a list of non-empty strings (max {MAX_ITEMS})")
    writes = run.get("writes", [])
    if not (isinstance(writes, list) and len(writes) <= MAX_ITEMS and all(
            isinstance(w, dict) and set(w) == {"collection", "id", "fields"} and isinstance(w["fields"], list)
            for w in writes)):
        bad("writes must be a list of {collection, id, fields: [...]}")
    sources = run.get("sources", [])
    if not (isinstance(sources, list) and len(sources) <= MAX_ITEMS):
        bad("sources must be a list")
        sources = []
    for i, s in enumerate(sources):
        if not (isinstance(s, dict) and set(s) <= {"source", "checkedAt", "sportId"} and https(s.get("source"))
                and isinstance(s.get("checkedAt"), str) and UTC.fullmatch(s["checkedAt"])):
            bad(f"sources[{i}] must be {{source: https, checkedAt: ISO with Z (from `now`), sportId?}}, got {s!r}")
    status = run.get("status")
    if status is not None and status not in STATUSES - {"started"}:
        bad(f"status must be done or failed, got {status!r}")
    if problems:
        raise ValueError("; ".join(problems))
    n = now(clock)
    doc = {"status": status or ("failed" if run.get("errors") and not run["published"] else "done"),
           "started": run["started"], "ended": n["now"], "published": run["published"], "writes": writes,
           "sources": sources, **{k: run.get(k, []) for k in sorted(LISTS)}}
    if doc["ended"] < doc["started"]:
        raise ValueError("started is after now; take it from `start`")
    return {"id": run["id"], "doc": doc}


def main(argv):
    cmd = argv[1] if len(argv) > 1 else ""
    try:
        if cmd == "now" and len(argv) == 2:
            out = now()
        elif cmd == "start" and len(argv) == 2:
            out = start()
        elif cmd == "finish" and len(argv) == 3:
            with open(argv[2], encoding="utf-8") as f:
                out = finish(json.load(f))
        else:
            print("usage: python3 run_log.py now | start | finish <run.json>", file=sys.stderr)
            return 1
    except (ValueError, OSError) as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        return 2
    print(json.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
