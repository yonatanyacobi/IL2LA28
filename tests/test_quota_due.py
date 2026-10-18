import json, os, subprocess, sys, tempfile, unittest
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "job", "quota_due.py")
sys.path.insert(0, os.path.join(HERE, "..", "job"))
import quota_due  # noqa: E402

DATA = {
    "sports": [{"id": "judo", "he": "ג׳ודו"}, {"id": "artistic-gymnastics", "he": "התעמלות מכשירים"}],
    "competitions": [
        {"id": "gs", "sportId": "judo", "name": "גרנד סלאם", "start": "2026-10-29", "end": "2026-10-31", "qualifying": True},
        {"id": "worlds", "sportId": "artistic-gymnastics", "name": "אליפות העולם", "start": "2026-10-17",
         "end": "2026-10-25", "qualifying": True},
        {"id": "open", "sportId": "judo", "name": "לא מעפילה", "start": "2026-10-18", "end": "2026-10-19", "qualifying": False},
    ],
}


def item(sport, event, name=None, start=None):
    return {"sportId": sport, "event": event, "nextQuotaEvent": {"name": name, "start": start} if start else None}


QUOTAS = {"items": [
    item("judo", "60-", "גרנד סלאם", "2026-10-29"),
    item("judo", "73-", "גרנד סלאם", "2026-10-29"),
    item("artistic-gymnastics", "קבוצתי", "גמר קבוצתי רוטרדם", "2026-10-20"),  # no matching competition start
    item("judo", "ללא אירוע"),
    "junk",
]}


def run(today, days=4, quotas=QUOTAS):
    return quota_due.due(DATA, quotas, date.fromisoformat(today), days)


class QuotaDueTest(unittest.TestCase):
    def test_nothing_due_on_event_day(self):
        self.assertEqual(run("2026-10-20"), [])

    def test_unmatched_event_ends_on_its_start(self):
        out = run("2026-10-21")
        self.assertEqual(out, ["לעדכן quotas.json: גמר קבוצתי רוטרדם (התעמלות מכשירים, הסתיים 2026-10-20) – פריט אחד: קבוצתי"])
        self.assertEqual(run("2026-10-24"), out)
        self.assertEqual(run("2026-10-25"), [])  # 5 days after, outside the default window

    def test_items_grouped_under_matching_competition_end(self):
        self.assertEqual(run("2026-10-31"), [])  # still running on its last day
        out = run("2026-11-01")
        self.assertEqual(out, ["לעדכן quotas.json: גרנד סלאם (ג׳ודו, הסתיים 2026-10-31) – 2 פריטים: 60-, 73-"])

    def test_qualifying_competitions_flagged_without_items(self):
        self.assertEqual(run("2026-10-26"), ["לעדכן quotas.json: אליפות העולם (התעמלות מכשירים, הסתיים 2026-10-25)"])
        self.assertEqual(run("2026-10-20", days=4, quotas={}), [])  # non-qualifying "open" ended 10-19: ignored

    def test_days_window(self):
        self.assertEqual(len(run("2026-10-28", days=10)), 2)  # Rotterdam (10-20) and worlds (10-25)

    def test_cli(self):
        with tempfile.TemporaryDirectory() as tmp:
            dp, qp = os.path.join(tmp, "d.json"), os.path.join(tmp, "q.json")
            for p, doc in ((dp, DATA), (qp, QUOTAS)):
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
