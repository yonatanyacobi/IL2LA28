import json, os, subprocess, sys, unittest

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

    def test_untouched_items_and_unlogged_removal(self):
        legacy = item("73- ק״ג גברים", {**BOTH, "by": "dana"})   # signed by one checker before the rule
        lines, stop = cs.check([legacy, item("x")], [legacy, item("y")])
        self.assertEqual(stop, 1)
        self.assertEqual(lines, ['OK   judo y {"status": "ok", "by": "dana+tamar", "at": "2026-10-19"}', "REMOVED STOP judo x {}"],
                         "unchanged items aren't re-checked; a removal without a log entry stops (#332)")

    def test_removal_needs_a_signed_log_entry_from_this_pr(self):
        old, new = [item("x"), item("y")], [item("y")]
        entry = {"sportId": "judo", "event": "x", "reason": "אוחד עם x+", "source": "https://www.ijf.org/x", "review": BOTH}
        lines, stop = cs.check(old, new, [], [entry])
        self.assertEqual((stop, lines), (0, ['REMOVED OK   judo x {"status": "ok", "by": "dana+tamar", "at": "2026-10-19"}']))
        for bad in ({**entry, "review": {**BOTH, "by": "dana"}}, {**entry, "review": {**BOTH, "status": "unchecked"}},
                    {**entry, "reason": " "}, {**entry, "source": "http://x.org"}, {**entry, "event": "z"}):
            self.assertEqual(cs.check(old, new, [], [bad])[1], 1, bad)
        self.assertEqual(cs.check(old, new, [entry], [entry])[1], 1, "an entry from an earlier PR doesn't cover a new removal")

    def test_log_is_append_only(self):
        entry = {"sportId": "judo", "event": "x", "reason": "r", "source": "https://x.org", "review": BOTH}
        for new_log in ([], [{**entry, "reason": "other"}]):
            lines, stop = cs.check([], [], [entry], new_log)
            self.assertEqual(stop, 1, new_log)
            self.assertIn("LOG EDITED STOP judo x {}", lines)
        self.assertEqual(cs.check([], [], [entry], [entry, {**entry, "event": "w"}])[1], 0, "appending is fine")

    def test_cli_removal_when_the_base_has_no_log(self):
        import tempfile
        script = os.path.abspath(os.path.join(HERE, "..", "job", "check_signoff.py"))
        with tempfile.TemporaryDirectory() as repo:
            git = lambda *a: subprocess.run(["git", "-C", repo, *a], check=True, capture_output=True)
            os.makedirs(os.path.join(repo, "data", "quotas"))
            write = lambda name, items: json.dump({"items": items}, open(os.path.join(repo, "data", "quotas", name), "w"))
            write("quotas.json", [item("x"), item("y")])
            git("init", "-q")
            git("add", ".")
            git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "base")
            write("quotas.json", [item("y")])
            run = lambda: subprocess.run([sys.executable, script, "HEAD"], cwd=repo, capture_output=True, text=True)
            r = run()
            self.assertEqual((r.returncode, r.stdout.strip()), (1, "REMOVED STOP judo x {}"), r.stderr)
            write("removed.json", [{"sportId": "judo", "event": "x", "reason": "r", "source": "https://x.org", "review": BOTH}])
            self.assertEqual(run().returncode, 0)

    def test_shipped_log_is_well_formed(self):
        with open(os.path.join(HERE, "..", cs.REMOVED), encoding="utf-8") as f:
            log = json.load(f)
        self.assertEqual(set(log), {"items"})
        self.assertTrue(all(cs.logged(e) for e in log["items"]), "every entry has a reason, an https source and two checkers")

    def test_cli_against_head(self):
        root = os.path.join(HERE, "..")
        r = subprocess.run([sys.executable, os.path.join(root, "job", "check_signoff.py"), "HEAD"], cwd=root,
                           capture_output=True, text=True)
        self.assertEqual(r.returncode, 1 if "STOP" in r.stdout else 0, r.stdout + r.stderr)


if __name__ == "__main__":
    unittest.main()
