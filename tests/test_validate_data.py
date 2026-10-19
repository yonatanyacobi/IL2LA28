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

    def test_sessions(self):
        comp = self.good["competitions"][0]
        aid = self.good["athletes"][0]["id"]
        s = {"id": "s1", "competitionId": comp["id"], "date": comp["start"], "startUtc": comp["start"] + "T06:15:00Z",
             "athleteIds": [aid], "phase": "מוקדמות", "source": "https://x.org/schedule",
             "result": "", "resultSource": "", "resultAt": ""}
        untimed = {**s, "id": "s2", "startUtc": None}
        done = {**s, "id": "s0", "startUtc": comp["start"] + "T05:00:00Z", "result": "מקום 3",
                "resultSource": "https://x.org/results", "resultAt": comp["start"] + "T09:00:00Z"}
        with_s = lambda rows: lambda d: d.__setitem__("sessions", rows)
        self.assertEqual(self.broken(with_s([done, s, untimed])), [])
        self.assertEqual(self.broken(with_s([])), [])
        cases = [
            ("keys must be exactly", [{**s, "quota": True}]),
            ("keys must be exactly", [{k: v for k, v in s.items() if k != "resultAt"}]),
            ("duplicate", [s, {**s}]),
            ("unknown competition", [{**s, "competitionId": "nope"}]),
            ("outside", [{**s, "date": "1999-01-01"}]),
            ("startUtc", [{**s, "startUtc": comp["start"] + "T09:15:00+03:00"}]),
            ("athleteIds", [{**s, "athleteIds": []}]),
            ("athleteIds", [{**s, "athleteIds": ["ghost"]}]),
            ("athleteIds", [{**s, "athleteIds": [aid, aid]}]),
            ("phase", [{**s, "phase": " "}]),
            ("phase", [{**s, "phase": "א" * 121}]),
            ("source", [{**s, "source": "http://x.org"}]),
            ("resultSource", [{**done, "resultSource": ""}]),
            ("resultAt", [{**done, "resultAt": ""}]),
            ("must be \"\" without a result", [{**s, "resultSource": "https://x.org/r"}]),
            ("not in order", [untimed, s]),
            ("sessions: expected a list", {"s1": s}),
        ]
        for needle, rows in cases:
            errors = self.broken(with_s(rows))
            self.assertTrue(errors, needle)
            self.assertIn(needle, "\n".join(errors), needle)

    def test_olympic_rank_fields(self):
        setr = lambda **kw: lambda d: d["athletes"][0].update(kw)
        O, D = "IJF Olympic Ranking List", "2026-10-13"
        for ok in [{}, dict(olympicRankNum=3, olympicRankList=O, olympicRankAsOf=D),
                   dict(olympicRankNum=None, olympicRankList="", olympicRankAsOf=""),
                   dict(rankNum=1, rankList="IJF World Ranking List", rankAsOf=D, olympicRankNum=3, olympicRankList=O,
                        olympicRankAsOf=D)]:
            self.assertEqual(self.broken(setr(**ok)), [], ok)
        for bad, needle in [(dict(olympicRankNum=0, olympicRankList=O, olympicRankAsOf=D), "olympicRankNum"),
                            (dict(olympicRankNum="3", olympicRankList=O, olympicRankAsOf=D), "olympicRankNum"),
                            (dict(olympicRankNum=4, olympicRankAsOf=D), "olympicRankList: required"),
                            (dict(olympicRankNum=4, olympicRankList=O), "olympicRankAsOf: YYYY-MM-DD required"),
                            (dict(olympicRankList="x" * 81), "olympicRankList"),
                            (dict(olympicRankAsOf="13.10.2026"), "olympicRankAsOf"),
                            (dict(olympicRank=3), "unexpected key")]:
            errors = self.broken(setr(**bad))
            self.assertTrue(errors, bad)
            self.assertIn(needle, "\n".join(errors), bad)

    def test_rank_list_without_as_of_warns(self):
        # A warning, not an error: export_data leaves exactly this for a malformed DB date (test_export.test_rank_fields).
        for p in ("olympicRank", "rank"):
            d = copy.deepcopy(self.good)
            d["athletes"][0].update({p + "Num": None, p + "List": "IJF Olympic Ranking List", p + "AsOf": ""})
            self.assertEqual(validate_data.validate(d), [], p)
            self.assertTrue(any(f"{p}AsOf: missing although {p}List is set" in w for w in validate_data.warnings(d)), p)
            d["athletes"][0][p + "List"] = ""
            self.assertFalse(any(d["athletes"][0]["id"] + f").{p}AsOf: missing" in w for w in validate_data.warnings(d)), p)

    def test_rank_as_of_vs_export_day(self):
        # 21:30Z on 18.10 is already 19.10 in Israel, so both days count as "the export day".
        def at(stamp, **kw):
            d = copy.deepcopy(self.good)
            d["generatedAt"] = stamp
            for a in d["athletes"]:   # the real fixture carries rankAsOf warnings of its own; pin a clean baseline
                for p in ("rank", "olympicRank"):
                    if a.get(p + "AsOf") or a.get(p + "List"):
                        a[p + "AsOf"] = "2026-10-12"
            d["athletes"][0].update(kw)
            return validate_data.validate(d), validate_data.warnings(d)
        ijf = dict(rankNum=5, rankList="IJF World Ranking List", rank="5 בעולם")
        self.assertEqual(at("2026-10-18T21:30:00Z", **ijf, rankAsOf="2026-10-12"), ([], []))
        for day in ("2026-10-18", "2026-10-19"):
            errors, warns = at("2026-10-18T21:30:00Z", **ijf, rankAsOf=day)
            self.assertEqual(errors, [], day)
            self.assertEqual(len(warns), 1, day)
            self.assertIn(f"rankAsOf: {day} is the export day; check the date printed on 'IJF World Ranking List'", warns[0])
        errors, _ = at("2026-10-18T21:30:00Z", **ijf, rankAsOf="2026-10-20")
        self.assertIn("rankAsOf: 2026-10-20 is after the export (2026-10-19)", "\n".join(errors))
        _, warns = at("2026-10-18T09:00:00Z", olympicRankNum=7, olympicRankList="IJF Olympic Ranking List",
                      olympicRankAsOf="2026-10-18")
        self.assertTrue(warns and "olympicRankAsOf" in warns[0])
        # No rankNum: nothing is sorted by that date, so no warning.
        self.assertEqual(at("2026-10-18T09:00:00Z", rankNum=None, rankList="", rankAsOf="2026-10-18")[1], [])

    def test_cli_warns_without_failing(self):
        # The fixture (export of 18.10, 17:16Z) carries a real data gap: amit-vales has a rankList but no rankAsOf.
        out = subprocess.run([sys.executable, os.path.join(HERE, "..", "job", "validate_data.py"), FIXTURE],
                             capture_output=True, text=True)
        self.assertEqual(out.returncode, 0)
        self.assertTrue(any(l.startswith("WARN: ") and "amit-vales" in l and "rankAsOf: missing" in l for l in out.stdout.splitlines()))
        self.assertTrue(out.stdout.rstrip().endswith("OK: " + FIXTURE))

    def test_history_caps_per_kind(self):
        res = lambda n: [{"at": "2026-01-01", "kind": "result", "text": f"r{i}", "source": "https://x.org"} for i in range(n)]
        oth = lambda n: [{"at": "2026-02-01", "kind": "rank", "text": f"o{i}", "source": ""} for i in range(n)]
        set_h = lambda h: lambda d: d["athletes"][0].__setitem__("history", h)
        self.assertEqual(self.broken(set_h(res(60) + oth(10))), [])
        self.assertIn("11 non-result entries, max 10", "\n".join(self.broken(set_h(res(5) + oth(11)))))
        self.assertIn("61 result entries, max 60", "\n".join(self.broken(set_h(res(61)))))

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



