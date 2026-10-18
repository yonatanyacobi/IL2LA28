import json, os, subprocess, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
sys.path.insert(0, os.path.join(ROOT, "job"))
import build_quotas, validate_data  # noqa: E402


def load(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as f:
        return json.load(f)


class BuildQuotasTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.master = load("data", "quotas", "quotas.json")
        cls.data = load("tests", "fixtures", "data.json")

    def test_publishes_only_signed_off_items_without_review(self):
        q = load("tests", "fixtures", "quotas.json")["items"][1]
        master = {"updatedAt": "2026-10-18", "items": [
            {**q, "event": s, "review": {"status": s, "by": "dana", "at": "2026-10-18"}}
            for s in ("ok", "fixed", "partial", "unchecked")] + [{**q, "event": "no review"}]}
        out = build_quotas.build(master)
        self.assertEqual([i["event"] for i in out["items"]], ["ok", "fixed"])
        self.assertTrue(all("review" not in i for i in out["items"]))
        self.assertEqual(out["updatedAt"], "2026-10-18")
        self.assertEqual(out["unpublished"], 3)
        self.assertEqual({i["checkedAt"] for i in out["items"]}, {"2026-10-18"})
        self.assertTrue(all("by" not in json.dumps(i) or "dana" not in json.dumps(i) for i in out["items"]))

    def test_validator_checks_unpublished_count(self):
        q = load("tests", "fixtures", "quotas.json")
        for bad in (-1, "3", 1.5, True):
            self.assertTrue(validate_data.validate_quotas({**q, "unpublished": bad}, self.data), bad)

    def test_checked_at_published_and_validated(self):
        q = load("tests", "fixtures", "quotas.json")["items"][1]
        out = build_quotas.build({"updatedAt": "2026-10-18", "items": [
            {**q, "review": {"status": "ok", "by": "dana", "at": "2026-10-20"}},
            {**q, "event": "bad date", "review": {"status": "ok", "at": "soon"}}]})
        self.assertEqual(out["items"][0]["checkedAt"], "2026-10-20")
        self.assertNotIn("checkedAt", out["items"][1])
        fx = load("tests", "fixtures", "quotas.json")
        item = {**fx["items"][1], "checkedAt": "20.10.2026"}
        self.assertTrue(any("checkedAt" in e for e in validate_data.validate_quotas({**fx, "items": [item]}, self.data)))

    def test_stakes_passes_through(self):
        q = load("tests", "fixtures", "quotas.json")["items"][1]
        master = {"updatedAt": "2026-10-18", "items": [{**q, "stakes": "מקום בגמר", "review": {"status": "ok"}}]}
        self.assertEqual(build_quotas.build(master)["items"][0]["stakes"], "מקום בגמר")

    def test_built_real_master_passes_validator(self):
        out = build_quotas.build(self.master)
        self.assertTrue(out["items"])
        self.assertEqual(validate_data.validate_quotas(out, self.data), [])

    def test_missing_args_print_usage(self):
        r = subprocess.run([sys.executable, os.path.join(ROOT, "job", "build_quotas.py")], capture_output=True, text=True)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("usage:", r.stderr)

    def test_committed_site_file_matches_master(self):
        # site/quotas.json is a build output; a hand edit there would be lost on the next build.
        self.assertEqual(load("site", "quotas.json"), build_quotas.build(self.master))


if __name__ == "__main__":
    unittest.main()
