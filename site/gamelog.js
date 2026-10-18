// Athlete results log ("game log", issue #178; docs/design/athlete-game-log.md) on the athlete page.
// Loaded after app.js and day.js (exportedSessions, compOn). Results are shown as written: nothing is parsed or added.
"use strict";

const GAMELOG_MAX = 50, GAMELOG_ROWS = 10;

// One athlete's results, newest first: [{date, comp, phase, result, source, resultAt, startUtc}]. Sources:
// - exported sessions she is in with a result. exportedSessions() keeps only proven results (https source + resultAt),
//   which are official for the whole session (e.g. a team). The merged per-athlete text that daySessions() builds
//   for #day is not used here, so a teammate's result never lands in her log;
// - her history entries of kind "result" with an https source (the job writes these), matched to the competition
//   running that day.
// A history result on a day that already has a session result is the same result: the session wins.
function gameLog(a){
  if (!a) return [];
  const rows = [];
  for (const s of exportedSessions()) {
    if (!s.athletes.includes(a) || !s.result) continue;
    rows.push({date: s.day, comp: s.comp, phase: s.phase, result: s.result, source: s.resultSource, resultAt: s.resultAt, startUtc: s.startUtc});
  }
  const sessionDays = new Set(rows.map(r => r.date));
  for (const h of Array.isArray(a.history) ? a.history : []) {
    if (h?.kind !== "result" || !isDate(h.at) || !str(h.text).trim() || !safeUrl(h.source) || sessionDays.has(h.at)) continue;
    rows.push({date: h.at, comp: compOn(a.sportId, h.at), phase: "", result: str(h.text).trim().slice(0, 120), source: h.source, resultAt: "", startUtc: null});
  }
  return rows.sort((x, y) => y.date.localeCompare(x.date) || heCmp(x.comp?.name, y.comp?.name)).slice(0, GAMELOG_MAX);
}

// Rows for the page: one per competition (prelims and final together), one per result without a competition.
// Rows newest first by their last day; entries inside a row oldest first (day, then start time).
function gameLogRows(a){
  const groups = new Map();
  gameLog(a).forEach((r, i) => { const k = r.comp?.id || `none-${i}`; groups.set(k, [...(groups.get(k) || []), r]); });
  return [...groups.values()].map(entries => {
    entries.sort((x, y) => x.date.localeCompare(y.date) || byStart(x.startUtc, y.startUtc));
    return {comp: entries[0].comp, entries, first: entries[0].date, last: entries[entries.length - 1].date};
  }).sort((x, y) => y.last.localeCompare(x.last));
}

// The year only when it isn't this year: "29–30 באוק׳", "12 בספט׳ 2025".
function logDays(first, last){
  const year = today().slice(0, 4), one = d => `<time datetime="${d}">${d.slice(0, 4) === year ? fmtShort(d) : fmt(d)}</time>`;
  return first === last ? one(first) : `${one(first)}–${one(last)}`;
}

function gameLogRow({comp, entries, first, last}){
  // One source for the whole row is shown once, on its last entry.
  const shared = entries.every(e => e.source === entries[0].source);
  const src = e => linkOut(e.source, `מקור: ${host(e.source)}`);
  return `<li><span class="d">${logDays(first, last)}</span>
    <span class="t">${comp ? `<a href="#c-${esc(comp.id)}">${esc(comp.name)}</a>` : `<span class="muted">תחרות שאינה במאגר</span>`}${entries.map((e, i) =>
      `<span class="res">${e.phase ? `<bdi>${esc(e.phase)}</bdi>: ` : ""}${esc(e.result)}${!shared || i === entries.length - 1 ? ` · ${src(e)}` : ""}</span>`).join("")}</span></li>`;
}

function gameLogSection(a){
  const rows = gameLogRows(a), n = rows.reduce((k, r) => k + r.entries.length, 0);
  const shown = rows.slice(0, GAMELOG_ROWS), more = rows.slice(GAMELOG_ROWS), k = more.reduce((x, r) => x + r.entries.length, 0);
  return `<section class="panel" aria-labelledby="logH"><h2 id="logH">תוצאות בתחרויות</h2>
    ${n ? `<p class="kpi muted">${plural(n, "תוצאה אחת", "תוצאות")} ${rows.length === 1 ? "בתחרות אחת" : `ב־${rows.length} תחרויות`}</p>
    <ul class="rows game-log">${shown.map(gameLogRow).join("")}</ul>
    ${more.length ? `<details><summary>${k === 1 ? "הצגת עוד תוצאה אחת" : `הצגת עוד ${k} תוצאות`}</summary><ul class="rows game-log">${more.map(gameLogRow).join("")}</ul></details>` : ""}
    <p class="foot">כל תוצאה מופיעה עם המקור שלה · ${CADENCE}</p>`
    : `<p class="muted">עוד לא תועדו תוצאות של ${esc(a.name)} בתחרויות.</p>`}
  </section>`;
}
