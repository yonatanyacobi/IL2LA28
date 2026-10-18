import copy, json, os, subprocess, sys, tempfile, unittest
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
JOB = os.path.join(HERE, "..", "job")
sys.path.insert(0, JOB)
import athlete_patch  # noqa: E402
import tri_results as tr  # noqa: E402

PAGE = "https://www.triathlon.org/events/2026-world-triathlon-cup-tongyeong"
TONGYEONG = {"id": "tri-world-cup-tongyeong-2026", "sportId": "triathlon", "name": "גביע העולם בטריאתלון טונגיונג",
             "start": "2026-10-24", "end": "2026-10-24", "qualifying": True,
             "source": "https://triathlon.org/events/2026-world-triathlon-cup-tongyeong/race-info"}
SAGIV = {"id": "shachar-sagiv", "name": "שחר שגיב", "name_en": "Shachar Sagiv", "sportId": "triathlon", "stage": 1,
         "nextDate": "2026-10-24", "notes": "זכייה בגביע העולם בהואטולקו 2025",
         "source": "https://triathlon.org/athletes/profile/41870", "history": []}
OTHER = {"id": "tri-other", "name": "אחר", "name_en": "Other Athlete", "sportId": "triathlon", "nextDate": "2026-11-13",
         "source": "", "history": []}
DATA = {"athletes": [SAGIV, OTHER], "competitions": [TONGYEONG]}


def row(pos, athlete_id=41870, title="Shachar Sagiv", noc="ISR", validated=True):
    return {"athlete_id": athlete_id, "athlete_title": title, "athlete_noc": noc, "position": pos, "validated": validated}


class FakeApi:
    """Shapes as returned by api.triathlon.org/v1 (checked on 2025 World Cup Rome); no key involved."""

    def __init__(self, men_rows, women_rows=(), event=True):
        self.calls, self.men, self.women, self.event = [], list(men_rows), list(women_rows), event

    def __call__(self, path, params=None):
        self.calls.append(path)
        if path == "/events":
            return {"data": [{"event_id": 1, "event_slug": "2026-world-triathlon-cup-hamburg"}]
                    + ([{"event_id": 195162, "event_slug": "2026-world-triathlon-cup-tongyeong", "event_listing": PAGE}]
                       if self.event else [])}
        if path == "/events/195162/programs":
            return {"data": [{"prog_id": 10, "prog_name": "Elite Men", "is_race": True},
                             {"prog_id": 11, "prog_name": "Elite Women", "is_race": True},
                             {"prog_id": 12, "prog_name": "Elite Coaches", "is_race": False}]}
        rows = {"/events/195162/programs/10/results": self.men, "/events/195162/programs/11/results": self.women}[path]
        return {"data": {"prog_distance_category": "sprint", "prog_date": "2026-10-24",
                         "results": [row(1, 1, "Winner", "BEL")] + rows}}


def run(api, today="2026-10-25", data=DATA):
    return tr.plan(copy.deepcopy(data), api, date.fromisoformat(today))


