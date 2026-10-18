"""Check that the live scheduled-task folder runs exactly what the repo's job/ holds.

Usage: python3 job/check_live_sync.py [--repo DIR] [--live DIR]
Defaults: --repo = this script's folder, --live = ~/.claude/scheduled-tasks/la28-israel-daily-update.
Compares every regular file (dotfiles and __pycache__ skipped) byte for byte. Exit 0 when identical, 1 on any
missing, extra or differing file (each listed), 2 when a folder doesn't exist. Read-only.
"""
import difflib, os, sys

LIVE = os.path.expanduser("~/.claude/scheduled-tasks/la28-israel-daily-update")


def files(root):
    out = {}
    for d, dirs, names in os.walk(root):
        dirs[:] = [x for x in dirs if x != "__pycache__" and not x.startswith(".")]
        for n in names:
            if not n.startswith("."):
                p = os.path.join(d, n)
                out[os.path.relpath(p, root)] = p
    return out


def compare(repo, live):
    """List of human-readable differences; empty when in sync."""
    a, b = files(repo), files(live)
    problems = [f"missing in live: {k}" for k in sorted(a.keys() - b.keys())]
    problems += [f"only in live: {k}" for k in sorted(b.keys() - a.keys())]
    for k in sorted(a.keys() & b.keys()):
        with open(a[k], "rb") as fa, open(b[k], "rb") as fb:
            x, y = fa.read(), fb.read()
        if x != y:
            diff = list(difflib.unified_diff(y.decode("utf-8", "replace").splitlines(),
                                             x.decode("utf-8", "replace").splitlines(), "live", "repo", lineterm="", n=0))
            changed = sum(1 for l in diff if l[:1] in "+-" and l[:3] not in ("+++", "---"))
            problems.append(f"differs: {k} ({changed} changed lines; first: {next((l for l in diff[2:] if l[:1] in '+-'), '')[:100]!r})")
    return problems


def main(argv):
    args = dict(zip(argv[1::2], argv[2::2]))
    if len(argv) % 2 == 0 or set(args) - {"--repo", "--live"}:
        print("usage: python3 check_live_sync.py [--repo DIR] [--live DIR]", file=sys.stderr)
        return 2
    repo = args.get("--repo", os.path.dirname(os.path.abspath(__file__)))
    live = os.path.expanduser(args.get("--live", LIVE))
    for d in (repo, live):
        if not os.path.isdir(d):
            print(f"NOT FOUND: {d}")
            return 2
    problems = compare(repo, live)
    for p in problems:
        print(f"OUT OF SYNC: {p}")
    if problems:
        print(f"Sync after merge: cp {os.path.join(repo, '*')} {live}/  (then re-run this check)")
        return 1
    print(f"OK: {live} matches {repo}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
