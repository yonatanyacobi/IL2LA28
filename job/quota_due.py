"""List quota work that is due after a quota event ended: one Hebrew warning line per event.

Usage: python3 quota_due.py <data.json> <quotas.json> [--days N] [--today YYYY-MM-DD]
Flags qualifying competitions in data.json and quota items whose nextQuotaEvent ended in the last N days
(default 4), before today (Israel date). A quota event ends on its own end, else on the end of the same-sport
competition that contains its start (max 31 days), else on its start, like quotaEventEnd() in site/app.js.
A missing or unreadable quotas.json is reported on stderr and treated as empty. Read-only: never writes files.
"""
import json, sys
from datetime import date, datetime, timedelta, timezone


def israel_today():
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("Asia/Jerusalem")).date()
    except Exception:  # no tz database: UTC is at most a few hours off
        return datetime.now(timezone.utc).date()


def as_date(v):
    try:
        return date.fromisoformat(v) if isinstance(v, str) and len(v) == 10 else None
    except ValueError:
        return None


SERIES_DAYS = 31  # as site/app.js: a longer "competition" is a season-long series, not one event


def comp_end(c):
    return as_date(c.get("end")) or as_date(c["start"])


def due(data, quotas, today, days=4):
    first = today - timedelta(days=days)
    sport_he = {s.get("id"): s.get("he") or s.get("id") for s in data.get("sports") or [] if isinstance(s, dict)}
    comps = [c for c in data.get("competitions") or [] if isinstance(c, dict) and as_date(c.get("start"))]
    events = {}  # key -> {"sportId", "name", "end", "items": [event names]}
    comp_key = lambda c: ("comp", c.get("sportId"), c["start"], str(c.get("id")))

    for c in comps:
        if c.get("qualifying") is True and first <= comp_end(c) < today:
            events[comp_key(c)] = {"sportId": c.get("sportId"), "name": c.get("name") or c.get("id"),
                                   "end": comp_end(c), "items": []}

    for it in (quotas or {}).get("items") or []:
        nqe = it.get("nextQuotaEvent") if isinstance(it, dict) else None
        start = as_date(nqe.get("start")) if isinstance(nqe, dict) else None
        if not start:
            continue
        sid, name = it.get("sportId"), nqe.get("name")
        # Same order as quotaEventEnd() in site/app.js: own end, else the containing competition, else start.
        end, key = as_date(nqe.get("end")), None
        if not end:
            comp = next((c for c in comps if c.get("sportId") == sid and as_date(c["start"]) <= start <= comp_end(c)
                         and (comp_end(c) - as_date(c["start"])).days + 1 <= SERIES_DAYS), None)
            if comp:
                end, key, name = comp_end(comp), comp_key(comp), comp.get("name") or name
        end = end or start
        key = key or ("item", sid, nqe["start"], end.isoformat(), str(name))
        if first <= end < today:
            ev = events.setdefault(key, {"sportId": sid, "name": name, "end": end, "items": []})
            ev["items"].append(str(it.get("event") or "?"))

    lines = []
    for _, ev in sorted(events.items(), key=lambda kv: (kv[1]["end"], kv[0])):
        sid = ev["sportId"]
        line = f"לעדכן quotas.json: {ev['name']} ({sport_he.get(sid, sid)}, הסתיים {ev['end'].isoformat()})"
        if ev["items"]:
            n = len(ev["items"])
            line += f" – {f'{n} פריטים' if n > 1 else 'פריט אחד'}: {', '.join(ev['items'])}"
        lines.append(line)
    return lines


def main(argv):
    args, opts = [], {"--days": "4", "--today": None}
    it = iter(argv[1:])
    for a in it:
        if a in opts:
            opts[a] = next(it, None)
        else:
            args.append(a)
    today = as_date(opts["--today"]) if opts["--today"] else israel_today()
    if len(args) != 2 or today is None or not str(opts["--days"]).isdigit():
        print("usage: python3 quota_due.py <data.json> <quotas.json> [--days N] [--today YYYY-MM-DD]", file=sys.stderr)
        return 1
    with open(args[0], encoding="utf-8") as f:
        data = json.load(f)
    try:
        with open(args[1], encoding="utf-8") as f:
            quotas = json.load(f)
    except (OSError, ValueError) as e:
        print(f"note: quotas.json not read ({e}); checking competitions only", file=sys.stderr)
        quotas = {}
    for line in due(data, quotas if isinstance(quotas, dict) else {}, today, int(opts["--days"])):
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
