"""Gymnastics results-assist skeleton (#168): read FIG/Longines results without a browser. Writes nothing.

Feasibility (checked 2026-10-18, see #168):
- gym.longinestiming.com answers plain HTTP in 1-3 s, but only to non-browser user agents: a browser-like User-Agent
  is held until it times out (that was the curl timeout). So fetch() sends its own honest agent string, never a
  browser's.
- Longines "Phase/Ranking/<id>" pages are server-rendered result tables (rank, bib, name, NOC, total, Q), parsed
  here with the stdlib. They carry no Official/Unofficial mark, and the PDF menu is built by JavaScript over a live
  hub, with no document URL in the HTML.
- FIG's event page (gymnastics.sport/site/events/detail.php?id=<event>) lists the official documents as
  asset.php?id=fidb_… links. Those download as real PDFs, and their text is readable with stdlib zlib (pdf_text()).
- Hence the plan for the full script: treat a phase as official only once FIG's event page lists a results document
  (official_documents() + is_results_document()), take the rows from the Longines ranking table, and build the history
  text with result_text(), the one function a manual entry on result night must use too.

Usage (dry, prints JSON): python3 gym_results.py ranking <url-or-file> | fig-docs <url-or-file> | pdf-text <file>
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


def pdf_text(data):
    """Text of a PDF with simple (WinAnsi) fonts, stdlib only: inflate the streams, join the Tj/TJ string pieces per line.
    Returns "" for fonts it can't read (CID/Identity-H without a ToUnicode map), and the caller then warns rather than guesses."""
    lines = []
    for s in re.findall(rb"stream\r?\n(.*?)\r?\nendstream", data, re.S):
        try:
            content = zlib.decompress(s)
        except zlib.error:
            continue
        for block in re.findall(rb"BT(.*?)ET", content, re.S):
            pieces = []
            for op in re.finditer(rb"\[((?:\\.|[^\]])*)\]\s*TJ|\(((?:\\.|[^\\)])*)\)\s*Tj|(T\*|Td|TD|')", block):
                if op.group(3):
                    pieces.append(b"\n")
                    continue
                arr = op.group(1) if op.group(1) is not None else b"(" + op.group(2) + b")"
                for strpart, kern in re.findall(rb"\(((?:\\.|[^\\)])*)\)|(-?\d+(?:\.\d+)?)", arr):
                    if strpart:
                        pieces.append(re.sub(rb"\\(.)", rb"\1", strpart))
                    elif kern and float(kern) < -200:   # a wide negative kern is a word gap
                        pieces.append(b" ")
            text = b"".join(pieces).decode("cp1252", "replace")
            lines += [re.sub(r"\s+", " ", l).strip() for l in text.split("\n") if l.strip()]
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


def _load(arg):
    return fetch(arg) if arg.startswith("https://") else open(arg, "rb").read()


def main(argv):
    if len(argv) != 3 or argv[1] not in ("ranking", "fig-docs", "pdf-text"):
        print("usage: python3 gym_results.py ranking|fig-docs|pdf-text <https-url-or-file>", file=sys.stderr)
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
