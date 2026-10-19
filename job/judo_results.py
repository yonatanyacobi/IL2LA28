"""Judo results-assist: the result-night wording, and the daily job's plan from the official IJF results page.

Usage: python3 judo_results.py plan <db_dump_dir> [--today YYYY-MM-DD] [--days N]
       python3 judo_results.py text <place 1|2|3|5|7, or "out"> <competition name> <category, e.g. -66> <YYYY-MM-DD>
                                    <m|f> [<round, for "out">] [bye]
       ("bye": the IJF draw shows no bout for them in column 1; only with "בסיבוב השני")
plan: judo competitions in the DB that ended in the last N days (default 4) and whose `source` is the IJF competition
page (ijf.org/competition/<id>). It reads that competition's results page, the one official page that lists places
1-7 per category, and matches the rows to athletes by the IJF judoka id in their `source`. Each place becomes a history
result with result_text(), on the day of the athlete's session in that competition. Prints the same JSON plan as
tri_results.py ({"warnings", "updates", "proposals"}; no proposals: notes and quotas stay with people).
An entrant (a session in the competition, or nextDate inside it) without a place was eliminated or didn't fight. That
page doesn't say which, or in which round, so it's a warning: the result night enters it by hand with `text … out`.
Never a stage or quota change. Wording: docs/runbooks/result-night-abu-dhabi.md ("Values").
"""
import html, json, os, re, sys
from datetime import timedelta

MEDAL = {1: "זהב", 2: "כסף", 3: "ארד"}
PLACES = {1, 2, 3, 5, 7}   # an IJF results page lists 1, 2, 3, 3, 5, 5, 7, 7
OUT = {"m": "הודח", "f": "הודחה"}
# Rounds before the quarter-final, as abu-dhabi-outcomes.md names them. A quarter-final loser goes to the repechage
# and ends on a place (5 or 7), so there is no "ברבע הגמר" (Itai on #381).
ROUNDS = {"בסיבוב הראשון", "בסיבוב השני", "בסיבוב השלישי", "בסיבוב הרביעי"}
# After a bye (no bout in column 1 of the IJF draw) the first bout is in round two: "הודח בקרב הפתיחה בסיבוב השני"
# (Shira on #381). Only that round can follow a bye.
BYE_ROUND = "בסיבוב השני"
IJF_COMP = re.compile(r"^https://(?:www\.)?ijf\.org/competition/(\d+)")
JUDOKA = re.compile(r"ijf\.org/judoka/(\d+)")


def weight(category):
    """"-66" / "-66 kg" / "+78 kg" -> "66- ק״ג" / "78+ ק״ג" (the site's style)."""
    m = re.fullmatch(r"\s*([-+])(\d+)(?:\s*kg)?\s*", str(category))
    if not m:
        raise ValueError(f"category must look like -66 or +78 kg, got {category!r}")
    return f"{m.group(2)}{m.group(1)} ק״ג"


def outcome(place, gender, round_=None, bye=False):
    """The outcome words, shared by the history text and the session `result`: זהב, מקום 5, הודח בסיבוב השני,
    הודחה בקרב הפתיחה בסיבוב השני (bye=True: the draw shows no bout for them in column 1)."""
    if gender not in OUT:
        raise ValueError(f"gender must be m or f, got {gender!r}")
    if place == "out":
        if round_ not in ROUNDS:
            raise ValueError(f"round must be one of {sorted(ROUNDS)}, got {round_!r}")
        if bye and round_ != BYE_ROUND:
            raise ValueError(f"after a bye the first bout is {BYE_ROUND}, got {round_!r}")
        return f"{OUT[gender]} {'בקרב הפתיחה ' if bye else ''}{round_}"
    if round_ is not None or bye or place not in PLACES:
        raise ValueError(f"place must be one of {sorted(PLACES)} (or \"out\" with a round), got {place!r}")
    return MEDAL.get(place, f"מקום {place}")


def result_text(place, comp, category, day, gender, round_=None, bye=False):
    """The history text (result-night-abu-dhabi.md): "<outcome> ב<comp>, <weight> (<D> ב<month׳> <YYYY>)"."""
    from tri_results import he_date
    return f"{outcome(place, gender, round_, bye)} ב{comp}, {weight(category)} ({he_date(day)})"


def join_session(pairs):
    """A session's `result` when it holds several judoka (66- Kokolayev and Simkhaev): "<name>: <outcome> · <name>: …"."""
    return " · ".join(f"{name}: {words}" for name, words in pairs)


def parse_results(page):
    """[{gender, category, place, judoka}] from an IJF results page. The page repeats every panel: kept once."""
    s = page if isinstance(page, str) else page.decode("utf-8", "replace")
    rows, seen = [], set()
    for panel in re.findall(r'<div class="category-container">.*?</table>', s, re.S):
        head = re.search(r'panel-header">(.*?)</div>', panel, re.S)
        m = re.fullmatch(r"(Men|Women) ([-+]\d+) kg", " ".join(html.unescape(head.group(1) if head else "").split()))
        if not m:
            continue
        for tr in re.findall(r'<tr class="athlete".*?</tr>', panel, re.S):
            place, judoka = re.search(r'place-(\d)', tr), re.search(r'/judoka/(\d+)', tr)
            if place and judoka and (m.group(2), judoka.group(1)) not in seen:
                seen.add((m.group(2), judoka.group(1)))
                rows.append({"gender": "m" if m.group(1) == "Men" else "f", "category": m.group(2),
                             "place": int(place.group(1)), "judoka": judoka.group(1)})
    return rows


