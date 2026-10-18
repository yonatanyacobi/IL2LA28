"""Build the public data.json for the LA28 tracker from an ArtifactData dump.

Usage: python3 export_data.py <dump_dir> <out_file> [<previous_data.json>]
<dump_dir> holds athletes/, competitions/, sports/, corrections/, sessions/ and meta/status.json, as written by
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
HISTORY_KINDS = {"start", "stage", "rank", "result", "next", "note", "correction"}
HISTORY_PUBLIC = 10
RANK_LIST_MAX = 80
# Public corrections log (docs/design/corrections-log.md). The single source: data.json carries it as launchAt and
# the page reads it from there. None until the owner picks a launch date; the launch PR sets an ISO instant with Z.
# While None, no correction is published.
LAUNCH_AT = None
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


RANK_PREFIXES = ("rank", "olympicRank")  # world rank, and the Olympic qualification list (spec-rank-tiebreak, #218)


def rank_fields(a, prefix="rank"):
    """<prefix>Num only together with its list and date; anything unusable exports as no rank, never a guess."""
    n, lst, at = a.get(prefix + "Num"), text(a.get(prefix + "List"), RANK_LIST_MAX), date(a.get(prefix + "AsOf"))
    if isinstance(n, str) and n.strip().isdigit():  # edit-form inputs may arrive as strings
        n = int(n)
    ok = type(n) is int and n >= 1 and lst and at
    return {prefix + "Num": n if ok else None, prefix + "List": lst, prefix + "AsOf": at}


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


SESSION_TEXT_MAX = 120
SIGNED_OFF = {"ok", "fixed"}  # = build_quotas.PUBLISH: only fact-checked rows reach data.json
HHMM = re.compile(r"([01]\d|2[0-3]):[0-5]\d", re.ASCII)


def start_utc(day, time_local, tz):
    """The session start as ISO with Z, from the venue's local time and IANA zone (docs/design/sessions-contract.md)."""
    from zoneinfo import ZoneInfo
    try:
        local = datetime.strptime(f"{day} {time_local}", "%Y-%m-%d %H:%M").replace(tzinfo=ZoneInfo(tz))
    except (ValueError, TypeError, LookupError, OSError):  # LookupError covers ZoneInfoNotFoundError
        return None
    return local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def session(sid, s, comps, athlete_ids, held):
    """Public form of sessions/<id> (whitelist), or None to drop it. held collects ids exported with a field blanked."""
    comp = comps.get(s.get("competitionId"))
    day = date(s.get("date"))
    review = s.get("review") if isinstance(s.get("review"), dict) else {}
    if review.get("status") not in SIGNED_OFF:  # fact-check gate, as build_quotas.py does for quota items
        return None
    if (not comp or not day or not comp["start"] <= day <= (comp["end"] or comp["start"]) or not https(s.get("source"))
            or not text(s.get("phase"))):
        return None
    ids = [a for a in dict.fromkeys(s.get("athleteIds") or []) if isinstance(a, str) and a in athlete_ids]
    if not ids:
        return None
    when = None
    if s.get("timeLocal") or s.get("tz"):
        when = start_utc(day, s.get("timeLocal"), s.get("tz")) if HHMM.fullmatch(str(s.get("timeLocal"))) else None
        if not when:
            held.append(f"{sid} (time)")
    result = text(s.get("result"), SESSION_TEXT_MAX)
    proof = https(s.get("resultSource")), iso(s.get("resultAt"))
    if result and not (proof[0] and proof[1].endswith("Z")):
        held.append(f"{sid} (result)")
        result = ""
    return {"id": sid, "competitionId": comp["id"], "date": day, "startUtc": when, "athleteIds": ids,
            "phase": text(s.get("phase"), SESSION_TEXT_MAX), "source": https(s.get("source")),
            "result": result, "resultSource": proof[0] if result else "", "resultAt": proof[1] if result else ""}


def main(dump, out_file, prev_file=None):
    dropped = []
    sports, athletes, comps, corrs, sess = (load(dump, c, dropped)
                                            for c in ("sports", "athletes", "competitions", "corrections", "sessions"))
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
                   **rank_fields(a), **rank_fields(a, "olympicRank"))
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
    for cid, c in corrs.items() if LAUNCH_AT else ():  # no launch date yet: nothing is public, nothing is an error
        row, at = correction(cid, c), instant(c.get("at"))
        if row:
            fixes.append(row)
        elif not (at and at < instant(LAUNCH_AT)):  # pre-launch entries are skipped by design, not reported
            dropped.append(cid)
    fixes = sorted(fixes, key=lambda r: (instant(r["at"]), r["id"]), reverse=True)[:CORRECTIONS_MAX]

    sessions, held, by_comp = [], [], {c["id"]: c for c in c_out}
    for sid, s in sorted(sess.items()):
        row = session(sid, s, by_comp, ids, held)
        if row:
            sessions.append(row)
        else:
            dropped.append(sid)
    sessions.sort(key=lambda r: (r["date"], r["startUtc"] is None, r["startUtc"] or "", r["id"]))

    counts = {"sports": len(s_out), "athletes": len(a_out), "competitions": len(c_out), "sessions": len(sessions)}
    if LAUNCH_AT:  # without a launch date corrections are [] by design, so the guard ignores them
        counts["corrections"] = len(fixes)
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
        "sports": s_out, "athletes": a_out, "competitions": c_out, "changes": changes,
        "launchAt": LAUNCH_AT, "corrections": fixes, "sessions": sessions,
    }
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{counts} changes={len(changes)} dropped={dropped} held={held} -> {out_file}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
