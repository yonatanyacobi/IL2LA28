"""Gymnastics results-assist (#168): plan the daily job's writes from FIG's official results book. Writes nothing.

Usage: python3 gym_results.py plan <db_dump_dir> [--today YYYY-MM-DD] [--days N]
  Artistic gymnastics competitions in the DB that ended in the last N days (default 4) and whose `source` is the FIG
  event page (gymnastics.sport/site/events/detail.php?id=<event>). Once that page lists the "Results Book" (FIG
  publishes one per event when it ends), every ISR row is matched to an athlete by name_en and becomes a history
  result with result_text(), sourced to the book. Prints the same JSON plan as tri_results.py:
  {"warnings": [...], "updates": [{"athleteId", "result": {at, text, source}}], "proposals": [{"id", "doc"}]}
  A podium in a final also proposes a notes line. Never a stage or quota change (the quota proposal kind waits for
  owner decision D-R2). Rhythmic and trampoline books aren't parsed yet: their competitions get a warning.

Feasibility (checked 2026-10-18, see #168):
- gym.longinestiming.com answers plain HTTP in 1-3 s, but only to non-browser user agents: a browser-like User-Agent
  is held until it times out (that was the curl timeout). So fetch() sends its own honest agent string, never a
  browser's.
- Longines "Phase/Ranking/<id>" pages are server-rendered result tables (rank, bib, name, NOC, total, Q), parsed
  here with the stdlib. They carry no Official/Unofficial mark, and the PDF menu is built by JavaScript over a live
  hub, with no document URL in the HTML.
- FIG's event page (gymnastics.sport/site/events/detail.php?id=<event>) lists the official documents as
  asset.php?id=fidb_… links. Those download as real PDFs, and their text is readable with stdlib zlib (pdf_text()).
- The results book (checked on Paris WCC 2026, fidb_23893) uses 2-byte fonts with ToUnicode maps; pdf_text() reads
  it, and parse_results_book() takes its "<Men's|Women's> <apparatus> <Qualification|Final>" / "Results" tables.
  So the job reads one official document per event (docs/design/results-automation.md), not the Longines pages.

Other modes (dry, print JSON): ranking <url-or-file> | fig-docs <url-or-file> | pdf-text <file>
"""
import html, json, re, sys, urllib.request, zlib
from html.parser import HTMLParser
from urllib.parse import urljoin

FIG_EVENT_PAGE = "https://www.gymnastics.sport/site/events/detail.php"   # base for its relative asset links

AGENT = "IL2LA28-results/1.0 (+https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT)"  # never a browser string, see above
APPARATUS = {"floor": "קרקע", "pommelhorse": "סוס סמוכות", "rings": "טבעות", "vault": "קפיצות", "parallelbars": "מקבילים",
             "horizontalbar": "מתח", "unevenbars": "מקבילים מדורגים", "balancebeam": "קורה", "allaround": "קרב־רב"}
MEDAL = {1: "זהב", 2: "כסף", 3: "ארד"}
# "לגמר <final>" in qualification texts, as the result-night runbook (#173) writes them.
FINAL_NAME = {"floor": "הקרקע", "pommelhorse": "סוס הסמוכות", "rings": "הטבעות", "vault": "הקפיצות",
              "parallelbars": "המקבילים", "horizontalbar": "המתח", "unevenbars": "המקבילים", "balancebeam": "הקורה",
              "allaround": "הקרב־רב"}
# The apparatus in the short session text (#173): "במקבילים", not "במקבילים מדורגים".
SHORT_NAME = {"unevenbars": "מקבילים"}
VERBS = {None: {"in": "עלה/תה", "out": "לא עלה/תה", "reserve": "מחליף/ה"},
         "f": {"in": "עלתה", "out": "לא עלתה", "reserve": "מחליפה"},
         "m": {"in": "עלה", "out": "לא עלה", "reserve": "מחליף"}}


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


class _Ranking(HTMLParser):
    """Rows of a Longines Phase/Ranking table: <tr data-rank> with td.rank/.bib/.name (fulldescription)/.noc/.total/.QualifiedMarker."""

    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell, self.title, self.apparatus, self._in = [], None, None, "", "", None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = (a.get("class") or "").split()
        if tag == "h4" and "type" in cls:
            self._in, self.apparatus = "title", next((c for c in cls if c != "type"), "")
        elif tag == "tr" and "data-rank" in a:
            self.row = {"rank": a["data-rank"]}
        elif self.row is not None and tag == "td":
            self.cell = next((c for c in ("bib", "name", "noc", "total", "QualifiedMarker") if c in cls), None)
        elif self.row is not None and tag == "div" and "fulldescription" in cls:
            self._in = "fullname"

    def handle_endtag(self, tag):
        if tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None
        elif tag in ("td", "div", "h4"):
            if tag == "td":
                self.cell = None
            self._in = None if self._in != "title" or tag == "h4" else self._in

    def handle_data(self, data):
        d = data.strip()
        if not d:
            return
        if self._in == "title":
            self.title += d
        elif self.row is not None and self._in == "fullname":
            self.row["name"] = d
        elif self.row is not None and self.cell and self.cell != "name":
            self.row[self.cell] = (self.row.get(self.cell, "") + d).strip()


