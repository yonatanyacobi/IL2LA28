"""Validate a public data.json produced by export_data.py (shipped next to it).

Usage: python3 validate_data.py <data.json>  -> exit 0 if valid, 1 with one error per line otherwise;
       WARN lines (suspect rank dates) never change the exit code.
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
HISTORY_KINDS = {"start", "stage", "rank", "result", "next", "note", "correction"}  # = export_data.HISTORY_KINDS
QUOTA_STATUSES = {"earned", "in-contention", "outside", "unknown"}
QUOTA_KEYS = {"sportId", "event", "totalQuotas", "maxPerNOC", "allocation", "israelStatus", "israelNote",
              "nextQuotaEvent", "source"}
QUOTA_OPTIONAL = {"stakes", "earnedAt", "checkedAt", "cutoff", "teamRank"}
TEAM_RANK_KEYS = {"num", "asOf", "source"}   # a team event's own rank on its cutoff list (standings.md §1)
CUTOFF_KEYS, CUTOFF_OPTIONAL = {"rank", "list", "url", "final"}, {"opens"}   # docs/design/standings.md §1 (#194)
STAKES_MAX = 140
# Stakes style (site date format, maqaf). A year-less date needs a 2-digit month so decimals like 9.58 pass.
DOTTED_DATE = re.compile(r"(?<![\d.])\d{1,2}\.(?:\d{1,2}\.\d{2,4}|0[1-9]|1[0-2])(?![\d.])", re.ASCII)
HEB_HYPHEN = re.compile(r"[א-ת]-\S*")

# key -> (kind, required); kinds: str, date ("" or YYYY-MM-DD), url ("" or https://), iso ("" or ISO datetime with timezone, as export_data.iso())
SPORT = {"id": ("id", True), "he": ("str", True), "en": ("str", True), "window": ("window", True)}
WINDOW = {"from": ("date!", True), "to": ("date?", True), "summary": ("str", True), "source": ("url", True)}
ATHLETE = {
    "id": ("id", True), "name": ("str", True), "name_en": ("str", True), "sportId": ("sport", True),
    "event": ("str", True), "stage": ("stage", True), "rank": ("str", True), "next": ("str", True),
    "nextDate": ("date", True), "notes": ("str", True), "source": ("url", True), "updatedAt": ("iso", True),
    "history": ("history", True), "verifiedAt": ("iso", False),
    # Sortable world rank (docs/product/spec-rank-tiebreak.md); a set rankNum needs both companions (checked below).
    "rankNum": ("rankNum", False), "rankList": ("rankList", False), "rankAsOf": ("date", False),
    # The Olympic qualification list, kept apart from the world rank (#218); same rules.
    "olympicRankNum": ("rankNum", False), "olympicRankList": ("rankList", False), "olympicRankAsOf": ("date", False),
}
RANK_LIST_MAX = 80
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
    extra = set(data) - {"schemaVersion", "generatedAt", "lastRun", "sports", "athletes", "competitions", "changes",
                         "launchAt", "corrections", "sessions"}
    if extra:
        err(f"top level: unexpected keys {sorted(extra)}")
    errors.extend(validate_corrections(data.get("corrections", []), data.get("launchAt")))

    sport_ids = {s.get("id") for s in data["sports"] if isinstance(s, dict)}
    athlete_ids = {a.get("id") for a in data["athletes"] if isinstance(a, dict)}
    errors.extend(validate_sessions(data.get("sessions", []), data["competitions"], athlete_ids))

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
                "rankNum": lambda: v is None or (type(v) is int and v >= 1),
                "rankList": lambda: isinstance(v, str) and "\n" not in v and len(v) <= RANK_LIST_MAX,
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
                n_res = sum(1 for h in v if isinstance(h, dict) and h.get("kind") == "result")
                if len(v) - n_res > 10:   # = export_data.HISTORY_PUBLIC
                    err(f"{where}: {len(v) - n_res} non-result entries, max 10")
                if n_res > 60:            # = export_data.RESULTS_PUBLIC
                    err(f"{where}: {n_res} result entries, max 60")
                dates = [h.get("at") for h in v if isinstance(h, dict)]
                if all(isinstance(d, str) for d in dates) and dates != sorted(dates):
                    err(f"{where}: not sorted by date")

    days = export_days(data.get("generatedAt"))
    for coll, spec in (("sports", SPORT), ("athletes", ATHLETE), ("competitions", COMP), ("changes", CHANGE)):
        seen = set()
        for i, row in enumerate(data[coll]):
            path = f"{coll}[{i}]" + (f"({row.get('id')})" if isinstance(row, dict) and "id" in row else "")
            check(row, spec, path)
            for p in ("rank", "olympicRank"):
                if coll != "athletes" or not isinstance(row, dict):
                    continue
                if type(row.get(p + "Num")) is int:
                    if not (isinstance(row.get(p + "List"), str) and row[p + "List"].strip()):
                        err(f"{path}.{p}List: required when {p}Num is set")
                    if not is_date(row.get(p + "AsOf")):
                        err(f"{path}.{p}AsOf: YYYY-MM-DD required when {p}Num is set")
                as_of = row.get(p + "AsOf")
                if is_date(as_of) and days and as_of > days[-1]:
                    err(f"{path}.{p}AsOf: {as_of} is after the export ({days[-1]})")
            if "id" in spec and isinstance(row, dict):
                rid = row.get("id")
                if isinstance(rid, str) and rid in seen:
                    err(f"{path}: duplicate id")
                seen.add(rid)
    return errors


def export_days(generated_at):
    """The export's UTC and Israel dates, ascending: a rank read "today" may carry either."""
    if not (isinstance(generated_at, str) and STAMP.fullmatch(generated_at)):
        return []
    from zoneinfo import ZoneInfo
    t = datetime.fromisoformat(generated_at[:-1] + "+00:00")
    return sorted({t.strftime("%Y-%m-%d"), t.astimezone(ZoneInfo("Asia/Jerusalem")).strftime("%Y-%m-%d")})


