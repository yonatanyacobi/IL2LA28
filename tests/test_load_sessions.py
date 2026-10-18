import copy, json, os, subprocess, sys, tempfile, time, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
JOB = os.path.join(HERE, "..", "job")
sys.path.insert(0, JOB)
import load_sessions as ls  # noqa: E402

COMPS = {"ag-worlds-2026": {"sportId": "artistic-gymnastics", "start": "2026-10-17", "end": "2026-10-25"},
         "judo-gs-abu-dhabi-2026": {"sportId": "judo", "start": "2026-10-29", "end": "2026-10-31"}}
ATHLETES = {"yali-shoshani": {"name": "יהלי שושני"}, "raz-hershko": {"name": "רז הרשקו"},
            "matan-roditi": {"name": "מתן רודיטי", "archived": True}}
SRC = "https://gym.longinestiming.com/2026/Artistic-17247/en-us/Default/Schedule"


def item(**kw):
    base = {"id": "ag-worlds-2026-20261019-wag-q7", "competitionId": "ag-worlds-2026", "date": "2026-10-19",
            "timeLocal": "16:00", "tz": "Europe/Amsterdam", "athleteIds": ["yali-shoshani"],
            "phase": "מוקדמות נשים, סבב 7 (מקבילים מדורגים)", "source": SRC, "review": SIGNED}
    return {**base, **kw}


SIGNED = {"status": "ok", "by": "tamar", "at": "2026-10-19"}
JUDO = item(id="judo-gs-abu-dhabi-2026-20261029-w57", competitionId="judo-gs-abu-dhabi-2026", date="2026-10-29",
            timeLocal="09:30", tz="Asia/Dubai", athleteIds=["raz-hershko"], phase="מוקדמות 57- ק״ג",
            source="https://www.ijf.org/competition/abu-dhabi-2026/schedule")


def batch(sessions, **top):
    return {"sessions": sessions, **top}


def run(batches, existing=None):
    return ls.plan([(n, copy.deepcopy(b)) for n, b in batches], COMPS, ATHLETES, existing or {})


