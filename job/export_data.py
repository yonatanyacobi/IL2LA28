"""Build the public data.json for the LA28 tracker from an ArtifactData dump.

Usage: python3 export_data.py <dump_dir> <out_file> [<previous_data.json>]
<dump_dir> holds athletes/, competitions/, sports/, corrections/ and meta/status.json, as written by
ArtifactData list/get with out_dir. Only public fields are exported; proposals, run logs,
archived athletes, updatedBy and verifiedBy (viewer ids) and anything identifying who reported
a correction never leave the database.
With a previous data.json, the export refuses (exit 2) to shrink any collection by more
than 20%, so a failed or truncated dump can't publish a half-empty site.
"""
import glob, json, os, re, sys
from datetime import datetime, timezone

DATE = re.compile(r"\d{4}-\d{2}-\d{2}", re.ASCII)
# Timezone required: the page compares verifiedAt with updatedAt as instants.
ISO = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})", re.ASCII)
ATHLETE_FIELDS = ["name", "name_en", "sportId", "event", "rank", "next", "nextDate", "notes", "source", "updatedAt"]
COMP_FIELDS = ["sportId", "name", "location", "start", "end", "notes", "source"]
HISTORY_KINDS = {"start", "stage", "rank", "result", "next", "note"}
HISTORY_PUBLIC = 10
RANK_LIST_MAX = 80
# Public corrections log (docs/design/corrections-log.md). Same value as LAUNCH_AT in site/app.js; the PM sets it.
LAUNCH_AT = "2026-10-22T09:00:00Z"
CORRECTION_TARGETS = {"athlete", "sport", "quota"}
CORRECTION_FIELDS = {"name", "event", "rank", "next", "nextDate", "notes", "stage", "sportId", "quota"}
CORRECTION_BY = {"reader", "audit", "job"}
CORRECTIONS_MAX = 300
# data.json is public: a correction mentioning an email address is held back, whoever typed it.
EMAIL = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")


def load(dump, coll, dropped):
    out = {}
    for f in glob.glob(os.path.join(dump, coll, "*.json")):
        with open(f, encoding="utf-8") as fh:
            d = json.load(fh)
        doc_id = os.path.basename(f)[:-5]
        d = d.get("data", d) if isinstance(d, dict) and "data" in d and "id" in d else d
        if isinstance(d, dict):
            out[doc_id] = d
        else:
            dropped.append(doc_id)
    return out


# A Hebrew word (optionally opened by a ' quote) that may contain ' and " typed for geresh/gershayim.
HEB_WORD = re.compile(r"(?<![\w'])('?)([א-ת][א-ת'\"]*)")


def _geresh_word(m):
    opener, word = m.groups()
    tail = "'" if opener and word.endswith("'") else ""  # 'מילה' is a quotation, not an abbreviation
    word = word[:len(word) - len(tail)]
    word = re.sub(r"(?<=[א-ת])'", "׳", word)  # צ'לנג', מ' -> geresh
    word = re.sub(r'(?<=[א-ת])"(?=[א-ת])', "״", word)  # ארה"ב -> gershayim
    return opener + word + tail


def geresh(s):
    """Typed ' and " attached to Hebrew letters -> ׳ and ״. Latin text and URLs are left alone."""
    return re.sub(r"\S+", lambda m: m.group() if "://" in m.group() else HEB_WORD.sub(_geresh_word, m.group()), s)


def text(v, limit=600):
    return geresh(v.strip())[:limit] if isinstance(v, str) else ""


def https(u):
    return u if isinstance(u, str) and u.startswith("https://") else ""


def date(v):
    # fullmatch: "$" would accept a trailing newline; strptime rejects impossible dates like 2026-02-30
    try:
        return v if isinstance(v, str) and DATE.fullmatch(v) and datetime.strptime(v, "%Y-%m-%d") else ""
    except ValueError:
        return ""


def iso(v):
    return v if isinstance(v, str) and ISO.fullmatch(v) and date(v[:10]) else ""


def stage(v):
    try:
        return max(0, min(3, int(float(v))))
    except (TypeError, ValueError, OverflowError):  # OverflowError: "inf"
        return 0


