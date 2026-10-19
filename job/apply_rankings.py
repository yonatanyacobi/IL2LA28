"""Dry-run write plan for signed ranking backfills (docs/design/standings.md §1, #179).

Usage: python3 job/apply_rankings.py <db_dump_dir> data/quotas/quotas.json data/rankings/<name>.json [...] [--now ISO]
<db_dump_dir>: an ArtifactData read with out_dir of athletes (the current DB). Writes nothing. Prints a JSON plan:
  errors     every rule a file breaks (exit 1 if any; fix the file, don't hand-edit the plan)
  skipped    rows not signed off (review status ok/fixed, by, at; as in the quotas master). Checked right after
             the row's shape, so a draft may name a quota item that isn't in the master yet.
  unranked   signed athlete rows with rankNum null ("not on the list" / "not read"): nothing is written, and a
             rank already in the DB is kept (it may be on another list); "current" shows it for a manual call
  noCutoff   signed cutoff rows with "cutoff": null (the system has no ranking line; nothing to write)
  cutoffs    the quotas master patch: {sportId, event, cutoff, was}; set item.cutoff, then run build_quotas.py
  cutoffsUnchanged  "sportId|event" whose cutoff already matches
  changes    athlete updates {doc_id, fields}, built by athlete_patch (so updatedAt moves only on a visible
             change). Read the doc and "update" with its if_version. Routed by the row's list (PM on #218):
             an Olympic qualification list goes to olympicRankNum/olympicRankList/olympicRankAsOf, any other
             list to rankNum/rankList/rankAsOf (the world rank the page's "rank" text names).
  unchanged  athlete ids whose rankNum/rankList/rankAsOf already match
  warnings   rows whose list name looks Olympic ("olymp", "AOR") but doesn't match the routing rule, so they go to
             the world rank; check the name before writing
"""
import json, os, re, sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_data import date, https, load, text  # one contract, one implementation
from athlete_patch import build

SIGNED = {"ok", "fixed"}
FILE_KEYS, FILE_OPTIONAL = {"athletes"}, {"updatedAt", "cutoffs"}
ATHLETE_KEYS, CUTOFF_ROW_KEYS, ROW_OPTIONAL = ({"athleteId", "rankNum", "rankList", "rankAsOf", "source", "review"},
                                               {"sportId", "event", "cutoff", "source", "review"}, {"notes"})
RANK_FIELDS = ["rankNum", "rankList", "rankAsOf"]
OLYMPIC_FIELDS = ["olympicRankNum", "olympicRankList", "olympicRankAsOf"]


def fields_for(rank_list):
    """By name: the Olympic qualification lists say "Olympic" (IJF, WT), or are FIE's Adjusted Official Ranking (AOR),
    which only exists for Olympic qualification. Anything else is the world rank."""
    name = rank_list.lower()
    return OLYMPIC_FIELDS if "olympic" in name or "adjusted official ranking" in name else RANK_FIELDS
RANK_LIST_MAX = 80  # as validate_data / export_data
LOOKS_OLYMPIC = re.compile(r"olymp|\bAOR\b", re.IGNORECASE)


def misrouted(rank_list):
    """A name that reads as an Olympic list but that fields_for() sends to the world rank (e.g. "FIE AOR")."""
    return bool(LOOKS_OLYMPIC.search(rank_list)) and fields_for(rank_list) is RANK_FIELDS


def check_cutoff(c, path):
    """Same rules as validate_data.check_cutoff (#198): {rank, list, url, final, opens?}."""
    if not (isinstance(c, dict) and {"rank", "list", "url", "final"} <= set(c) <= {"rank", "list", "url", "final", "opens"}):
        return [f"{path}: expected {{rank, list, url, final, opens?}}, got {c!r}"]
    errs = []
    if not (type(c["rank"]) is int and c["rank"] >= 1):
        errs.append(f"{path}.rank: expected an integer ≥ 1, got {c['rank']!r}")
    if not (isinstance(c["list"], str) and c["list"].strip() and len(c["list"]) <= RANK_LIST_MAX):
        errs.append(f"{path}.list: expected the ranking list's name, as athletes' rankList spells it")
    if not https(c["url"]):
        errs.append(f"{path}.url: expected the official https ranking page, got {c['url']!r}")
    if not date(c["final"]):
        errs.append(f"{path}.final: expected YYYY-MM-DD, got {c['final']!r}")
    if "opens" in c and not (date(c["opens"]) and (not date(c["final"]) or c["opens"] <= c["final"])):
        errs.append(f"{path}.opens: expected YYYY-MM-DD on or before final, got {c['opens']!r}")
    return errs


