import os, subprocess, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "job"))
import check_signoff as cs  # noqa: E402

BOTH = {"status": "ok", "by": "dana+tamar", "at": "2026-10-19"}


def item(event="60- ק״ג גברים", review=BOTH, **kw):
    return {"sportId": "judo", "event": event, "israelStatus": "in-contention", "israelNote": "x", "review": review, **kw}


class CheckSignoffTest(unittest.TestCase):
    def test_every_touched_item_needs_both_checkers(self):
        old = [item(israelNote="old")]
        for review in (BOTH, {**BOTH, "status": "fixed"}, {**BOTH, "by": "tamar+dana"}, {**BOTH, "by": "Dana + Tamar"}):
            self.assertEqual(cs.check(old, [item(review=review)])[1], 0, review)
        for review in ({**BOTH, "by": "dana"}, {**BOTH, "by": "tamar"}, {**BOTH, "by": "dana+roni"},
                       {**BOTH, "by": "dana+tamar+roni"}, {**BOTH, "status": "unchecked"}, {}, None, "ok"):
            lines, stop = cs.check(old, [item(review=review)])
            self.assertEqual(stop, 1, review)
            self.assertTrue(lines[0].startswith("STOP judo 60- ק״ג גברים"), lines)

    def test_not_only_earned(self):
        # Before #305 only "earned" needed dana+tamar: an in-contention item signed by one checker passed.
        lines, stop = cs.check([], [item(review={**BOTH, "by": "dana"})])
        self.assertEqual((stop, lines[0][:4]), (1, "STOP"))
        self.assertEqual(cs.check([], [item(israelStatus="earned")])[1], 0)

    def test_untouched_and_removed_items(self):
        legacy = item("73- ק״ג גברים", {**BOTH, "by": "dana"})   # signed by one checker before the rule
        lines, stop = cs.check([legacy, item("x")], [legacy, item("y")])
        self.assertEqual(stop, 0)
        self.assertEqual(lines, ['OK   judo y {"status": "ok", "by": "dana+tamar", "at": "2026-10-19"}', "REMOVED judo x"],
                         "unchanged items aren't re-checked; a removal doesn't fail")

    # publish-v55.md step 4 runs the tests on a `git archive`, which has no .git to `git show` from.
    @unittest.skipUnless(subprocess.run(["git", "rev-parse", "--git-dir"], cwd=HERE, capture_output=True).returncode == 0,
                         "not a git checkout")
    def test_cli_against_head(self):
        root = os.path.join(HERE, "..")
        r = subprocess.run([sys.executable, os.path.join(root, "job", "check_signoff.py"), "HEAD"], cwd=root,
                           capture_output=True, text=True)
        self.assertEqual(r.returncode, 1 if "STOP" in r.stdout else 0, r.stdout + r.stderr)


if __name__ == "__main__":
    unittest.main()
