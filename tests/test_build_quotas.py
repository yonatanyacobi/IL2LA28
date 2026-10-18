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
