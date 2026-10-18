// Athlete results log ("game log", issue #178): data only for now; the athlete-page UI follows the UX spec.
// Loaded after app.js and day.js (exportedSessions, compOn). Strings are returned raw: the UI escapes them.
"use strict";

const GAMELOG_MAX = 50;

// One athlete's results, newest first: [{date, comp, phase, result, source, resultAt}]. Sources:
// - exported sessions she is in with a result. exportedSessions() keeps only proven results (https source + resultAt),
//   which are official for the whole session (e.g. a team). The merged per-athlete text that daySessions() builds
//   for #day is not used here, so a teammate's result never lands in her log;
// - her history entries of kind "result" (the job writes these), matched to the competition running that day.
// Sessions on the same day (heats, a final) stay separate rows. A history entry for a day and competition that
// already has a session row is the same result: the session row stays, taking the history source if it has none.
function gameLog(a){
  if (!a) return [];
  const rows = [];
  for (const s of exportedSessions()) {
    if (!s.athletes.includes(a) || !s.result) continue;
    rows.push({date: s.day, comp: s.comp, phase: s.phase, result: s.result, source: s.resultSource, resultAt: s.resultAt});
  }
  for (const h of Array.isArray(a.history) ? a.history : []) {
    if (h?.kind !== "result" || !isDate(h.at) || !str(h.text).trim()) continue;
    const comp = compOn(a.sportId, h.at), same = rows.filter(r => r.date === h.at && (r.comp?.id || "") === (comp?.id || ""));
    if (same.length) { for (const r of same) if (!safeUrl(r.source) && safeUrl(h.source)) r.source = h.source; continue; }
    rows.push({date: h.at, comp, phase: "", result: str(h.text).trim().slice(0, 120), source: safeUrl(h.source) ? h.source : "", resultAt: ""});
  }
  return rows.sort((x, y) => y.date.localeCompare(x.date) || heCmp(x.comp?.name, y.comp?.name)).slice(0, GAMELOG_MAX);
}