class CrossRecordTest(unittest.TestCase):
    """xref_warnings(): gaps across collections, warnings only, on the real fixture (export of 19.10)."""
    @classmethod
    def setUpClass(cls):
        with open(FIXTURE, encoding="utf-8") as f:
            cls.good = json.load(f)

    def warn(self, mutate=None):
        d = copy.deepcopy(self.good)
        if mutate:
            mutate(d)
        return validate_data.xref_warnings(d)

    def athlete(self, d, aid):
        return next(a for a in d["athletes"] if a["id"] == aid)

    def test_fixture_gaps(self):
        """The 19.10 export: the starts Yael's sweep found, plus the two lacrosse teams."""
        gaps = [w.split("(")[1].split(")")[0] for w in self.warn() if ".nextDate:" in w]
        self.assertEqual(sorted(gaps), ["artem-dolgopyat", "israel-lacrosse-men-sixes", "israel-lacrosse-women-sixes",
                                        "noam-berkovich", "shachar-sagiv"])
        self.assertIn("athletes[88](shachar-sagiv).nextDate: 2026-10-24 is in tri-world-cup-tongyeong-2026 but no session"
                      " lists them that day", self.warn())
        self.assertEqual(validate_data.validate(self.good), [], "warnings never make the file invalid")

    def test_session_on_the_israel_day_covers(self):
        def add(start):
            def m(d):
                d["sessions"].append({"id": "x", "competitionId": "tri-world-cup-tongyeong-2026", "date": "2026-10-24",
                                      "startUtc": start, "athleteIds": ["shachar-sagiv"], "phase": "x", "source": "https://x.org",
                                      "result": "", "resultSource": "", "resultAt": ""})
            return m
        sagiv = lambda w: any("(shachar-sagiv).nextDate" in x for x in w)
        self.assertFalse(sagiv(self.warn(add("2026-10-24T02:00:00Z"))), "05:00 in Israel on the 24th")
        self.assertFalse(sagiv(self.warn(add(None))), "untimed: its date")
        self.assertTrue(sagiv(self.warn(add("2026-10-23T20:00:00Z"))), "23:00 on the 23rd in Israel doesn't cover the 24th")

    def test_only_upcoming_and_known_competitions(self):
        past = lambda d: self.athlete(d, "shachar-sagiv").__setitem__("nextDate", "2026-10-01")
        self.assertFalse(any("shachar-sagiv" in w for w in self.warn(past)), "a past nextDate isn't this check's job")
        nowhere = lambda d: self.athlete(d, "shachar-sagiv").__setitem__("nextDate", "2026-12-30")
        self.assertFalse(any("shachar-sagiv" in w for w in self.warn(nowhere)), "no competition that day: nothing to match")
        def series(d):
            for c in d["competitions"]:
                if c["id"] == "tri-world-cup-tongyeong-2026":
                    c["start"], c["end"] = "2026-09-01", "2026-12-31"   # longer than 31 days: a series
        self.assertFalse(any("shachar-sagiv" in w for w in self.warn(series)))

    def test_qualifying_needs_a_source(self):
        def strip(d):
            d["competitions"][0].update(qualifying=True, source="")
        w = self.warn(strip)
        cid = self.good["competitions"][0]["id"]
        self.assertIn(f"competitions[0]({cid}).source: a qualifying competition needs its official source", w)
        self.assertFalse(any(".source:" in x for x in self.warn()), "every qualifying competition has one today")

    def test_rank_as_of_after_export(self):
        def future(d):
            self.athlete(d, "raz-hershko").update(rankAsOf="2026-10-25", olympicRankNum=2, olympicRankList="IJF Olympic Ranking List",
                                                   olympicRankAsOf="2026-11-01")
        w = [x for x in self.warn(future) if "raz-hershko" in x]
        self.assertEqual(len(w), 2, w)
        self.assertTrue(all("is after the export (2026-10-19)" in x for x in w), w)
        same = lambda d: self.athlete(d, "raz-hershko").update(rankAsOf="2026-10-19")
        self.assertFalse(any("raz-hershko" in x for x in self.warn(same)), "the export day itself is warnings()'s case")

    def test_session_links_are_errors_already(self):
        """Check 1 (a session's competition and athletes exist) is validate()'s, as an error."""
        def bad(d):
            d["sessions"][0] = {**d["sessions"][0], "competitionId": "nope"}
        d = copy.deepcopy(self.good)
        bad(d)
        self.assertTrue(any("unknown competition" in e for e in validate_data.validate(d)))

    def test_cli_prints_them_and_stays_ok(self):
        r = subprocess.run([sys.executable, os.path.join(HERE, "..", "job", "validate_data.py"), FIXTURE], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0)
        self.assertIn("WARN: athletes[88](shachar-sagiv).nextDate:", r.stdout)


