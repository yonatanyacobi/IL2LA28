import contextlib, importlib.util, io, json, os, re, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "job", "export_data.py")
spec = importlib.util.spec_from_file_location("export_data", SCRIPT)
ex = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ex)
sys.path.insert(0, os.path.join(HERE, "..", "job"))
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
        with contextlib.redirect_stdout(io.StringIO()) as log:
            ex.main(self.dir, self.out, prev)
        self.log = log.getvalue()
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
            with open(d.out, encoding="utf-8") as f:
                raw = f.read()
        for key in ("updatedBy", "verifiedBy", "user-123", "user-456"):
            self.assertNotIn(key, raw)

    def test_bad_timestamps_blanked_not_fatal(self):
        data = self.export(
            athletes={"a": athlete(updatedAt="yesterday", verifiedAt="2026-10-18"),
                      "b": athlete(verifiedAt="2026-10-18T14:00:00+03:00"),
                      "c": athlete(updatedAt="2026-10-18T14:00:00Z\n")},
            meta={"lastRun": "today", "changes": [{"at": "soon", "text": "x"}, {"at": None, "text": "y"}]})
        a, b, c = data["athletes"]
        self.assertEqual((a["updatedAt"], a["verifiedAt"]), ("", ""))
        self.assertEqual(b["verifiedAt"], "2026-10-18T14:00:00+03:00")
        self.assertEqual(c["updatedAt"], "")
        self.assertEqual(data["lastRun"], "")
        self.assertEqual([ch["at"] for ch in data["changes"]], ["", ""])

    def test_non_object_documents_dropped(self):
        with Dump(athletes={"a": athlete(), "list": [1], "str": "x", "null": None},
                  sports={"judo": {"he": "ג׳ודו"}, "bad": 5}, meta=["not", "a", "dict"]) as d:
            data = d.run()
        self.assertEqual(validate_data.validate(data), [])
        self.assertEqual([a["id"] for a in data["athletes"]], ["a"])
        self.assertEqual([s["id"] for s in data["sports"]], ["judo"])
        for doc_id in ("list", "str", "null", "bad"):
            self.assertIn(repr(doc_id), d.log)

    def test_geresh(self):
        cases = {
            "קווין קוזמיצ'וב": "קווין קוזמיצ׳וב",
            "200 מ' גב": "200 מ׳ גב",
            "ארד בצ'לנג' בהובנס": "ארד בצ׳לנג׳ בהובנס",
            'ארה"ב, 10 ק"מ': "ארה״ב, 10 ק״מ",
            "Israel men's 3x3 team": "Israel men's 3x3 team",
            "לפי 'מאי 2027'.": "לפי 'מאי 2027'.",
            "אמר 'שלום' לכולם": "אמר 'שלום' לכולם",
            'כתב "שלום" לכולם': 'כתב "שלום" לכולם',
            "ראו https://he.wikipedia.org/wiki/צ'לנג": "ראו https://he.wikipedia.org/wiki/צ'לנג",
            "כבר ג׳ודו": "כבר ג׳ודו",
        }
        for raw, want in cases.items():
            self.assertEqual(ex.geresh(raw), want, raw)

    def test_geresh_applied_to_display_text_only(self):
        hist = [{"at": "2026-01-01", "kind": "rank", "text": "3000 מ' מכשולים", "source": "https://x.org/a'b"}]
        data = self.export(
            athletes={"a": athlete(name="קוזמיצ'וב", name_en="O'Brien", event="200 מ' גב",
                                   source="https://x.org/צ'לנג", history=hist)},
            sports={"judo": {"he": "ג'ודו", "en": "Judo", "window": None}},
            meta={"lastRun": "", "changes": [{"at": "2026-10-18", "text": 'ארה"ב'}]})
        a = data["athletes"][0]
        self.assertEqual((a["name"], a["name_en"], a["event"]), ("קוזמיצ׳וב", "O'Brien", "200 מ׳ גב"))
        self.assertEqual(a["source"], "https://x.org/צ'לנג")
        self.assertEqual((a["history"][0]["text"], a["history"][0]["source"]), ("3000 מ׳ מכשולים", "https://x.org/a'b"))
        self.assertEqual(data["sports"][0]["he"], "ג׳ודו")
        self.assertEqual(data["changes"][0]["text"], "ארה״ב")

    def test_geresh_fixes_fixture_strings(self):
        with open(os.path.join(HERE, "fixtures", "data.json"), encoding="utf-8") as f:
            fixture = json.load(f)
        left = []

        def walk(v):
            if isinstance(v, dict):
                for k, x in v.items():
                    if k not in ("source", "id", "sportId", "athleteId"):
                        walk(x)
            elif isinstance(v, list):
                for x in v:
                    walk(x)
            elif isinstance(v, str):
                left.extend(re.findall(r"[א-ת]['\"][א-ת\s]", ex.geresh(v)))
        walk(fixture)
        self.assertEqual(left, [])

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
                with open(d.out, encoding="utf-8") as f:
                    self.assertEqual(len(json.load(f)["athletes"]), 9)


if __name__ == "__main__":
    unittest.main()
