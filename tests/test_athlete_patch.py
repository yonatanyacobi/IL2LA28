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
        same = {k: CUR[k] for k in ap.VISIBLE + ap.SILENT if k in CUR}
        self.assertEqual(ap.build(CUR, {**same, "source": "https://other.example/new-url"}, NOW), {})

    def test_cosmetic_differences_are_not_changes(self):
        proposed = {"rank": "  1 בעולם (IJF, אוק' 2026) ", "rankNum": "1", "notes": CUR["notes"] + "\n",
                    "historyEntry": {"at": "2026-10-19", "kind": "rank", "text": "1 בעולם", "source": ""}}
        self.assertEqual(ap.build(CUR, proposed, NOW), {})  # apostrophe vs geresh, padding, "1" vs 1

    def test_olympic_rank_fields_follow_rank_rules(self):
        cur = {**CUR, "olympicRankNum": 3, "olympicRankList": "IJF Olympic Ranking List", "olympicRankAsOf": "2026-10-13"}
        # Same number, new list date: written silently, updatedAt untouched (as rankAsOf).
        self.assertEqual(ap.build(cur, {"olympicRankNum": "3", "olympicRankAsOf": "2026-10-20"}, NOW),
                         {"olympicRankAsOf": "2026-10-20"})
        # A new number is visible: updatedAt moves, the list and date come along.
        patch = ap.build(cur, {"olympicRankNum": 2, "olympicRankList": "IJF Olympic Ranking List",
                               "olympicRankAsOf": "2026-10-20"}, NOW)
        self.assertEqual(patch, {"olympicRankNum": 2, "olympicRankAsOf": "2026-10-20", "updatedAt": NOW, "updatedBy": "auto"})
        # First Olympic rank on a record that had none.
        self.assertIn("updatedAt", ap.build(CUR, {"olympicRankNum": 17, "olympicRankList": "x", "olympicRankAsOf": "2026-10-20"}, NOW))
        # Unchanged world and Olympic ranks: nothing to write.
        self.assertEqual(ap.build(cur, {"rankNum": 1, "olympicRankNum": 3}, NOW), {})
        with self.assertRaises(ValueError):
            ap.build(cur, {"olympicRank": 3}, NOW)

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

    def test_new_result_entry_alone_is_a_change(self):
        entry = {"at": "2026-10-24", "kind": "result", "text": "מקום 2 בגביע העולם", "source": "https://x.org/r"}
        patch = ap.build(CUR, {"historyEntry": entry}, NOW)
        self.assertEqual((patch["updatedAt"], patch["history"][-1]), (NOW, entry))
        self.assertNotIn("source", patch)  # the record's own source is not replaced by a result page
        logged = {**CUR, "history": CUR["history"] + [{**entry, "text": "מקום 2 בגביע העולם "}]}
        self.assertEqual(ap.build(logged, {"historyEntry": entry}, NOW), {}, "already logged (padding ignored)")
        self.assertEqual(ap.build(CUR, {"historyEntry": {**entry, "kind": "rank"}}, NOW), {}, "only results count alone")

    def test_result_key_becomes_checked_history_entry(self):
        r = {"at": "2026-10-24", "text": "מקום 4 בגמר ( 24 באוק׳ 2026)", "source": "https://x.org/results"}
        patch = ap.build(CUR, {"notes": "חדש", "result": r}, NOW)
        self.assertEqual(patch["history"][-1], {**r, "kind": "result"})
        self.assertEqual(patch["notes"], "חדש")
        for bad in ({**r, "at": "24.10.2026"}, {**r, "text": " "}, {**r, "source": "http://x.org"}, {**r, "source": ""},
                    {**r, "kind": "rank"}, "מקום 4"):
            with self.assertRaises(ValueError):
                ap.build(CUR, {"result": bad}, NOW)
        with self.assertRaises(ValueError):
            ap.build(CUR, {"result": r, "historyEntry": {"at": "2026-10-24", "kind": "rank", "text": "x"}}, NOW)
        with self.assertRaises(ValueError):  # a kind "result" historyEntry gets the same checks
            ap.build(CUR, {"historyEntry": {"at": "2026-10-24", "kind": "result", "text": "x", "source": ""}}, NOW)

    def test_history_capped(self):
        cur = {**CUR, "history": [{"at": f"2026-01-{i:02d}"} for i in range(1, 21)]}
        h = ap.build(cur, {"notes": "חדש", "historyEntry": {"at": "2026-10-19"}}, NOW)["history"]
        self.assertEqual((len(h), h[0]["at"], h[-1]["at"]), (20, "2026-01-02", "2026-10-19"))

    def test_results_have_their_own_cap(self):
        res = lambda d: {"at": d, "kind": "result", "text": f"מקום 1 ({d})", "source": "https://x.org/r"}
        other = lambda d, k="rank": {"at": d, "kind": k, "text": "x"}
        # 20 other entries (the cap) with 5 results among them: the history is 25 long.
        hist = [res("2025-01-01"), other("2025-02-01", "start")] + [other(f"2025-03-{i:02d}") for i in range(1, 17)] \
            + [res("2025-04-01"), res("2025-05-01")] + [other(f"2025-06-{i:02d}", "stage") for i in range(1, 4)] \
            + [res("2025-07-01"), res("2025-08-01")]
        self.assertEqual((len(hist), sum(e["kind"] == "result" for e in hist)), (25, 5))
        # A new result pushes out nothing: results sit outside the cap of 20.
        new = {k: v for k, v in res("2026-10-24").items() if k != "kind"}
        self.assertEqual(ap.build({**CUR, "history": hist}, {"result": new}, NOW)["history"], hist + [res("2026-10-24")])
        # A new rank entry drops the oldest other entry (the "start"), never a result; order kept.
        h = ap.build({**CUR, "history": hist}, {"rank": "2 בעולם", "historyEntry": other("2026-10-25")}, NOW)["history"]
        self.assertEqual(h, [e for e in hist if e["at"] != "2025-02-01"] + [other("2026-10-25")])

    def test_results_cap_is_60(self):
        res = lambda i: {"at": "2020-01-01", "kind": "result", "text": f"r{i:03d}", "source": "https://x.org"}
        hist = [res(i) for i in range(60)] + [{"at": "2024-01-01", "kind": "rank", "text": "x"}]
        new = {"at": "2026-10-24", "text": "חדש", "source": "https://x.org/r"}
        h = ap.build({**CUR, "history": hist}, {"result": new}, NOW)["history"]
        results = [e for e in h if e["kind"] == "result"]
        self.assertEqual((len(results), results[0]["text"], results[-1]["text"]), (60, "r001", "חדש"))
        self.assertEqual(len(h), 61, "the rank entry stays")
        mixed = [{"kind": "rank", "n": i} for i in range(25)] + [{"kind": "result", "n": i} for i in range(65)]
        t = ap.trim_history(mixed)
        self.assertEqual([e["n"] for e in t if e["kind"] == "rank"], list(range(5, 25)))
        self.assertEqual([e["n"] for e in t if e["kind"] == "result"], list(range(5, 65)))
        self.assertEqual((ap.HISTORY_MAX, ap.RESULTS_MAX), (20, 60))

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