def warnings(data):
    """Suspect but not provably wrong, so these never block publishing. A ranking list is published before it's
    read, so an AsOf equal to the export day is usually the read date instead of the list's (IJF, 18.10).
    A list name without a date is what the exporter leaves when a DB date is malformed (it nulls the Num)."""
    days, out = export_days(data.get("generatedAt")), []
    athletes = data.get("athletes") if isinstance(data.get("athletes"), list) else []
    for i, a in enumerate(athletes):
        if not isinstance(a, dict):
            continue
        for p in ("rank", "olympicRank"):
            where = f"athletes[{i}]({a.get('id')}).{p}AsOf"
            if type(a.get(p + "Num")) is int and a.get(p + "AsOf") in days:
                out.append(f"{where}: {a[p + 'AsOf']} is the export day; check the date printed on {a.get(p + 'List')!r}")
            elif isinstance(a.get(p + "List"), str) and a[p + "List"].strip() and not is_date(a.get(p + "AsOf")):
                out.append(f"{where}: missing although {p}List is set; fix the date in the DB")
    return out


def validate_corrections(rows, launch_at):
    """data.json "corrections" (optional) against its "launchAt": the export's public shape, on or after launchAt,
    newest first, no emails. launchAt null (no launch date yet) allows only an empty list."""
    from export_data import CORRECTION_TARGETS, CORRECTION_FIELDS, CORRECTION_BY, CORRECTIONS_MAX, EMAIL, instant
    if not isinstance(rows, list):
        return ["corrections: expected a list"]
    errors = []
    err = errors.append
    if launch_at is not None and not (isinstance(launch_at, str) and launch_at.endswith("Z") and is_iso(launch_at)):
        err(f"launchAt: expected null or an ISO time with Z, got {launch_at!r}")
        launch_at = None
    if rows and launch_at is None:
        return errors + [f"corrections: {len(rows)} entries but no valid launchAt; nothing is public before launch"]
    if len(rows) > CORRECTIONS_MAX:
        err(f"corrections: {len(rows)} entries, max {CORRECTIONS_MAX}")
    seen, prev = set(), None
    for i, c in enumerate(rows):
        path = f"corrections[{i}]"
        if not isinstance(c, dict):
            err(f"{path}: expected an object")
            continue
        path += f"({c.get('id')})"
        extra = set(c) - {"id", "at", "reportedAt", "target", "changes", "source", "by"}
        if extra:  # reporter identity or editor ids would land here
            err(f"{path}: unexpected keys {sorted(extra)}")
        if not (isinstance(c.get("id"), str) and c["id"]) or c.get("id") in seen:
            err(f"{path}.id: missing or duplicate")
        seen.add(c.get("id"))
        at = instant(c.get("at")) if is_iso(c.get("at")) else None
        if not at or at < instant(launch_at):
            err(f"{path}.at: expected an ISO time on or after launchAt {launch_at}, got {c.get('at')!r}")
        elif prev and at > prev:
            err(f"{path}.at: not newest first")
        prev = at or prev
        if not (c.get("reportedAt") == "" or is_iso(c.get("reportedAt"))):
            err(f"{path}.reportedAt: expected ISO time or \"\", got {c.get('reportedAt')!r}")
        t = c.get("target")
        if not (isinstance(t, dict) and set(t) == {"kind", "id", "name"} and t["kind"] in CORRECTION_TARGETS
                and all(isinstance(t[k], str) and t[k].strip() for k in ("id", "name"))):
            err(f"{path}.target: expected {{kind: {sorted(CORRECTION_TARGETS)}, id, name}}, got {t!r}")
        ch = c.get("changes")
        if not (isinstance(ch, list) and 1 <= len(ch) <= 5):
            err(f"{path}.changes: expected 1-5 entries")
            ch = []
        for j, x in enumerate(ch):
            if not (isinstance(x, dict) and set(x) == {"field", "wrong", "right"} and x["field"] in CORRECTION_FIELDS
                    and all(isinstance(x[k], str) and len(x[k]) <= 200 for k in ("wrong", "right"))
                    and (x["wrong"] or x["right"])):
                err(f"{path}.changes[{j}]: expected {{field, wrong, right}} with a known field and one value set, got {x!r}")
        src = c.get("source")
        if not (isinstance(src, str) and src.startswith("https://") and len(src) > 8):
            err(f"{path}.source: expected an https:// URL, got {src!r}")
        if c.get("by") not in CORRECTION_BY:
            err(f"{path}.by: expected one of {sorted(CORRECTION_BY)}, got {c.get('by')!r}")
        strings = [json.dumps(v, ensure_ascii=False) for k, v in c.items() if k != "source"]
        if any(EMAIL.search(s) for s in strings):
            err(f"{path}: contains an email address; data.json is public")
    return errors