def parse_ranking(page):
    """{"title", "apparatus", "rows": [{rank:int|None, bib, name, noc, total:str, qualified:bool}]} from a ranking page."""
    p = _Ranking()
    p.feed(page if isinstance(page, str) else page.decode("utf-8", "replace"))
    mark = lambda r: r.get("QualifiedMarker", "").strip().upper()
    rows = [{"rank": int(r["rank"]) if str(r.get("rank", "")).isdigit() else None, "bib": r.get("bib", ""),
             "name": r.get("name", ""), "noc": r.get("noc", ""), "total": r.get("total", ""),
             "qualified": mark(r).startswith("Q"),
             # Longines marks the final's reserves R1, R2, R3: not qualified, but not out either.
             "reserve": int(mark(r)[1:]) if re.fullmatch(r"R\d", mark(r)) else None} for r in p.rows]
    return {"title": html.unescape(p.title).strip(), "apparatus": p.apparatus, "rows": rows}


def official_documents(page):
    """[(absolute asset url, title)] for the documents FIG lists on an event page."""
    s = page if isinstance(page, str) else page.decode("utf-8", "replace")
    out = []
    for m in re.finditer(r'(?is)<a[^>]+href="([^"]*asset\.php\?id=fidb_\d+)"[^>]*>(.*?)</a>', s):
        out.append((urljoin(FIG_EVENT_PAGE, html.unescape(m.group(1))),
                    html.unescape(re.sub(r"<[^>]+>", "", m.group(2))).strip()))
    return out


def is_results_document(title):
    """FIG names its official result books "...Results..."; draws of lots ("Drawing of Lots - Results") are not results."""
    t = title.lower()
    return "result" in t and "drawing of lots" not in t and "qualifier" not in t


_ESC = {b"n": b"\n", b"r": b"\r", b"t": b"\t", b"b": b"\b", b"f": b"\f"}


def _unescape(s):
    """A PDF literal string's bytes: \\n, \\ddd (octal) and \\( \\) \\\\ escapes."""
    return re.sub(rb"\\([0-7]{1,3}|.)", lambda m: bytes([int(m.group(1), 8) & 255]) if m.group(1)[:1].isdigit()
                  else _ESC.get(m.group(1), m.group(1)), s, flags=re.S)


def _cmaps(streams):
    """One code -> text map from every ToUnicode CMap in the file, or None when two fonts map a code differently
    (then the font of each string would matter, and we don't resolve fonts)."""
    out = {}
    for c in streams:
        if b"begincmap" not in c:
            continue
        pairs = [(int(a, 16), bytes.fromhex(u.decode()).decode("utf-16-be", "replace"))
                 for blk in re.findall(rb"beginbfchar(.*?)endbfchar", c, re.S)
                 for a, u in re.findall(rb"<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>", blk)]
        for blk in re.findall(rb"beginbfrange(.*?)endbfrange", c, re.S):
            for a, b, u in re.findall(rb"<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>", blk):
                pairs += [(k, chr(int(u, 16) + k - int(a, 16))) for k in range(int(a, 16), int(b, 16) + 1)]
        for k, v in pairs:
            if out.setdefault(k, v) != v:
                return None
    return out


