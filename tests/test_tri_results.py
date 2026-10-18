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
        self.assertEqual(out["updates"], [{"athleteId": "shachar-sagiv", "historyEntry": {
            "at": "2026-10-24", "kind": "result", "text": "מקום 2 בגביע העולם בטריאתלון טונגיונג (ספרינט, 2026-10-24)",
            "source": PAGE}}])
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
        cases = {40: "מקום 40 בגביע העולם בטריאתלון טונגיונג (ספרינט, 2026-10-24)",
                 "DNF": "לא סיים/ה את גביע העולם בטריאתלון טונגיונג (2026-10-24)",
                 "DSQ": "נפסל/ה בגביע העולם בטריאתלון טונגיונג (2026-10-24)"}
        for pos, text in cases.items():
            out = run(FakeApi([row(pos)]))
            self.assertEqual([u["historyEntry"]["text"] for u in out["updates"]], [text], pos)
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
        self.assertEqual([u["historyEntry"]["text"][:7] for u in out["updates"]], ["מקום 9 "])

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
        entry = out["updates"][0]["historyEntry"]
        patch = athlete_patch.build(SAGIV, {"historyEntry": entry}, "2026-10-25T04:13:00Z")
        self.assertEqual((patch["updatedAt"], patch["history"][-1]), ("2026-10-25T04:13:00Z", entry))
        logged = {**SAGIV, "history": [entry], "notes": SAGIV["notes"] + ". מקום 2 בגביע העולם בטריאתלון טונגיונג 2026"}
        again = run(FakeApi([row(2)]), data={**DATA, "athletes": [logged]})
        self.assertEqual((again["updates"], again["proposals"]), ([], []), "next morning: nothing new")
        self.assertEqual(athlete_patch.build(logged, {"historyEntry": entry}, "x"), {})

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
