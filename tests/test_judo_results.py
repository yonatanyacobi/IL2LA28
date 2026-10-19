import copy, json, os, subprocess, sys, unittest
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
JOB = os.path.join(HERE, "..", "job")
sys.path.insert(0, JOB)
import athlete_patch  # noqa: E402
import judo_results as jr  # noqa: E402

PAGE = os.path.join(HERE, "fixtures", "judo", "ijf-3151-results-excerpt.html")   # Baku Worlds 2026, real rows
RESULTS = "https://www.ijf.org/competition/3157/results"
ABU_DHABI = {"id": "judo-gs-abu-dhabi-2026", "sportId": "judo", "name": "גרנד סלאם אבו דאבי",
             "start": "2026-10-29", "end": "2026-10-31", "source": "https://www.ijf.org/competition/3157"}


def judoka(aid, ijf, next_date="2026-10-29", **kw):
    return {"id": aid, "sportId": "judo", "name_en": aid, "nextDate": next_date,
            "source": f"https://www.ijf.org/judoka/{ijf}", "history": [], **kw}


# IJF ids as in the DB (19.10). Elbaz, K. Primo and Hershko have real rows in the Baku excerpt (5, 2, 3).
ATHLETES = [judoka("yonatan-elbaz", 24088, "2026-10-30"), judoka("kerem-primo", 60920), judoka("raz-hershko", 13713, "2026-10-31"),
            judoka("matan-kokolayev", 29534), judoka("tom-simkhaev", 82113), judoka("izhak-ashpiz", 67289)]
SESSIONS = [{"competitionId": "judo-gs-abu-dhabi-2026", "date": "2026-10-29", "athleteIds": ["izhak-ashpiz"]},
            {"competitionId": "judo-gs-abu-dhabi-2026", "date": "2026-10-29", "athleteIds": ["matan-kokolayev", "tom-simkhaev"]},
            {"competitionId": "judo-gs-abu-dhabi-2026", "date": "2026-10-30", "athleteIds": ["yonatan-elbaz"]},
            {"competitionId": "judo-gs-abu-dhabi-2026", "date": "2026-10-31", "athleteIds": ["raz-hershko"]}]
# A -66 panel in the page's markup, made up: Kokolayev 5th, Simkhaev not placed (shared session, one result each).
M66 = ('<div class="category-container"><div class="panel"><div class="panel-header"> Men -66 kg </div><table>'
       '<tr class="athlete"><td class="place-1"><a href="/judoka/1"></a>1</td></tr>'
       '<tr class="athlete"><td class="place-5"><a href="/judoka/29534" class="rowlink"></a>5</td></tr></table>')


class JudoTextTest(unittest.TestCase):
    def test_runbook_wording(self):
        # result-night-abu-dhabi.md "Values", its own example
        self.assertEqual(jr.result_text(3, "גרנד סלאם אבו דאבי", "-57", "2026-10-29", "f"),
                         "ארד בגרנד סלאם אבו דאבי, 57- ק״ג (29 באוק׳ 2026)")
        want = {1: "זהב", 2: "כסף", 3: "ארד", 5: "מקום 5", 7: "מקום 7"}
        for place, words in want.items():
            self.assertEqual(jr.result_text(place, "גרנד סלאם אבו דאבי", "+78 kg", "2026-10-31", "f"),
                             f"{words} בגרנד סלאם אבו דאבי, 78+ ק״ג (31 באוק׳ 2026)")
        self.assertEqual(jr.result_text("out", "גרנד סלאם אבו דאבי", "-66", "2026-10-29", "m", "בסיבוב השני"),
                         "הודח בסיבוב השני בגרנד סלאם אבו דאבי, 66- ק״ג (29 באוק׳ 2026)")
        self.assertEqual(jr.outcome("out", "f", "ברבע הגמר"), "הודחה ברבע הגמר", "the athlete's own form, never הודח/ה")

    def test_refuses_what_the_runbook_doesnt_allow(self):
        for args in [(4, "m"), (5, "x"), ("out", "m", None), ("out", "m", "בשלב הבתים"), (5, "m", "בסיבוב הראשון")]:
            with self.assertRaises(ValueError, msg=args):
                jr.outcome(*args)
        with self.assertRaises(ValueError):
            jr.weight("66")

    def test_shared_session(self):
        # 66- on 29.10 holds Kokolayev and Simkhaev: one session result, each in his own form.
        self.assertEqual(jr.join_session([("מתן קוקולייב", jr.outcome(5, "m")), ("טום שמחייב", jr.outcome("out", "m", "בסיבוב הראשון"))]),
                         "מתן קוקולייב: מקום 5 · טום שמחייב: הודח בסיבוב הראשון")


class JudoPlanTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(PAGE, encoding="utf-8") as f:
            cls.page = f.read()

    def run_plan(self, page=None, athletes=ATHLETES, comps=(ABU_DHABI,), today="2026-11-01"):
        calls = []
        def get(url):
            calls.append(url)
            return (page if page is not None else self.page).encode()
        data = {"athletes": copy.deepcopy(athletes), "competitions": list(comps), "sessions": SESSIONS}
        return jr.plan(data, get, date.fromisoformat(today)), calls

    def test_parse_real_page(self):
        rows = jr.parse_results(self.page)
        isr = {r["judoka"]: (r["gender"], r["category"], r["place"]) for r in rows if r["judoka"] in ("24088", "60920", "13713")}
        self.assertEqual(isr, {"24088": ("m", "-73", 5), "60920": ("f", "-63", 2), "13713": ("f", "+78", 3)})
        self.assertEqual(len(rows), 32, "4 categories x 8 places; the page's repeated -73 panel counted once")

    def test_places_by_judoka_id_on_the_session_day(self):
        out, calls = self.run_plan()
        self.assertEqual(calls, [RESULTS], "one official page")
        self.assertEqual([(u["athleteId"], u["result"]["at"], u["result"]["text"]) for u in out["updates"]], [
            ("yonatan-elbaz", "2026-10-30", "מקום 5 בגרנד סלאם אבו דאבי, 73- ק״ג (30 באוק׳ 2026)"),
            ("kerem-primo", "2026-10-29", "כסף בגרנד סלאם אבו דאבי, 63- ק״ג (29 באוק׳ 2026)"),
            ("raz-hershko", "2026-10-31", "ארד בגרנד סלאם אבו דאבי, 78+ ק״ג (31 באוק׳ 2026)")])
        for u in out["updates"]:
            self.assertEqual(u["result"]["source"], RESULTS)
            self.assertEqual(athlete_patch.result_entry(u["result"])["kind"], "result")
        self.assertEqual(out["proposals"], [])
        missing = [w for w in out["warnings"] if "לא במקומות 1–7" in w]
        self.assertEqual([w.split(": ")[2].split(" ")[0] for w in missing], ["izhak-ashpiz", "matan-kokolayev", "tom-simkhaev"])

    def test_shared_session_one_placed(self):
        out, _ = self.run_plan(page=self.page + M66)
        texts = {u["athleteId"]: u["result"]["text"] for u in out["updates"]}
        self.assertEqual(texts["matan-kokolayev"], "מקום 5 בגרנד סלאם אבו דאבי, 66- ק״ג (29 באוק׳ 2026)")
        self.assertNotIn("tom-simkhaev", texts)
        self.assertTrue(any("tom-simkhaev לא במקומות 1–7" in w for w in out["warnings"]))

    def test_night_entry_not_repeated_and_a_different_one_warns(self):
        night = {"at": "2026-10-30", "kind": "result", "text": "מקום 5 בגרנד סלאם אבו דאבי, 73- ק״ג (30 באוק׳ 2026)", "source": RESULTS}
        same = [{**a, "history": [night]} if a["id"] == "yonatan-elbaz" else a for a in ATHLETES]
        out, _ = self.run_plan(athletes=same)
        self.assertNotIn("yonatan-elbaz", [u["athleteId"] for u in out["updates"]])
        other = [{**a, "history": [{**night, "text": night["text"].replace("מקום 5", "מקום 7")}]} if a["id"] == "yonatan-elbaz" else a
                 for a in ATHLETES]
        out, _ = self.run_plan(athletes=other)
        self.assertNotIn("yonatan-elbaz", [u["athleteId"] for u in out["updates"]])
        self.assertTrue(any("yonatan-elbaz: רשום כבר" in w for w in out["warnings"]))

    def test_warnings_instead_of_writes(self):
        out, calls = self.run_plan(comps=[{**ABU_DHABI, "source": "https://allsportdb.com/Sports/Judo"}])
        self.assertEqual((out["updates"], calls), ([], []))
        self.assertIn("אינו דף התחרות ב־IJF", out["warnings"][0])
        out, _ = self.run_plan(page="<html>no results yet</html>")
        self.assertEqual(out["updates"], [])
        self.assertIn("אין עדיין תוצאות", out["warnings"][0])

        def down(url):
            raise OSError("timed out")
        out = jr.plan({"athletes": ATHLETES, "competitions": [ABU_DHABI], "sessions": SESSIONS}, down, date(2026, 11, 1))
        self.assertEqual(out["warnings"], ["תוצאות ג׳ודו: גרנד סלאם אבו דאבי (2026-10-31): IJF לא זמין (OSError); לבדוק ידנית"])

    def test_window(self):
        for today in ("2026-10-31", "2026-11-05"):   # last day; more than 4 days after
            out, calls = self.run_plan(today=today)
            self.assertEqual((out["updates"], calls), ([], []), today)

    def test_cli_text(self):
        script = os.path.join(JOB, "judo_results.py")
        r = subprocess.run([sys.executable, script, "text", "out", "גרנד סלאם אבו דאבי", "-66", "2026-10-29", "m", "בסיבוב הראשון"],
                           capture_output=True, text=True)
        self.assertEqual((r.returncode, r.stdout.strip()), (0, "הודח בסיבוב הראשון בגרנד סלאם אבו דאבי, 66- ק״ג (29 באוק׳ 2026)"))
        self.assertEqual(subprocess.run([sys.executable, script, "text", "4", "x", "-66", "2026-10-29", "m"],
                                        capture_output=True).returncode, 1)
        self.assertEqual(subprocess.run([sys.executable, script, "plan", "/no/such/dir"], capture_output=True).returncode, 1)


if __name__ == "__main__":
    unittest.main()