SESSION_KEYS = {"id", "competitionId", "date", "startUtc", "athleteIds", "phase", "source", "result", "resultSource",
                "resultAt"}


def validate_sessions(rows, competitions, athlete_ids):
    """data.json "sessions" (optional): docs/design/sessions-contract.md §3, strict."""
    if not isinstance(rows, list):
        return ["sessions: expected a list"]
    errors = []
    err = errors.append
    comps = {c.get("id"): c for c in competitions if isinstance(c, dict)}
    seen, prev = set(), None
    utc = lambda v: isinstance(v, str) and v.endswith("Z") and is_iso(v)
    for i, s in enumerate(rows):
        path = f"sessions[{i}]"
        if not isinstance(s, dict):
            err(f"{path}: expected an object")
            continue
        path += f"({s.get('id')})"
        if set(s) != SESSION_KEYS:
            err(f"{path}: keys must be exactly {sorted(SESSION_KEYS)}; extra {sorted(set(s) - SESSION_KEYS)},"
                f" missing {sorted(SESSION_KEYS - set(s))}")
            continue
        if not (isinstance(s["id"], str) and s["id"]) or s["id"] in seen:
            err(f"{path}.id: missing or duplicate")
        seen.add(s["id"])
        comp = comps.get(s["competitionId"])
        if not comp:
            err(f"{path}.competitionId: unknown competition {s['competitionId']!r}")
        if not is_date(s["date"]):
            err(f"{path}.date: expected YYYY-MM-DD, got {s['date']!r}")
        elif comp and not (comp.get("start", "") <= s["date"] <= (comp.get("end") or comp.get("start", ""))):
            err(f"{path}.date: outside {comp.get('id')} ({comp.get('start')}–{comp.get('end')})")
        if not (s["startUtc"] is None or utc(s["startUtc"])):
            err(f"{path}.startUtc: expected null or ISO with Z, got {s['startUtc']!r}")
        ids = s["athleteIds"]
        if not (isinstance(ids, list) and ids and len(set(map(str, ids))) == len(ids) and all(a in athlete_ids for a in ids)):
            err(f"{path}.athleteIds: expected a non-empty list of unique known athlete ids, got {ids!r}")
        for k, required in (("phase", True), ("result", False)):
            v = s[k]
            if not (isinstance(v, str) and len(v) <= 120 and (v.strip() or not required)):
                err(f"{path}.{k}: expected {'a non-empty ' if required else ''}string of at most 120 chars")
        if not (isinstance(s["source"], str) and s["source"].startswith("https://") and len(s["source"]) > 8):
            err(f"{path}.source: expected an https:// URL, got {s['source']!r}")
        if s["result"]:
            if not (isinstance(s["resultSource"], str) and s["resultSource"].startswith("https://") and len(s["resultSource"]) > 8):
                err(f"{path}.resultSource: a result needs an https:// source, got {s['resultSource']!r}")
            if not utc(s["resultAt"]):
                err(f"{path}.resultAt: a result needs an ISO time with Z, got {s['resultAt']!r}")
        elif s["resultSource"] != "" or s["resultAt"] != "":
            err(f"{path}: resultSource and resultAt must be \"\" without a result")
        key = (str(s["date"]), s["startUtc"] is None, str(s["startUtc"] or ""), str(s["id"]))
        if prev and key < prev:
            err(f"{path}: not in order (date, startUtc with untimed last, id)")
        prev = key
    return errors


