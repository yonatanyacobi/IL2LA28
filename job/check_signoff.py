"""List quota items changed since a base ref and whether each is signed off (docs/runbooks/publishing.md, step 0).

Usage: python3 job/check_signoff.py [<base-ref>]   (default origin/main; run at the repo root on the PR branch)
Prints one line per added or changed item in data/quotas/quotas.json: OK if review.status is "ok" or "fixed" (and,
for "earned", review.by is "dana+tamar"), else STOP. Exit 1 if any item is STOP. Removed items are listed as REMOVED and don't fail the check.
"""
import json, subprocess, sys

MASTER = "data/quotas/quotas.json"
SIGNED = {"ok", "fixed"}
EARNED_BY = "dana+tamar"   # owner decision D4: both fact-checkers approve "earned"


def key(item):
    return item.get("sportId"), item.get("event")


def main(ref):
    old = json.loads(subprocess.check_output(["git", "show", f"{ref}:{MASTER}"]))["items"]
    with open(MASTER, encoding="utf-8") as f:
        new = json.load(f)["items"]
    old_by = {key(i): i for i in old}
    stop = 0
    for item in new:
        if old_by.get(key(item)) == item:
            continue
        review = item.get("review") or {}
        ok = review.get("status") in SIGNED and (item.get("israelStatus") != "earned" or review.get("by") == EARNED_BY)
        stop += not ok
        print("OK  " if ok else "STOP", *key(item), json.dumps(review, ensure_ascii=False))
    for k in old_by.keys() - {key(i) for i in new}:
        print("REMOVED", *k)
    return 1 if stop else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "origin/main"))
