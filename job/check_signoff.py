"""List quota items changed since a base ref and whether each is signed off (docs/runbooks/publishing.md, step 0).

Usage: python3 job/check_signoff.py [<base-ref>]   (default origin/main; run at the repo root on the PR branch)
Prints one line per added or changed item in data/quotas/quotas.json: OK if review.status is "ok" or "fixed" and
review.by names both fact-checkers ("dana+tamar", either order), else STOP. Exit 1 if any item is STOP.
Removed items are listed as REMOVED and don't fail the check (there is no review to sign on a removed item).
"""
import json, subprocess, sys

MASTER = "data/quotas/quotas.json"
SIGNED = {"ok", "fixed"}
# Team charter (docs/product/team.md, #305): two checkers for all quota data, not only "earned" (owner decision D4).
CHECKERS = {"dana", "tamar"}


def key(item):
    return item.get("sportId"), item.get("event")


def signed_off(item):
    review = item.get("review") if isinstance(item.get("review"), dict) else {}
    by = {p.strip().lower() for p in str(review.get("by") or "").split("+")}
    return review.get("status") in SIGNED and by == CHECKERS


def check(old, new):
    """(lines, number of STOPs) for the items added or changed from old to new."""
    old_by, lines, stop = {key(i): i for i in old}, [], 0
    for item in new:
        if old_by.get(key(item)) == item:
            continue
        ok = signed_off(item)
        stop += not ok
        lines.append(" ".join(["OK  " if ok else "STOP", *map(str, key(item)), json.dumps(item.get("review") or {}, ensure_ascii=False)]))
    lines += [" ".join(["REMOVED", *map(str, k)]) for k in sorted(old_by.keys() - {key(i) for i in new}, key=str)]
    return lines, stop


def main(ref):
    old = json.loads(subprocess.check_output(["git", "show", f"{ref}:{MASTER}"]))["items"]
    with open(MASTER, encoding="utf-8") as f:
        new = json.load(f)["items"]
    lines, stop = check(old, new)
    print("\n".join(lines))
    return 1 if stop else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "origin/main"))
