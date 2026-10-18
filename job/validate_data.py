"""Validate a public data.json produced by export_data.py (shipped next to it).

Usage: python3 validate_data.py <data.json>  -> exit 0 if valid, 1 with one error per line otherwise.
       python3 validate_data.py --quotas <quotas.json> <data.json>  -> checks the hand-curated quotas.json;
       data.json is context for sportId and the "earned" cross-check.
Checks the contract the exporter guarantees; unknown keys are errors so a private field can't leak silently.
"""
import json, re, sys
from datetime import datetime

SCHEMA_VERSION = 3
PRIVATE_KEYS = {"updatedBy", "verifiedBy"}
DATE = re.compile(r"\d{4}-\d{2}-\d{2}", re.ASCII)
ISO = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})", re.ASCII)
STAMP = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", re.ASCII)
HISTORY_KINDS = {"start", "stage", "rank", "result", "next", "note"}
QUOTA_STATUSES = {"earned", "in-contention", "outside", "unknown"}
QUOTA_KEYS = {"sportId", "event", "totalQuotas", "maxPerNOC", "allocation", "israelStatus", "israelNote",
              "nextQuotaEvent", "source"}
QUOTA_OPTIONAL = {"stakes"}
STAKES_MAX = 140

# key -> (kind, required); kinds: str, date ("" or YYYY-MM-DD), url ("" or https://), iso ("" or ISO datetime with timezone, as export_data.iso())
SPORT = {"id": ("id", True), "he": ("str", True), "en": ("str", True), "window": ("window", True)}
WINDOW = {"from": ("date!", True), "to": ("date?", True), "summary": ("str", True), "source": ("url", True)}
ATHLETE = {
    "id": ("id", True), "name": ("str", True), "name_en": ("str", True), "sportId": ("sport", True),
    "event": ("str", True), "stage": ("stage", True), "rank": ("str", True), "next": ("str", True),
    "nextDate": ("date", True), "notes": ("str", True), "source": ("url", True), "updatedAt": ("iso", True),
    "history": ("history", True), "verifiedAt": ("iso", False),
}
HISTORY = {"at": ("date!", True), "kind": ("kind", True), "text": ("str!", True), "source": ("url", True)}
COMP = {
    "id": ("id", True), "sportId": ("sport", True), "name": ("str", True), "location": ("str", True),
    "start": ("date!", True), "end": ("date", True), "notes": ("str", True), "source": ("url", True),
    "qualifying": ("bool", True),
}
CHANGE = {"at": ("date", True), "text": ("str!", True), "athleteId": ("athlete", False)}


def is_date(v):
    try:
        return isinstance(v, str) and bool(DATE.fullmatch(v)) and bool(datetime.strptime(v, "%Y-%m-%d"))
    except ValueError:
        return False


def is_iso(v):
    if not isinstance(v, str) or not ISO.fullmatch(v):
        return False
    try:
        datetime.fromisoformat(v[:-1] + "+00:00" if v.endswith("Z") else v)
        return True
    except ValueError:
        return False


