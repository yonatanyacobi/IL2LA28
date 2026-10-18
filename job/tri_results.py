"""Triathlon results-assist (G-5): plan the daily job's writes after a triathlon competition with Israeli entrants.

Usage: python3 tri_results.py <data.json> [--db <dump_dir>] [--today YYYY-MM-DD] [--days N]
<data.json> supplies competitions. --db is an ArtifactData athletes dump (out_dir); the athletes come from there,
so dedupe and notes use the live records. Without --db no notes proposal is made.
Reads the World Triathlon API through triathlon_api.py (key file only; see that module) and prints a JSON plan:
  {"warnings": [...], "updates": [{"athleteId", "result": {at, text, source}}], "proposals": [{"id", "doc"}]}
The job sends each update's {"result": …} through athlete_patch.py, and creates each proposal only if it doesn't
exist yet.
Never a stage or quota change: a result goes into history directly, and anything it implies for the record is a
proposal for a person. A World Cup awards no quota (docs/research/2026-10-18-ofir-triathlon.md, #95).
Only a final list counts, meaning every row has validated=true. Otherwise there's a warning and nothing to write.
"""
import json, re, sys
from datetime import date, timedelta

DISTANCE = {"sprint": "ספרינט", "standard": "מרחק אולימפי", "super-sprint": "ספרינט קצר"}
# The site's date style: fmt() in app.js, he-IL {day: numeric, month: short, year: numeric} → "24 באוק׳ 2026".
HE_MONTHS = ["בינו׳", "בפבר׳", "במרץ", "באפר׳", "במאי", "ביוני", "ביולי", "באוג׳", "בספט׳", "באוק׳", "בנוב׳", "בדצמ׳"]


def he_date(iso_day):
    d = date.fromisoformat(iso_day)
    return f"{d.day} {HE_MONTHS[d.month - 1]} {d.year}"
PROFILE = re.compile(r"triathlon\.org/athletes/profile/(\d+)")
SLUG = re.compile(r"triathlon\.org/events/([a-z0-9-]+)")


def as_date(v):
    try:
        return date.fromisoformat(v) if isinstance(v, str) and len(v) == 10 else None
    except ValueError:
        return None


def entrants(data, comp):
    """Israeli athletes in the competition's sport whose nextDate falls inside it (how the job tracks entries)."""
    start, end = as_date(comp["start"]), as_date(comp.get("end")) or as_date(comp["start"])
    return [a for a in data.get("athletes") or [] if a.get("sportId") == comp["sportId"]
            and as_date(a.get("nextDate")) and start <= as_date(a["nextDate"]) <= end]


def due_competitions(data, today, days):
    first = today - timedelta(days=days)
    for c in data.get("competitions") or []:
        end = as_date(c.get("end")) or as_date(c.get("start"))
        if c.get("sportId") == "triathlon" and end and first <= end < today and entrants(data, c):
            yield c


def find_event(fetch, comp):
    m = SLUG.search(str(comp.get("source") or ""))
    if not m:
        return None
    listing = fetch("/events", {"start_date": comp["start"], "end_date": comp.get("end") or comp["start"], "per_page": 100})
    return next((e for e in listing.get("data") or [] if e.get("event_slug") == m.group(1)), None)


def matches(athlete, row):
    m = PROFILE.search(str(athlete.get("source") or ""))
    if m and str(row.get("athlete_id")) == m.group(1):
        return True
    name = str(athlete.get("name_en") or "").strip().lower()
    return bool(name) and name == str(row.get("athlete_title") or "").strip().lower()


def result_text(row, comp_name, distance, day):
    pos = row.get("position")
    if isinstance(pos, int) or str(pos).isdigit():
        dist = f"{DISTANCE[distance]}, " if distance in DISTANCE else ""
        return int(pos), f"מקום {int(pos)} ב{comp_name} ({dist}{he_date(day)})"
    if str(pos).upper() == "DNF":
        return "DNF", f"לא סיים/ה את {comp_name} ({he_date(day)})"
    if str(pos).upper() == "DSQ":
        return "DSQ", f"נפסל/ה ב{comp_name} ({he_date(day)})"
    return None, None  # DNS or unknown: Ofir's outcome D, no entry