class LoadSessionsTest(unittest.TestCase):
    def test_signed_batch_creates_with_utc_preview(self):
        out = run([("roni", batch([item(), JUDO]))])
        self.assertEqual(out["errors"], [])
        self.assertEqual([c["doc_id"] for c in out["creates"]], [item()["id"], JUDO["id"]])
        c = out["creates"][0]
        self.assertEqual((c["op"], c["collection"]), ("set", "sessions"))
        self.assertEqual(c["data"], {**{k: item().get(k, "") for k in ls.DB_FIELDS}, "review": SIGNED,
                                     "result": "", "resultSource": "", "resultAt": "", "loadedFrom": "roni"})
        # Roni's table: 17:00 Israel on 19.10 (Rotterdam +1); Abu Dhabi 09:30 = 07:30 Israel after DST on 25.10.
        self.assertEqual(out["preview"], [
            {"id": item()["id"], "startUtc": "2026-10-19T14:00:00Z", "israelTime": "2026-10-19 17:00"},
            {"id": JUDO["id"], "startUtc": "2026-10-29T05:30:00Z", "israelTime": "2026-10-29 07:30"}])

    def test_untimed_session(self):
        out = run([("b", batch([item(timeLocal="", tz="")]))])
        self.assertEqual((out["errors"], out["preview"][0]["startUtc"], out["preview"][0]["israelTime"]), ([], None, ""))

    def test_unsigned_batches_are_skipped_not_loaded(self):
        for review in ({"status": "unchecked", "by": "roni", "at": "2026-10-18"}, {"status": "ok", "by": "", "at": "2026-10-19"},
                       {"status": "ok", "by": "tamar", "at": "19.10"}, {"status": "partial"}):
            out = run([("b", batch([item(review=review)]))])
            self.assertEqual((out["errors"], out["creates"], len(out["skipped"])), ([], [], 1), review)

    def test_existing_unchanged_and_changed_never_touch_results(self):
        db_same = {**{k: item().get(k, "") for k in ls.DB_FIELDS}, "review": SIGNED, "result": "", "resultSource": "", "resultAt": ""}
        db_old = {**{k: JUDO.get(k, "") for k in ls.DB_FIELDS}, "review": SIGNED, "timeLocal": "10:00", "result": "מקום 3",
                  "resultSource": "https://ijf.org/r", "resultAt": "2026-10-29T12:00:00Z"}
        out = run([("b", batch([item(), JUDO]))], {item()["id"]: db_same, JUDO["id"]: db_old})
        self.assertEqual((out["unchanged"], out["creates"]), ([item()["id"]], []))
        self.assertEqual(out["changes"], [{"doc_id": JUDO["id"], "fields": {"timeLocal": "09:30", "loadedFrom": "b"}}])

    def test_rules(self):
        cases = [
            ("must be empty", item(result="מקום 1")),
            ("must be empty", item(resultAt="2026-10-19T12:00:00Z")),
            ("missing ['tz']", {k: v for k, v in item().items() if k != "tz"}),
            ("missing ['review']", {k: v for k, v in item().items() if k != "review"}),
            ("unknown ['quota']", item(quota=True)),
            ("review", item(review="ok")),
            ("notes", item(notes=5)),
            ("not in the DB", item(competitionId="nope", id="nope-20261019-x")),
            ("outside", item(date="2026-10-28", id="ag-worlds-2026-20261028-x")),
            ("date: expected", item(date="19.10.2026")),
            (".id: expected", item(id="ag-worlds-2026-20261020-wag-q7")),   # date in id doesn't match
            (".id: expected", item(id="ag-worlds-2026-20261019-WAG Q7")),
            ("timeLocal", item(timeLocal="4pm")),
            ("tz", item(tz="")),
            ("tz", item(tz="Israel Time")),
            ("timeLocal", item(timeLocal="", tz="Asia/Qatar")),
            ("athleteIds", item(athleteIds=[])),
            ("not an athlete", item(athleteIds=["ghost"])),
            ("archived", item(athleteIds=["matan-roditi"])),
            ("unique", item(athleteIds=["yali-shoshani", "yali-shoshani"])),
            ("phase", item(phase=" ")),
            ("phase", item(phase="א" * 121)),
            ("source", item(source="http://x.org")),
        ]
        for needle, s in cases:
            out = run([("b", batch([s]))])
            self.assertTrue(out["errors"], needle)
            self.assertIn(needle, "\n".join(out["errors"]), (needle, out["errors"]))
            self.assertEqual(out["creates"], [], needle)

    def test_duplicates_and_bad_batches(self):
        out = run([("a", batch([item()])), ("b", batch([item()]))])
        self.assertIn("duplicate of a.sessions[0]", "\n".join(out["errors"]))
        for bad in ({"sessions": {}}, {"sessions": [item()], "owner": "x"}, [item()], {}):
            self.assertTrue(run([("b", bad)])["errors"], bad)

    def test_cli(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = os.path.join(tmp, "db")
            for coll, docs in (("competitions", COMPS), ("athletes", ATHLETES)):
                os.makedirs(os.path.join(db, coll))
                for i, (k, v) in enumerate(docs.items()):
                    with open(os.path.join(db, coll, k + ".json"), "w", encoding="utf-8") as f:
                        json.dump({"id": k, "data": v} if i % 2 else v, f, ensure_ascii=False)
            good, bad = os.path.join(tmp, "roni.json"), os.path.join(tmp, "bad.json")
            for p, b in ((good, batch([item(), JUDO])), (bad, batch([item(source="http://x")]))):
                with open(p, "w", encoding="utf-8") as f:
                    json.dump(b, f, ensure_ascii=False)
            script = os.path.join(JOB, "load_sessions.py")
            r = subprocess.run([sys.executable, script, db, good], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            self.assertEqual(len(json.loads(r.stdout)["creates"]), 2)
            self.assertIn("errors=0 creates=2", r.stderr)
            r = subprocess.run([sys.executable, script, db, good, bad], capture_output=True, text=True)
            self.assertEqual(r.returncode, 1)
            r = subprocess.run([sys.executable, script, good], capture_output=True, text=True)
            self.assertEqual(r.returncode, 2)

    def dump(self, tmp, age_min):
        """A dump dir whose files were all written age_min minutes ago."""
        db = os.path.join(tmp, "db")
        for coll, docs in (("competitions", COMPS), ("athletes", ATHLETES)):
            os.makedirs(os.path.join(db, coll))
            for k, v in docs.items():
                p = os.path.join(db, coll, k + ".json")
                with open(p, "w", encoding="utf-8") as f:
                    json.dump(v, f, ensure_ascii=False)
                t = time.time() - age_min * 60
                os.utime(p, (t, t))
        return db

    def test_dump_age(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = self.dump(tmp, 45)
            os.utime(os.path.join(db, "athletes", "raz-hershko.json"))   # the newest file sets the age
            self.assertLess(ls.dump_age_min(db), 1)
            os.makedirs(os.path.join(tmp, "empty"))
            self.assertIsNone(ls.dump_age_min(os.path.join(tmp, "empty")))
        self.assertEqual((ls.fmt_age(47.4), ls.fmt_age(185)), ("47 min", "3.1 h"))
        out = {"errors": ["a.competitionId: not in the DB: 'x'", "a.athleteIds: 'y' is not an athlete in the DB",
                          "a.source: expected the official https schedule"]}
        self.assertEqual(ls.stale_hints(copy.deepcopy(out), 47)["errors"],
                         ["a.competitionId: not in the DB: 'x' (dump may be stale: age 47 min)",
                          "a.athleteIds: 'y' is not an athlete in the DB (dump may be stale: age 47 min)",
                          "a.source: expected the official https schedule"])
        self.assertEqual(ls.stale_hints(copy.deepcopy(out), None), out)

    def test_cli_stale_dump(self):
        script = os.path.join(JOB, "load_sessions.py")
        with tempfile.TemporaryDirectory() as tmp:
            db, good = self.dump(tmp, 45), os.path.join(tmp, "roni.json")
            new_athlete = item(athleteIds=["new-judoka"])   # written to the DB after this dump
            with open(good, "w", encoding="utf-8") as f:
                json.dump(batch([new_athlete]), f, ensure_ascii=False)
            r = subprocess.run([sys.executable, script, db, good], capture_output=True, text=True)
            self.assertEqual(r.returncode, 1)
            self.assertRegex(r.stderr, r"WARN: the DB dump .* is 45 min old \(newest file\), over --max-age 30 min")
            self.assertIn("'new-judoka' is not an athlete in the DB (dump may be stale: age 45 min)", r.stdout)
            r = subprocess.run([sys.executable, script, "--max-age", "60", db, good], capture_output=True, text=True)
            self.assertNotIn("WARN", r.stderr)
            self.assertIn("(dump may be stale: age 45 min)", r.stdout, "the hint names the age even under --max-age")
            for bad in (["--max-age"], ["--max-age", "soon", db, good]):
                self.assertEqual(subprocess.run([sys.executable, script, *bad], capture_output=True).returncode, 2, bad)


if __name__ == "__main__":
    unittest.main()
