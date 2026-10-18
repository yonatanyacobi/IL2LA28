import copy, json, os, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
JOB = os.path.join(HERE, "..", "job")
sys.path.insert(0, JOB)
import validate_data  # noqa: E402


def load(name):
    with open(os.path.join(HERE, "fixtures", name), encoding="utf-8") as f:
        return json.load(f)


class QuotasTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = load("data.json")
        # The real snapshot has no stage >= 2 athlete yet; give judo one so the "earned" fixture item can pass.
        cls.staged = copy.deepcopy(cls.data)
        next(a for a in cls.staged["athletes"] if a["sportId"] == "judo")["stage"] = 2
        q = load("quotas.json")
        cls.valid = {**q, "items": q["items"][:4]}

    def errors(self, mutate=None, data=None):
        q = copy.deepcopy(self.valid)
        if mutate:
            mutate(q)
        return validate_data.validate_quotas(q, data or self.staged)

    def test_fixture_covers_all_statuses_and_valid_items_pass(self):
        self.assertEqual({i["israelStatus"] for i in self.valid["items"]}, validate_data.QUOTA_STATUSES)
        self.assertEqual(self.errors(), [])

    def test_fixture_invalid_item_is_the_only_error(self):
        errors = validate_data.validate_quotas(load("quotas.json"), self.staged)
        self.assertEqual(len(errors), 1, errors)
        self.assertIn("items[4]", errors[0])
        self.assertIn("source", errors[0])

    def test_earned_requires_stage_2_athlete_in_sport(self):
        errors = self.errors(data=self.data)
        self.assertEqual(len(errors), 1, errors)
        self.assertIn('"earned"', errors[0])

    def test_stakes_optional_and_accepted_up_to_140(self):
        self.assertEqual(self.errors(lambda q: q["items"][1].__setitem__("stakes", "א" * 140)), [])

    def test_next_quota_event_end_optional(self):
        def add_end(q):
            e = q["items"][1]["nextQuotaEvent"]
            e["end"] = e["start"]
        self.assertEqual(self.errors(add_end), [])

    def test_iso_updated_at_accepted(self):
        self.assertEqual(self.errors(lambda q: q.__setitem__("updatedAt", "2026-10-18T12:00:00Z")), [])

    def test_broken_items(self):
        i0 = lambda q: q["items"][1]
        cases = [
            ("updatedAt", lambda q: q.__setitem__("updatedAt", "yesterday")),
            ("items", lambda q: q.__setitem__("items", {})),
            ("unknown sport", lambda q: i0(q).__setitem__("sportId", "quidditch")),
            ("israelStatus", lambda q: i0(q).__setitem__("israelStatus", "won")),
            ("source", lambda q: i0(q).__setitem__("source", "javascript:alert(1)")),
            ("source", lambda q: i0(q).__setitem__("source", "")),
            ("nextQuotaEvent.start", lambda q: i0(q)["nextQuotaEvent"].__setitem__("start", "10/01/2027")),
            ("nextQuotaEvent", lambda q: i0(q).__setitem__("nextQuotaEvent", "soon")),
            ("nextQuotaEvent.end", lambda q: i0(q)["nextQuotaEvent"].__setitem__("end", "2020-01-01")),
            ("nextQuotaEvent.end", lambda q: i0(q)["nextQuotaEvent"].__setitem__("end", "soon")),
            ("totalQuotas", lambda q: i0(q).__setitem__("totalQuotas", "24")),
            ("maxPerNOC", lambda q: i0(q).__setitem__("maxPerNOC", 1.5)),
            ("maxPerNOC", lambda q: i0(q).__setitem__("maxPerNOC", True)),
            ("missing", lambda q: i0(q).pop("allocation")),
            ("unexpected", lambda q: i0(q).__setitem__("israelstatus", "earned")),
            ("israelNote", lambda q: i0(q).__setitem__("israelNote", None)),
            ("expected an object", lambda q: q["items"].append("junk")),
            ("stakes", lambda q: i0(q).__setitem__("stakes", 7)),
            ("stakes", lambda q: i0(q).__setitem__("stakes", "  ")),
            ("stakes", lambda q: i0(q).__setitem__("stakes", "שורה\nשנייה")),
            ("stakes", lambda q: i0(q).__setitem__("stakes", "א" * 141)),
        ]
        for needle, mutate in cases:
            errors = self.errors(mutate)
            self.assertTrue(errors, needle)
            self.assertIn(needle, "\n".join(errors), needle)

    def test_cli(self):
        script = os.path.join(JOB, "validate_data.py")
        with tempfile.TemporaryDirectory() as tmp:
            qp, dp = os.path.join(tmp, "q.json"), os.path.join(tmp, "d.json")
            for path, doc in ((qp, self.valid), (dp, self.staged)):
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(doc, f, ensure_ascii=False)
            ok = subprocess.run([sys.executable, script, "--quotas", qp, dp], capture_output=True, text=True)
            self.assertEqual(ok.returncode, 0, ok.stdout)
            bad = subprocess.run([sys.executable, script, "--quotas", os.path.join(HERE, "fixtures", "quotas.json"), dp],
                                 capture_output=True, text=True)
            self.assertEqual(bad.returncode, 1)
            self.assertIn("INVALID: items[4]", bad.stdout)
            usage = subprocess.run([sys.executable, script, "--quotas", qp], capture_output=True, text=True)
            self.assertEqual(usage.returncode, 1)


if __name__ == "__main__":
    unittest.main()
