import copy, json, os, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
JOB = os.path.join(HERE, "..", "job")
sys.path.insert(0, JOB)
import apply_rankings as ar  # noqa: E402
import athlete_patch as ap  # noqa: E402

# Olympic-list rows write olympicRank*, which athlete_patch accepts from #231 (Maya) on.
needs_231 = unittest.skipUnless("olympicRankNum" in ap.VISIBLE + ap.SILENT, "needs #231: athlete_patch olympicRank*")

NOW = "2026-10-18T16:00:00Z"
SIGNED = {"status": "ok", "by": "dana", "at": "2026-10-18"}
OLY = "IJF Olympic Ranking List"
CUT = {"rank": 17, "list": OLY, "url": "https://www.ijf.org/wrl_olympic", "final": "2028-06-15", "opens": "2026-06-15"}
QUOTAS = [{"sportId": "judo", "event": "60- ק״ג גברים", "review": SIGNED},
          {"sportId": "judo", "event": "78+ ק״ג נשים", "review": SIGNED, "cutoff": CUT}]
ATHLETES = {"izhak-ashpiz": {"name": "יצחק אשפיז", "rankNum": 7, "rankList": "IJF World Ranking List", "rankAsOf": "2026-10-12",
                             "source": "https://www.ijf.org/judoka/1", "updatedAt": "2026-10-12T00:00:00Z"},
            "raz-hershko": {"name": "רז הרשקו", "rankNum": 1, "rankList": "IJF World Ranking List", "rankAsOf": "2026-10-12",
                            "olympicRankNum": 1, "olympicRankList": OLY, "olympicRankAsOf": "2026-10-18"},
            "inbar-lanir": {"name": "ענבר לניר", "rankNum": 22, "rankList": "IJF World Ranking List", "rankAsOf": "2026-10-12"},
            "old-timer": {"name": "x", "archived": True}}


def athlete(aid="izhak-ashpiz", **kw):
    return {"athleteId": aid, "rankNum": 5, "rankList": OLY, "rankAsOf": "2026-10-18",
            "source": "https://www.ijf.org/wrl_olympic", "notes": "", "review": SIGNED, **kw}


def cutoff(event="60- ק״ג גברים", **kw):
    return {"sportId": "judo", "event": event, "cutoff": CUT, "source": "https://example.org/system.pdf", "review": SIGNED, **kw}


def run(athletes=(), cutoffs=(), name="roni", **top):
    f = {"athletes": list(athletes), "cutoffs": list(cutoffs), **top}
    return ar.plan([(name, copy.deepcopy(f))], copy.deepcopy(QUOTAS), copy.deepcopy(ATHLETES), NOW)


