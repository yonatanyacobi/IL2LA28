"""List quota items changed since a base ref and whether each is signed off (docs/runbooks/publishing.md, step 0).

Usage: python3 job/check_signoff.py [<base-ref>]   (default origin/main; run at the repo root on the PR branch)
Prints one line per added, changed or removed item in data/quotas/quotas.json. Exit 1 if any line is STOP.
- Added or changed: OK if review.status is "ok" or "fixed" and review.by names both fact-checkers ("dana+tamar",
  either order), else STOP.
- Removed: OK only if the PR also adds an entry for it to data/quotas/removed.json ({sportId, event, reason, source,
  review}) that is signed the same way, with a reason and an https source (#332). The log is append-only: an entry
  from the base ref that is edited or deleted is a STOP.
"""
import json, subprocess, sys

MASTER = "data/quotas/quotas.json"
REMOVED = "data/quotas/removed.json"   # the removals log; build_quotas.py doesn't read it
SIGNED = {"ok", "fixed"}
# Team charter (docs/product/team.md, #305): two checkers for all quota data, not only "earned" (owner decision D4).
CHECKERS = {"dana", "tamar"}


def key(item):
    return item.get("sportId"), item.get("event")


def signed_off(item):
    review = item.get("review") if isinstance(item.get("review"), dict) else {}
    by = {p.strip().lower() for p in str(review.get("by") or "").split("+")}
    return review.get("status") in SIGNED and by == CHECKERS


def logged(entry):
    """A removals-log entry that records the removal: a reason, an official https source and two checkers."""
    return (isinstance(entry, dict) and str(entry.get("reason") or "").strip() != ""
            and str(entry.get("source") or "").startswith("https://") and signed_off(entry))


def line(word, k, review):
    return " ".join([word, *map(str, k), json.dumps(review or {}, ensure_ascii=False)])


def check(old, new, old_log=(), new_log=()):
    """(lines, number of STOPs) for the items added, changed or removed from old to new; *_log: removed.json items."""
    old_by, lines, stop = {key(i): i for i in old}, [], 0
    for item in new:
        if old_by.get(key(item)) == item:
            continue
        ok = signed_off(item)
        stop += not ok
        lines.append(line("OK  " if ok else "STOP", key(item), item.get("review")))
    added = [e for e in new_log if e not in old_log]   # an entry from an earlier PR doesn't cover a new removal
    for k in sorted(old_by.keys() - {key(i) for i in new}, key=str):
        entry = next((e for e in added if isinstance(e, dict) and key(e) == k and logged(e)), None)
        stop += entry is None
        lines.append(line("REMOVED OK  " if entry else "REMOVED STOP", k, (entry or {}).get("review")))
    for e in old_log:
        if e not in new_log:
            stop += 1
            lines.append(line("LOG EDITED STOP", key(e) if isinstance(e, dict) else (e,), None))
    return lines, stop


def items(text):
    return json.loads(text)["items"] if text else []


def main(ref):
    old = items(subprocess.check_output(["git", "show", f"{ref}:{MASTER}"], text=True))
    # The log may not exist on the base ref yet; the master must.
    old_log = items(subprocess.run(["git", "show", f"{ref}:{REMOVED}"], capture_output=True, text=True).stdout)
    with open(MASTER, encoding="utf-8") as f:
        new = json.load(f)["items"]
    try:
        with open(REMOVED, encoding="utf-8") as f:
            new_log = json.load(f)["items"]
    except FileNotFoundError:
        new_log = []
    lines, stop = check(old, new, old_log, new_log)
    print("\n".join(lines))
    return 1 if stop else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "origin/main"))