def check_cutoff(c, path):
    """A quota item's direct-quota line on an official ranking list: {rank, list, url, final, opens?}."""
    if not isinstance(c, dict):
        return [f"{path}: expected an object {{rank, list, url, final, opens?}}"]
    errs = []
    missing, extra = CUTOFF_KEYS - set(c), set(c) - CUTOFF_KEYS - CUTOFF_OPTIONAL
    if missing or extra:
        errs.append(f"{path}: missing {sorted(missing)}, unknown {sorted(extra)}")
    if "rank" in c and not (type(c["rank"]) is int and c["rank"] >= 1):
        errs.append(f"{path}.rank: expected an int >= 1, got {c['rank']!r}")
    if "list" in c and not (isinstance(c["list"], str) and c["list"].strip() and "\n" not in c["list"]
                            and len(c["list"]) <= RANK_LIST_MAX):
        errs.append(f"{path}.list: expected the list name as athletes' rankList writes it (≤ {RANK_LIST_MAX} chars)")
    if "url" in c and not (isinstance(c["url"], str) and c["url"].startswith("https://") and len(c["url"]) > 8):
        errs.append(f"{path}.url: expected the official https ranking page, got {c['url']!r}")
    if "final" in c and not is_date(c["final"]):
        errs.append(f"{path}.final: expected YYYY-MM-DD, got {c['final']!r}")
    if "opens" in c and not is_date(c["opens"]):
        errs.append(f"{path}.opens: expected YYYY-MM-DD, got {c['opens']!r}")
    elif "opens" in c and is_date(c.get("final")) and c["opens"] > c["final"]:
        errs.append(f"{path}.opens: {c['opens']} is after final {c['final']}")
    return errs