class CopyRulesTest(unittest.TestCase):
    """copy_warnings(): copy-rules §1/§5 slips in Hebrew strings (LA28, dashed scores, ASCII ' and ")."""

    def warn(self, text, key="notes"):
        return validate_data.copy_warnings({"athletes": [{"id": "x", key: text}]})

    def test_fixture_slips(self):
        """The 19.10 fixture predates the DB fixes of 19.10, so it still carries them."""
        with open(FIXTURE, encoding="utf-8") as f:
            w = validate_data.copy_warnings(json.load(f))
        hits = sorted({x.split(":")[0] for x in w})
        self.assertIn("athletes[44](israel-lacrosse-men-sixes).notes", hits)
        self.assertIn("athletes[67](nimrod-krivitsky).notes", hits)
        self.assertIn("competitions[28](issf-wch-doha-2026).notes", hits)
        self.assertIn("sports[29](trampoline).window.summary", hits)   # 'מאי 2027' in ASCII quotes
        self.assertEqual(sum("LA28" in x for x in w), 10)

    def test_flags(self):
        for text in ("בדרך ל-LA28", "בדרך ל־LA 28", "9-8 על איטליה", "ניצחון 78–65", "(0-2 לברקאי)", "90-54",
                     "ארה\"ב", "צ'לנג'", "\"מכסה הושגה\""):
            self.assertTrue(self.warn(text + " עברית"), text)

    def test_allows(self):
        for text in ("ניצחון 78:65 על פולין", "סאלו, 10–18.11.2026", "7–12.9", "14:30–16:00", "14:30 – 16:00",
                     "17–25 באוקטובר", "2026-10-19", "ב־2028", "ארה״ב", "„מכסה הושגה”", "2:06:00 / 2:23:20",
                     "מרוץ 4x100", "Hlavní 9-8"):
            self.assertEqual(self.warn(text if "Hlav" in text else text + " עברית"), [], text)
        self.assertEqual(self.warn("ל-LA28 עברית", key="source"), [], "sources are URLs, not copy")

    def test_cli_prints_them_and_stays_ok(self):
        r = subprocess.run([sys.executable, os.path.join(HERE, "..", "job", "validate_data.py"), FIXTURE],
                           capture_output=True, text=True)
        self.assertEqual(r.returncode, 0)
        self.assertIn("WARN: athletes[67](nimrod-krivitsky).notes: a dash between numbers", r.stdout)


if __name__ == "__main__":
    unittest.main()
