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

    def test_cutoff(self):
        good = {"rank": 17, "list": "IJF Olympic Ranking List", "url": "https://www.ijf.org/wrl",
                "final": "2028-06-15", "opens": "2026-06-15"}
        cut = lambda c: self.errors(lambda q: q["items"][1].__setitem__("cutoff", c))
        self.assertEqual(cut(good), [])
        self.assertEqual(cut({k: v for k, v in good.items() if k != "opens"}), [], "opens is optional")
        for needle, c in [
            ("rank", {**good, "rank": 0}), ("rank", {**good, "rank": "17"}), ("rank", {**good, "rank": True}),
            ("rank", {**good, "rank": 17.0}),
            ("list", {**good, "list": " "}), ("list", {**good, "list": "x" * 81}),
            ("url", {**good, "url": "http://www.ijf.org/wrl"}), ("url", {**good, "url": ""}),
            ("final", {**good, "final": "15.6.2028"}), ("opens", {**good, "opens": "2026-13-01"}),
            ("is after final", {**good, "opens": "2029-01-01"}),
            ("missing ['url']", {k: v for k, v in good.items() if k != "url"}),
            ("unknown ['note']", {**good, "note": "x"}),
            ("expected an object", 17),
        ]:
            errors = cut(c)
            self.assertTrue(errors, needle)
            self.assertIn(needle, "\n".join(errors), (needle, errors))

    def test_team_rank(self):
        cut = {"rank": 4, "list": "FIE Senior Team Ranking", "url": "https://fie.org/athletes", "final": "2028-04-01"}
        good = {"num": 6, "asOf": "2027-05-01", "source": "https://fie.org/athletes"}
        def team(t, with_cut=True):
            def m(q):
                if with_cut:
                    q["items"][1]["cutoff"] = cut
                q["items"][1]["teamRank"] = t
            return self.errors(m)
        self.assertEqual(team(good), [])
        for needle, t in [("teamRank", {**good, "num": 0}), ("teamRank", {**good, "asOf": "5.2027"}),
                          ("teamRank", {**good, "source": "http://fie.org"}), ("teamRank", {**good, "x": 1})]:
            self.assertIn(needle, "\n".join(team(t)), t)
        self.assertIn("only with a cutoff", "\n".join(team(good, with_cut=False)))

    def test_stakes_style(self):
        stakes = lambda v: self.errors(lambda q: q["items"][1].__setitem__("stakes", v))
        for ok in ["גרנד סלאם (מ־29 באוק׳ 2026): נקודות לדירוג IJF עד 12 ביוני 2028",
                   "שיא 9.58 שניות; 10.5 נקודות; עונת 2026-2027; קטגוריה 60- ק״ג; T-50 ו־ל־LA28"]:
            self.assertEqual(stakes(ok), [], ok)
        for bad, needle in [("מ־29.10.2026 והלאה", "dotted date '29.10.2026'"), ("עד 12.6.28", "dotted date"),
                            ("ב־29.10 בערב", "dotted date '29.10'"), ("מ-29 באוק׳ 2026", "hyphen in 'מ-29'"),
                            ("ל-LA28", "maqaf"), ("דרום-קוריאה", "hyphen")]:
            errors = stakes(bad)
            self.assertEqual(len(errors), 1, (bad, errors))
            self.assertIn(needle, errors[0])
        # The published file follows the style already.
        with open(os.path.join(HERE, "..", "site", "quotas.json"), encoding="utf-8") as f:
            published = json.load(f)
        self.assertFalse([e for e in validate_data.validate_quotas(published, self.data) if ".stakes" in e])

    def test_stakes_optional_and_accepted_up_to_140(self):
        self.assertEqual(self.errors(lambda q: q["items"][1].__setitem__("stakes", "א" * 140)), [])

    def test_next_quota_event_end_optional(self):
        def add_end(q):
            e = q["items"][1]["nextQuotaEvent"]
            e["end"] = e["start"]
        self.assertEqual(self.errors(add_end), [])

    def test_earned_at_optional_on_earned_items(self):
        q = copy.deepcopy(self.valid)
        earned = next(i for i in q["items"] if i["israelStatus"] == "earned")
        earned["earnedAt"] = "2026-10-18"
        self.assertEqual(validate_data.validate_quotas(q, self.staged), [])

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
            ("earnedAt", lambda q: i0(q).__setitem__("earnedAt", "yesterday")),
            ("earnedAt", lambda q: i0(q).__setitem__("earnedAt", "2026-10-18")),   # i0 is not "earned"
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
