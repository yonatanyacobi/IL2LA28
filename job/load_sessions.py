"""Dry-run DB write plan for signed-off session batches (docs/design/sessions-contract.md §1 and §6).

Usage: python3 job/load_sessions.py [--max-age MIN] <db_dump_dir> data/sessions/<name>.json [...]
<db_dump_dir>: an ArtifactData read with out_dir of athletes, competitions and sessions (the current DB).
Its age is its newest file's mtime (ArtifactData writes on read). Over --max-age minutes (default 30) prints a WARN
to stderr, and every "not in the DB" error names the age: re-read the DB before trusting either.
Writes nothing. Prints a JSON plan for the coordinator:
  errors     every rule a batch breaks (exit 1 if any; fix the batch, don't hand-edit the plan)
  skipped    sessions not signed off (each session's review: status ok/fixed, by, at; as in the quotas master)
  unchanged  ids already in the DB with the same fields
  creates    ArtifactData batch entries {op: "set", collection: "sessions", doc_id, data} for new ids
  changes    existing ids whose fields differ: {doc_id, fields}. Read the doc and "update" with its if_version.
             Result fields are never part of a change; the job owns them.
  preview    {id, startUtc, israelTime}, to compare with the research table before writing
"""
import json, os, re, sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_data import date, https, load, start_utc, text, HHMM, SESSION_TEXT_MAX  # one contract, one implementation

SIGNED = {"ok", "fixed"}
BATCH_REQUIRED, BATCH_OPTIONAL = {"sessions"}, {"updatedAt", "pendingFinalBlocks"}  # pendingFinalBlocks: notes, not loaded
ITEM_KEYS = {"id", "competitionId", "date", "timeLocal", "tz", "athleteIds", "phase", "source", "review"}
ITEM_OPTIONAL = {"notes", "result", "resultSource", "resultAt"}  # results only empty: the job owns them
DB_FIELDS = ["competitionId", "date", "timeLocal", "tz", "athleteIds", "phase", "source", "notes"]
SLUG = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*", re.ASCII)
MAX_AGE_MIN = 30
NOT_IN_DB = re.compile(r"not in the DB|is not an athlete in the DB")


def check_item(s, comps, athletes, path):
    """Errors for one batch session against the contract's DB rules (§1), with the DB as context."""
    errs = []
    err = errs.append
    if not isinstance(s, dict):
        return [f"{path}: expected an object"]
    missing, extra = ITEM_KEYS - set(s), set(s) - ITEM_KEYS - ITEM_OPTIONAL
    if missing or extra:
        return [f"{path}: missing {sorted(missing)}, unknown {sorted(extra)} (required {sorted(ITEM_KEYS)},"
                f" optional {sorted(ITEM_OPTIONAL)})"]
    filled = [k for k in ("result", "resultSource", "resultAt") if s.get(k)]
    if filled:
        err(f"{path}: {filled} must be empty; results are written by the job from official lists, never by a batch")
    if not (isinstance(s.get("notes", ""), str) and len(s.get("notes", "")) <= 2000):
        err(f"{path}.notes: expected a string of at most 2000 chars (internal, never exported)")
    r = s["review"]
    if not (isinstance(r, dict) and set(r) <= {"status", "by", "at"} and isinstance(r.get("status"), str)):
        err(f"{path}.review: expected {{status, by, at}}, got {r!r}")
    comp, day = comps.get(s["competitionId"]), date(s["date"])
    if not comp:
        err(f"{path}.competitionId: not in the DB: {s['competitionId']!r}")
    if not day:
        err(f"{path}.date: expected YYYY-MM-DD, got {s['date']!r}")
    elif comp and not (date(comp.get("start")) and comp["start"] <= day <= (date(comp.get("end")) or comp["start"])):
        err(f"{path}.date: {day} is outside {s['competitionId']} ({comp.get('start')}–{comp.get('end')})")
    sid = s["id"]
    prefix = f"{s['competitionId']}-{str(s['date']).replace('-', '')}-"
    if not (isinstance(sid, str) and sid.startswith(prefix) and SLUG.fullmatch(sid[len(prefix):] or "") and len(sid) <= 200):
        err(f"{path}.id: expected {prefix}<slug> (lowercase a-z, 0-9, -), got {sid!r}")
    t, tz = s["timeLocal"], s["tz"]
    if t == "" and tz == "":
        pass
    elif not (isinstance(t, str) and HHMM.fullmatch(t)):
        err(f"{path}.timeLocal: expected HH:MM venue time or \"\", got {t!r}")
    elif not (isinstance(tz, str) and day and start_utc(day, t, tz)):
        err(f"{path}.tz: expected an IANA zone like Asia/Qatar with the time, got {tz!r}")
    ids = s["athleteIds"]
    if not (isinstance(ids, list) and ids and len(set(map(str, ids))) == len(ids)):
        err(f"{path}.athleteIds: expected a non-empty list of unique ids, got {ids!r}")
    else:
        for a in ids:
            if a not in athletes:
                err(f"{path}.athleteIds: {a!r} is not an athlete in the DB")
            elif athletes[a].get("archived"):
                err(f"{path}.athleteIds: {a!r} is archived")
    if not (isinstance(s["phase"], str) and s["phase"].strip() and len(s["phase"]) <= SESSION_TEXT_MAX):
        err(f"{path}.phase: expected a non-empty Hebrew string of at most {SESSION_TEXT_MAX} chars")
    if not https(s["source"]):
        err(f"{path}.source: expected the official https schedule or start list, got {s['source']!r}")
    return errs


