import copy, json, os, subprocess, sys, unittest, zlib
from datetime import date
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
JOB = os.path.join(HERE, "..", "job")
sys.path.insert(0, JOB)
import gym_results as gr  # noqa: E402

FIX = os.path.join(HERE, "fixtures", "gym")
RANKING = os.path.join(FIX, "longines-mag-fx-qual.html")
PDF = os.path.join(FIX, "fig-rotterdam-nominative-2026-10-14.pdf")

FIG_EVENT = """<ul>
<li><a href="../../asset.php?id=fidb_23944" target="_blank">6_Work Plan and Appendices 02.10.2026</a></li>
<li><a href="../../asset.php?id=fidb_24017">7_Drawing of Lots - Results and Procedures</a></li>
<li><a href="../../asset.php?id=fidb_23999">2_MAG Qualifiers_08.10.2026</a></li>
<li><a href="../../asset.php?id=fidb_99001"><b>MAG Results</b> &amp; Ranking 25.10.2026</a></li>
<li><a href="https://example.org/x.pdf">not a FIG asset</a></li></ul>"""


class GymResultsTest(unittest.TestCase):
    def test_parse_saved_longines_ranking(self):
        with open(RANKING, encoding="utf-8") as f:
            out = gr.parse_ranking(f.read())
        self.assertEqual((out["title"], out["apparatus"], len(out["rows"])), ("Men's @ Qualification - Results", "floor", 151))
        self.assertEqual(out["rows"][0]["rank"], 1)
        isr = [(r["rank"], r["name"], r["total"], r["qualified"]) for r in out["rows"] if r["noc"] == "ISR"]
        self.assertEqual(isr, [(3, "DOLGOPYAT Artem", "14.300", True), (7, "BERKOVICH Noam", "14.033", True),
                               (67, "ORTAL Ron", "12.800", False)])
        ranks = [r["rank"] for r in out["rows"] if r["rank"] is not None]
        self.assertEqual(ranks, sorted(ranks), "table order; ties share a rank (two at 7th here)")
        self.assertEqual(ranks[:8], [1, 2, 3, 4, 5, 6, 7, 7])

    def test_reserves_parsed_from_r_markers(self):
        with open(RANKING, encoding="utf-8") as f:
            rows = gr.parse_ranking(f.read())["rows"]
        self.assertEqual([(r["rank"], r["name"], r["reserve"], r["qualified"]) for r in rows if r["reserve"]],
                         [(9, "KOVTUN Illia", 1, False), (9, "LEYKIN Danila", 1, False), (11, "HEPWORTH Harry", 3, False)])
        self.assertEqual(sum(r["qualified"] for r in rows), 8)
        self.assertTrue(all(r["reserve"] is None for r in rows if r["qualified"]))

    def test_reserve_wording(self):
        comp, day = "אליפות העולם ברוטרדם", "19 באוק׳ 2026"
        self.assertEqual(gr.result_text("qual", 10, "balancebeam", comp, day, qualified=False, reserve=2),
                         "מקום 10 בקורה במוקדמות אליפות העולם ברוטרדם (19 באוק׳ 2026), מחליף/ה 2 לגמר הקורה")
        self.assertNotIn("לא עלה/תה", gr.result_text("qual", 9, "floor", comp, day, reserve=1))
        for bad in (dict(qualified=True, reserve=1), dict(reserve=0), dict(reserve="R1")):
            with self.assertRaises(ValueError, msg=bad):
                gr.result_text("qual", 9, "floor", comp, day, **bad)
        with self.assertRaises(ValueError):
            gr.result_text("final", 4, "floor", comp, day, reserve=1)

    def test_matches_runbook_173_exactly(self):
        # The strings of docs/runbooks/result-night-1910.md (#173) with <N> = 12 and <R> = 2.
        comp, day, N = "אליפות העולם בהתעמלות מכשירים 2026", "19 באוק׳ 2026", 12
        cases = [
            (gr.result_text("qual", N, "allaround", comp, day, True, gender="f"),
             "מקום 12 בקרב־רב במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלתה לגמר הקרב־רב"),
            (gr.result_text("qual", N, "allaround", comp, day, False, gender="f"),
             "מקום 12 בקרב־רב במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלתה לגמר הקרב־רב"),
            (gr.result_text("qual", N, "unevenbars", comp, day, True, gender="f"),
             "מקום 12 במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), עלתה לגמר המקבילים"),
            (gr.result_text("qual", N, "unevenbars", comp, day, False, reserve=2, gender="f"),
             "מקום 12 במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), מחליפה 2 לגמר המקבילים"),
            (gr.result_text("qual", N, "unevenbars", comp, day, False, gender="f"),
             "מקום 12 במקבילים מדורגים במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (19 באוק׳ 2026), לא עלתה לגמר המקבילים"),
            # Session `result` short forms.
            (gr.session_text(N, "allaround", True, gender="f"), "מקום 12 בקרב־רב, עלתה לגמר"),
            (gr.session_text(N, "allaround", False, gender="f"), "מקום 12 בקרב־רב, לא עלתה לגמר"),
            (gr.session_text(N, "unevenbars", True, gender="f"), "מקום 12 במקבילים, עלתה לגמר"),
            (gr.session_text(N, "unevenbars", False, reserve=2, gender="f"), "מקום 12 במקבילים, מחליפה 2"),
            (gr.session_text(N, "unevenbars", False, gender="f"), "מקום 12 במקבילים, לא עלתה לגמר"),
        ]
        for got, want in cases:
            self.assertEqual(got, want)
        self.assertEqual(gr.session_text(N, "unevenbars", False, reserve=2), "מקום 12 במקבילים, מחליף/ה 2", "neutral default")
        with self.assertRaises(ValueError):
            gr.session_text(N, "unevenbars", True, reserve=2)

    def test_pdf_text_from_saved_fig_pdf(self):
        with open(PDF, "rb") as f:
            text = gr.pdf_text(f.read())
        self.assertIn("DOLGOPYAT", text)
        self.assertIn("ISR", text)
        self.assertIn("Artem", text)
        self.assertEqual(gr.pdf_text(b"%PDF-1.7 no streams"), "")

    def test_official_documents_and_results_filter(self):
        docs = gr.official_documents(FIG_EVENT)
        self.assertEqual([u for u, _ in docs], [f"https://www.gymnastics.sport/asset.php?id=fidb_{n}"
                                                for n in (23944, 24017, 23999, 99001)])
        self.assertEqual([t for _, t in docs if gr.is_results_document(t)], ["MAG Results & Ranking 25.10.2026"])

    def test_result_text_is_deterministic(self):
        self.assertEqual(gr.result_text("qual", 3, "floor", "אליפות העולם ברוטרדם", "18 באוק׳ 2026", True),
                         "מקום 3 בקרקע במוקדמות אליפות העולם ברוטרדם (18 באוק׳ 2026), עלה/תה לגמר הקרקע")
        self.assertTrue(gr.result_text("qual", 67, "floor", "אליפות העולם ברוטרדם", "18 באוק׳ 2026", False)
                        .endswith(", לא עלה/תה לגמר הקרקע"))
        self.assertEqual(gr.result_text("qual", 67, "floor", "x", "d"), "מקום 67 בקרקע במוקדמות x (d)", "no outcome stated")
        self.assertEqual(gr.result_text("qual", 3, "floor", "x", "d", True, gender="m"), "מקום 3 בקרקע במוקדמות x (d), עלה לגמר הקרקע")
        with self.assertRaises(ValueError):
            gr.result_text("qual", 3, "floor", "x", "d", True, gender="x")
        self.assertEqual(gr.result_text("final", 1, "floor", "אליפות העולם ברוטרדם", "24 באוק׳ 2026"),
                         "זהב בגמר קרקע באליפות העולם ברוטרדם (24 באוק׳ 2026)")
        self.assertEqual(gr.result_text("final", 5, "קורה", "x", "d"), "מקום 5 בגמר קורה בx (d)")
        with self.assertRaises(ValueError):
            gr.result_text("semi", 1, "floor", "x", "d")

    def test_fetch_sends_a_non_browser_agent(self):
        class Resp:
            def __enter__(self): return self
            def __exit__(self, *a): pass
            def read(self): return b"ok"
        with mock.patch("urllib.request.urlopen", return_value=Resp()) as m:
            self.assertEqual(gr.fetch("https://gym.longinestiming.com/x"), b"ok")
        ua = m.call_args[0][0].get_header("User-agent")
        self.assertTrue(ua.startswith("IL2LA28-results/") and "Mozilla" not in ua and "Chrome" not in ua)

    def test_cli_on_saved_files(self):
        script = os.path.join(JOB, "gym_results.py")
        r = subprocess.run([sys.executable, script, "ranking", RANKING], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("DOLGOPYAT Artem", r.stdout)
        self.assertEqual(subprocess.run([sys.executable, script, "nope", RANKING], capture_output=True).returncode, 1)
        self.assertEqual(subprocess.run([sys.executable, script, "plan", "/no/such/dir"], capture_output=True).returncode, 1)


def stream(data, extra=b""):
    return b"<< /Filter /FlateDecode" + extra + b" >>\nstream\n" + zlib.compress(data) + b"\nendstream"


def cmap(body):
    return stream(b"/CIDInit /ProcSet findresource begin begincmap\n" + body + b"\nendcmap")


def pdf(objs):
    return b"%PDF-1.7\n" + b"".join(b"%d 0 obj\n%s\nendobj\n" % (n, body) for n, body in objs.items())


class PdfCidTest(unittest.TestCase):
    # Glyph = character - 29, as in fidb_23893; "]" (0x5D) is the code for "z".
    PLUS29 = b"1 beginbfrange\n<0003><0003><0020>\nendbfrange\n1 beginbfrange\n<0024><005d><0041>\nendbfrange"
    OTHER = b"1 beginbfchar\n<0024><0058>\nendbfchar"   # code 0x24 is "A" in PLUS29 and "X" here
    enc = staticmethod(lambda s: b"".join(b"\x00" + bytes([ord(ch) - 29]) for ch in s))

    def test_each_string_through_its_own_font(self):
        z = self.enc("HRIBAR Anze")   # holds a raw "]" byte: the TJ array must not end there
        self.assertIn(b"]", z)
        content = (b"BT /F1 9 Tf [(" + self.enc("SHAMAY") + b")-300(" + self.enc("Roni") + b")] TJ T* [(" + z + b")] TJ ET "
                   b"BT /F1 9 Tf (\\000\\053\\000\\053) Tj ET "   # octal escapes: two "H"
                   b"BT /F2 9 Tf <0024> Tj ET /X1 Do")                 # hex string; a form with no resources of its own
        doc = pdf({1: b"<< /Type /Catalog /Pages 2 0 R >>", 2: b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                   3: b"<< /Type /Page /Parent 2 0 R /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >>"
                      b" /XObject << /X1 9 0 R >> >> >>",
                   4: stream(content), 5: b"<< /Type /Font /Subtype /Type0 /ToUnicode 7 0 R >>",
                   6: b"<< /Type /Font /Subtype /Type0 /ToUnicode 8 0 R >>", 7: cmap(self.PLUS29), 8: cmap(self.OTHER),
                   9: stream(b"BT /F2 9 Tf (\x00\x24) Tj ET", b" /Type /XObject /Subtype /Form")})
        self.assertEqual(gr.pdf_text(doc), "SHAMAY Roni\nHRIBAR Anze\nHH\nX\nX", "0x24 is A in F1, X in F2")

    def test_without_a_page_tree(self):
        flat = lambda *bodies: pdf({n + 1: b for n, b in enumerate(bodies)})
        self.assertEqual(gr.pdf_text(flat(cmap(self.PLUS29), stream(b"BT [(" + self.enc("Roni") + b")] TJ ET"))), "Roni",
                         "one map from every CMap in the file")
        self.assertEqual(gr.pdf_text(flat(cmap(self.PLUS29), cmap(self.OTHER), stream(b"BT [(\x00\x24)] TJ ET"))), "",
                         "maps that disagree: nothing rather than a guess")


BOOK = os.path.join(FIX, "fig-paris-wcc-2026-results-book.txt")   # pdf_text() of fidb_23893, FIG WCC Paris 2026
BOOK_URL = "https://www.gymnastics.sport/asset.php?id=fidb_23893"
PARIS_PAGE = "https://www.gymnastics.sport/site/events/detail.php?id=18305"
PARIS = {"id": "ag-wcc-paris-2026", "sportId": "artistic-gymnastics", "name": "גביע העולם פריז 2026",
         "start": "2026-09-26", "end": "2026-09-27", "source": PARIS_PAGE}
EVENT_PAGE = ('<a href="../../asset.php?id=fidb_23751">4_Nominative Registration</a>'
              '<a href="../../asset.php?id=fidb_23893">Results book (Media)</a>').encode()


class GymPlanTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(BOOK, encoding="utf-8") as f:
            cls.book = f.read()
        with open(os.path.join(HERE, "fixtures", "data.json"), encoding="utf-8") as f:
            cls.athletes = json.load(f)["athletes"]

    def run_plan(self, comps=(PARIS,), athletes=None, sessions=(), page=EVENT_PAGE, today="2026-09-29"):
        calls = []
        def get(url):
            calls.append(url)
            return page if url == PARIS_PAGE else b"%PDF"
        data = {"athletes": copy.deepcopy(athletes or self.athletes), "competitions": list(comps), "sessions": list(sessions)}
        with mock.patch.object(gr, "pdf_text", return_value=self.book):
            out = gr.plan(data, get, date.fromisoformat(today))
        return out, calls

    def test_parse_results_book(self):
        rows = gr.parse_results_book(self.book)
        self.assertEqual(len(rows), 353)
        finals = [r for r in rows if r["phase"] == "final"]
        self.assertEqual((len(finals), {r["qualified"] for r in finals}), (80, {None}), "10 finals of 8")
        isr = {(r["name"], r["apparatus"], r["phase"]): (r["day"], r["rank"], r["qualified"], r["reserve"])
               for r in rows if r["noc"] == "ISR"}
        self.assertEqual(len(isr), 19)
        self.assertEqual(isr[("SHAMAY Roni", "floor", "qual")], ("2026-09-26", 9, False, 1), "R1 is a reserve")
        self.assertEqual(isr[("SHAMAY Roni", "balancebeam", "qual")], ("2026-09-26", 7, True, None))
        self.assertEqual(isr[("DOLGOPYAT Artem", "floor", "final")], ("2026-09-27", 1, None, None))
        # A "z" name: its rows were lost before the TJ fix, which left the floor final without a silver.
        self.assertEqual([r["rank"] for r in rows if r["name"] == "HRIBAR Anze" and r["phase"] == "final"], [2])
        vault = [r for r in rows if r["apparatus"] == "vault" and r["phase"] == "qual" and r["gender"] == "f"]
        self.assertEqual([r["rank"] for r in vault if r["qualified"]], list(range(1, 9)), "Q after the first vault")
        self.assertEqual(gr.parse_results_book("Men's Team Final\nResults\n1 1 CHINA CHN 250.000"), [], "team tables closed")

    def test_dry_run_on_paris(self):
        out, calls = self.run_plan()
        self.assertEqual(calls, [PARIS_PAGE, BOOK_URL], "one event page, one official book")
        self.assertEqual(out["warnings"], [])
        self.assertEqual(len(out["updates"]), 19)
        self.assertTrue(all(u["result"]["source"] == BOOK_URL for u in out["updates"]))
        texts = {(u["athleteId"], u["result"]["at"], u["result"]["text"]) for u in out["updates"]}
        for want in [("roni-shamay", "2026-09-26", "מקום 9 בקרקע במוקדמות גביע העולם פריז 2026 (26 בספט׳ 2026), מחליפה 1 לגמר הקרקע"),
                     ("roni-shamay", "2026-09-27", "מקום 8 בגמר קורה בגביע העולם פריז 2026 (27 בספט׳ 2026)"),
                     ("noam-berkovich", "2026-09-26", "מקום 2 במתח במוקדמות גביע העולם פריז 2026 (26 בספט׳ 2026), עלה לגמר המתח"),
                     ("artem-dolgopyat", "2026-09-27", "זהב בגמר קרקע בגביע העולם פריז 2026 (27 בספט׳ 2026)")]:
            self.assertIn(want, texts)
        self.assertEqual([(p["id"], p["doc"]["kind"], p["doc"]["status"]) for p in out["proposals"]],
                         [("artem-dolgopyat-20260927-floor-result", "update", "pending")], "podium in a final only")
        self.assertTrue(out["proposals"][0]["doc"]["patch"]["notes"].endswith("זהב בקרקע בגביע העולם פריז 2026"))
        self.assertNotIn("stage", json.dumps(out["proposals"]), "never a stage or quota change")

    def test_already_logged_and_rerun(self):
        out, _ = self.run_plan()
        done = copy.deepcopy(self.athletes)
        for a in done:
            a["history"] = (a.get("history") or []) + [{**u["result"], "kind": "result"} for u in out["updates"] if u["athleteId"] == a["id"]]
        again, _ = self.run_plan(athletes=done)
        self.assertEqual((again["updates"], again["warnings"]), ([], []), "a later run (or a manual entry with result_text) finds them logged")

    def test_warnings_instead_of_writes(self):
        cases = [
            (dict(page=b'<a href="../../asset.php?id=fidb_1">5_Work Plan</a>'), "ספר התוצאות הרשמי עוד לא פורסם"),
            (dict(comps=[{**PARIS, "source": "https://en.wikipedia.org/wiki/x"}]), "אינו דף האירוע ב־FIG"),
            (dict(comps=[{**PARIS, "sportId": "rhythmic-gymnastics"}]), "עוד לא נקרא אוטומטית"),
            (dict(sessions=[{"competitionId": PARIS["id"], "athleteIds": ["lihie-raz"]}]), "lihie-raz רשום/ה בסשן"),
            (dict(athletes=[a for a in self.athletes if a["id"] != "ron-ortal"]), "ORTAL Ron (ISR) לא נמצא/ה במאגר"),
        ]
        for kw, needle in cases:
            out, _ = self.run_plan(**kw)
            self.assertIn(needle, "\n".join(out["warnings"]), kw)
        out, _ = self.run_plan(page=b"")
        self.assertEqual(out["updates"], [])

    def test_window(self):
        for today in ("2026-09-27", "2026-10-02"):   # not yet ended; ended more than 4 days ago
            out, calls = self.run_plan(today=today)
            self.assertEqual((calls, out["updates"]), ([], []), today)
        out, calls = self.run_plan(today="2026-09-28")
        self.assertEqual(len(out["updates"]), 19)

    def test_fig_unreachable(self):
        def down(url):
            raise OSError("timed out")
        out = gr.plan({"athletes": [], "competitions": [PARIS], "sessions": []}, down, date(2026, 9, 29))
        self.assertEqual((out["updates"], out["warnings"]), ([], ["תוצאות התעמלות: גביע העולם פריז 2026 (2026-09-27): FIG לא זמין (OSError); לבדוק ידנית"]))


# Nanjing 2026 (FIG 18189) is timed by Longines like Paris and Rotterdam, so its book should follow the same template.
# No Longines trampoline book is public yet: this text copies the Paris layout with trampoline tables. Names other than
# the Israelis are placeholders. Replace it with the real book's text after 8.11.
NANJING_PAGE = "https://www.gymnastics.sport/site/events/detail.php?id=18189"
NANJING = {"id": "tra-worlds-2026", "sportId": "trampoline", "name": "אליפות העולם בטרמפולינה 2026",
           "start": "2026-11-04", "end": "2026-11-08", "source": NANJING_PAGE}
TRA_BOOK = """Official Results Provider
THU 5 NOV 2026
2026 Trampoline Gymnastics World Championships
Nanjing (CHN), 4-8 November 2026
Men's Trampoline Qualification
Results
Rank NameBib
NOC
Code
Total
1 101 ATHLETE One CHN 61.230 Q
2 102 ATHLETE Two FRA 60.110 Q
9 109 ATHLETE Nine GBR 58.900 R1
14 140 NANADZE Benyamin ISR 57.410
Men's Synchronised Trampoline Qualification
Results
3 70 NANADZE Benyamin ISR 49.200 Q
Men's Trampoline Qualification 1
Results
5 140 NANADZE Benyamin ISR 29.100
Women's Trampoline Qualification
Results
1 201 ATHLETE Three CHN 55.300 Q
6 250 TESTER Noa ISR 53.100 Q
SAT 7 NOV 2026
Women's Trampoline Final
Results
1 250 TESTER Noa ISR 56.000
Men's Trampoline Final
Results
5 140 NANADZE Benyamin ISR 58.700"""


class TrampolineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(os.path.join(HERE, "fixtures", "data.json"), encoding="utf-8") as f:
            cls.athletes = json.load(f)["athletes"] + [{"id": "noa-tester", "name": "נועה טסטר", "name_en": "Noa Tester",
                                                         "sportId": "trampoline", "notes": "", "history": []}]

    def run_plan(self):
        page = b'<a href="../../asset.php?id=fidb_90001">Results Book</a>'
        get = lambda url: page if url == NANJING_PAGE else b"%PDF"
        data = {"athletes": copy.deepcopy(self.athletes), "competitions": [NANJING], "sessions": []}
        with mock.patch.object(gr, "pdf_text", return_value=TRA_BOOK):
            return gr.plan(data, get, date(2026, 11, 10))

    def test_parse_individual_tables_only(self):
        rows = [(r["name"], r["apparatus"], r["phase"], r["rank"], r["qualified"], r["reserve"])
                for r in gr.parse_results_book(TRA_BOOK) if r["noc"] == "ISR"]
        self.assertEqual(rows, [("NANADZE Benyamin", "trampoline", "qual", 14, False, None),
                                ("TESTER Noa", "trampoline", "qual", 6, True, None),
                                ("TESTER Noa", "trampoline", "final", 1, None, None),
                                ("NANADZE Benyamin", "trampoline", "final", 5, None, None)],
                         "synchronised and the single-routine Q1 table stay closed")

    def test_nanadze_plan_and_text_forms(self):
        import athlete_patch
        out = self.run_plan()
        self.assertEqual(out["warnings"], [])
        texts = [(u["athleteId"], u["result"]["at"], u["result"]["text"]) for u in out["updates"]]
        self.assertEqual(texts, [
            ("ben-nanadze", "2026-11-05", "מקום 14 במוקדמות אליפות העולם בטרמפולינה 2026 (5 בנוב׳ 2026), לא עלה לגמר"),
            ("noa-tester", "2026-11-05", "מקום 6 במוקדמות אליפות העולם בטרמפולינה 2026 (5 בנוב׳ 2026), עלתה לגמר"),
            ("noa-tester", "2026-11-07", "זהב בגמר אליפות העולם בטרמפולינה 2026 (7 בנוב׳ 2026)"),
            ("ben-nanadze", "2026-11-07", "מקום 5 בגמר אליפות העולם בטרמפולינה 2026 (7 בנוב׳ 2026)")])
        for u in out["updates"]:   # what the job sends through athlete_patch.py
            self.assertEqual(athlete_patch.result_entry(u["result"])["kind"], "result")
        self.assertEqual([p["doc"]["patch"]["notes"] for p in out["proposals"]], ["זהב באליפות העולם בטרמפולינה 2026"])
        self.assertEqual(gr.session_text(14, "trampoline", False, gender="m"), "מקום 14, לא עלה לגמר")


ROTTERDAM_PAGE = "https://www.gymnastics.sport/site/events/detail.php?id=17247"
ROTTERDAM = {"id": "ag-worlds-2026", "sportId": "artistic-gymnastics", "name": "אליפות העולם בהתעמלות מכשירים 2026",
             "start": "2026-10-17", "end": "2026-10-25", "source": ROTTERDAM_PAGE}
# Rotterdam's book will come from Longines, as Paris did: this copies the Paris layout. Qualification ranks are the real
# ones from the Longines ranking (18.10). The final ranks are made up, only to cover a medal, a place and a tie.
ROTTERDAM_BOOK = """Official Results Provider
SUN 18 OCT 2026
54th Artistic Gymnastics World Championships
Rotterdam (NED), 17-25 October 2026
Men's Floor Exercise Qualification
Results
Rank NameBib
NOC
Code
TotalPen.
D
Score
E
Score
1 101 ATHLETE One JPN 14.600 Q6.100 8.500
3 225 DOLGOPYAT Artem ISR 14.300 Q6.200 8.100
7 224 BERKOVICH Noam ISR 14.033 Q5.800 8.233
9 110 ATHLETE Ten GBR 13.966 R15.700 8.266
67 228 ORTAL Ron ISR 12.8004.900 7.900
Men's Individual All-Around Qualification
Results
1 101 ATHLETE One JPN 86.100 Q
37 224 BERKOVICH Noam ISR 79.398
Men's Team Qualification
Results
14 1 ISRAEL ISR 240.000
GARM1APFX-------------QUAL--------_73I 1.0 Report Created SUN 18 OCT 2026 21:40 Page 1/1
Official Results Provider
SAT 24 OCT 2026
54th Artistic Gymnastics World Championships
Rotterdam (NED), 17-25 October 2026
Men's Floor Exercise Final
Results
Rank NameBib
NOC
Code
TotalPen.
D
Score
E
Score
Qualification
Rank
Start
Order
1 225 DOLGOPYAT Artem ISR 14.766 6.200 8.566 3 5
2 101 ATHLETE One JPN 14.700 6.100 8.600 1 8
4 224 BERKOVICH Noam ISR 14.100 5.800 8.300 7 2
4 102 ATHLETE Two CHN 14.100 5.900 8.200 2 1"""


class RotterdamFloorFinalTest(unittest.TestCase):
    """The plan after the Worlds (26-29.10) on the floor final of 24.10, next to the result-night entries of 18.10."""

    @classmethod
    def setUpClass(cls):
        with open(os.path.join(HERE, "fixtures", "data.json"), encoding="utf-8") as f:
            cls.athletes = json.load(f)["athletes"]

    def run_plan(self, book=ROTTERDAM_BOOK, today="2026-10-26"):
        page = b'<a href="../../asset.php?id=fidb_99247">Results book (Media)</a>'
        get = lambda url: page if url == ROTTERDAM_PAGE else b"%PDF"
        data = {"athletes": copy.deepcopy(self.athletes), "competitions": [ROTTERDAM], "sessions": []}
        with mock.patch.object(gr, "pdf_text", return_value=book):
            return gr.plan(data, get, date.fromisoformat(today))

    def test_floor_final_wording_passes_result_entry(self):
        import athlete_patch
        out = self.run_plan()
        finals = {u["athleteId"]: u["result"] for u in out["updates"] if u["result"]["at"] == "2026-10-24"}
        self.assertEqual({k: v["text"] for k, v in finals.items()}, {
            "artem-dolgopyat": "זהב בגמר קרקע באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)",
            "noam-berkovich": "מקום 4 בגמר קרקע באליפות העולם בהתעמלות מכשירים 2026 (24 באוק׳ 2026)"}, "a tie keeps the shared rank")
        for r in finals.values():
            self.assertEqual(r["source"], "https://www.gymnastics.sport/asset.php?id=fidb_99247")
            self.assertEqual(athlete_patch.result_entry(r), {**r, "kind": "result"})
        self.assertEqual([p["doc"]["patch"]["notes"].rsplit(". ", 1)[-1] for p in out["proposals"]],
                         ["זהב בקרקע באליפות העולם בהתעמלות מכשירים 2026"], "medal only")

    def test_result_night_entries_are_not_repeated(self):
        out = self.run_plan()
        self.assertEqual(out["warnings"], [])
        self.assertEqual(sorted((u["athleteId"], u["result"]["at"]) for u in out["updates"]),
                         [("artem-dolgopyat", "2026-10-24"), ("noam-berkovich", "2026-10-24"), ("ron-ortal", "2026-10-18")],
                         "18.10 floor and all-around entries (entered on the night with result_text) already match")
        self.assertEqual(next(u for u in out["updates"] if u["athleteId"] == "ron-ortal")["result"]["text"],
                         "מקום 67 בקרקע במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (18 באוק׳ 2026), לא עלה לגמר הקרקע")

    def test_a_qualification_table_dated_17_10_matches_the_night_entries(self):
        # Men's qualification ran 17-18.10, and the night's entries say 18.10. A book that dates the table 17.10 is
        # the same result: matched by event and phase, not by date (same_result).
        out = self.run_plan(book=ROTTERDAM_BOOK.replace("SUN 18 OCT 2026\n54th", "SAT 17 OCT 2026\n54th", 1))
        self.assertEqual(sorted((u["athleteId"], u["result"]["at"]) for u in out["updates"]),
                         [("artem-dolgopyat", "2026-10-24"), ("noam-berkovich", "2026-10-24"), ("ron-ortal", "2026-10-17")])

    def test_same_result(self):
        t = "מקום 3 בקרקע במוקדמות אליפות העולם בהתעמלות מכשירים 2026 (17 באוק׳ 2026), עלה לגמר הקרקע"
        night = {"at": "2026-10-18", "kind": "result", "text": t.replace("17 באוק׳", "18 באוק׳"), "source": "https://x.org"}
        self.assertTrue(gr.same_result(night, t, "2026-10-17", "2026-10-25"))
        for other in ({**night, "text": night["text"].replace("מקום 3", "מקום 4")},   # a different place is news
                      {**night, "at": "2025-10-18"},                                   # outside the competition
                      {**night, "kind": "note"}, "not a dict"):
            self.assertFalse(gr.same_result(other, t, "2026-10-17", "2026-10-25"), other)

    def test_only_after_the_worlds_end(self):
        for today in ("2026-10-24", "2026-10-25", "2026-10-30"):   # running, last day, more than 4 days after
            self.assertEqual(self.run_plan(today=today)["updates"], [], today)


if __name__ == "__main__":
    unittest.main()