def signed(r):
    rv = r.get("review")
    return isinstance(rv, dict) and rv.get("status") in SIGNED and rv.get("by") and date(rv.get("at"))


def shape(r, keys, path):
    if not isinstance(r, dict):
        return [f"{path}: expected an object"]
    missing, extra = keys - set(r), set(r) - keys - ROW_OPTIONAL
    return [f"{path}: missing {sorted(missing)}, unknown {sorted(extra)}"] if missing or extra else []


def plan(files, quota_items, athletes, now):
    """files: [(name, parsed json)]; quota_items: the quotas master items; athletes: DB docs by id."""
    out = {"errors": [], "skipped": [], "unranked": [], "noCutoff": [], "cutoffs": [], "cutoffsUnchanged": [], "changes": [], "unchanged": [],
           "warnings": []}
    err = out["errors"].append
    today = now[:10]
    items = {}
    for it in quota_items:
        items.setdefault((it.get("sportId"), it.get("event")), []).append(it)
    seen_a, seen_c = {}, {}
    for name, f in files:
        if not (isinstance(f, dict) and FILE_KEYS <= set(f) and not set(f) - FILE_KEYS - FILE_OPTIONAL
                and isinstance(f["athletes"], list) and isinstance(f.get("cutoffs", []), list)):
            err(f"{name}: expected {{athletes: [...], cutoffs?: [...], updatedAt?}}")
            continue
        for i, r in enumerate(f.get("cutoffs", [])):
            path = f"{name}.cutoffs[{i}]"
            errs = shape(r, CUTOFF_ROW_KEYS, path)
            if not errs:
                key = (r["sportId"], r["event"])
                path += f"({r['sportId']}|{r['event']})"
                if not signed(r):
                    out["skipped"].append(f"{path}: review {r['review']!r}, not signed off")
                    continue
                if len(items.get(key, [])) != 1:
                    errs.append(f"{path}: {len(items.get(key, []))} quota items match sportId + event (need exactly 1)")
                if key in seen_c:
                    errs.append(f"{path}: duplicate of {seen_c[key]}")
                seen_c.setdefault(key, path)
                if r["cutoff"] is not None:
                    errs += check_cutoff(r["cutoff"], f"{path}.cutoff")
                if not https(r["source"]):
                    errs.append(f"{path}.source: expected the qualification system's https link")
            if errs:
                out["errors"] += errs
                continue
            if r["cutoff"] is None:
                out["noCutoff"].append(f"{r['sportId']}|{r['event']}")
            else:
                was = items[key][0].get("cutoff")
                if was == r["cutoff"]:
                    out["cutoffsUnchanged"].append(f"{r['sportId']}|{r['event']}")
                else:
                    out["cutoffs"].append({"sportId": r["sportId"], "event": r["event"], "cutoff": r["cutoff"], "was": was})
        for i, r in enumerate(f["athletes"]):
            path = f"{name}.athletes[{i}]"
            errs = shape(r, ATHLETE_KEYS, path)
            if not errs:
                aid = r["athleteId"]
                path += f"({aid})"
                if not signed(r):
                    out["skipped"].append(f"{path}: review {r['review']!r}, not signed off")
                    continue
                if aid not in athletes:
                    errs.append(f"{path}.athleteId: not an athlete in the DB")
                elif athletes[aid].get("archived"):
                    errs.append(f"{path}.athleteId: archived")
                # One row per athlete and field set: two would overwrite each other. A null row has no list,
                # so it can't be routed; it counts against both.
                keys = [(aid, "world"), (aid, "olympic")] if r["rankNum"] is None else [
                    (aid, "olympic" if fields_for(str(r["rankList"])) is OLYMPIC_FIELDS else "world")]
                for k in keys:
                    if k in seen_a:
                        errs.append(f"{path}: duplicate of {seen_a[k]}")
                    seen_a.setdefault(k, path)
                if r["rankNum"] is None:
                    if r["rankList"] or r["rankAsOf"]:
                        errs.append(f"{path}: rankNum null needs empty rankList and rankAsOf")
                    if not errs:
                        cur = athletes[aid]
                        out["unranked"].append({"athleteId": aid, "file": name, "current": {
                            k: cur.get(k) for k in RANK_FIELDS + OLYMPIC_FIELDS if cur.get(k) not in (None, "")} or None})
                    out["errors"] += errs
                    continue
                if not (type(r["rankNum"]) is int and r["rankNum"] >= 1):
                    errs.append(f"{path}.rankNum: expected an integer ≥ 1 or null, got {r['rankNum']!r}")
                if not (isinstance(r["rankList"], str) and r["rankList"].strip() and "\n" not in r["rankList"]
                        and len(r["rankList"]) <= RANK_LIST_MAX):
                    errs.append(f"{path}.rankList: expected the list's name, at most {RANK_LIST_MAX} chars")
                if not (date(r["rankAsOf"]) and r["rankAsOf"] <= today):
                    errs.append(f"{path}.rankAsOf: expected YYYY-MM-DD, not after {today}, got {r['rankAsOf']!r}")
                if not https(r["source"]):
                    errs.append(f"{path}.source: expected the official https ranking link")
            if errs:
                out["errors"] += errs
                continue
            target = fields_for(r["rankList"])
            if misrouted(r["rankList"]):
                out["warnings"].append(f"{path}.rankList: {r['rankList']!r} looks like an Olympic list but goes to the world rank"
                                       " (rankNum); use the list's full name, e.g. \"… Adjusted Official Ranking (AOR)\"")
            patch = build(athletes[aid], {t: r[k] for t, k in zip(target, RANK_FIELDS)}, now)
            prior = next((c for c in out["changes"] if c["doc_id"] == aid), None)   # its world + Olympic rows
            if patch and prior:
                prior["fields"] = {**prior["fields"], **patch, "loadedFrom": name}
            elif patch:
                out["changes"].append({"doc_id": aid, "fields": {**patch, "loadedFrom": name}})
            elif aid not in out["unchanged"]:
                out["unchanged"].append(aid)
    return out