def pdf_text(data):
    """Text of a PDF, stdlib only: inflate the streams, join the Tj/TJ string pieces per line. Simple (WinAnsi) fonts
    are read as cp1252; 2-byte (CID) strings through the file's ToUnicode CMaps (FIG results books, checked on
    fidb_23893). Returns "" when it can't read the text (CMaps that disagree), and the caller then warns rather than guesses."""
    streams = []
    for s in re.findall(rb"stream\r?\n(.*?)endstream", data, re.S):
        try:   # a decompressobj ignores the EOL before "endstream", which some writers omit
            streams.append(zlib.decompressobj().decompress(s))
        except zlib.error:
            continue
    cmap = _cmaps(streams)
    if cmap is None:
        return ""

    def decode(raw):
        codes = [raw[i] << 8 | raw[i + 1] for i in range(0, len(raw) - 1, 2)]
        if cmap and len(raw) % 2 == 0 and codes and all(c in cmap for c in codes):
            return "".join(cmap[c] for c in codes)
        return raw.decode("cp1252", "replace")

    lines = []
    for content in streams:
        for block in re.findall(rb"BT(.*?)ET", content, re.S):
            pieces = []
            # A "]" inside a string is data (0x5D is "z" in FIG's 2-byte fonts), so the TJ array skips over strings.
            for op in re.finditer(rb"\[((?:\((?:\\.|[^\\)])*\)|[^\]()])*)\]\s*TJ|\(((?:\\.|[^\\)])*)\)\s*Tj|(T\*|Td|TD|')",
                                  block, re.S):
                if op.group(3):
                    pieces.append("\n")
                    continue
                arr = op.group(1) if op.group(1) is not None else b"(" + op.group(2) + b")"
                for strpart, kern in re.findall(rb"\(((?:\\.|[^\\)])*)\)|(-?\d+(?:\.\d+)?)", arr, re.S):
                    if strpart:
                        pieces.append(decode(_unescape(strpart)))
                    elif kern and float(kern) < -200:   # a wide negative kern is a word gap
                        pieces.append(" ")
            lines += [re.sub(r"\s+", " ", l).strip() for l in "".join(pieces).split("\n") if l.strip()]
    return "\n".join(lines)


def _qual_outcome(qualified, reserve, gender):
    """(verb, reserve) for a qualification outcome; verb is None when qualified is None (outcome not stated)."""
    if gender not in VERBS:
        raise ValueError(f"gender must be one of {sorted(g for g in VERBS if g)} or None, got {gender!r}")
    if reserve is not None:
        if qualified or type(reserve) is not int or reserve < 1:
            raise ValueError(f"reserve must be an int >= 1 on a non-qualified result, got {reserve!r}")
        return f"{VERBS[gender]['reserve']} {reserve}", reserve
    if qualified is None:
        return None, None
    return VERBS[gender]["in" if qualified else "out"], None


def result_text(phase, place, apparatus, comp, day_he, qualified=None, reserve=None, gender=None):
    """The one Hebrew wording for a gymnastics result (#168): the history text the job and manual entries share.
    phase: "qual" or "final"; apparatus: a Longines key (APPARATUS) or Hebrew; day_he: site date style.
    reserve: n for a qualification reserve (Longines R<n>), never written as "not qualified".
    gender: "f" / "m", or None for the neutral form (עלה/תה). Matches the result-night runbook #173 exactly."""
    app = APPARATUS.get(apparatus, apparatus)
    if phase == "final":
        if reserve is not None:
            raise ValueError("reserve applies to a qualification result")
        _qual_outcome(None, None, gender)   # validates gender
        return f"{MEDAL.get(place, f'מקום {place}')} בגמר {app} ב{comp} ({day_he})"
    if phase == "qual":
        verb, _ = _qual_outcome(qualified, reserve, gender)
        final = FINAL_NAME.get(apparatus, "")
        tail = f", {verb} לגמר" + (f" {final}" if final else "") if verb else ""
        return f"מקום {place} ב{app} במוקדמות {comp} ({day_he}){tail}"
    raise ValueError(f"phase must be qual or final, got {phase!r}")


def session_text(place, apparatus, qualified=None, reserve=None, gender=None):
    """The short form for a session's `result` on #day (#173): "מקום 12 במקבילים, עלתה לגמר" / ", מחליפה 2"."""
    verb, res = _qual_outcome(qualified, reserve, gender)
    short = f"מקום {place} ב{SHORT_NAME.get(apparatus, APPARATUS.get(apparatus, apparatus))}"
    if verb is None:
        return short
    return f"{short}, {verb}" if res is not None else f"{short}, {verb} לגמר"


# ---- the official results book (FIG "Results Book" PDF) ----
BOOK_APPARATUS = {"floor exercise": "floor", "pommel horse": "pommelhorse", "rings": "rings", "vault": "vault",
                  "parallel bars": "parallelbars", "horizontal bar": "horizontalbar", "uneven bars": "unevenbars",
                  "balance beam": "balancebeam", "all-around": "allaround", "individual all-around": "allaround"}
_DAY = re.compile(r"(?:MON|TUE|WED|THU|FRI|SAT|SUN) (\d{1,2}) (JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC) (\d{4})")
_MONTHS = "JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split()
_HEAD = re.compile(r"(Men's|Women's) (.+) (Qualification|Final)")
# "<rank> <bib> <SURNAME Given> <NOC> <total>" then the rest; Q / R1-R3 sit in the rest, glued to the next score
# ("12.150 Q4.900"), or after the first vault on the vault table.
_ROW = re.compile(r"(\d+) (\d+) (.+?) ([A-Z][A-Z0-9]{2}) (\d{1,2}\.\d{3})(.*)")
_MARK = re.compile(r"(?:^| )(Q|R[1-3])(?=[\d\s.-]|$)")


