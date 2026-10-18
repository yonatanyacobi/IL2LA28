"""Every quota event in the next 14 days needs a competition in data.json (same sport, overlapping dates),
or the today strip and the calendar have nothing to show on the day. "Today" is the snapshot's generatedAt
date, so the check moves with the fixture, not the wall clock."""
import json, os, unittest
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
WINDOW_DAYS = 14
# A gap we can't fix yet, as (sportId, nextQuotaEvent.name); remove it once the competition is in the fixture.
KNOWN_MISSING = set()


def load(*parts):
    with open(os.path.join(HERE, *parts), encoding="utf-8") as f:
        return json.load(f)


def missing_competitions(data, quotas):
    today = date.fromisoformat(data["generatedAt"][:10])
    last = today + timedelta(days=WINDOW_DAYS)
    comps = [c for c in data["competitions"] if c.get("start")]
    out = set()
    for q in quotas["items"]:
        e = q.get("nextQuotaEvent")
        if not e or not (today <= date.fromisoformat(e["start"]) <= last):
            continue
        e_end = e.get("end") or e["start"]
        if not any(c["sportId"] == q["sportId"] and c["start"] <= e_end and e["start"] <= (c.get("end") or c["start"])
                   for c in comps):
            out.add((q["sportId"], e["name"]))
    return out


class QuotaEventCoverageTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.missing = missing_competitions(load("fixtures", "data.json"), load("fixtures", "site-quotas-2026-10-18.json"))

    def test_no_new_gaps(self):
        self.assertEqual(self.missing - KNOWN_MISSING, set())

    def test_every_upcoming_quota_event_has_a_competition(self):
        self.assertEqual(self.missing, set())

    def test_overlap_rule(self):
        data = {"generatedAt": "2026-10-18T09:00:00Z", "competitions": [
            {"sportId": "judo", "start": "2026-10-29", "end": "2026-10-31"}]}
        q = lambda sport, start, end=None, name="x": {"sportId": sport, "nextQuotaEvent": {
            "name": name, "start": start, **({"end": end} if end else {})}}
        quotas = {"items": [q("judo", "2026-10-30"), q("judo", "2026-10-27", "2026-10-29"),  # inside / overlapping
                            q("judo", "2026-10-20", name="gap"), q("shooting", "2026-10-30", name="other sport"),
                            q("judo", "2026-11-20", name="beyond 14 days"), {"sportId": "judo", "nextQuotaEvent": None}]}
        self.assertEqual(missing_competitions(data, quotas), {("judo", "gap"), ("shooting", "other sport")})


if __name__ == "__main__":
    unittest.main()
