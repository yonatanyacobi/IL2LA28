import os, subprocess, sys, unittest
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
                         "מקום 3 בקרקע במוקדמות אליפות העולם ברוטרדם (18 באוק׳ 2026), עלה/תה לגמר")
        self.assertEqual(gr.result_text("qual", 67, "floor", "אליפות העולם ברוטרדם", "18 באוק׳ 2026", False)[-14:],
                         "לא עלה/תה לגמר")
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


if __name__ == "__main__":
    unittest.main()
