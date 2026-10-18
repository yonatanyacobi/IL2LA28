# Standings vs. the quota line (`#sport-<id>`), issue #179

Status: spec · Owner: UX · PM roadmap priority 5 · Sports: judo, taekwondo, fencing first. Builders: Itai (UI),
Maya (data), Roni (rank backfill). Builds on `spec-rank-tiebreak.md` (rankNum/rankList/rankAsOf).
Works at 400px and 1280px, light and dark, signed out. CSS tokens only.

**Purpose.** Per quota event, the ranked Israelis in order, and where the quota line sits on the same official list.
**The honesty rule:** the line is a position on a list, not a forecast. Most systems count one athlete per country,
add continental places and finalise on a later date, so "above the line" is never "qualified".

## 1. Data (Maya)
- **New quota-item field `cutoff`** (in `data/quotas/quotas.json`, fact-checked like the rest; exported to
  `site/quotas.json`):
  `{"rank": 17, "list": "IJF Olympic Ranking List", "url": "https://…", "final": "2028-06-15", "opens": "2026-06-15"}`
  - `rank`: the last direct-quota position on that list, as the qualification system states it.
  - `list`: the same string an athlete's `rankList` uses, so the two compare exactly.
  - `url`: the official ranking list page (https), the link Gil's acceptance opens.
  - `final`: the date the list counts; `opens`: when the ranking period starts (optional).
  - No `cutoff` → the event has no standings block. Nothing is computed from `allocation` text.
- **Athletes:** `quotaAthletes(q)` (existing matching). Raw `rankNum` orders them, **not** `rankOf()`, which hides
  stale ranks; stale ones are flagged instead (§3).
- **Teams (fencing team events):** the ranked unit is the national team, not its fencers. v1 shows only the
  period state (§2, "not open"); a `teamRank {num, asOf, source}` on the quota item is a later ask.

## 2. Block on the sport page
After "שיטת ההעפלה", before "תחרויות קרובות בענף": `<section class="panel"><h2>דירוג מול קו המכסה</h2>`, then one
`<h3><bdi>{q.event}</bdi></h3>` per item with a `cutoff`, in the sport page's quota order.
```
┌ דירוג מול קו המכסה ──────────────────┐
│ 60- ק״ג גברים                        │  ← h3
│ IJF Olympic Ranking List · שיטת ההעפלה │  ← .foot: linkOut(cutoff.url, list) · linkOut(q.source, "שיטת ההעפלה")
│  5  ★ יצחק אשפיז · 3 באוק׳ 2026       │  ← .d = rankNum; .t = name · rankAsOf
│ ┄┄ קו המכסה: מקום 17 ┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │  ← li.cutline
│ 41  {name} · 12 ביולי 2026 [דירוג מ־12 ביולי 2026] │
│ ללא דירוג: {name}, {name}             │
│ הקו הוא מקום ברשימה, לא תחזית: …      │  ← the caveat line
└──────────────────────────────────────┘
```
- **Rows** (`<ol class="rows">`): ranked athletes on `cutoff.list`, by `rankNum` (ties by name). The cut line is an
  `<li class="cutline" aria-hidden="true">` (each row's sr text carries it) after the last athlete with `rankNum ≤ cutoff.rank` (or first, if none is). ★ for followed.
- **Other list:** an athlete whose `rankList` differs is never placed against the line. They go under it as
  `בדירוג אחר: {name}, מקום {n} ב־<bdi>{rankList}</bdi>`.
- **Unranked:** one line, `ללא דירוג: {names}` (Gil's acceptance).
- **Period not open** (`today < opens`): no rows, only `תקופת הדירוג להעפלה נפתחת ב־{fmt(opens)}.`
- **Status text, not colour:** each row's `.t` ends with `<span class="sr">, מעל קו המכסה</span>` or
  `<span class="sr">, מתחת לקו המכסה</span>`; the visible cut line carries the same meaning for sighted readers.

## 3. Stale ranks (flagged, not hidden)
`rankAsOf` older than `RANK_MAX_AGE_D` (60 days): the row stays in order and gets
`<span class="pill ended">דירוג מ־{fmt(rankAsOf)}</span>`: the neutral pill, not the ◷ awaiting style, since nothing
is awaited; the date says the rest.

## 4. Athlete page
In `.facts`, for an athlete in a block: `<dt>מול קו המכסה</dt><dd>מקום {n} · הקו: מקום {cutoff.rank} ·
<bdi>{list}</bdi>, {fmt(rankAsOf)}</dd>`, linking to `#sport-{id}`. No row when the lists differ.

## 5. Copy (Shira)
| Key | Hebrew |
|---|---|
| h2 | `דירוג מול קו המכסה` |
| line | `קו המכסה: מקום {rank}` |
| other list | `בדירוג אחר: {name}, מקום {n} ב־{list}` |
| unranked | `ללא דירוג: {names}` |
| not open | `תקופת הדירוג להעפלה נפתחת ב־{date}.` |
| stale pill | `דירוג מ־{date}` |
| caveat (`.foot`) | `הקו הוא מקום ברשימה, לא תחזית. ברוב השיטות כל מדינה יכולה לקבל לכל היותר מכסה אחת במקצה, ויש גם מסלולים יבשתיים. הדירוג הסופי נקבע ב־{fmt(final)}.` |
| sr above / below | `מעל קו המכסה` / `מתחת לקו המכסה` |

Never: "עולה", "בפנים", "הבטיח/ה", "מכסה בדרך", "מעפיל", "בטוח", "כמעט", or any word that turns a position into a verdict.

## 6. CSS (tokens only)
```css
.rows li.cutline{display:block;border-top:2px dashed var(--sun);padding-top:4px;color:var(--sun-ink);font-size:14px;font-weight:700}
```
`--sun-ink` on `--surface` is the brand-text pair already used by `.brand b` and `.admin-chip`.

## 7. Tests (fixture + injected ranks and cutoffs)
- Judo 60 kg, cutoff 17: ranks 5 and 41 → 5, the line, 41; an athlete without `rankNum` is in `ללא דירוג`.
- Everyone above the line → the line is last; everyone below → first.
- A 75-day-old rank keeps its place and shows the neutral `דירוג מ־` pill (not `s-wait`); a different `rankList` goes to `בדירוג אחר`, never above the line.
- `today < opens` → only the "not open" line. No `cutoff` → no block.
- The list name links to `cutoff.url` and "שיטת ההעפלה" to `q.source`, both via `linkOut`; output has none of the §5 "never" words.

## Asks
- **Maya:** `cutoff` in quotas.json + `build_quotas.py` + validator (rank int ≥ 1, list non-empty, https url, dates valid).
- **Roni:** backfill `rankNum`/`rankList`/`rankAsOf` for judo and taekwondo **on the list named in `cutoff.list`**.
  Today's judo ranks are on the IJF World Ranking List, but the quota line is on the Olympic list; until they match,
  judo shows those athletes under `בדירוג אחר`.
