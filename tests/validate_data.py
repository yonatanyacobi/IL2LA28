"""Validate a public data.json produced by job/export_data.py.

Usage: python3 validate_data.py <data.json>  -> exit 0 if valid, 1 with one error per line otherwise.
Checks the contract the exporter guarantees; unknown keys are errors so a private field can't leak silently.
"""
import json, re, sys
from datetime import datetime

SCHEMA_VERSION = 3
PRIVATE_KEYS = {"updatedBy", "verifiedBy"}
DATE = re.compile(r"\d{4}-\d{2}-\d{2}", re.ASCII)
STAMP = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", re.ASCII)
HISTORY_KINDS = {"start", "stage", "rank", "result", "next", "note"}

# key -> (kind, required); kinds: str, date ("" or YYYY-MM-DD), url ("" or https://), iso ("" or ISO datetime/date)
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
    if not isinstance(v, str) or not DATE.match(v):
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
        err(f"lastRun: expected ISO datetime or \"\", got {data.get('lastRun')!r}")
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


def main(argv):
    if len(argv) != 2:
        print("usage: python3 validate_data.py <data.json>", file=sys.stderr)
        return 1
    try:
        with open(argv[1], encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError) as e:
        print(f"INVALID: cannot read {argv[1]}: {e}")
        return 1
    errors = validate(data)
    for e in errors:
        print(f"INVALID: {e}")
    if not errors:
        print(f"OK: {argv[1]}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