def rank_fields(a):
    """rankNum only together with its list and date; anything unusable exports as no rank, never a guess."""
    n, lst, at = a.get("rankNum"), text(a.get("rankList"), RANK_LIST_MAX), date(a.get("rankAsOf"))
    if isinstance(n, str) and n.strip().isdigit():  # edit-form inputs may arrive as strings
        n = int(n)
    ok = type(n) is int and n >= 1 and lst and at
    return {"rankNum": n if ok else None, "rankList": lst, "rankAsOf": at}


def instant(v):
    v = iso(v)
    return datetime.fromisoformat(v.replace("Z", "+00:00")) if v else None


def correction(cid, c):
    """Public form of corrections/<id>, or None. Fields are whitelisted, so reporter or editor ids never leave."""
    at, t, src = instant(c.get("at")), c.get("target"), https(c.get("source"))
    if not (at and at >= instant(LAUNCH_AT) and src and c.get("by") in CORRECTION_BY and isinstance(t, dict)
            and t.get("kind") in CORRECTION_TARGETS and text(t.get("id"), 120) and text(t.get("name"), 120)):
        return None
    changes = [{"field": ch["field"], "wrong": text(ch.get("wrong"), 200), "right": text(ch.get("right"), 200)}
               for ch in (c.get("changes") if isinstance(c.get("changes"), list) else [])
               if isinstance(ch, dict) and ch.get("field") in CORRECTION_FIELDS]
    changes = [ch for ch in changes if ch["wrong"] or ch["right"]]
    if not 1 <= len(changes) <= 5:
        return None
    out = {"id": cid, "at": iso(c["at"]), "reportedAt": iso(c.get("reportedAt")),
           "target": {"kind": t["kind"], "id": text(t["id"], 120), "name": text(t["name"], 120)},
           "changes": changes, "source": src, "by": c["by"]}
    if any(EMAIL.search(s) for s in [out["target"]["name"]] + [v for ch in changes for v in (ch["wrong"], ch["right"])]):
        return None
    return out


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
    dropped = []
    sports, athletes, comps, corrs = (load(dump, c, dropped) for c in ("sports", "athletes", "competitions", "corrections"))
    with open(os.path.join(dump, "meta", "status.json"), encoding="utf-8") as fh:
        meta = json.load(fh)
    meta = meta.get("data", meta) if isinstance(meta, dict) else {}
    meta = meta if isinstance(meta, dict) else {}

    s_out = []
    for sid, s in sorted(sports.items()):
        w = s.get("window") if isinstance(s.get("window"), dict) else None
        if w and date(w.get("from")):
            w = {"from": w["from"], "to": date(w.get("to")) or None, "summary": text(w.get("summary")), "source": https(w.get("source"))}
        else:
            w = None
        s_out.append({"id": sid, "he": text(s.get("he"), 60) or sid, "en": text(s.get("en"), 60), "window": w})
    known = {s["id"] for s in s_out}

    a_out = []
    for aid, a in sorted(athletes.items()):
        if a.get("archived"):
            continue
        if a.get("sportId") not in known:
            dropped.append(aid)
            continue
        row = {"id": aid, **{k: text(a.get(k)) for k in ATHLETE_FIELDS}}
        row.update(stage=stage(a.get("stage")), source=https(a.get("source")), nextDate=date(a.get("nextDate")),
                   updatedAt=iso(a.get("updatedAt")), verifiedAt=iso(a.get("verifiedAt")), history=history(a.get("history")),
                   **rank_fields(a))
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

    fixes = []
    for cid, c in corrs.items():
        row, at = correction(cid, c), instant(c.get("at"))
        if row:
            fixes.append(row)
        elif not (at and at < instant(LAUNCH_AT)):  # pre-launch entries are skipped by design, not reported
            dropped.append(cid)
    fixes = sorted(fixes, key=lambda r: (instant(r["at"]), r["id"]), reverse=True)[:CORRECTIONS_MAX]

    counts = {"sports": len(s_out), "athletes": len(a_out), "competitions": len(c_out), "corrections": len(fixes)}
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
        "lastRun": iso(meta.get("lastRun")),
        "sports": s_out, "athletes": a_out, "competitions": c_out, "changes": changes, "corrections": fixes,
    }
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{counts} changes={len(changes)} dropped={dropped} -> {out_file}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