def parse_results_book(text):
    """[{day, gender, apparatus, phase, rank, bib, name, noc, qualified, reserve}] from pdf_text() of a results book.
    Only "<Men's|Women's> <apparatus> <Qualification|Final>" headers followed by "Results" open a table (start lists
    and qualifier lists don't). qualified is None in a qualification table that marks nobody Q (outcome not stated)."""
    rows, day, table, pending, seen = [], None, None, None, set()
    for line in text.split("\n"):
        if (m := _DAY.fullmatch(line)):
            day = f"{m.group(3)}-{_MONTHS.index(m.group(2)) + 1:02d}-{int(m.group(1)):02d}"
        elif (m := _HEAD.fullmatch(line)):
            pending, table = (m.group(1), BOOK_APPARATUS.get(m.group(2).lower()), m.group(3)), None
        elif pending and line == "Results":
            table, pending = pending if pending[1] else None, None   # a team table (unknown apparatus) stays closed
        else:
            pending = None
            if table and day and (m := _ROW.fullmatch(line)):
                key = table + (m.group(2),)
                if key in seen:
                    continue
                seen.add(key)
                mark = (_MARK.search(m.group(6)) or [None, ""])[1]
                rows.append({"day": day, "gender": "m" if table[0] == "Men's" else "f", "apparatus": table[1],
                             "phase": "qual" if table[2] == "Qualification" else "final", "rank": int(m.group(1)),
                             "bib": m.group(2), "name": m.group(3), "noc": m.group(4), "mark": mark})
    marked = {(r["gender"], r["apparatus"]) for r in rows if r["phase"] == "qual" and r["mark"] == "Q"}
    for r in rows:
        mark = r.pop("mark")
        stated = r["phase"] == "qual" and (r["gender"], r["apparatus"]) in marked
        r["reserve"] = int(mark[1]) if stated and mark.startswith("R") else None
        r["qualified"] = (mark == "Q") if stated else None
    return rows


GYM_SPORTS = {"artistic-gymnastics", "rhythmic-gymnastics", "trampoline"}
FIG_EVENT = re.compile(r"^https://(?:www\.)?gymnastics\.sport/site/events/detail\.php\?id=(\d+)$")


def name_key(name):
    """Token set of a name, case- and accent-free: Longines/FIG "SHAMAY Roni" == name_en "Roni Shamay"."""
    import unicodedata
    return tuple(sorted(re.findall(r"[a-z]+", unicodedata.normalize("NFKD", str(name)).encode("ascii", "ignore").decode().lower())))


