"""List quota work that is due after a quota event ended: one Hebrew warning line per event.

Usage: python3 quota_due.py <data.json> <quotas.json> [--days N] [--today YYYY-MM-DD]
Flags qualifying competitions in data.json and quota items whose nextQuotaEvent ended in the last N days
(default 4), before today (Israel date). nextQuotaEvent has only a start, so its end is taken from the
data.json competition with the same sportId and start, falling back to the start itself.
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


def due(data, quotas, today, days=4):
    first = today - timedelta(days=days)
    sport_he = {s.get("id"): s.get("he") or s.get("id") for s in data.get("sports") or [] if isinstance(s, dict)}
    comps = [c for c in data.get("competitions") or [] if isinstance(c, dict) and as_date(c.get("start"))]
    by_start = {(c.get("sportId"), c["start"]): c for c in comps}
    events = {}  # (sportId, start) -> {"name", "end", "items": [event names]}

    for c in comps:
        end = as_date(c.get("end")) or as_date(c["start"])
        if c.get("qualifying") is True and first <= end < today:
            events[(c.get("sportId"), c["start"])] = {"name": c.get("name") or c.get("id"), "end": end, "items": []}

    for it in (quotas or {}).get("items") or []:
        nqe = it.get("nextQuotaEvent") if isinstance(it, dict) else None
        start = as_date(nqe.get("start")) if isinstance(nqe, dict) else None
        if not start:
            continue
        key = (it.get("sportId"), nqe["start"])
        comp = by_start.get(key)
        end = (as_date(comp.get("end")) if comp else None) or start
        if first <= end < today:
            ev = events.setdefault(key, {"name": nqe.get("name") or (comp or {}).get("name"), "end": end, "items": []})
            ev["items"].append(str(it.get("event") or "?"))

    lines = []
    for (sid, _), ev in sorted(events.items(), key=lambda kv: (kv[1]["end"], kv[0])):
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