def plan(data, get, today, days=4):
    """data: {"athletes", "competitions", "sessions"} as the DB has them; get(url) -> bytes."""
    from tri_results import as_date
    out = {"warnings": [], "updates": [], "proposals": []}
    warn = lambda s: out["warnings"].append(f"תוצאות ג׳ודו: {s}")
    first = today - timedelta(days=days)
    judoka = {}
    for a in data.get("athletes") or []:
        m = JUDOKA.search(str(a.get("source") or ""))
        if a.get("sportId") == "judo" and not a.get("archived") and m:
            judoka[m.group(1)] = a
    for comp in data.get("competitions") or []:
        end = as_date(comp.get("end")) or as_date(comp.get("start"))
        if comp.get("sportId") != "judo" or not end or not first <= end < today:
            continue
        tag = f"{comp.get('name')} ({end})"
        m = IJF_COMP.match(str(comp.get("source") or ""))
        if not m:
            warn(f"{tag}: מקור התחרות אינו דף התחרות ב־IJF (ijf.org/competition/…); לעדכן את source או להזין ידנית")
            continue
        page = f"https://www.ijf.org/competition/{m.group(1)}/results"
        try:
            rows = parse_results(get(page))
        except (OSError, ValueError) as e:   # urllib errors are OSErrors
            warn(f"{tag}: IJF לא זמין ({type(e).__name__}); לבדוק ידנית")
            continue
        if not rows:
            warn(f"{tag}: אין עדיין תוצאות בדף {page}; לא נכתב דבר")
            continue
        days_of = {}
        for s in data.get("sessions") or []:
            if s.get("competitionId") == comp.get("id"):
                for aid in s.get("athleteIds") or []:
                    days_of.setdefault(aid, s.get("date"))
        entrants = set(days_of) | {a["id"] for a in judoka.values()
                                   if as_date(a.get("nextDate")) and comp["start"] <= a["nextDate"] <= str(end)}
        placed = set()
        for r in rows:
            a = judoka.get(r["judoka"])
            if not a:
                continue
            placed.add(a["id"])
            day = days_of.get(a["id"]) or (a.get("nextDate") if a["id"] in entrants else None)
            if not as_date(day) or not comp["start"] <= day <= str(end):
                warn(f"{tag}: {a['id']} במקום {r['place']}, אבל אין סשן שלו/ה בתחרות ליום; לא נכתב דבר")
                continue
            text = result_text(r["place"], comp["name"], r["category"], day, r["gender"])
            logged = [h for h in a.get("history") or [] if isinstance(h, dict) and h.get("kind", "result") == "result"
                      and h.get("at") == day and comp["name"] in str(h.get("text"))]
            if any(h.get("text") == text for h in logged):
                continue   # entered on the result night (same wording) or by an earlier run
            if logged:
                warn(f"{tag}: {a['id']}: רשום כבר \"{logged[0].get('text')}\", ובדף התוצאות עכשיו \"{text}\"; לבדוק, לא נכתב דבר")
                continue
            out["updates"].append({"athleteId": a["id"], "result": {"at": day, "text": text, "source": page}})
        by_id = {a["id"]: a for a in judoka.values()}
        for aid in sorted(entrants - placed):
            a = by_id.get(aid, {})
            day = days_of.get(aid) or a.get("nextDate")
            if any(isinstance(h, dict) and h.get("kind", "result") == "result" and h.get("at") == day
                   and comp["name"] in str(h.get("text")) for h in a.get("history") or []):
                continue   # the result night already entered it (Itai on #381)
            warn(f"{tag}: {aid} לא במקומות 1–7; אם הודח/ה, להזין לפי result-night-abu-dhabi.md (`judo_results.py text … out <round>`)")
    return out


def db_data(dump_dir):
    """Athletes, competitions and sessions from the step-1 DB dump (ArtifactData out_dir)."""
    from export_data import load
    return {coll: [{**v, "id": k} for k, v in sorted(load(dump_dir, coll, []).items())]
            for coll in ("athletes", "competitions", "sessions")}


def main(argv):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    args = argv[1:]
    bye = args[-1:] == ["bye"]
    if bye:
        args = args[:-1]
    if args[:1] == ["text"] and len(args) in (6, 7):
        place = "out" if args[1] == "out" else int(args[1]) if args[1].isdigit() else args[1]
        try:
            print(result_text(place, args[2], args[3], args[4], args[5], args[6] if len(args) == 7 else None, bye))
            return 0
        except ValueError as e:
            print(f"error: {e}", file=sys.stderr)
            return 1
    if args[:1] == ["plan"]:
        from gym_results import fetch
        from quota_due import israel_today
        from tri_results import as_date
        rest, opts = [], {"--today": None, "--days": "4"}
        it = iter(args[1:])
        for a in it:
            if a in opts:
                opts[a] = next(it, None)
            else:
                rest.append(a)
        today = as_date(opts["--today"]) if opts["--today"] else israel_today()
        if len(rest) == 1 and os.path.isdir(rest[0]) and today and str(opts["--days"]).isdigit():
            print(json.dumps(plan(db_data(rest[0]), fetch, today, int(opts["--days"])), ensure_ascii=False, indent=1))
            return 0
    print(__doc__.split("\nplan:")[0], file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
