"""Build the daily job's update for one athlete, so updatedAt moves only when a visible field really changed.

Usage: python3 athlete_patch.py <current.json> <proposed.json> [--now ISO]
<current.json>: the athlete doc as read (bare or {"id", "data"}). <proposed.json>: the job's new values for the
direct-write fields, optionally with "historyEntry": {at, kind, text, source}.
Prints the update as JSON: {} means nothing visible changed, so skip the write entirely.
The page marks a verified record "stale" when updatedAt > verifiedAt, so an unchanged rewrite would undo
human verification. Exit 2 on a field the job may not write directly.
"""
import json, os, sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_data import text  # same normalisation the public file gets (strip, ' -> ׳)

VISIBLE = ["rank", "next", "nextDate", "notes", "event", "rankNum"]
# Written when they differ, but alone they don't move updatedAt: not shown on the page.
SILENT = ["rankList", "rankAsOf"]
SOURCE = "source"  # only written alongside a visible change; a new URL for the same facts is not a change
HISTORY_MAX = 20


def norm(k, v):
    if k == "rankNum":
        if isinstance(v, str) and v.strip().isdigit():
            return int(v)
        return v if type(v) is int else None
    return text(v, 10_000) if isinstance(v, str) else ("" if v is None else v)


def build(current, proposed, now):
    bad = set(proposed) - set(VISIBLE + SILENT + [SOURCE, "historyEntry"])
    if bad:
        raise ValueError(f"not a direct-write field: {sorted(bad)}")
    changed = {k: proposed[k] for k in VISIBLE if k in proposed and norm(k, proposed[k]) != norm(k, current.get(k))}
    silent = {k: proposed[k] for k in SILENT if k in proposed and norm(k, proposed[k]) != norm(k, current.get(k))}
    hist = current.get("history") if isinstance(current.get("history"), list) else []
    entry = proposed.get("historyEntry")
    # A new competition result is itself visible news on the athlete page; a repeat of one already logged is not.
    new_result = bool(entry) and entry.get("kind") == "result" and not any(
        isinstance(h, dict) and h.get("at") == entry.get("at") and norm("notes", h.get("text")) == norm("notes", entry.get("text"))
        for h in hist)
    if not changed and not new_result:
        return silent  # possibly {}: no updatedAt, no updatedBy, no history
    patch = {**changed, **silent, "updatedAt": now, "updatedBy": "auto"}
    if proposed.get(SOURCE):
        patch[SOURCE] = proposed[SOURCE]
    if entry:
        patch["history"] = (hist + [entry])[-HISTORY_MAX:]
    return patch


def main(argv):
    args, now = argv[1:], None
    if "--now" in args:
        i = args.index("--now")
        now, args = args[i + 1] if i + 1 < len(args) else None, args[:i] + args[i + 2:]
    if len(args) != 2:
        print("usage: python3 athlete_patch.py <current.json> <proposed.json> [--now ISO]", file=sys.stderr)
        return 1
    docs = []
    for p in args:
        with open(p, encoding="utf-8") as f:
            docs.append(json.load(f))
    cur = docs[0].get("data", docs[0]) if "data" in docs[0] and "id" in docs[0] else docs[0]
    try:
        patch = build(cur, docs[1], now or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    except ValueError as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        return 2
    print(json.dumps(patch, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