def validate(data):
    errors = []
    err = errors.append

    def find_private(v, path):
        if isinstance(v, dict):
            for k, x in v.items():
                if k in PRIVATE_KEYS:
                    err(f"{path}.{k}: private field must not be exported")
                find_private(x, f"{path}.{k}")
        elif isinstance(v, list):
            for i, x in enumerate(v):
                find_private(x, f"{path}[{i}]")

    if not isinstance(data, dict):
        return ["top level: expected an object"]
    find_private(data, "$")
    if data.get("schemaVersion") != SCHEMA_VERSION:
        err(f"schemaVersion: expected {SCHEMA_VERSION}, got {data.get('schemaVersion')!r}")
    if not (isinstance(data.get("generatedAt"), str) and STAMP.fullmatch(data["generatedAt"])):
        err(f"generatedAt: expected YYYY-MM-DDTHH:MM:SSZ, got {data.get('generatedAt')!r}")
    if not is_iso(data.get("lastRun")) and data.get("lastRun") != "":
        err(f"lastRun: expected ISO datetime with timezone or \"\", got {data.get('lastRun')!r}")
    data = dict(data)
    for k in ("sports", "athletes", "competitions", "changes"):
        if not isinstance(data.get(k), list):
            err(f"{k}: expected a list")
            data[k] = []
    if len(data["changes"]) > 30:
        err(f"changes: {len(data['changes'])} entries, max 30")
    extra = set(data) - {"schemaVersion", "generatedAt", "lastRun", "sports", "athletes", "competitions", "changes"}
    if extra:
        err(f"top level: unexpected keys {sorted(extra)}")

    sport_ids = {s.get("id") for s in data["sports"] if isinstance(s, dict)}
    athlete_ids = {a.get("id") for a in data["athletes"] if isinstance(a, dict)}

    def check(obj, spec, path):
        if not isinstance(obj, dict):
            err(f"{path}: expected an object")
            return
        for k in set(obj) - set(spec):
            if k not in PRIVATE_KEYS:  # already reported
                err(f"{path}.{k}: unexpected key")
        for k, (kind, required) in spec.items():
            if k not in obj:
                if required:
                    err(f"{path}.{k}: missing")
                continue
            v, where = obj[k], f"{path}.{k}"
            ok = {
                "str": lambda: isinstance(v, str),
                "str!": lambda: isinstance(v, str) and v.strip() != "",
                "id": lambda: isinstance(v, str) and v != "",
                "bool": lambda: isinstance(v, bool),
                "date": lambda: v == "" or is_date(v),
                "date!": lambda: is_date(v),
                "date?": lambda: v is None or is_date(v),
                "iso": lambda: v == "" or is_iso(v),
                "url": lambda: v == "" or (isinstance(v, str) and v.startswith("https://") and len(v) > 8),
                "stage": lambda: type(v) is int and 0 <= v <= 3,
                "kind": lambda: v in HISTORY_KINDS,
                "sport": lambda: isinstance(v, str) and v in sport_ids,
                "athlete": lambda: isinstance(v, str) and v in athlete_ids,
                "window": lambda: v is None or isinstance(v, dict),
                "history": lambda: isinstance(v, list),
            }[kind]()
            if not ok:
                err(f"{where}: invalid {kind.rstrip('!?')} value {v!r}")
            elif kind == "window" and v is not None:
                check(v, WINDOW, where)
            elif kind == "history":
                for i, h in enumerate(v):
                    check(h, HISTORY, f"{where}[{i}]")
                if len(v) > 10:
                    err(f"{where}: {len(v)} entries, max 10")
                dates = [h.get("at") for h in v if isinstance(h, dict)]
                if all(isinstance(d, str) for d in dates) and dates != sorted(dates):
                    err(f"{where}: not sorted by date")

    for coll, spec in (("sports", SPORT), ("athletes", ATHLETE), ("competitions", COMP), ("changes", CHANGE)):
        seen = set()
        for i, row in enumerate(data[coll]):
            path = f"{coll}[{i}]" + (f"({row.get('id')})" if isinstance(row, dict) and "id" in row else "")
            check(row, spec, path)
            if "id" in spec and isinstance(row, dict):
                rid = row.get("id")
                if isinstance(rid, str) and rid in seen:
                    err(f"{path}: duplicate id")
                seen.add(rid)
    return errors