class ApplyRankingsTest(unittest.TestCase):
    @needs_231
    def test_signed_rows_make_a_cutoff_patch_and_athlete_changes(self):
        out = run([athlete(), athlete("raz-hershko", rankNum=1)], [cutoff(), cutoff("78+ ק״ג נשים")])
        self.assertEqual(out["errors"], [])
        self.assertEqual(out["cutoffs"], [{"sportId": "judo", "event": "60- ק״ג גברים", "cutoff": CUT, "was": None}])
        self.assertEqual(out["cutoffsUnchanged"], ["judo|78+ ק״ג נשים"])
        self.assertEqual(out["changes"], [{"doc_id": "izhak-ashpiz", "fields": {
            "olympicRankNum": 5, "olympicRankList": OLY, "olympicRankAsOf": "2026-10-18", "updatedAt": NOW, "updatedBy": "auto",
            "loadedFrom": "roni"}}])
        self.assertEqual(out["unchanged"], ["raz-hershko"])

    @needs_231
    def test_rows_route_by_list_world_rank_untouched_by_olympic_rows(self):
        """PM on #218: rank/rankNum stay the world ranking; Olympic-list rows go to olympicRank*."""
        world = athlete(rankNum=13, rankList="IJF World Ranking List", rankAsOf="2026-10-12")
        out = run([athlete(rankNum=2), world])
        self.assertEqual(out["errors"], [])
        [change] = out["changes"]
        self.assertEqual({k: change["fields"].get(k) for k in ("rankNum", "rankList", "olympicRankNum", "olympicRankList")},
                         {"rankNum": 13, "rankList": None, "olympicRankNum": 2, "olympicRankList": OLY})  # list already World
        self.assertNotIn("rankNum", run([athlete(rankNum=2)])["changes"][0]["fields"])
        dup = run([athlete(rankNum=2), athlete(rankNum=3)])
        self.assertTrue(any("duplicate of" in e for e in dup["errors"]), dup["errors"])

    @needs_231
    def test_only_list_and_date_change_does_not_move_updated_at(self):
        out = run([athlete("raz-hershko", rankNum=1, rankAsOf="2026-10-17")])
        self.assertEqual(out["changes"], [{"doc_id": "raz-hershko", "fields": {"olympicRankAsOf": "2026-10-17", "loadedFrom": "roni"}}])

    def test_unsigned_rows_are_skipped_before_checks(self):
        hold = {"status": "hold", "by": "tamar", "at": "2026-10-18"}
        out = run([athlete(review=hold, rankNum=0)], [cutoff("nope", review=hold), cutoff(review={"status": "ok"})])
        self.assertEqual(out["errors"], [])
        self.assertEqual(len(out["skipped"]), 3)
        self.assertEqual(out["cutoffs"] + out["changes"], [])

    def test_unranked_rows_write_nothing_and_show_the_current_rank(self):
        out = run([athlete("inbar-lanir", rankNum=None, rankList="", rankAsOf="")])
        self.assertEqual(out["errors"], [])
        self.assertEqual(out["changes"], [])
        self.assertEqual(out["unranked"], [{"athleteId": "inbar-lanir", "file": "roni",
                                            "current": {"rankNum": 22, "rankList": "IJF World Ranking List", "rankAsOf": "2026-10-12"}}])
        bad = run([athlete("inbar-lanir", rankNum=None)])
        self.assertTrue(any("rankNum null needs empty" in e for e in bad["errors"]), bad["errors"])

    def test_null_cutoff_is_reported_not_written(self):
        out = run(cutoffs=[cutoff(cutoff=None)])
        self.assertEqual((out["errors"], out["cutoffs"], out["noCutoff"]), ([], [], ["judo|60- ק״ג גברים"]))

    def test_errors(self):
        out = run([athlete("nobody"), athlete("old-timer"), athlete(rankNum="5"), athlete("raz-hershko", rankAsOf="2026-10-19"),
                   athlete("inbar-lanir", source="http://x"), athlete("izhak-ashpiz", rankNum=6), athlete("raz-hershko", rankList="")],
                  [cutoff("אין כזה"), cutoff(cutoff={**CUT, "rank": 0, "url": "http://x"}), cutoff("60- ק״ג גברים", cutoff={**CUT, "opens": "2029-01-01"}),
                   cutoff("78+ ק״ג נשים", extra=1)])
        text = "\n".join(out["errors"])
        for needle in ["nobody).athleteId: not an athlete", "old-timer).athleteId: archived", "rankNum: expected an integer",
                       "rankAsOf: expected YYYY-MM-DD, not after 2026-10-18", "inbar-lanir).source", "duplicate of roni.athletes[2]", "rankList: expected",
                       "0 quota items match", "cutoff.rank", "cutoff.url", "cutoff.opens", "duplicate of roni.cutoffs[1]", "unknown ['extra']"]:
            self.assertIn(needle, text)
        self.assertEqual(out["changes"] + out["cutoffs"], [])
        self.assertEqual(run(name="bad", **{"sessions": []})["errors"][0][:4], "bad:")

    @needs_231
    def test_cli_reads_a_dump_and_writes_nothing(self):
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(os.path.join(d, "athletes"))
            for i, (k, v) in enumerate(ATHLETES.items()):
                with open(os.path.join(d, "athletes", k + ".json"), "w", encoding="utf-8") as f:
                    json.dump({"id": k, "data": v} if i % 2 else v, f, ensure_ascii=False)
            q, r = os.path.join(d, "quotas.json"), os.path.join(d, "roni.json")
            for p, body in [(q, {"items": QUOTAS}), (r, {"athletes": [athlete()], "cutoffs": [cutoff()]})]:
                with open(p, "w", encoding="utf-8") as f:
                    json.dump(body, f, ensure_ascii=False)
            before = {p: open(p, encoding="utf-8").read() for p in (q, r)}
            res = subprocess.run([sys.executable, os.path.join(JOB, "apply_rankings.py"), d, q, r, "--now", NOW],
                                 capture_output=True, text=True)
            self.assertEqual(res.returncode, 0, res.stderr)
            out = json.loads(res.stdout)
            self.assertEqual((len(out["cutoffs"]), out["changes"][0]["doc_id"]), (1, "izhak-ashpiz"))
            self.assertEqual(before, {p: open(p, encoding="utf-8").read() for p in (q, r)})
            self.assertEqual(subprocess.run([sys.executable, os.path.join(JOB, "apply_rankings.py"), d],
                                            capture_output=True).returncode, 2)


if __name__ == "__main__":
    unittest.main()