def plan(data, fetch, today, days=4, propose=True):
    """propose: data["athletes"] are the DB records (main(): --db), so a notes patch can be built from them."""
    out = {"warnings": [], "updates": [], "proposals": []}
    for comp in due_competitions(data, today, days):
        tag = f"{comp['name']} ({comp.get('end') or comp['start']})"
        event = find_event(fetch, comp)
        if not event:
            out["warnings"].append(f"תוצאות טריאתלון: לא נמצא אירוע ב־API עבור {tag}; לבדוק ידנית בדף התחרות")
            continue
        page = event.get("event_listing") or f"https://triathlon.org/events/{event['event_slug']}"
        progs = [p for p in fetch(f"/events/{event['event_id']}/programs").get("data") or []
                 if p.get("is_race") and str(p.get("prog_name", "")).startswith("Elite")]
        rows, final, pending = [], 0, 0
        for p in progs:
            res = fetch(f"/events/{event['event_id']}/programs/{p['prog_id']}/results").get("data") or {}
            prog_rows = res.get("results") if isinstance(res.get("results"), list) else []
            if not prog_rows or not all(r.get("validated") is True for r in prog_rows):
                pending += 1
                out["warnings"].append(f"תוצאות טריאתלון: {tag} · {p.get('prog_name')}: הרשימה עוד לא סופית; לא נכתב דבר")
                continue
            final += 1
            rows += [(r, res.get("prog_distance_category"), res.get("prog_date") or comp["start"])
                     for r in prog_rows if r.get("athlete_noc") == "ISR"]
        if not progs:
            out["warnings"].append(f"תוצאות טריאתלון: אין מקצי עלית ב־API עבור {tag}")
        for a in entrants(data, comp):
            hit = next(((r, dist, day) for r, dist, day in rows if matches(a, r)), None)
            if not hit:
                if final and not pending:  # all lists final and no row: a DNS, or a name/id mismatch to check
                    out["warnings"].append(f"תוצאות טריאתלון: {a.get('name') or a['id']} לא נמצא/ה בתוצאות של {tag}")
                continue
            r, dist, day = hit
            pos, text = result_text(r, comp["name"], dist, day)
            if not text:
                continue
            if any(h.get("at") == day and h.get("text") == text for h in a.get("history") or [] if isinstance(h, dict)):
                continue  # already logged on an earlier run
            out["updates"].append({"athleteId": a["id"], "result": {"at": day, "text": text, "source": page}})
            note = f"מקום {pos} ב{comp['name']} {day[:4]}"
            notes = str(a.get("notes") or "").strip()
            # Podium only (Ofir's plan): the note is a judgment call, so a person approves it. The patch replaces the
            # whole notes field, so it is built only from the DB record (propose=True), never from the published copy.
            if propose and isinstance(pos, int) and pos <= 3 and note not in notes:
                pid = f"{a['id']}-{day.replace('-', '')}-result"
                out["proposals"].append({"id": pid, "doc": {
                    "kind": "update", "target": a["id"],
                    "patch": {"notes": f"{notes.rstrip('.')}. {note}" if notes else note},
                    "summary": f"{text}: להוסיף להערות. שלב ומכסה ללא שינוי",
                    "evidence": [{"url": page, "label": "World Triathlon results"}],
                    "status": "pending"}})
    return out


def db_athletes(dump_dir):
    """Athlete records from an ArtifactData list with out_dir (bare or {id, data} files); archived ones left out."""
    from export_data import load
    return [{**a, "id": aid} for aid, a in sorted(load(dump_dir, "athletes", []).items()) if not a.get("archived")]


def main(argv):
    args, opts = [], {"--today": None, "--days": "4", "--db": None}
    it = iter(argv[1:])
    for a in it:
        if a in opts:
            opts[a] = next(it, None)
        else:
            args.append(a)
    from quota_due import israel_today
    today = as_date(opts["--today"]) if opts["--today"] else israel_today()
    if len(args) != 1 or not today or not str(opts["--days"]).isdigit():
        print("usage: python3 tri_results.py <data.json> [--db <dump_dir>] [--today YYYY-MM-DD] [--days N]", file=sys.stderr)
        return 1
    import triathlon_api as api
    with open(args[0], encoding="utf-8") as f:
        data = json.load(f)
    if opts["--db"]:
        data["athletes"] = db_athletes(opts["--db"])
    try:
        result = plan(data, api.get, today, int(opts["--days"]), propose=bool(opts["--db"]))
        if not opts["--db"] and result["updates"]:
            result["warnings"].append("תוצאות טריאתלון: הורץ בלי --db, ולכן לא נבנו הצעות להערות")
    except (api.ApiKeyError, api.ApiError) as e:  # messages carry no key (triathlon_api)
        result = {"warnings": [f"תוצאות טריאתלון: ה־API לא זמין ({e}); לבדוק ידנית"], "updates": [], "proposals": []}
    print(json.dumps(result, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
