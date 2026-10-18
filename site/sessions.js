// Sessions shared by #day (day.js) and #c- (event.js): data, status rule and row markup, so both render the same.
// Sessions come from data.json.sessions (docs/design/sessions-contract.md); athletes with no session that day fall
// back to pseudo-sessions from their nextDate and history entries of kind "result". Loaded after app.js.
"use strict";

const CADENCE = "מתעדכן פעם ביום";   // the one place to change when event-day runs are approved (OD2)
const SESSION_WINDOW_H = 3;          // a timed session counts as "now" from its start to +3h

const asDate = d => new Date(d + "T12:00:00");
const isUtc = v => typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?Z$/.test(v) && !isNaN(Date.parse(v));
const dayTitle = d => asDate(d).toLocaleDateString("he-IL", {weekday: "short", day: "numeric", month: "short", year: "numeric"});
const hhmm = iso => new Date(iso).toLocaleTimeString("he-IL", {hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem"});
const ilDate = iso => new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Jerusalem"}).format(new Date(iso));

// The ≤ 31-day competition of a sport that contains day d (season-long series don't count).
const compOn = (sid, d) => S.comps.find(c => c.sportId === sid && c.start <= d && d <= (c.end || c.start) && dayNo(c.start, c.end || c.start) <= SERIES_DAYS) || null;

// data.json.sessions, re-checked as defense in depth: unknown competition or no known athlete → dropped; a result
// without its proof (https source + resultAt) is not shown. Read from the public snapshot, which editors load too.
function exportedSessions(){
  const list = typeof publicSnapshot !== "undefined" && Array.isArray(publicSnapshot?.sessions) ? publicSnapshot.sessions : [];
  return list.filter(s => s && typeof s === "object" && isDate(s.date)).map(s => {
    const comp = S.comps.find(c => c.id === s.competitionId);
    const athletes = (Array.isArray(s.athleteIds) ? s.athleteIds : []).map(id => S.athletes.find(a => a.id === id)).filter(Boolean);
    const proven = str(s.result).trim() && safeUrl(s.resultSource) && isUtc(s.resultAt);
    return comp && athletes.length ? {comp, athletes, sportId: comp.sportId, phase: str(s.phase).slice(0, 120),
      startUtc: isUtc(s.startUtc) ? s.startUtc : null, day: isUtc(s.startUtc) ? ilDate(s.startUtc) : s.date, timed: true,
      result: proven ? str(s.result).slice(0, 120) : "", resultSource: proven ? s.resultSource : "", resultAt: proven ? s.resultAt : ""} : null;
  }).filter(Boolean);
}

// Fallback pseudo-sessions for day d, one per athlete (deduped by athlete + day; a recorded result wins).
function fallbackSessions(d){
  const out = new Map();
  for (const a of S.athletes) {
    const res = (Array.isArray(a.history) ? a.history : []).find(h => h.kind === "result" && h.at === d && str(h.text).trim());
    const base = {athletes: [a], sportId: a.sportId, comp: compOn(a.sportId, d), phase: a.event || "", startUtc: null, timed: false};
    if (res) out.set(a.id, {...base, result: str(res.text).slice(0, 120), resultSource: res.source, resultAt: ""});
    else if (a.nextDate === d) out.set(a.id, {...base, result: ""});
  }
  return [...out.values()];
}

// The job records results in athletes' history (#137); a session without its own result takes them for that day.
const historyResult = (a, d) => (Array.isArray(a.history) ? a.history : []).find(h => h.kind === "result" && h.at === d && str(h.text).trim());

// Exported sessions, plus fallback pseudo-sessions for athletes who have no session in that day's competition (merged
// per athlete). An athlete with a session on any day of the competition gets no fallback row, or a nextDate on day 1
// and a session on day 3 would list them twice.
function daySessions(d){
  const all = exportedSessions();
  const inComp = new Set(all.flatMap(s => s.athletes.map(a => `${s.comp.id}|${a.id}`)));
  const real = all.filter(s => s.day === d).map(s => {
    if (s.result) return s;
    const found = s.athletes.map(a => [a, historyResult(a, d)]).filter(([, h]) => h);
    if (!found.length) return s;
    const text = found.length === 1 && s.athletes.length === 1 ? str(found[0][1].text)
      : found.map(([a, h]) => `${a.name}: ${str(h.text)}`).join(" · ");
    return {...s, result: text.slice(0, 120), resultSource: found[0][1].source, resultAt: ""};   // a date only: no "עודכן ב־"
  });
  const covered = new Set(real.flatMap(s => s.athletes.map(a => a.id)));
  return [...real, ...fallbackSessions(d).filter(s => !covered.has(s.athletes[0].id)
    && !(s.comp && inComp.has(`${s.comp.id}|${s.athletes[0].id}`)))];
}

// One status rule for #day and #c- rows: a result, else before / today / awaiting by start time (or by date).
function sessStatus(s, d){
  if (s.result) return "result";
  const t = today(), start = s.startUtc ? Date.parse(s.startUtc) : NaN;
  if (!isNaN(start)) return Date.now() < start ? "before" : Date.now() < start + SESSION_WINDOW_H * 36e5 ? "live" : "wait";
  return d < t ? "wait" : d === t ? "live" : "before";
}
const statusChip = st => ({wait: `<span class="pill s-wait"><span aria-hidden="true">◷</span> בהמתנה לתוצאה</span>`,
  live: `<span class="pill s-live">מתחרה היום</span>`, before: `<span class="pill s-before">לפני התחרות</span>`})[st] || "";

function sessionRow(s, d){
  const t = today();
  const names = s.athletes.map(a => `${S.follows.has(a.id) ? STAR + " " : ""}<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`).join(", ");
  // "עודכן ב־" only with the result's own time (resultAt); fallback results have only a date.
  const stamp = s.resultAt ? ` · עודכן ב־${ilDate(s.resultAt) === t ? hhmm(s.resultAt) : `${fmtShort(ilDate(s.resultAt))}, ${hhmm(s.resultAt)}`}` : "";
  const res = s.result ? `<span class="res"><b>תוצאה:</b> ${esc(s.result)}${stamp}${safeUrl(s.resultSource) ? ` · ${linkOut(s.resultSource)}` : ""}</span>` : "";
  const when = s.startUtc ? hhmm(s.startUtc) : s.timed ? "השעה תפורסם" : "תאריך בלבד";
  return `<li><span class="d">${when}</span>
    <span class="t">${names}${s.phase ? ` · <bdi>${esc(s.phase)}</bdi>` : ""}${res}</span>
    <span>${statusChip(sessStatus(s, d))}</span></li>`;
}

const followedIn = s => s.athletes.some(a => S.follows.has(a.id));
// Followed first, then by start time (untimed last), then by name.
// Start time ascending, untimed last (explicit: localeCompare would put a "~" placeholder before digits).
const byStart = (a, b) => !a === !b ? (a ? Date.parse(a) - Date.parse(b) : 0) : a ? -1 : 1;
const sessionOrder = (x, y) => followedIn(y) - followedIn(x) || byStart(x.startUtc, y.startUtc)
  || heCmp(x.athletes[0].name, y.athletes[0].name);