def plan(data, get, today, days=4):
    """data: {"athletes", "competitions", "sessions"} as the DB has them; get(url) -> bytes."""
    from datetime import timedelta
    from tri_results import as_date, he_date
    out = {"warnings": [], "updates": [], "proposals": []}
    warn = lambda s: out["warnings"].append(f"תוצאות התעמלות: {s}")
    first = today - timedelta(days=days)
    for comp in data.get("competitions") or []:
        end = as_date(comp.get("end")) or as_date(comp.get("start"))
        if comp.get("sportId") not in GYM_SPORTS or not end or not first <= end < today:
            continue
        tag = f"{comp.get('name')} ({end})"
        if comp["sportId"] != "artistic-gymnastics":
            warn(f"{tag}: ספר תוצאות של {comp['sportId']} עוד לא נקרא אוטומטית; להזין ידנית")
            continue
        m = FIG_EVENT.match(str(comp.get("source") or ""))
        if not m:
            warn(f"{tag}: מקור התחרות אינו דף האירוע ב־FIG (detail.php?id=…); לעדכן את source או להזין ידנית")
            continue
        try:
            docs = [(u, t) for u, t in official_documents(get(m.group(0))) if is_results_document(t)]
            if not docs:
                warn(f"{tag}: ספר התוצאות הרשמי עוד לא פורסם ב־FIG; לא נכתב דבר")
                continue
            book = next((d for d in docs if "book" in d[1].lower()), docs[0])[0]
            rows = parse_results_book(pdf_text(get(book)))
        except (OSError, ValueError) as e:   # urllib errors are OSErrors
            warn(f"{tag}: FIG לא זמין ({type(e).__name__}); לבדוק ידנית")
            continue
        if not rows:
            warn(f"{tag}: לא נקראו טבלאות תוצאות מ־{book}; לבדוק ידנית")
            continue
        athletes = {}
        for a in data.get("athletes") or []:
            if a.get("sportId") == comp["sportId"] and not a.get("archived") and a.get("name_en"):
                athletes.setdefault(name_key(a["name_en"]), []).append(a)
        found = set()
        for r in (r for r in rows if r["noc"] == "ISR"):
            hits = athletes.get(name_key(r["name"]), [])
            if len(hits) != 1:
                warn(f"{tag}: {r['name']} (ISR) {'לא נמצא/ה במאגר' if not hits else 'מתאים/ה ליותר מרשומה אחת'}; לא נכתב דבר")
                continue
            a = hits[0]
            found.add(a["id"])
            if not as_date(comp.get("start")) or not comp["start"] <= r["day"] <= str(end):
                warn(f"{tag}: {a['id']} {r['day']} מחוץ לתאריכי התחרות; לא נכתב דבר")
                continue
            text = result_text(r["phase"], r["rank"], r["apparatus"], comp["name"], he_date(r["day"]),
                               r["qualified"], r["reserve"], r["gender"])
            logged = [h for h in a.get("history") or [] if isinstance(h, dict) and h.get("at") == r["day"] and h.get("text") == text]
            if logged or any(u["athleteId"] == a["id"] and u["result"]["text"] == text for u in out["updates"]):
                continue
            out["updates"].append({"athleteId": a["id"], "result": {"at": r["day"], "text": text, "source": book}})
            # Podium in a final: the notes line is a judgment call, so a person approves it (as tri_results.py).
            note = f"{MEDAL.get(r['rank'])} ב{APPARATUS[r['apparatus']]} ב{comp['name']}"
            notes = str(a.get("notes") or "").strip()
            if r["phase"] == "final" and r["rank"] in MEDAL and note not in notes:
                out["proposals"].append({"id": f"{a['id']}-{r['day'].replace('-', '')}-{r['apparatus']}-result", "doc": {
                    "kind": "update", "target": a["id"],
                    "patch": {"notes": f"{notes.rstrip('.')}. {note}" if notes else note},
                    "summary": f"{text}: להוסיף להערות. שלב ומכסה ללא שינוי",
                    "evidence": [{"url": book, "label": "FIG Results Book"}], "status": "pending"}})
        entrants = {i for s in data.get("sessions") or [] if s.get("competitionId") == comp.get("id") for i in s.get("athleteIds") or []}
        for aid in sorted(entrants - found):
            warn(f"{tag}: {aid} רשום/ה בסשן אך לא נמצא/ה בספר התוצאות; לבדוק ידנית")
    return out


def db_data(dump_dir):
    """Athletes, competitions and sessions from the step-1 DB dump (ArtifactData out_dir)."""
    from export_data import load
    return {coll: [{**v, "id": k} for k, v in sorted(load(dump_dir, coll, []).items())]
            for coll in ("athletes", "competitions", "sessions")}


def _load(arg):
    return fetch(arg) if arg.startswith("https://") else open(arg, "rb").read()


def main(argv):
    if len(argv) >= 3 and argv[1] == "plan":
        import os
        from quota_due import israel_today
        from tri_results import as_date
        args, opts = [], {"--today": None, "--days": "4"}
        it = iter(argv[2:])
        for a in it:
            if a in opts:
                opts[a] = next(it, None)
            else:
                args.append(a)
        today = as_date(opts["--today"]) if opts["--today"] else israel_today()
        if len(args) != 1 or not os.path.isdir(args[0]) or not today or not str(opts["--days"]).isdigit():
            print("usage: python3 gym_results.py plan <db_dump_dir> [--today YYYY-MM-DD] [--days N]", file=sys.stderr)
            return 1
        print(json.dumps(plan(db_data(args[0]), fetch, today, int(opts["--days"])), ensure_ascii=False, indent=1))
        return 0
    if len(argv) != 3 or argv[1] not in ("ranking", "fig-docs", "pdf-text"):
        print("usage: python3 gym_results.py plan <db_dump_dir> [--today D] [--days N] | ranking|fig-docs|pdf-text <https-url-or-file>",
              file=sys.stderr)
        return 1
    data = _load(argv[2])
    if argv[1] == "ranking":
        out = parse_ranking(data)
    elif argv[1] == "fig-docs":
        out = [{"url": u, "title": t, "results": is_results_document(t)} for u, t in official_documents(data)]
    else:
        out = pdf_text(data)
    print(json.dumps(out, ensure_ascii=False, indent=1) if not isinstance(out, str) else out)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
