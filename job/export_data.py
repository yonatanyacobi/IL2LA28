"""Build the public data.json for the LA28 tracker from an ArtifactData dump.

Usage: python3 export_data.py <dump_dir> <out_file> [<previous_data.json>]
<dump_dir> holds athletes/, competitions/, sports/ and meta/status.json, as written by
ArtifactData list/get with out_dir. Only public fields are exported; proposals, run logs,
archived athletes and updatedBy (a viewer id) never leave the database.
With a previous data.json, the export refuses (exit 2) to shrink any collection by more
than 20%, so a failed or truncated dump can't publish a half-empty site.
"""
import glob, json, os, re, sys
from datetime import datetime, timezone

DATE = re.compile(r"\d{4}-\d{2}-\d{2}", re.ASCII)
ATHLETE_FIELDS = ["name", "name_en", "sportId", "event", "rank", "next", "nextDate", "notes", "source", "updatedAt"]
COMP_FIELDS = ["sportId", "name", "location", "start", "end", "notes", "source"]
HISTORY_KINDS = {"start", "stage", "rank", "result", "next", "note"}
HISTORY_PUBLIC = 10


def load(dump, coll):
    out = {}
    for f in glob.glob(os.path.join(dump, coll, "*.json")):
        d = json.load(open(f, encoding="utf-8"))
        out[os.path.basename(f)[:-5]] = d.get("data", d) if isinstance(d, dict) and "data" in d and "id" in d else d
    return out


def text(v, limit=600):
    return v.strip()[:limit] if isinstance(v, str) else ""


def https(u):
    return u if isinstance(u, str) and u.startswith("https://") else ""


def date(v):
    # fullmatch: "$" would accept a trailing newline; strptime rejects impossible dates like 2026-02-30
    try:
        return v if isinstance(v, str) and DATE.fullmatch(v) and datetime.strptime(v, "%Y-%m-%d") else ""
    except ValueError:
        return ""


def stage(v):
    try:
        return max(0, min(3, int(float(v))))
    except (TypeError, ValueError, OverflowError):  # OverflowError: "inf"
        return 0


def history(items):
    out = []
    for h in items if isinstance(items, list) else []:
        if not isinstance(h, dict) or not date(h.get("at")) or not text(h.get("text")):
            continue
        out.append({"at": h["at"], "kind": h.get("kind") if h.get("kind") in HISTORY_KINDS else "note",
                    "text": text(h["text"], 300), "source": https(h.get("source"))})
    out.sort(key=lambda h: h["at"])
    return out[-HISTORY_PUBLIC:]


def main(dump, out_file, prev_file=None):
    sports = load(dump, "sports")
    athletes = load(dump, "athletes")
    comps = load(dump, "competitions")
    meta = json.load(open(os.path.join(dump, "meta", "status.json"), encoding="utf-8"))
    meta = meta.get("data", meta)

    s_out = []
    for sid, s in sorted(sports.items()):
        w = s.get("window") if isinstance(s.get("window"), dict) else None
        if w and date(w.get("from")):
            w = {"from": w["from"], "to": date(w.get("to")) or None, "summary": text(w.get("summary")), "source": https(w.get("source"))}
        else:
            w = None
        s_out.append({"id": sid, "he": text(s.get("he"), 60) or sid, "en": text(s.get("en"), 60), "window": w})
    known = {s["id"] for s in s_out}

    a_out, dropped = [], []
    for aid, a in sorted(athletes.items()):
        if a.get("archived"):
            continue
        if a.get("sportId") not in known:
            dropped.append(aid)
            continue
        row = {"id": aid, **{k: text(a.get(k)) for k in ATHLETE_FIELDS}}
        row.update(stage=stage(a.get("stage")), source=https(a.get("source")), nextDate=date(a.get("nextDate")),
                   history=history(a.get("history")))
        a_out.append(row)

    c_out = []
    for cid, c in sorted(comps.items()):
        if c.get("sportId") not in known or not date(c.get("start")):
            dropped.append(cid)
            continue
        row = {"id": cid, **{k: text(c.get(k)) for k in COMP_FIELDS}, "qualifying": bool(c.get("qualifying"))}
        row.update(source=https(c.get("source")), end=date(c.get("end")))
        c_out.append(row)

    ids = {a["id"] for a in a_out}
    changes = []
    for ch in (meta.get("changes") or [])[:30]:
        if not isinstance(ch, dict) or not text(ch.get("text")):
            continue
        item = {"at": date(str(ch.get("at", ""))[:10]), "text": text(ch["text"], 300)}
        if ch.get("athleteId") in ids:
            item["athleteId"] = ch["athleteId"]
        changes.append(item)

    counts = {"sports": len(s_out), "athletes": len(a_out), "competitions": len(c_out)}
    if prev_file and os.path.exists(prev_file):
        prev = json.load(open(prev_file, encoding="utf-8"))
        for k, n in counts.items():
            before = len(prev.get(k) or [])
            if before and n < 0.8 * before:
                print(f"REFUSED: {k} dropped from {before} to {n}; not writing {out_file}")
                sys.exit(2)

    data = {
        "schemaVersion": 3,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "lastRun": text(meta.get("lastRun")),
        "sports": s_out, "athletes": a_out, "competitions": c_out, "changes": changes,
    }
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{counts} changes={len(changes)} dropped={dropped} -> {out_file}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