def validate_quotas(q, data):
    """Same per-item rules as the page's quota loader, plus: "earned" needs an athlete at stage >= 2 in that sport."""
    if not isinstance(q, dict):
        return ["top level: expected an object"]
    errors = []
    err = errors.append
    # The sprint backlog says YYYY-MM-DD, the agreed format says ISO; both are accepted.
    if not (is_date(q.get("updatedAt")) or is_iso(q.get("updatedAt"))):
        err(f"updatedAt: expected YYYY-MM-DD or ISO datetime, got {q.get('updatedAt')!r}")
    if set(q) - {"updatedAt", "items"}:
        err(f"top level: unexpected keys {sorted(set(q) - {'updatedAt', 'items'})}")
    if not isinstance(q.get("items"), list):
        return errors + ["items: expected a list"]
    sports = {s.get("id") for s in data.get("sports") or [] if isinstance(s, dict)}
    staged = {a.get("sportId") for a in data.get("athletes") or []
              if isinstance(a, dict) and type(a.get("stage")) is int and a["stage"] >= 2}
    for i, it in enumerate(q["items"]):
        path = f"items[{i}]"
        if not isinstance(it, dict):
            err(f"{path}: expected an object")
            continue
        path += f"({it.get('sportId')}/{it.get('event')})"
        for k in sorted(QUOTA_KEYS - set(it)):
            err(f"{path}.{k}: missing")
        for k in sorted(set(it) - QUOTA_KEYS - QUOTA_OPTIONAL):
            err(f"{path}.{k}: unexpected key")
        if it.get("sportId") not in sports:
            err(f"{path}.sportId: unknown sport {it.get('sportId')!r}")
        for k in ("event", "allocation", "israelNote"):
            if k in it and not isinstance(it[k], str):
                err(f"{path}.{k}: expected a string")
        if isinstance(it.get("event"), str) and not it["event"].strip():
            err(f"{path}.event: must not be empty")
        for k in ("totalQuotas", "maxPerNOC"):
            v = it.get(k)
            if not (v is None or (type(v) is int and v >= 0)):
                err(f"{path}.{k}: expected a non-negative int or null, got {v!r}")
        status = it.get("israelStatus")
        if status not in QUOTA_STATUSES:
            err(f"{path}.israelStatus: expected one of {sorted(QUOTA_STATUSES)}, got {status!r}")
        elif status == "earned" and it.get("sportId") not in staged:
            err(f"{path}.israelStatus: \"earned\" but no athlete in {it.get('sportId')!r} has stage >= 2 in data.json")
        if "stakes" in it:
            v = it["stakes"]
            if not (isinstance(v, str) and v.strip() and "\n" not in v and len(v) <= STAKES_MAX):
                err(f"{path}.stakes: expected one non-empty line of at most {STAKES_MAX} chars, got {v!r}")
        src = it.get("source")
        if not (isinstance(src, str) and src.startswith("https://") and len(src) > 8):
            err(f"{path}.source: expected an https:// URL, got {src!r}")
        nxt = it.get("nextQuotaEvent")
        if nxt is not None:
            if not (isinstance(nxt, dict) and set(nxt) == {"name", "start"}):
                err(f"{path}.nextQuotaEvent: expected null or {{name, start}}")
            else:
                if not (isinstance(nxt["name"], str) and nxt["name"].strip()):
                    err(f"{path}.nextQuotaEvent.name: must not be empty")
                if not is_date(nxt["start"]):
                    err(f"{path}.nextQuotaEvent.start: expected YYYY-MM-DD, got {nxt['start']!r}")
    return errors


def main(argv):
    args = argv[1:]
    quotas = bool(args) and args[0] == "--quotas"
    if quotas:
        args = args[1:]
    if len(args) != (2 if quotas else 1):
        print("usage: python3 validate_data.py [--quotas <quotas.json>] <data.json>", file=sys.stderr)
        return 1
    docs = []
    for p in args:
        try:
            with open(p, encoding="utf-8") as f:
                docs.append(json.load(f))
        except (OSError, ValueError) as e:
            print(f"INVALID: cannot read {p}: {e}")
            return 1
    if quotas:
        errors = validate_quotas(docs[0], docs[1] if isinstance(docs[1], dict) else {})
    else:
        errors = validate(docs[0])
    for e in errors:
        print(f"INVALID: {e}")
    if not errors:
        print(f"OK: {args[0]}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
