import json, os, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
JOB = os.path.join(HERE, "..", "job")
sys.path.insert(0, JOB)
import athlete_patch as ap  # noqa: E402

NOW = "2026-10-19T04:13:00Z"
CUR = {"name": "רז הרשקו", "rank": "1 בעולם (IJF, אוק׳ 2026)", "next": "גרנד סלאם אבו דאבי", "nextDate": "2026-10-29",
       "notes": "זהב באליפות העולם 2025", "event": "+78 ק״ג", "source": "https://www.ijf.org/judoka/1",
       "rankNum": 1, "rankList": "IJF World Ranking List", "rankAsOf": "2026-10-13",
       "updatedAt": "2026-10-18T09:00:00Z", "updatedBy": "auto", "verifiedAt": "2026-10-18T12:00:00Z",
       "verifiedBy": "u1", "history": [{"at": "2026-10-18", "kind": "start", "text": "נכנסה למעקב", "source": ""}]}


class AthletePatchTest(unittest.TestCase):
    def test_unchanged_rewrite_is_empty(self):
        same = {k: CUR[k] for k in ap.VISIBLE + ap.SILENT}
        self.assertEqual(ap.build(CUR, {**same, "source": "https://other.example/new-url"}, NOW), {})

    def test_cosmetic_differences_are_not_changes(self):
        proposed = {"rank": "  1 בעולם (IJF, אוק' 2026) ", "rankNum": "1", "notes": CUR["notes"] + "\n",
                    "historyEntry": {"at": "2026-10-19", "kind": "rank", "text": "1 בעולם", "source": ""}}
        self.assertEqual(ap.build(CUR, proposed, NOW), {})  # apostrophe vs geresh, padding, "1" vs 1

    def test_silent_fields_update_without_bumping(self):
        self.assertEqual(ap.build(CUR, {"rankNum": 1, "rankAsOf": "2026-10-20"}, NOW), {"rankAsOf": "2026-10-20"})

    def test_visible_change_bumps_and_carries_source_and_history(self):
        entry = {"at": "2026-10-19", "kind": "rank", "text": "2 בעולם", "source": "https://ijf.org/r"}
        patch = ap.build(CUR, {"rank": "2 בעולם", "rankNum": 2, "rankAsOf": "2026-10-20", "nextDate": "2026-10-29",
                               "source": "https://ijf.org/r", "historyEntry": entry}, NOW)
        self.assertEqual(patch, {"rank": "2 בעולם", "rankNum": 2, "rankAsOf": "2026-10-20", "updatedAt": NOW,
                                 "updatedBy": "auto", "source": "https://ijf.org/r", "history": CUR["history"] + [entry]})
        for k in ("verifiedAt", "verifiedBy", "nextDate"):
            self.assertNotIn(k, patch)

    def test_history_capped(self):
        cur = {**CUR, "history": [{"at": f"2026-01-{i:02d}"} for i in range(1, 21)]}
        h = ap.build(cur, {"notes": "חדש", "historyEntry": {"at": "2026-10-19"}}, NOW)["history"]
        self.assertEqual((len(h), h[0]["at"], h[-1]["at"]), (20, "2026-01-02", "2026-10-19"))

    def test_new_value_on_empty_field_is_a_change(self):
        self.assertIn("updatedAt", ap.build({**CUR, "next": ""}, {"next": "גביע העולם"}, NOW))

    def test_refuses_non_direct_fields(self):
        for field in ("stage", "name", "updatedAt", "verifiedAt", "archived"):
            with self.assertRaises(ValueError):
                ap.build(CUR, {field: "x"}, NOW)

    def test_cli(self):
        script = os.path.join(JOB, "athlete_patch.py")
        with tempfile.TemporaryDirectory() as tmp:
            cp, pp, bp = (os.path.join(tmp, n) for n in ("cur.json", "new.json", "bad.json"))
            for p, doc in ((cp, {"id": "raz-hershko", "data": CUR}), (pp, {"rank": CUR["rank"]}), (bp, {"stage": 3})):
                with open(p, "w", encoding="utf-8") as f:
                    json.dump(doc, f, ensure_ascii=False)
            r = subprocess.run([sys.executable, script, cp, pp, "--now", NOW], capture_output=True, text=True)
            self.assertEqual((r.returncode, r.stdout.strip()), (0, "{}"), r.stderr)
            r = subprocess.run([sys.executable, script, cp, bp], capture_output=True, text=True)
            self.assertEqual(r.returncode, 2)
            self.assertIn("REFUSED", r.stderr)


if __name__ == "__main__":
    unittest.main()
