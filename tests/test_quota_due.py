import json, os, subprocess, sys, tempfile, unittest
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "job", "quota_due.py")
sys.path.insert(0, os.path.join(HERE, "..", "job"))
import quota_due  # noqa: E402

DATA = {
    "sports": [{"id": "judo", "he": "ג׳ודו"}, {"id": "artistic-gymnastics", "he": "התעמלות מכשירים"},
               {"id": "triathlon", "he": "טריאתלון"}],
    "competitions": [
        {"id": "gs", "sportId": "judo", "name": "גרנד סלאם", "start": "2026-10-29", "end": "2026-10-31", "qualifying": True},
        {"id": "worlds", "sportId": "artistic-gymnastics", "name": "אליפות העולם", "start": "2026-10-17",
         "end": "2026-10-25", "qualifying": True},
        {"id": "open", "sportId": "judo", "name": "לא מעפילה", "start": "2026-10-18", "end": "2026-10-19", "qualifying": False},
        {"id": "series", "sportId": "triathlon", "name": "סבב גביע העולם", "start": "2026-03-01", "end": "2027-06-30",
         "qualifying": True},
    ],
}


def item(sport, event, name=None, start=None, end=None):
    nqe = {"name": name, "start": start, **({"end": end} if end else {})} if start else None
    return {"sportId": sport, "event": event, "nextQuotaEvent": nqe}


def run(today, quotas, days=4):
    return quota_due.due(DATA, {"items": quotas}, date.fromisoformat(today), days)


class QuotaDueTest(unittest.TestCase):
    def test_contained_in_competition_ends_with_it(self):
        # Rotterdam team final starts inside the worlds: current until the worlds end (as on the page).
        q = [item("artistic-gymnastics", "קבוצתי", "גמר קבוצתי רוטרדם", "2026-10-20")]
        self.assertEqual(run("2026-10-21", q), [])
        self.assertEqual(run("2026-10-26", q),
                         ["לעדכן quotas.json: אליפות העולם (התעמלות מכשירים, הסתיים 2026-10-25) – פריט אחד: קבוצתי"])

    def test_own_end_equal_to_competition_end_gives_one_line(self):
        # An explicit end that matches the qualifying competition's end must not add a second warning.
        q = [item("judo", "60-", "גרנד סלאם", "2026-10-29", "2026-10-31"), item("judo", "52-", "גרנד סלאם", "2026-10-29", "2026-10-31")]
        self.assertEqual(run("2026-11-01", q),
                         ["לעדכן quotas.json: גרנד סלאם (ג׳ודו, הסתיים 2026-10-31) – 2 פריטים: 60-, 52-"])

    def test_own_end_wins(self):
        q = [item("artistic-gymnastics", "קבוצתי", "גמר קבוצתי רוטרדם", "2026-10-20", "2026-10-20")]
        self.assertEqual(run("2026-10-20", q), [])
        line = "לעדכן quotas.json: גמר קבוצתי רוטרדם (התעמלות מכשירים, הסתיים 2026-10-20) – פריט אחד: קבוצתי"
        self.assertEqual(run("2026-10-21", q), [line])
        self.assertEqual(run("2026-10-24", q), [line])
        self.assertEqual(run("2026-10-25", q), [])  # 5 days after: outside the default window
        self.assertEqual(run("2026-10-26", q)[0], "לעדכן quotas.json: אליפות העולם (התעמלות מכשירים, הסתיים 2026-10-25)")

    def test_no_competition_ends_on_start(self):
        q = [item("judo", "60-", "אירוע בלי תחרות", "2026-10-22")]
        self.assertEqual(run("2026-10-23", q), ["לעדכן quotas.json: אירוע בלי תחרות (ג׳ודו, הסתיים 2026-10-22) – פריט אחד: 60-"])

    def test_series_longer_than_31_days_not_used(self):
        q = [item("triathlon", "אישי", "גביע העולם טונגיונג", "2026-10-24")]
        self.assertEqual(run("2026-10-25", q), ["לעדכן quotas.json: גביע העולם טונגיונג (טריאתלון, הסתיים 2026-10-24) – פריט אחד: אישי"])

    def test_items_grouped_under_matching_competition(self):
        q = [item("judo", "60-", "גרנד סלאם", "2026-10-29"), item("judo", "73-", "גרנד סלאם", "2026-10-29"),
             item("judo", "ללא אירוע"), "junk"]
        self.assertEqual(run("2026-10-31", q), [])  # still running on its last day
        self.assertEqual(run("2026-11-01", q), ["לעדכן quotas.json: גרנד סלאם (ג׳ודו, הסתיים 2026-10-31) – 2 פריטים: 60-, 73-"])

    def test_non_qualifying_competitions_ignored(self):
        self.assertEqual(run("2026-10-20", []), [])  # "open" ended 10-19 but isn't qualifying

    def test_days_window(self):
        q = [item("judo", "60-", "אירוע", "2026-10-20", "2026-10-20")]
        self.assertEqual(len(run("2026-10-28", q, days=10)), 2)  # the item (10-20) and the worlds (10-25)

    def test_date_matrix_on_real_data(self):
        # Same dates as the smoke date matrix: a warning starts the day after the page stops showing the event.
        with open(os.path.join(HERE, "fixtures", "data.json"), encoding="utf-8") as f:
            data = json.load(f)
        # Frozen 18.10 copy: the live file changes on each result night.
        with open(os.path.join(HERE, "fixtures", "site-quotas-2026-10-18.json"), encoding="utf-8") as f:
            quotas = json.load(f)
        expected = {
            "2026-10-20": [],
            "2026-10-24": ["רוטרדם – גמר קבוצתי גברים (התעמלות מכשירים, הסתיים 2026-10-20)"],
            "2026-10-27": ["טונגיונג (טריאתלון, הסתיים 2026-10-24)", "אליפות העולם בהתעמלות מכשירים 2026 (התעמלות מכשירים, הסתיים 2026-10-25)"],
            "2026-10-30": [],
            "2026-11-01": ["גרנד סלאם אבו דאבי (ג׳ודו, הסתיים 2026-10-31) – 7 פריטים"],
        }
        for t, parts in expected.items():
            out = quota_due.due(data, quotas, date.fromisoformat(t))
            self.assertEqual(len(out), len(parts), (t, out))
            for line, part in zip(out, parts):
                self.assertIn(part, line, t)

    def test_cli(self):
        quotas = {"items": [item("judo", "60-", "גרנד סלאם", "2026-10-29")]}
        with tempfile.TemporaryDirectory() as tmp:
            dp, qp = os.path.join(tmp, "d.json"), os.path.join(tmp, "q.json")
            for p, doc in ((dp, DATA), (qp, quotas)):
                with open(p, "w", encoding="utf-8") as f:
                    json.dump(doc, f, ensure_ascii=False)
            r = subprocess.run([sys.executable, SCRIPT, dp, qp, "--today", "2026-11-01"], capture_output=True, text=True)
            self.assertEqual((r.returncode, r.stdout.count("\n")), (0, 1), r.stderr)
            r = subprocess.run([sys.executable, SCRIPT, dp, os.path.join(tmp, "missing.json"), "--today", "2026-10-26"],
                               capture_output=True, text=True)
            self.assertEqual(r.returncode, 0)
            self.assertIn("אליפות העולם", r.stdout)
            self.assertIn("not read", r.stderr)
            r = subprocess.run([sys.executable, SCRIPT, dp], capture_output=True, text=True)
            self.assertEqual(r.returncode, 1)


if __name__ == "__main__":
    unittest.main()
