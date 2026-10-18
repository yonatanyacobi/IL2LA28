import copy, json, os, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "job"))
import validate_data  # noqa: E402

FIXTURE = os.path.join(HERE, "fixtures", "data.json")


class ValidateTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(FIXTURE, encoding="utf-8") as f:
            cls.good = json.load(f)

    def broken(self, mutate):
        d = copy.deepcopy(self.good)
        mutate(d)
        return validate_data.validate(d)

    def test_fixture_valid(self):
        self.assertEqual(validate_data.validate(self.good), [])

    def test_cli(self):
        ok = subprocess.run([sys.executable, os.path.join(HERE, "..", "job", "validate_data.py"), FIXTURE], capture_output=True)
        self.assertEqual(ok.returncode, 0)
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump({"schemaVersion": 2}, f)
        try:
            bad = subprocess.run([sys.executable, os.path.join(HERE, "..", "job", "validate_data.py"), f.name],
                                 capture_output=True, text=True)
        finally:
            os.unlink(f.name)
        self.assertEqual(bad.returncode, 1)
        self.assertIn("schemaVersion", bad.stdout)

    def test_corrections(self):
        fix = {"id": "c1", "at": "2026-10-24T09:10:00Z", "reportedAt": "2026-10-23T18:40:00Z",
               "target": {"kind": "athlete", "id": "raz-hershko", "name": "רז הרשקו"},
               "changes": [{"field": "rank", "wrong": "2 בעולם", "right": "1 בעולם"}],
               "source": "https://www.ijf.org/x", "by": "reader"}
        later = {**fix, "id": "c2", "at": "2026-10-25T09:00:00Z", "reportedAt": "", "by": "job"}
        launch = "2026-10-22T09:00:00Z"
        with_c = lambda rows, at=launch: lambda d: d.update(launchAt=at, corrections=rows)
        # No launch date yet: only an empty list is valid; a missing launchAt counts as null.
        self.assertEqual(self.broken(with_c([], None)), [])
        self.assertEqual(self.broken(lambda d: d.pop("corrections", None)), [])
        for at in (None, "", "2026-10-22", "2026-10-22T12:00:00+03:00", 5):
            errors = self.broken(with_c([fix], at))
            self.assertIn("no valid launchAt", "\n".join(errors), at)
        self.assertIn("launchAt: expected", "\n".join(self.broken(with_c([], "soon"))))
        self.assertEqual(self.broken(with_c([])), [])
        self.assertEqual(self.broken(with_c([later, fix])), [])
        self.assertIn("on or after", "\n".join(self.broken(with_c([later, fix], "2026-10-25T00:00:00Z"))))
        cases = [
            ("not newest first", [fix, later]),
            ("on or after", [{**fix, "at": "2026-10-21T09:00:00Z"}]),
            ("duplicate", [later, {**later}]),
            ("unexpected keys ['reporter']", [{**fix, "reporter": "קורא"}]),
            ("email address", [{**fix, "changes": [{"field": "notes", "wrong": "a@b.com", "right": "x"}]}]),
            ("target", [{**fix, "target": {"kind": "athlete", "id": "x"}}]),
            ("target", [{**fix, "target": {"kind": "team", "id": "x", "name": "y"}}]),
            ("changes: expected 1-5", [{**fix, "changes": []}]),
            ("changes[0]", [{**fix, "changes": [{"field": "rank", "wrong": "", "right": ""}]}]),
            ("changes[0]", [{**fix, "changes": [{"field": "verifiedBy", "wrong": "a", "right": "b"}]}]),
            ("changes[0]", [{**fix, "changes": [{"field": "rank", "wrong": "x" * 201, "right": ""}]}]),
            ("source", [{**fix, "source": "http://x.org"}]),
            ("by", [{**fix, "by": "editor"}]),
            ("reportedAt", [{**fix, "reportedAt": "אתמול"}]),
            ("corrections: expected a list", {"c1": fix}),
        ]
        for needle, rows in cases:
            errors = self.broken(with_c(rows))
            self.assertTrue(errors, needle)
            self.assertIn(needle, "\n".join(errors), needle)

    def test_rank_fields(self):
        def setr(**kw):
            return lambda d: d["athletes"][0].update(kw)
        L, D = "IJF World Ranking List", "2026-10-13"
        for ok in [{}, dict(rankNum=1, rankList=L, rankAsOf=D), dict(rankNum=None, rankList="", rankAsOf=""),
                   dict(rankNum=None, rankList=L, rankAsOf=D)]:
            self.assertEqual(self.broken(setr(**ok)), [], ok)
        for bad, needle in [(dict(rankNum=0, rankList=L, rankAsOf=D), "rankNum"),
                            (dict(rankNum="3", rankList=L, rankAsOf=D), "rankNum"),
                            (dict(rankNum=True, rankList=L, rankAsOf=D), "rankNum"),
                            (dict(rankNum=2.0, rankList=L, rankAsOf=D), "rankNum"),
                            (dict(rankNum=4, rankAsOf=D), "rankList: required"),
                            (dict(rankNum=4, rankList=" ", rankAsOf=D), "rankList: required"),
                            (dict(rankNum=4, rankList=L), "rankAsOf: YYYY-MM-DD required"),
                            (dict(rankNum=4, rankList=L, rankAsOf="2026-13-01"), "rankAsOf"),
                            (dict(rankList="x" * 81), "rankList"),
                            (dict(rankList=7), "rankList"),
                            (dict(rankAsOf="13.10.2026"), "rankAsOf")]:
            errors = self.broken(setr(**bad))
            self.assertTrue(errors, bad)
            self.assertIn(needle, "\n".join(errors), bad)

    def test_verified_at_optional_iso(self):
        def setv(v):
            return lambda d: d["athletes"][0].__setitem__("verifiedAt", v)
        self.assertEqual(self.broken(setv("2026-10-18T14:00:00Z")), [])
        self.assertEqual(self.broken(setv("")), [])
        self.assertTrue(self.broken(setv("2026-10-18")))  # no time/timezone: page compares instants
        self.assertTrue(self.broken(setv("yesterday")))

    def test_broken_variants(self):
        a0 = lambda d: d["athletes"][0]
        cases = [
            ("schemaVersion", lambda d: d.__setitem__("schemaVersion", 2)),
            ("missing", lambda d: a0(d).pop("name")),
            ("stage", lambda d: a0(d).__setitem__("stage", 4)),
            ("stage", lambda d: a0(d).__setitem__("stage", "2")),
            ("nextDate", lambda d: a0(d).__setitem__("nextDate", "18/10/2026")),
            ("start", lambda d: d["competitions"][0].__setitem__("start", "2027-02-30")),
            ("source", lambda d: a0(d).__setitem__("source", "http://x.org")),
            ("sport", lambda d: a0(d).__setitem__("sportId", "quidditch")),
            ("duplicate", lambda d: d["athletes"].append(copy.deepcopy(a0(d)))),
            ("private", lambda d: a0(d).__setitem__("updatedBy", "user-1")),
            ("private", lambda d: a0(d)["history"][0].__setitem__("verifiedBy", "user-1")),
            ("unexpected", lambda d: d["competitions"][0].__setitem__("secret", 1)),
            ("kind", lambda d: a0(d)["history"][0].__setitem__("kind", "gossip")),
            ("athlete", lambda d: d["changes"][0].__setitem__("athleteId", "ghost")),
            ("qualifying", lambda d: d["competitions"][0].__setitem__("qualifying", "yes")),
            ("max 30", lambda d: d["changes"].extend(d["changes"] * 4)),
        ]
        for needle, mutate in cases:
            errors = self.broken(mutate)
            self.assertTrue(errors, needle)
            self.assertIn(needle.strip(), "\n".join(errors), needle)


if __name__ == "__main__":
    unittest.main()
