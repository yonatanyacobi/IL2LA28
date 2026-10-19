import json, os, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
JOB = os.path.join(HERE, "..", "job")
sys.path.insert(0, JOB)
import session_gaps as sg  # noqa: E402

TODAY = "2026-10-19"
COMPS = {
    "judo-gs-abu-dhabi-2026": {"sportId": "judo", "name": "גרנד סלאם אבו דאבי", "start": "2026-10-29", "end": "2026-10-31"},
    "judo-series": {"sportId": "judo", "name": "סדרה", "start": "2026-03-01", "end": "2027-06-30"},     # > 31 days
    "issf-wch-doha-2026": {"sportId": "shooting", "name": "אליפות העולם בקליעה", "start": "2026-11-01", "end": "2026-11-14"},
}
ATHLETES = {
    "raz-hershko": {"name": "רז הרשקו", "sportId": "judo", "nextDate": "2026-10-29"},
    "gefen-primo": {"name": "גפן פרימו", "sportId": "judo", "nextDate": "2026-10-29"},
    "timna-nelson-levy": {"name": "תמנע נלסון לוי", "sportId": "judo", "nextDate": "2026-10-30"},
    "sergey-richter": {"name": "סרגיי ריכטר", "sportId": "shooting", "nextDate": "2026-11-03"},   # day 15: outside
    "matan-roditi": {"name": "מתן רודיטי", "sportId": "judo", "nextDate": "2026-10-29", "archived": True},
    "maru-teferi": {"name": "מרו טפרי", "sportId": "athletics", "nextDate": "2026-10-25", "next": "מרתון פרנקפורט"},
    "past": {"name": "עבר", "sportId": "judo", "nextDate": "2026-10-18"},
    "no-date": {"name": "בלי תאריך", "sportId": "judo", "nextDate": ""},
}
OK = {"status": "ok", "by": "tamar", "at": "2026-10-19"}


def sess(cid, day, ids, review=OK):
    return {"competitionId": cid, "date": day, "athleteIds": ids, "review": review}


class SessionGapsTest(unittest.TestCase):
    def test_gaps(self):
        sessions = {
            "s1": sess("judo-gs-abu-dhabi-2026", "2026-10-29", ["raz-hershko"]),                 # Raz covered
            "s2": sess("judo-gs-abu-dhabi-2026", "2026-10-30", ["timna-nelson-levy"], {"status": "unchecked"}),
        }
        self.assertEqual(sg.gaps(ATHLETES, COMPS, sessions, TODAY), [
            "חסר סשן: מרו טפרי · מרתון פרנקפורט (לא במאגר) · 2026-10-25",
            "חסר סשן: גפן פרימו · גרנד סלאם אבו דאבי · 2026-10-29",           # a teammate's session doesn't count
            "חסר סשן: תמנע נלסון לוי · גרנד סלאם אבו דאבי · 2026-10-30 (ממתין לבדיקה)",
        ])

    def test_all_covered_and_window(self):
        sessions = {f"s{i}": sess("judo-gs-abu-dhabi-2026", d, ids) for i, (d, ids) in enumerate(
            [("2026-10-29", ["raz-hershko", "gefen-primo"]), ("2026-10-30", ["timna-nelson-levy"])])}
        athletes = {k: v for k, v in ATHLETES.items() if k != "maru-teferi"}
        self.assertEqual(sg.gaps(athletes, COMPS, sessions, TODAY), [])
        self.assertIn("סרגיי ריכטר", "\n".join(sg.gaps(athletes, COMPS, sessions, TODAY, days=15)))
        self.assertEqual(sg.gaps(athletes, COMPS, sessions, "2026-11-04"), [], "every nextDate already past")

    def test_same_rule_as_admin_nosession(self):
        """#294's list: any signed session on that Israel day covers the athlete, whatever its competition."""
        other = {"s": sess("judo-series", "2026-10-29", ["gefen-primo"])}
        self.assertNotIn("גפן פרימו", "\n".join(sg.gaps(ATHLETES, COMPS, other, TODAY)))
        # 23:30 in Abu Dhabi on 28.10 is 22:30 in Israel: still the 28th, so it doesn't cover the 29th...
        late = {"s": {**sess("judo-gs-abu-dhabi-2026", "2026-10-28", ["gefen-primo"]), "timeLocal": "23:30", "tz": "Asia/Dubai"}}
        self.assertIn("גפן פרימו", "\n".join(sg.gaps(ATHLETES, COMPS, late, TODAY)))
        # ...but 23:30 in New York on the 28th is 05:30 on the 29th in Israel, so it does.
        west = {"s": {**sess("judo-gs-abu-dhabi-2026", "2026-10-28", ["gefen-primo"]), "timeLocal": "23:30", "tz": "America/New_York"}}
        self.assertNotIn("גפן פרימו", "\n".join(sg.gaps(ATHLETES, COMPS, west, TODAY)))

    def test_competition_choice(self):
        self.assertEqual(sg.competition_of({"sportId": "judo", "nextDate": "2026-10-29"}, COMPS), "judo-gs-abu-dhabi-2026")
        self.assertIsNone(sg.competition_of({"sportId": "judo", "nextDate": "2026-12-01"}, COMPS), "only the long series")

    def test_cli_reads_dump_and_writes_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            for coll, docs in (("athletes", ATHLETES), ("competitions", COMPS),
                               ("sessions", {"s1": sess("judo-gs-abu-dhabi-2026", "2026-10-29", ["raz-hershko"])})):
                os.makedirs(os.path.join(tmp, coll))
                for i, (k, v) in enumerate(docs.items()):
                    with open(os.path.join(tmp, coll, k + ".json"), "w", encoding="utf-8") as f:
                        json.dump({"id": k, "data": v} if i % 2 else v, f, ensure_ascii=False)
            before = sorted(os.listdir(tmp))
            r = subprocess.run([sys.executable, os.path.join(JOB, "session_gaps.py"), tmp, "--today", TODAY],
                               capture_output=True, text=True)
            self.assertEqual(sorted(os.listdir(tmp)), before)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(len(r.stdout.splitlines()), 3)
        self.assertTrue(all(l.startswith("חסר סשן: ") for l in r.stdout.splitlines()))
        self.assertEqual(subprocess.run([sys.executable, os.path.join(JOB, "session_gaps.py")]).returncode, 1)


if __name__ == "__main__":
    unittest.main()
