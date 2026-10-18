import json, os, subprocess, sys, tempfile, unittest
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
JOB = os.path.join(HERE, "..", "job")
sys.path.insert(0, JOB)
import run_log as rl  # noqa: E402

AT = lambda s: datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
START = AT("2026-10-19T04:13:05Z")    # 07:13 in Israel
END = AT("2026-10-19T04:41:00Z")


def run(**kw):
    base = {"id": "2026-10-19", "started": "2026-10-19T04:13:05Z", "published": True,
            "sportsChecked": ["judo", "triathlon"], "writes": [{"collection": "athletes", "id": "raz-hershko", "fields": ["rank"]}],
            "proposals": [], "errors": [], "warnings": ["לעדכן quotas.json: גביע העולם טונגיונג"],
            "changes": ["ג׳ודו: רז הרשקו מדורגת ראשונה בעולם."],
            "sources": [{"source": "https://www.ijf.org/wrl", "checkedAt": "2026-10-19T04:20:00Z", "sportId": "judo"}]}
    return {**base, **kw}


class RunLogTest(unittest.TestCase):
    def test_now_is_utc_and_israel_date(self):
        self.assertEqual(rl.now(START), {"now": "2026-10-19T04:13:05Z", "today": "2026-10-19"})
        # 23:30 UTC on the 18th is already the 19th in Israel: the run id follows Israel's calendar.
        self.assertEqual(rl.now(AT("2026-10-18T23:30:00Z"))["today"], "2026-10-19")

    def test_start(self):
        self.assertEqual(rl.start(START), {"id": "2026-10-19", "doc": {"status": "started", "started": "2026-10-19T04:13:05Z"}})

    def test_finish_full_doc(self):
        out = rl.finish(run(), END)
        self.assertEqual(out["id"], "2026-10-19")
        d = out["doc"]
        self.assertEqual((d["status"], d["started"], d["ended"], d["published"]),
                         ("done", "2026-10-19T04:13:05Z", "2026-10-19T04:41:00Z", True))
        self.assertEqual(set(d), {"status", "started", "ended", "published", "writes", "sources", "sportsChecked",
                                  "proposals", "errors", "warnings", "changes"})
        self.assertEqual(d["sources"][0]["checkedAt"], "2026-10-19T04:20:00Z")

    def test_status_derived_or_given(self):
        self.assertEqual(rl.finish(run(errors=["export refused"], published=False), END)["doc"]["status"], "failed")
        self.assertEqual(rl.finish(run(errors=["one source down"]), END)["doc"]["status"], "done")
        self.assertEqual(rl.finish(run(status="failed"), END)["doc"]["status"], "failed")
        minimal = {"id": "2026-10-19", "started": "2026-10-19T04:13:05Z", "published": False}
        d = rl.finish(minimal, END)["doc"]
        self.assertEqual((d["status"], d["changes"], d["sources"]), ("done", [], []))

    def test_refusals(self):
        cases = [
            ("unknown key", run(startedAt="x")),
            ("id must be", run(id="19.10.2026")),
            ("started must be", run(started="2026-10-19T07:13:05")),     # Israel time without Z: the lastRun bug
            ("started must be", run(started="2026-10-19T07:13:05+03:00")),
            ("published", run(published="yes")),
            ("changes", run(changes=["", "x"])),
            ("errors", run(errors="boom")),
            ("writes", run(writes=[{"collection": "athletes", "id": "a"}])),
            ("sources[0]", run(sources=[{"source": "http://x.org", "checkedAt": "2026-10-19T04:20:00Z"}])),
            ("sources[0]", run(sources=[{"source": "https://x.org", "checkedAt": "today"}])),
            ("status must be", run(status="started")),
        ]
        for needle, r in cases:
            with self.assertRaises(ValueError) as cm:
                rl.finish(r, END)
            self.assertIn(needle, str(cm.exception), needle)
        with self.assertRaises(ValueError):
            rl.finish(run(), AT("2026-10-19T04:00:00Z"))   # ended before started

    def test_cli(self):
        script = os.path.join(JOB, "run_log.py")
        out = json.loads(subprocess.run([sys.executable, script, "now"], capture_output=True, text=True).stdout)
        self.assertRegex(out["now"], r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$")
        started = json.loads(subprocess.run([sys.executable, script, "start"], capture_output=True, text=True).stdout)
        with tempfile.TemporaryDirectory() as tmp:
            p = os.path.join(tmp, "run.json")
            with open(p, "w", encoding="utf-8") as f:
                json.dump(run(id=started["id"], started=started["doc"]["started"]), f, ensure_ascii=False)
            r = subprocess.run([sys.executable, script, "finish", p], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertEqual(json.loads(r.stdout)["doc"]["status"], "done")
            with open(p, "w", encoding="utf-8") as f:
                json.dump(run(published="no"), f)
            r = subprocess.run([sys.executable, script, "finish", p], capture_output=True, text=True)
            self.assertEqual(r.returncode, 2)
            self.assertIn("REFUSED", r.stderr)
        self.assertEqual(subprocess.run([sys.executable, script], capture_output=True).returncode, 1)


if __name__ == "__main__":
    unittest.main()