class TriResultsTest(unittest.TestCase):
    def test_podium_history_and_notes_proposal_only(self):
        out = run(FakeApi([row(2)]))
        self.assertEqual(out["updates"], [{"athleteId": "shachar-sagiv", "result": {
            "at": "2026-10-24", "text": "מקום 2 בגביע העולם בטריאתלון טונגיונג (ספרינט, 24 באוק׳ 2026)", "source": PAGE}}])
        (p,) = out["proposals"]
        self.assertEqual(p["id"], "shachar-sagiv-20261024-result")
        self.assertEqual(p["doc"]["patch"], {"notes": "זכייה בגביע העולם בהואטולקו 2025. מקום 2 בגביע העולם בטריאתלון טונגיונג 2026"})
        self.assertEqual((p["doc"]["kind"], p["doc"]["target"], p["doc"]["status"]), ("update", "shachar-sagiv", "pending"))
        self.assertEqual(p["doc"]["evidence"][0]["url"], PAGE)

    def test_never_stage_or_quota(self):
        for pos in (1, 2, 3, 4, 40, "DNF", "DSQ"):
            raw = json.dumps(run(FakeApi([row(pos)])), ensure_ascii=False)
            for key in ('"stage"', "israelStatus", "quota", "archived"):
                self.assertNotIn(key, raw, pos)

    def test_outcomes(self):
        cases = {40: "מקום 40 בגביע העולם בטריאתלון טונגיונג (ספרינט, 24 באוק׳ 2026)",
                 "DNF": "לא סיים/ה את גביע העולם בטריאתלון טונגיונג (24 באוק׳ 2026)",
                 "DSQ": "נפסל/ה בגביע העולם בטריאתלון טונגיונג (24 באוק׳ 2026)"}
        for pos, text in cases.items():
            out = run(FakeApi([row(pos)]))
            self.assertEqual([u["result"]["text"] for u in out["updates"]], [text], pos)
            self.assertEqual(out["proposals"], [], f"{pos}: no proposal below the podium")

    def test_dns_or_missing_warns_and_writes_nothing(self):
        for rows in ([row("DNS")], [row(5, 999, "Someone Else", "ISR")], []):
            out = run(FakeApi(rows))
            self.assertEqual((out["updates"], out["proposals"]), ([], []))
        self.assertTrue(any("לא נמצא/ה בתוצאות" in w for w in run(FakeApi([]))["warnings"]))

    def test_unvalidated_list_writes_nothing(self):
        out = run(FakeApi([row(2, validated=False)]))
        self.assertEqual((out["updates"], out["proposals"]), ([], []))
        self.assertTrue(any("לא סופית" in w for w in out["warnings"]))
        self.assertFalse(any("לא נמצא/ה" in w for w in out["warnings"]), "no 'missing' warning while a list is pending")

    def test_only_isr_rows_and_name_fallback(self):
        no_profile = {**SAGIV, "source": ""}
        data = {**DATA, "athletes": [no_profile]}
        out = run(FakeApi([row(7, 555, "Shachar Sagiv", "GBR"), row(9, 555, "shachar sagiv")]), data=data)
        self.assertEqual([u["result"]["text"][:7] for u in out["updates"]], ["מקום 9 "])

    def test_window_and_entrants(self):
        for today in ("2026-10-24", "2026-10-29"):  # race day itself, and 5 days later
            api = FakeApi([row(2)])
            self.assertEqual(run(api, today)["updates"], [], today)
            self.assertEqual(api.calls, [], f"{today}: no API call outside the window")
        api = FakeApi([row(2)])
        self.assertEqual(run(api, data={**DATA, "athletes": [OTHER]})["updates"], [])
        self.assertEqual(api.calls, [], "no Israeli entrant: no API call")
        self.assertEqual(len(run(FakeApi([row(2)]), "2026-10-28")["updates"]), 1)

    def test_event_not_found_warns(self):
        out = run(FakeApi([row(2)], event=False))
        self.assertEqual(out["updates"], [])
        self.assertTrue(any("לא נמצא אירוע" in w for w in out["warnings"]))

    def test_idempotent_and_patch_integration(self):
        out = run(FakeApi([row(2)]))
        result = out["updates"][0]["result"]
        entry = {**result, "kind": "result"}
        patch = athlete_patch.build(SAGIV, {"result": result}, "2026-10-25T04:13:00Z")
        self.assertEqual((patch["updatedAt"], patch["history"][-1]), ("2026-10-25T04:13:00Z", entry))
        logged = {**SAGIV, "history": [entry], "notes": SAGIV["notes"] + ". מקום 2 בגביע העולם בטריאתלון טונגיונג 2026"}
        again = run(FakeApi([row(2)]), data={**DATA, "athletes": [logged]})
        self.assertEqual((again["updates"], again["proposals"]), ([], []), "next morning: nothing new")
        self.assertEqual(athlete_patch.build(logged, {"result": result}, "x"), {})

    def test_site_date_style(self):
        # fmt() in site/app.js: toLocaleDateString("he-IL", {day: "numeric", month: "short", year: "numeric"})
        want = ["5 בינו׳ 2026", "5 בפבר׳ 2026", "5 במרץ 2026", "5 באפר׳ 2026", "5 במאי 2026", "5 ביוני 2026",
                "5 ביולי 2026", "5 באוג׳ 2026", "5 בספט׳ 2026", "24 באוק׳ 2026", "5 בנוב׳ 2026", "5 בדצמ׳ 2026"]
        days = [f"2026-{m:02d}-05" for m in range(1, 13)]
        days[9] = "2026-10-24"
        self.assertEqual([tr.he_date(d) for d in days], want)
        self.assertNotIn("'", "".join(tr.HE_MONTHS), "geresh, not apostrophe")

    def test_no_proposal_without_db_records(self):
        out = run(FakeApi([row(1)]))
        self.assertTrue(out["proposals"])
        out = tr.plan(copy.deepcopy(DATA), FakeApi([row(1)]), date(2026, 10, 25), propose=False)
        self.assertEqual((len(out["updates"]), out["proposals"]), (1, []))

    def test_cli_db_dump_notes_and_dedupe(self):
        db_sagiv = {**SAGIV, "notes": "הערה חדשה מהמאגר"}  # edited after the last publish
        logged_elsewhere = {**OTHER, "id": "tri-archived", "archived": True}
        with tempfile.TemporaryDirectory() as tmp:
            os.makedirs(os.path.join(tmp, "db", "athletes"))
            for aid, doc, wrap in (("shachar-sagiv", db_sagiv, True), ("tri-archived", logged_elsewhere, False)):
                with open(os.path.join(tmp, "db", "athletes", aid + ".json"), "w", encoding="utf-8") as f:
                    json.dump({"id": aid, "data": doc} if wrap else doc, f, ensure_ascii=False)
            athletes = tr.db_athletes(os.path.join(tmp, "db"))
        self.assertEqual([a["id"] for a in athletes], ["shachar-sagiv"])
        out = tr.plan({**DATA, "athletes": athletes}, FakeApi([row(3)]), date(2026, 10, 25))
        self.assertEqual(out["proposals"][0]["doc"]["patch"]["notes"],
                         "הערה חדשה מהמאגר. מקום 3 בגביע העולם בטריאתלון טונגיונג 2026")

    def write_dump(self, root, athletes, comps):
        for coll, docs in (("athletes", athletes), ("competitions", comps)):
            os.makedirs(os.path.join(root, coll), exist_ok=True)
            for i, (doc_id, doc) in enumerate(docs.items()):
                body = {"id": doc_id, "data": doc} if i % 2 else doc   # ArtifactData out_dir writes both shapes
                with open(os.path.join(root, coll, doc_id + ".json"), "w", encoding="utf-8") as f:
                    json.dump(body, f, ensure_ascii=False)

    def test_db_dump_sees_what_the_published_file_doesnt(self):
        published = {"athletes": [SAGIV], "competitions": []}       # Tongyeong added to the DB after the last export
        self.assertEqual(run(FakeApi([row(5)]), data=published)["updates"], [])
        strip = lambda d: {k: v for k, v in d.items() if k != "id"}
        with tempfile.TemporaryDirectory() as tmp:
            self.write_dump(tmp, {"shachar-sagiv": strip(SAGIV)}, {"tri-world-cup-tongyeong-2026": strip(TONGYEONG)})
            data = tr.db_data(tmp)
            out = tr.plan(data, FakeApi([row(5)]), date(2026, 10, 25))
            self.assertEqual([u["athleteId"] for u in out["updates"]], ["shachar-sagiv"])
            logged = {**strip(SAGIV), "history": [{"at": "2026-10-24", "kind": "result", "text": out["updates"][0]["result"]["text"]}]}
            self.write_dump(tmp, {"shachar-sagiv": logged}, {})       # logged in the DB, not yet published
            again = tr.plan(tr.db_data(tmp), FakeApi([row(5)]), date(2026, 10, 25))
        self.assertEqual(again["updates"], [], "the 'already logged' check reads the DB history")

    def test_cli_accepts_the_db_dump_dir(self):
        strip = lambda d: {k: v for k, v in d.items() if k != "id"}
        with tempfile.TemporaryDirectory() as tmp:
            db = os.path.join(tmp, "db")
            self.write_dump(db, {"shachar-sagiv": strip(SAGIV)}, {"tri-world-cup-tongyeong-2026": strip(TONGYEONG)})
            r = subprocess.run([sys.executable, os.path.join(JOB, "tri_results.py"), db, "--today", "2026-10-25"],
                               capture_output=True, text=True, env={**os.environ, "HOME": tmp})
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("ה־API לא זמין", json.loads(r.stdout)["warnings"][0])  # reached the API step: dump was read

    def test_cli_without_key_file_warns_and_never_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            dp = os.path.join(tmp, "data.json")
            with open(dp, "w", encoding="utf-8") as f:
                json.dump(DATA, f, ensure_ascii=False)
            env = {**os.environ, "HOME": tmp}  # no ~/.config/il2la28/triathlon_api_key there
            r = subprocess.run([sys.executable, os.path.join(JOB, "tri_results.py"), dp, "--today", "2026-10-25"],
                               capture_output=True, text=True, env=env)
        self.assertEqual(r.returncode, 0, r.stderr)
        out = json.loads(r.stdout)
        self.assertEqual((out["updates"], out["proposals"]), ([], []))
        self.assertIn("ה־API לא זמין", out["warnings"][0])


if __name__ == "__main__":
    unittest.main()
