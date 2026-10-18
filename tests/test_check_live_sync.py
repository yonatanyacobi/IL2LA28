import os, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "job", "check_live_sync.py")
sys.path.insert(0, os.path.join(HERE, "..", "job"))
import check_live_sync as cls  # noqa: E402


def write(root, rel, content):
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


class LiveSyncTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo, self.live = (os.path.join(self.tmp.name, n) for n in ("repo", "live"))
        for root in (self.repo, self.live):
            write(root, "SKILL.md", "step 1\nstep 2\n")
            write(root, "export_data.py", "print(1)\n")
            write(root, "__pycache__/export_data.cpython-312.pyc", "bytes " + root)  # ignored
            write(root, ".DS_Store", root)  # ignored

    def tearDown(self):
        self.tmp.cleanup()

    def run_cli(self):
        return subprocess.run([sys.executable, SCRIPT, "--repo", self.repo, "--live", self.live], capture_output=True, text=True)

    def test_identical(self):
        self.assertEqual(cls.compare(self.repo, self.live), [])
        r = self.run_cli()
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("OK:", r.stdout)

    def test_every_kind_of_difference(self):
        write(self.repo, "athlete_patch.py", "new\n")          # merged but not copied
        write(self.live, "old_helper.py", "stale\n")           # removed from the repo
        write(self.repo, "SKILL.md", "step 1\nstep 2 changed\n")
        self.assertEqual(cls.compare(self.repo, self.live), [
            "missing in live: athlete_patch.py",
            "only in live: old_helper.py",
            "differs: SKILL.md (2 changed lines; first: '-step 2')",
        ])
        r = self.run_cli()
        self.assertEqual(r.returncode, 1)
        self.assertEqual(r.stdout.count("OUT OF SYNC"), 3)
        self.assertIn("cp ", r.stdout)

    def test_whitespace_counts(self):
        write(self.live, "export_data.py", "print(1)\r\n")
        self.assertEqual(len(cls.compare(self.repo, self.live)), 1)

    def test_missing_folder_and_usage(self):
        r = subprocess.run([sys.executable, SCRIPT, "--repo", self.repo, "--live", os.path.join(self.tmp.name, "nope")],
                           capture_output=True, text=True)
        self.assertEqual(r.returncode, 2)
        self.assertIn("NOT FOUND", r.stdout)
        r = subprocess.run([sys.executable, SCRIPT, "--bogus", "x"], capture_output=True, text=True)
        self.assertEqual(r.returncode, 2)


if __name__ == "__main__":
    unittest.main()
