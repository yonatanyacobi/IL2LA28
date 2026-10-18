import contextlib, importlib.util, io, json, os, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "job", "export_data.py")
spec = importlib.util.spec_from_file_location("export_data", SCRIPT)
ex = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ex)
sys.path.insert(0, HERE)
import validate_data  # noqa: E402


def athlete(sport="judo", **kw):
    return {"name": "א", "name_en": "A", "sportId": sport, "event": "", "stage": 1, "rank": "", "next": "",
            "nextDate": "", "notes": "", "source": "https://x.org/a", "updatedAt": "2026-10-18T14:00:00Z",
            "updatedBy": "user-123", "verifiedBy": "user-456", **kw}


def comp(sport="judo", **kw):
    return {"sportId": sport, "name": "c", "location": "l", "start": "2027-01-01", "end": "2027-01-02",
            "notes": "", "source": "https://x.org/c", "qualifying": True, "updatedBy": "auto", **kw}


class Dump:
    """Temp dump dir in ArtifactData out_dir layout; every other file uses the {id, data} wrapper."""

    def __init__(self, athletes=None, comps=None, sports=None, meta=None):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = os.path.join(self.tmp.name, "dump")
        self.out = os.path.join(self.tmp.name, "data.json")
        sports = sports if sports is not None else {"judo": {"he": "ג׳ודו", "en": "Judo", "window": None}}
        meta = meta if meta is not None else {"lastRun": "2026-10-18T14:00:00Z", "changes": [], "updatedBy": "auto"}
        for coll, docs in (("athletes", athletes or {}), ("competitions", comps or {}), ("sports", sports),
                           ("meta", {"status": meta})):
            os.makedirs(os.path.join(self.dir, coll))
            for i, (doc_id, doc) in enumerate(docs.items()):
                body = {"id": doc_id, "data": doc} if i % 2 else doc
                with open(os.path.join(self.dir, coll, doc_id + ".json"), "w", encoding="utf-8") as f:
                    json.dump(body, f, ensure_ascii=False)

    def run(self, prev=None):
        with contextlib.redirect_stdout(io.StringIO()):
            ex.main(self.dir, self.out, prev)
        with open(self.out, encoding="utf-8") as f:
            return json.load(f)

    def cli(self, prev):
        return subprocess.run([sys.executable, SCRIPT, self.dir, self.out, prev], capture_output=True, text=True)

    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.tmp.cleanup()


class ExportTest(unittest.TestCase):
    def export(self, **kw):
        with Dump(**kw) as d:
            data = d.run()
        self.assertEqual(validate_data.validate(data), [])
        return data

    def test_filters_athletes_and_competitions(self):
        data = self.export(
            athletes={"a": athlete(), "b": athlete(archived=True), "c": athlete(sport="nope")},
            comps={"ok": comp(), "nosport": comp(sport="nope"), "nostart": comp(start=""),
                   "badstart": comp(start="2027-02-30"), "nlstart": comp(start="2027-01-01\n")})
        self.assertEqual([a["id"] for a in data["athletes"]], ["a"])
        self.assertEqual([c["id"] for c in data["competitions"]], ["ok"])

    def test_wrapped_and_bare_documents_load_the_same(self):
        data = self.export(athletes={"a": athlete(), "b": athlete()})
        self.assertEqual([a["name"] for a in data["athletes"]], ["א", "א"])

    def test_stage_parsing(self):
        for raw, want in (("2", 2), (2.0, 2), ("x", 0), (7, 3), (-1, 0), (None, 0), ("inf", 0), ("nan", 0)):
            self.assertEqual(ex.stage(raw), want, raw)

    def test_sources_https_only(self):
        data = self.export(athletes={"h": athlete(source="http://x.org"), "s": athlete(source="https://x.org")},
                           comps={"c": comp(source="http://x.org")})
        self.assertEqual([a["source"] for a in data["athletes"]], ["", "https://x.org"])
        self.assertEqual(data["competitions"][0]["source"], "")

    def test_history(self):
        hist = [{"at": f"2026-01-{d:02d}", "kind": "rank", "text": f"t{d}"} for d in range(15, 0, -1)]
        hist += [{"at": "2026-02-01", "kind": "weird", "text": "unknown kind", "source": "http://x"},
                 {"at": "bad", "kind": "rank", "text": "no date"}, {"at": "2026-03-01", "text": "  "}, "junk"]
        h = self.export(athletes={"a": athlete(history=hist)})["athletes"][0]["history"]
        self.assertEqual(len(h), 10)
        self.assertEqual([x["at"] for x in h], sorted(x["at"] for x in h))
        self.assertEqual(h[-1], {"at": "2026-02-01", "kind": "note", "text": "unknown kind", "source": ""})
        self.assertEqual(h[0]["at"], "2026-01-07")

    def test_changes(self):
        changes = [{"at": "2026-10-18T10:00:00Z", "text": "x", "athleteId": "a"},
                   {"at": "2026-10-18", "text": "y", "athleteId": "archived"},
                   {"at": "2026-10-18", "text": "z", "athleteId": "ghost"}] + \
                  [{"at": "2026-10-17", "text": f"n{i}"} for i in range(40)]
        data = self.export(athletes={"a": athlete(), "archived": athlete(archived=True)},
                           meta={"lastRun": "", "changes": changes})
        ch = data["changes"]
        self.assertEqual(len(ch), 30)
        self.assertEqual(ch[0], {"at": "2026-10-18", "text": "x", "athleteId": "a"})
        self.assertNotIn("athleteId", ch[1])
        self.assertNotIn("athleteId", ch[2])

    def test_private_fields_never_exported(self):
        hist = [{"at": "2026-01-01", "kind": "rank", "text": "t", "updatedBy": "u", "verifiedBy": "v"}]
        with Dump(athletes={"a": athlete(history=hist)}, comps={"c": comp()}) as d:
            d.run()
            raw = open(d.out, encoding="utf-8").read()
        for key in ("updatedBy", "verifiedBy", "user-123", "user-456"):
            self.assertNotIn(key, raw)

    def test_shrink_guard(self):
        with tempfile.TemporaryDirectory() as tmp:
            prev = os.path.join(tmp, "prev.json")
            with open(prev, "w") as f:
                json.dump({"sports": [{}], "athletes": [{}] * 10, "competitions": []}, f)
            with Dump(athletes={f"a{i}": athlete() for i in range(7)}) as d:
                r = d.cli(prev)
                self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
                self.assertIn("REFUSED", r.stdout)
                self.assertFalse(os.path.exists(d.out))
            with Dump(athletes={f"a{i}": athlete() for i in range(9)}) as d:
                r = d.cli(prev)
                self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
                self.assertEqual(len(json.load(open(d.out))["athletes"]), 9)


if __name__ == "__main__":
    unittest.main()
