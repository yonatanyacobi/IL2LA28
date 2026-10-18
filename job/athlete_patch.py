"""Build the daily job's update for one athlete, so updatedAt moves only when a visible field really changed.

Usage: python3 athlete_patch.py <current.json> <proposed.json> [--now ISO]
<current.json>: the athlete doc as read (bare or {"id", "data"}). <proposed.json>: the job's new values for the
direct-write fields, plus at most one of
  "result": {at, text, source}: any competition result the write records (it becomes a kind "result" entry)
  "historyEntry": {at, kind, text, source}: other entries (e.g. kind "rank")
Prints the update as JSON: {} means nothing visible changed, so skip the write entirely.
The page marks a verified record "stale" when updatedAt > verifiedAt, so an unchanged rewrite would undo
human verification. Exit 2 on a field the job may not write directly.
"""
import json, os, sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_data import date, https, text  # same normalisation and checks the public file gets

VISIBLE = ["rank", "next", "nextDate", "notes", "event", "rankNum", "olympicRankNum"]  # the page shows both ranks
# Written when they differ, but alone they don't move updatedAt: not shown on the page.
SILENT = ["rankList", "rankAsOf", "olympicRankList", "olympicRankAsOf"]
SOURCE = "source"  # only written alongside a visible change; a new URL for the same facts is not a change
HISTORY_MAX = 20   # non-result entries (start, rank, stage, note, …)
RESULTS_MAX = 60   # kind "result", capped separately (PM decision on #186)


def trim_history(hist, cap=HISTORY_MAX, results_cap=RESULTS_MAX):
    """Keep the newest `cap` non-result entries and, separately, the newest `results_cap` results, in their original
    order. Results are the athlete's game log (docs/design/athlete-game-log.md, #186), so other kinds can't push them out."""
    is_result = lambda h: isinstance(h, dict) and h.get("kind") == "result"
    keep_res = sum(map(is_result, hist)) - results_cap      # how many old results to drop (if > 0)
    keep_oth = (len(hist) - sum(map(is_result, hist))) - cap
    out = []
    for h in hist:  # oldest first
        if is_result(h) and keep_res > 0:
            keep_res -= 1
        elif not is_result(h) and keep_oth > 0:
            keep_oth -= 1
        else:
            out.append(h)
    return out


def norm(k, v):
    if k in ("rankNum", "olympicRankNum"):
        if isinstance(v, str) and v.strip().isdigit():
            return int(v)
        return v if type(v) is int else None
    return text(v, 10_000) if isinstance(v, str) else ("" if v is None else v)


def result_entry(r):
    """The history entry for a recorded result. Refused unless it has the competition day, text and an official link."""
    if not isinstance(r, dict) or set(r) - {"at", "text", "source"}:
        raise ValueError('"result" must be {at, text, source}')
    if not date(r.get("at")):
        raise ValueError('"result".at must be the competition day, YYYY-MM-DD')
    if not text(r.get("text")):
        raise ValueError('"result".text is empty')
    if not https(r.get("source")):
        raise ValueError('"result".source must be the official https results link')
    return {"at": r["at"], "kind": "result", "text": text(r["text"], 300), "source": r["source"]}


def build(current, proposed, now):
    bad = set(proposed) - set(VISIBLE + SILENT + [SOURCE, "historyEntry", "result"])
    if bad:
        raise ValueError(f"not a direct-write field: {sorted(bad)}")
    if "result" in proposed and "historyEntry" in proposed:
        raise ValueError('one history entry per update: "result" or "historyEntry", not both')
    entry = result_entry(proposed["result"]) if "result" in proposed else proposed.get("historyEntry")
    if isinstance(entry, dict) and entry.get("kind") == "result" and "result" not in proposed:
        entry = result_entry({k: entry.get(k) for k in ("at", "text", "source")})  # same checks either way
    changed = {k: proposed[k] for k in VISIBLE if k in proposed and norm(k, proposed[k]) != norm(k, current.get(k))}
    silent = {k: proposed[k] for k in SILENT if k in proposed and norm(k, proposed[k]) != norm(k, current.get(k))}
    hist = current.get("history") if isinstance(current.get("history"), list) else []
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
        patch["history"] = trim_history(hist + [entry])
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
