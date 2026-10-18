"""Sessions gap check (roadmap priority 1, data supply): who competes in the next 14 days with no session for #day.

Usage: python3 session_gaps.py <db_dump_dir> [--today YYYY-MM-DD] [--days N]
<db_dump_dir>: the step-1 ArtifactData dump (athletes/, competitions/, sessions/). Read-only. It prints one warning
line per gap, for run.json "warnings" (and so for #admin):
  חסר סשן: <athlete> · <competition> · <date>
Same rule as #admin-nosession (site/admin.js, #294), so the job's warnings and that list agree: an active
(non-archived) athlete whose nextDate is in [today, today+N] has a gap unless a fact-checked session (review ok/fixed,
the export's gate) on that Israel day lists them, in any competition. The day is the Israel date of the session's start
when it has a time, else its date, as on the page. A session for teammates doesn't cover them. When only an unchecked
session exists, the line ends with "(ממתין לבדיקה)". The competition named is the athlete's on nextDate (same sport,
containing the day, at most 31 days); with none in the DB their own `next` text names it, marked "(לא במאגר)".
"""
import json, os, sys
from datetime import date as Date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_data import SIGNED_OFF, date, load, start_utc
from quota_due import SERIES_DAYS, israel_today


def competition_of(athlete, comps):
    """The athlete's competition on nextDate: same sport, contains the day, not a season-long series; shortest wins."""
    day = athlete["nextDate"]
    hits = []
    for cid, c in comps.items():
        start, end = date(c.get("start")), date(c.get("end")) or date(c.get("start"))
        if c.get("sportId") == athlete.get("sportId") and start and start <= day <= end:
            span = (Date.fromisoformat(end) - Date.fromisoformat(start)).days + 1
            if span <= SERIES_DAYS:
                hits.append((span, cid))
    return min(hits)[1] if hits else None


def israel_day(s):
    """The session's day as the page keys it: the Israel date of its start when timed, else its date."""
    when = start_utc(s.get("date"), s.get("timeLocal"), s.get("tz")) if s.get("timeLocal") else None
    if not when:
        return date(s.get("date"))
    from zoneinfo import ZoneInfo
    from datetime import datetime, timezone
    t = datetime.strptime(when, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    return t.astimezone(ZoneInfo("Asia/Jerusalem")).strftime("%Y-%m-%d")


def gaps(athletes, comps, sessions, today, days=14):
    last = (Date.fromisoformat(today) + timedelta(days=days)).isoformat()
    lines = []
    for aid, a in athletes.items():
        day = date(a.get("nextDate"))
        if a.get("archived") or not day or not today <= day <= last:
            continue
        a = {**a, "nextDate": day}
        cid = competition_of(a, comps)
        mine = [s for s in sessions.values() if aid in (s.get("athleteIds") or []) and israel_day(s) == day]
        if any((s.get("review") or {}).get("status") in SIGNED_OFF for s in mine if isinstance(s.get("review"), dict)):
            continue
        name = (a.get("name") or aid).strip()
        comp = comps[cid].get("name", cid) if cid else f"{(a.get('next') or 'תחרות').strip()} (לא במאגר)"
        line = f"חסר סשן: {name} · {comp} · {day}" + (" (ממתין לבדיקה)" if mine else "")
        lines.append((day, name, line))
    return [line for _, _, line in sorted(lines)]


def main(argv):
    args, opts = [], {"--today": None, "--days": "14"}
    it = iter(argv[1:])
    for a in it:
        if a in opts:
            opts[a] = next(it, None)
        else:
            args.append(a)
    today = date(opts["--today"]) if opts["--today"] else israel_today().isoformat()
    if len(args) != 1 or not os.path.isdir(args[0]) or not today or not str(opts["--days"]).isdigit():
        print("usage: python3 session_gaps.py <db_dump_dir> [--today YYYY-MM-DD] [--days N]", file=sys.stderr)
        return 1
    athletes, comps, sessions = (load(args[0], c, []) for c in ("athletes", "competitions", "sessions"))
    for line in gaps(athletes, comps, sessions, today, int(opts["--days"])):
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