def validate_quotas(q, data):
    """Same per-item rules as the page's quota loader, plus: "earned" needs an athlete at stage >= 2 in that sport."""
    if not isinstance(q, dict):
        return ["top level: expected an object"]
    errors = []
    err = errors.append
    # The sprint backlog says YYYY-MM-DD, the agreed format says ISO; both are accepted.
    if not (is_date(q.get("updatedAt")) or is_iso(q.get("updatedAt"))):
        err(f"updatedAt: expected YYYY-MM-DD or ISO datetime, got {q.get('updatedAt')!r}")
    top = {"updatedAt", "items", "unpublished"}   # unpublished: optional count of master items awaiting sign-off
    if set(q) - top:
        err(f"top level: unexpected keys {sorted(set(q) - top)}")
    if "unpublished" in q and not (type(q["unpublished"]) is int and q["unpublished"] >= 0):
        err(f"unpublished: expected a non-negative int, got {q['unpublished']!r}")
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
        if "checkedAt" in it and not is_date(it["checkedAt"]):
            err(f"{path}.checkedAt: expected YYYY-MM-DD, got {it['checkedAt']!r}")
        if "stakes" in it:
            v = it["stakes"]
            if not (isinstance(v, str) and v.strip() and "\n" not in v and len(v) <= STAKES_MAX):
                err(f"{path}.stakes: expected one non-empty line of at most {STAKES_MAX} chars, got {v!r}")
            elif m := DOTTED_DATE.search(v):
                err(f"{path}.stakes: dotted date {m.group()!r}; write it as the site does, e.g. \"29 באוק׳ 2026\"")
            elif m := HEB_HYPHEN.search(v):
                err(f"{path}.stakes: hyphen in {m.group()!r}; use a maqaf (־) after a Hebrew letter")
        if "earnedAt" in it and not (is_date(it["earnedAt"]) and status == "earned"):
            err(f"{path}.earnedAt: expected YYYY-MM-DD on an \"earned\" item, got {it['earnedAt']!r}")
        if "cutoff" in it:
            errors.extend(check_cutoff(it["cutoff"], f"{path}.cutoff"))
        if "teamRank" in it:
            t = it["teamRank"]
            if not (isinstance(t, dict) and set(t) == TEAM_RANK_KEYS and type(t["num"]) is int and t["num"] >= 1
                    and is_date(t["asOf"]) and isinstance(t["source"], str) and t["source"].startswith("https://")):
                err(f"{path}.teamRank: expected {{num: int >= 1, asOf: YYYY-MM-DD, source: https URL}}, got {t!r}")
            elif "cutoff" not in it:
                err(f"{path}.teamRank: only with a cutoff (it's a rank on the cutoff's list)")
        src = it.get("source")
        if not (isinstance(src, str) and src.startswith("https://") and len(src) > 8):
            err(f"{path}.source: expected an https:// URL, got {src!r}")
        nxt = it.get("nextQuotaEvent")
        if nxt is not None:
            if not (isinstance(nxt, dict) and set(nxt) in ({"name", "start"}, {"name", "start", "end"})):
                err(f"{path}.nextQuotaEvent: expected null or {{name, start, end?}}")
            else:
                if not (isinstance(nxt["name"], str) and nxt["name"].strip()):
                    err(f"{path}.nextQuotaEvent.name: must not be empty")
                if not is_date(nxt["start"]):
                    err(f"{path}.nextQuotaEvent.start: expected YYYY-MM-DD, got {nxt['start']!r}")
                elif "end" in nxt and not (is_date(nxt["end"]) and nxt["end"] >= nxt["start"]):
                    err(f"{path}.nextQuotaEvent.end: expected YYYY-MM-DD on or after start, got {nxt['end']!r}")
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
        if isinstance(docs[0], dict):
            for w in warnings(docs[0]):
                print(f"WARN: {w}")
    for e in errors:
        print(f"INVALID: {e}")
    if not errors:
        print(f"OK: {args[0]}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