def main(argv):
    args, now = argv[1:], datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if "--now" in args:
        i = args.index("--now")
        now, args = (args[i + 1] if i + 1 < len(args) else ""), args[:i] + args[i + 2:]
    if len(args) < 3 or not os.path.isdir(args[0]) or not date(now[:10]):
        print("usage: python3 job/apply_rankings.py <db_dump_dir> data/quotas/quotas.json data/rankings/<name>.json [...]"
              " [--now ISO]", file=sys.stderr)
        return 2
    athletes = load(args[0], "athletes", [])
    with open(args[1], encoding="utf-8") as f:
        quota_items = json.load(f).get("items", [])
    files = []
    for p in args[2:]:
        try:
            with open(p, encoding="utf-8") as f:
                files.append((os.path.basename(p)[:-5] if p.endswith(".json") else p, json.load(f)))
        except (OSError, ValueError) as e:
            files.append((p, None))
            print(f"cannot read {p}: {e}", file=sys.stderr)
    out = plan(files, quota_items, athletes, now)
    print(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"errors={len(out['errors'])} warnings={len(out['warnings'])} cutoffs={len(out['cutoffs'])} changes={len(out['changes'])} "
          f"unchanged={len(out['unchanged'])} skipped={len(out['skipped'])}", file=sys.stderr)
    return 1 if out["errors"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
