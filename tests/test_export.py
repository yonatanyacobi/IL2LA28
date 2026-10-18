import contextlib, importlib.util, io, json, os, re, subprocess, sys, tempfile, unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "job", "export_data.py")
spec = importlib.util.spec_from_file_location("export_data", SCRIPT)
ex = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ex)
sys.path.insert(0, os.path.join(HERE, "..", "job"))
import validate_data  # noqa: E402

LAUNCH = "2026-10-22T09:00:00Z"  # injected launch date for the dated cases; the real one is set by the launch PR


def athlete(sport="judo", **kw):
    return {"name": "א", "name_en": "A", "sportId": sport, "event": "", "stage": 1, "rank": "", "next": "",
            "nextDate": "", "notes": "", "source": "https://x.org/a", "updatedAt": "2026-10-18T14:00:00Z",
            "updatedBy": "user-123", "verifiedBy": "user-456", **kw}


def comp(sport="judo", **kw):
    return {"sportId": sport, "name": "c", "location": "l", "start": "2027-01-01", "end": "2027-01-02",
            "notes": "", "source": "https://x.org/c", "qualifying": True, "updatedBy": "auto", **kw}


class Dump:
    """Temp dump dir in ArtifactData out_dir layout; every other file uses the {id, data} wrapper."""

    def __init__(self, athletes=None, comps=None, sports=None, meta=None, corrections=None, sessions=None):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = os.path.join(self.tmp.name, "dump")
        self.out = os.path.join(self.tmp.name, "data.json")
        sports = sports if sports is not None else {"judo": {"he": "ג׳ודו", "en": "Judo", "window": None}}
        meta = meta if meta is not None else {"lastRun": "2026-10-18T14:00:00Z", "changes": [], "updatedBy": "auto"}
        for coll, docs in (("athletes", athletes or {}), ("competitions", comps or {}), ("sports", sports),
                           ("meta", {"status": meta}), ("corrections", corrections or {}),
                           ("sessions", sessions or {})):
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

    def test_history_results_capped_apart_from_others(self):
        res = [{"at": f"2025-{1 + i // 28:02d}-{1 + i % 28:02d}", "kind": "result", "text": f"r{i}",
                "source": "https://x.org/r"} for i in range(70)]
        other = [{"at": f"2026-0{1 + i // 9}-{1 + i % 9:02d}", "kind": "rank", "text": f"o{i}"} for i in range(15)]
        h = self.export(athletes={"a": athlete(history=res + other)})["athletes"][0]["history"]
        self.assertEqual([x["text"] for x in h if x["kind"] == "result"], [f"r{i}" for i in range(10, 70)])
        self.assertEqual([x["text"] for x in h if x["kind"] != "result"], [f"o{i}" for i in range(5, 15)])
        self.assertEqual([x["at"] for x in h], sorted(x["at"] for x in h), "one list, by date")
        few = self.export(athletes={"a": athlete(history=other[:3] + res[:2])})["athletes"][0]["history"]
        self.assertEqual(len(few), 5)

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

    def test_olympic_rank_fields_apart_from_world_rank(self):
        W, O, D = "IJF World Ranking List", "IJF Olympic Ranking List", "2026-10-13"
        cases = {
            "both": ({"rankNum": 1, "rankList": W, "rankAsOf": D, "olympicRankNum": 3, "olympicRankList": O,
                      "olympicRankAsOf": D}, (1, W, D, 3, O, D)),
            "olympic-only": ({"olympicRankNum": "12", "olympicRankList": O, "olympicRankAsOf": D}, (None, "", "", 12, O, D)),
            "no-olympic-list": ({"rankNum": 5, "rankList": W, "rankAsOf": D, "olympicRankNum": 9, "olympicRankAsOf": D},
                                (5, W, D, None, "", D)),
            "bad-olympic": ({"olympicRankNum": 0, "olympicRankList": O, "olympicRankAsOf": "13.10.2026"},
                            (None, "", "", None, O, "")),
            "none": ({}, (None, "", "", None, "", "")),
        }
        data = self.export(athletes={k: athlete(**f) for k, (f, _) in cases.items()})
        keys = ("rankNum", "rankList", "rankAsOf", "olympicRankNum", "olympicRankList", "olympicRankAsOf")
        self.assertEqual({a["id"]: tuple(a[k] for k in keys) for a in data["athletes"]},
                         {k: want for k, (_, want) in cases.items()})

    def test_rank_fields(self):
        L, D = "IJF World Ranking List", "2026-10-13"
        cases = {
            "full": ({"rankNum": 1, "rankList": L, "rankAsOf": D}, (1, L, D)),
            "string from form": ({"rankNum": " 41 ", "rankList": L, "rankAsOf": D}, (41, L, D)),
            "no list": ({"rankNum": 5, "rankAsOf": D}, (None, "", D)),
            "no date": ({"rankNum": 5, "rankList": L}, (None, L, "")),
            "bad date": ({"rankNum": 5, "rankList": L, "rankAsOf": "13.10.2026"}, (None, L, "")),
            "zero": ({"rankNum": 0, "rankList": L, "rankAsOf": D}, (None, L, D)),
            "negative": ({"rankNum": -3, "rankList": L, "rankAsOf": D}, (None, L, D)),
            "float": ({"rankNum": 2.5, "rankList": L, "rankAsOf": D}, (None, L, D)),
            "bool": ({"rankNum": True, "rankList": L, "rankAsOf": D}, (None, L, D)),
            "absent": ({}, (None, "", "")),
            "long list": ({"rankNum": 3, "rankList": "x" * 200, "rankAsOf": D}, (3, "x" * 80, D)),
        }
        data = self.export(athletes={k: athlete(**fields) for k, (fields, _) in cases.items()})
        got = {a["id"]: (a["rankNum"], a["rankList"], a["rankAsOf"]) for a in data["athletes"]}
        self.assertEqual(got, {k: want for k, (_, want) in cases.items()})

    def fix(self, **kw):
        base = {"at": "2026-10-24T09:10:00Z", "reportedAt": "2026-10-23T18:40:00Z",
                "target": {"kind": "athlete", "id": "a", "name": "רז הרשקו"},
                "changes": [{"field": "rank", "wrong": "2 בעולם", "right": "1 בעולם"}],
                "source": "https://www.ijf.org/x", "by": "reader"}
        return {**base, **kw}

    def test_corrections_without_launch_date(self):
        self.assertIsNone(ex.LAUNCH_AT, "the launch PR sets it; until then nothing is public")
        corrections = {"ok": self.fix(), "bad": self.fix(source="")}
        with Dump(athletes={"a": athlete()}, corrections=corrections) as d:
            data = d.run()
            log = d.log
        self.assertEqual(validate_data.validate(data), [])
        self.assertEqual((data["launchAt"], data["corrections"]), (None, []))
        self.assertNotIn("'bad'", log)  # not reported either
        with tempfile.TemporaryDirectory() as tmp:  # a previous file with entries doesn't trip the shrink guard
            prev = os.path.join(tmp, "prev.json")
            with open(prev, "w") as f:
                json.dump({"sports": [{}], "athletes": [{}], "corrections": [{}] * 10}, f)
            with Dump(athletes={"a": athlete()}, corrections=corrections) as d:
                self.assertEqual(d.cli(prev).returncode, 0)

    @mock.patch.object(ex, "LAUNCH_AT", LAUNCH)
    def test_corrections_exported_after_launch_newest_first_without_identity(self):
        corrections = {
            "old": self.fix(at="2026-10-20T08:00:00Z"),                       # before launch: not public
            "at-launch": self.fix(at=LAUNCH),
            "later": self.fix(at="2026-10-25T07:00:00+03:00", by="job", reportedAt=""),
            "with-ids": self.fix(at="2026-10-24T10:00:00Z", reporter="dana@example.org", reportedBy="u-1",
                                 createdBy="u-2", updatedBy="u-3", note="פנימי"),
        }
        with Dump(athletes={"a": athlete()}, corrections=corrections) as d:
            data = d.run()
            log = d.log
        self.assertEqual(validate_data.validate(data), [])
        self.assertEqual(data["launchAt"], LAUNCH)
        self.assertEqual([c["id"] for c in data["corrections"]], ["later", "with-ids", "at-launch"])
        self.assertEqual(set(data["corrections"][1]), {"id", "at", "reportedAt", "target", "changes", "source", "by"})
        raw = json.dumps(data["corrections"], ensure_ascii=False)
        for secret in ("@", "u-1", "u-2", "u-3", "פנימי"):
            self.assertNotIn(secret, raw)
        self.assertNotIn("'old'", log)  # pre-launch is skipped, not reported as dropped

    @mock.patch.object(ex, "LAUNCH_AT", LAUNCH)
    def test_corrections_invalid_dropped_and_reported(self):
        bad = {
            "no-source": self.fix(source=""), "http": self.fix(source="http://x.org"), "by": self.fix(by="editor"),
            "kind": self.fix(target={"kind": "comp", "id": "a", "name": "x"}),
            "no-name": self.fix(target={"kind": "athlete", "id": "a", "name": " "}),
            "no-changes": self.fix(changes=[]), "empty-change": self.fix(changes=[{"field": "rank", "wrong": "", "right": ""}]),
            "field": self.fix(changes=[{"field": "updatedBy", "wrong": "a", "right": "b"}]),
            "six": self.fix(changes=[{"field": "rank", "wrong": str(i), "right": "x"} for i in range(6)]),
            "email": self.fix(changes=[{"field": "notes", "wrong": "פנו ל-someone@mail.com", "right": "x"}]),
            "bad-at": self.fix(at="yesterday"), "not-dict": ["x"],
        }
        with Dump(athletes={"a": athlete()}, corrections={**bad, "ok": self.fix()}) as d:
            data = d.run()
            log = d.log
        self.assertEqual([c["id"] for c in data["corrections"]], ["ok"])
        for cid in bad:
            self.assertIn(repr(cid), log)

    @mock.patch.object(ex, "LAUNCH_AT", LAUNCH)
    def test_corrections_values_normalised(self):
        long = "א" * 250
        c = self.export(athletes={"a": athlete()}, corrections={"x": self.fix(
            changes=[{"field": "event", "wrong": "200 מ' גב", "right": long}, {"field": "next", "wrong": "", "right": "גביע"}])})
        ch = c["corrections"][0]["changes"]
        self.assertEqual((ch[0]["wrong"], len(ch[0]["right"]), ch[1]["wrong"]), ("200 מ׳ גב", 200, ""))

    def test_correction_history_kind_kept(self):
        hist = [{"at": "2026-10-24", "kind": "correction", "text": "תוקן: דירוג", "source": "https://ijf.org/x"}]
        h = self.export(athletes={"a": athlete(history=hist)})["athletes"][0]["history"]
        self.assertEqual(h[0]["kind"], "correction")
        self.assertEqual(ex.HISTORY_KINDS, validate_data.HISTORY_KINDS)

    def test_launch_date_has_one_source(self):
        # The page reads data.json launchAt; a second copy in the site would drift from the export.
        for name in ("app.js", "corrections.js"):
            p = os.path.join(HERE, "..", "site", name)
            if os.path.exists(p):
                with open(p, encoding="utf-8") as f:
                    self.assertNotRegex(f.read(), r"\bLAUNCH_AT\s*=", name)

    # ---- sessions (docs/design/sessions-contract.md) ----
    def sess(self, **kw):
        base = {"competitionId": "gs", "date": "2026-10-29", "timeLocal": "09:30", "tz": "Asia/Dubai",
                "athleteIds": ["a"], "phase": "מוקדמות 57- ק״ג", "source": "https://www.ijf.org/schedule",
                "result": "", "resultSource": "", "resultAt": "",
                "review": {"status": "ok", "by": "tamar", "at": "2026-10-19"}}
        return {**base, **kw}

    def test_sessions_need_fact_check_sign_off(self):
        unchecked = {"status": "unchecked", "by": "roni", "at": "2026-10-18"}
        data, log = self.sessions_export({
            "ok": self.sess(), "fixed": self.sess(review={"status": "fixed", "by": "dana", "at": "2026-10-19"}),
            "unchecked": self.sess(review=unchecked), "hold": self.sess(review={**unchecked, "status": "HOLD"}),
            "partial": self.sess(review={**unchecked, "status": "partial"}),
            "no-review": {k: v for k, v in self.sess().items() if k != "review"}, "bad-review": self.sess(review="ok"),
        })
        self.assertEqual(sorted(s["id"] for s in data["sessions"]), ["fixed", "ok"])
        for held in ("unchecked", "hold", "partial", "no-review", "bad-review"):
            self.assertIn(repr(held), log)
        self.assertNotIn("review", data["sessions"][0], "the review itself is never exported")
        sys.path.insert(0, os.path.join(HERE, "..", "job"))
        import build_quotas
        self.assertEqual(ex.SIGNED_OFF, build_quotas.PUBLISH)

    def sessions_export(self, sessions, **kw):
        comps = {"gs": comp(start="2026-10-29", end="2026-10-31"),
                 "ams": comp(start="2026-10-24", end="2026-10-26")}
        athletes = {"a": athlete(), "b": athlete(), "gone": athlete(archived=True)}
        with Dump(athletes=athletes, comps=comps, sessions=sessions, **kw) as d:
            data = d.run()
            log = d.log
        self.assertEqual(validate_data.validate(data), [])
        return data, log

    def test_sessions_start_utc_from_local_time_and_zone(self):
        data, _ = self.sessions_export({
            "dubai": self.sess(),                                                            # UTC+4
            "ams-cest": self.sess(competitionId="ams", date="2026-10-24", timeLocal="09:00", tz="Europe/Amsterdam"),
            "ams-cet": self.sess(competitionId="ams", date="2026-10-26", timeLocal="09:00", tz="Europe/Amsterdam"),
            "untimed": self.sess(timeLocal="", tz=""),
        })
        got = {s["id"]: s["startUtc"] for s in data["sessions"]}
        self.assertEqual(got, {"dubai": "2026-10-29T05:30:00Z", "ams-cest": "2026-10-24T07:00:00Z",
                               "ams-cet": "2026-10-26T08:00:00Z", "untimed": None})  # DST ended on 25.10

    def test_sessions_whitelist_order_and_athletes(self):
        data, _ = self.sessions_export({
            "late": self.sess(timeLocal="15:00", updatedBy="u-1", notes="פנימי", quota=True, israelis=["a"]),
            "early": self.sess(timeLocal="08:00", athleteIds=["b", "ghost", "gone", "b"]),
            "notime": self.sess(timeLocal="", tz=""),
            "next-day": self.sess(date="2026-10-30", timeLocal="06:00"),
        })
        ss = data["sessions"]
        self.assertEqual([s["id"] for s in ss], ["early", "late", "notime", "next-day"])
        self.assertEqual(set(ss[1]), validate_data.SESSION_KEYS)
        self.assertEqual(ss[0]["athleteIds"], ["b"])  # unknown, archived and duplicate ids removed
        self.assertNotIn("פנימי", json.dumps(ss, ensure_ascii=False))

    def test_sessions_dropped_and_held(self):
        data, log = self.sessions_export({
            "ok": self.sess(),
            "unknown-comp": self.sess(competitionId="nope"), "outside": self.sess(date="2026-11-05"),
            "bad-date": self.sess(date="29.10.2026"), "http": self.sess(source="http://x.org"),
            "no-phase": self.sess(phase=" "), "no-israeli": self.sess(athleteIds=["ghost", "gone"]),
            "bad-time": self.sess(timeLocal="9:30"), "bad-tz": self.sess(tz="Mars/Olympus"),
            "no-tz": self.sess(tz=""),
            "unproven": self.sess(result="מקום 3", resultSource="", resultAt="2026-10-29T12:00:00Z"),
            "offset": self.sess(result="מקום 3", resultSource="https://ijf.org/r", resultAt="2026-10-29T15:00:00+03:00"),
            "proven": self.sess(result="מקום 3", resultSource="https://ijf.org/r", resultAt="2026-10-29T12:00:00Z"),
        })
        by_id = {s["id"]: s for s in data["sessions"]}
        for gone in ("unknown-comp", "outside", "bad-date", "http", "no-phase", "no-israeli"):
            self.assertNotIn(gone, by_id)
            self.assertIn(repr(gone), log)
        for k in ("bad-time", "bad-tz", "no-tz"):
            self.assertIsNone(by_id[k]["startUtc"], k)
            self.assertIn(f"{k} (time)", log)
        for k in ("unproven", "offset"):
            self.assertEqual((by_id[k]["result"], by_id[k]["resultSource"], by_id[k]["resultAt"]), ("", "", ""), k)
            self.assertIn(f"{k} (result)", log)
        self.assertEqual(by_id["proven"]["resultAt"], "2026-10-29T12:00:00Z")

    def test_sessions_shrink_guard(self):
        with tempfile.TemporaryDirectory() as tmp:
            prev = os.path.join(tmp, "prev.json")
            with open(prev, "w") as f:
                json.dump({"sports": [{}], "athletes": [{}], "competitions": [{}], "sessions": [{}] * 10}, f)
            comps = {"gs": comp(start="2026-10-29", end="2026-10-31")}
            for n, code in ((7, 2), (9, 0)):
                sessions = {f"s{i}": self.sess() for i in range(n)}
                with Dump(athletes={"a": athlete()}, comps=comps, sessions=sessions) as d:
                    r = d.cli(prev)
                    self.assertEqual(r.returncode, code, (n, r.stdout))
                    if code:
                        self.assertIn("REFUSED: sessions", r.stdout)

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
