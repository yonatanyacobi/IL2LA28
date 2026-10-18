"""Dry run of job/tri_results.py with a recorded/fake World Triathlon API response: no key file, no network.

Usage: python3 tests/dryrun_tri_results.py <data.json> <fake_api.json> --today YYYY-MM-DD [--add-competition <comp.json>]
<fake_api.json> maps an API path ("/events", "/events/<id>/programs", ".../results") to the response body.
--add-competition appends a competition record to the data first, e.g. one the researcher still has to add to the DB.
Prints the same JSON plan the daily job would apply (docs/runbooks/publishing.md, dry runs).
"""
import json, os, sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "job"))
import tri_results  # noqa: E402


def main(argv):
    args, opts = [], {"--today": None, "--add-competition": None}
    it = iter(argv[1:])
    for a in it:
        if a in opts:
            opts[a] = next(it, None)
        else:
            args.append(a)
    if len(args) != 2 or not opts["--today"]:
        print(__doc__.split("\n\n")[1].splitlines()[0], file=sys.stderr)
        return 2
    with open(args[0], encoding="utf-8") as f:
        data = json.load(f)
    with open(args[1], encoding="utf-8") as f:
        responses = json.load(f)
    if opts["--add-competition"]:
        with open(opts["--add-competition"], encoding="utf-8") as f:
            data.setdefault("competitions", []).append(json.load(f))

    def fake_get(path, params=None):
        if path not in responses:
            raise LookupError(f"fake API has no response for {path}")
        return responses[path]

    plan = tri_results.plan(data, fake_get, date.fromisoformat(opts["--today"]))
    print(json.dumps(plan, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