def israel_time(utc_iso):
    from zoneinfo import ZoneInfo
    t = datetime.strptime(utc_iso, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    return t.astimezone(ZoneInfo("Asia/Jerusalem")).strftime("%Y-%m-%d %H:%M")


def plan(batches, comps, athletes, existing):
    """batches: [(name, parsed json)]. comps/athletes/existing: DB docs by id. Returns the plan dict."""
    out = {"errors": [], "skipped": [], "unchanged": [], "creates": [], "changes": [], "preview": []}
    seen = {}
    for name, b in batches:
        if (not isinstance(b, dict) or not BATCH_REQUIRED <= set(b) or set(b) - BATCH_REQUIRED - BATCH_OPTIONAL
                or not isinstance(b.get("sessions"), list)):
            out["errors"].append(f"{name}: expected a sessions list, optional {sorted(BATCH_OPTIONAL)}, nothing else")
            continue
        for i, s in enumerate(b["sessions"]):
            path = f"{name}.sessions[{i}]" + (f"({s.get('id')})" if isinstance(s, dict) else "")
            errs = check_item(s, comps, athletes, path)
            if isinstance(s, dict) and s.get("id") in seen:
                errs.append(f"{path}.id: duplicate of {seen[s['id']]}")
            if isinstance(s, dict):
                seen.setdefault(s.get("id"), path)
            if errs:
                out["errors"] += errs
                continue
            review = s["review"]
            if not (review.get("status") in SIGNED and review.get("by") and date(review.get("at"))):
                out["skipped"].append(f"{s['id']} ({name}: review {review.get('status')!r} by {review.get('by')!r},"
                                      f" not signed off)")
                continue
            data = {k: (text(s[k], SESSION_TEXT_MAX) if k == "phase" else s.get(k, "")) for k in DB_FIELDS}
            data["review"] = review
            when = start_utc(s["date"], s["timeLocal"], s["tz"]) if s["timeLocal"] else None
            out["preview"].append({"id": s["id"], "startUtc": when, "israelTime": israel_time(when) if when else ""})
            cur = existing.get(s["id"])
            if cur is None:
                out["creates"].append({"op": "set", "collection": "sessions", "doc_id": s["id"],
                                       "data": {**data, "result": "", "resultSource": "", "resultAt": "", "loadedFrom": name}})
            else:
                diff = {k: v for k, v in data.items() if cur.get(k) != v}
                (out["changes"].append({"doc_id": s["id"], "fields": {**diff, "loadedFrom": name}}) if diff
                 else out["unchanged"].append(s["id"]))
    return out


def dump_age_min(dump, now=None):
    """Minutes since the newest file under the dump was written; None for an empty dump."""
    times = [os.path.getmtime(os.path.join(d, f)) for d, _, fs in os.walk(dump) for f in fs]
    return ((now if now is not None else datetime.now(timezone.utc).timestamp()) - max(times)) / 60 if times else None


def fmt_age(m):
    return f"{m:.0f} min" if m < 120 else f"{m / 60:.1f} h"


def stale_hints(out, age):
    """Name the dump's age on every "not in the DB" error: a write after the dump is the usual cause."""
    if age is not None:
        out["errors"] = [f"{e} (dump may be stale: age {fmt_age(age)})" if NOT_IN_DB.search(e) else e for e in out["errors"]]
    return out


def main(argv):
    args, max_age = argv[1:], MAX_AGE_MIN
    if args[:1] == ["--max-age"]:
        try:
            max_age, args = float(args[1]), args[2:]
        except (IndexError, ValueError):
            args = []
    if len(args) < 2 or not os.path.isdir(args[0]):
        print("usage: python3 job/load_sessions.py [--max-age MIN] <db_dump_dir> data/sessions/<name>.json [...]",
              file=sys.stderr)
        return 2
    dump, files = args[0], args[1:]
    age = dump_age_min(dump)
    if age is not None and age > max_age:
        print(f"WARN: the DB dump {dump} is {fmt_age(age)} old (newest file), over --max-age {max_age:g} min;"
              f" re-read the DB before writing this plan", file=sys.stderr)
    comps, athletes, existing = (load(dump, c, []) for c in ("competitions", "athletes", "sessions"))
    batches = []
    for p in files:
        try:
            with open(p, encoding="utf-8") as f:
                batches.append((os.path.basename(p)[:-5] if p.endswith(".json") else p, json.load(f)))
        except (OSError, ValueError) as e:
            batches.append((p, None))
            print(f"cannot read {p}: {e}", file=sys.stderr)
    out = stale_hints(plan(batches, comps, athletes, existing), age)
    print(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"errors={len(out['errors'])} creates={len(out['creates'])} changes={len(out['changes'])} "
          f"unchanged={len(out['unchanged'])} skipped={len(out['skipped'])}", file=sys.stderr)
    return 1 if out["errors"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
