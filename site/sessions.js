// Sessions shared by #day (day.js) and #c- (event.js): data, the near-live state and labels (docs/design/near-live.md),
// and the row markup, so both pages render a session the same way. Sessions come from data.json.sessions
// (docs/design/sessions-contract.md); athletes with no session that day fall back to pseudo-sessions from their nextDate
// and history entries of kind "result". Results arrive with the job run, so labels say as of when, never "live".
// Loaded after app.js (STAR, compLink and the date helpers live there).
"use strict";

// CADENCE and NEXT_CHECK change together when event-day runs are approved (OD2).
const CADENCE = "מתעדכן פעם ביום";
const NEXT_CHECK = "נבדוק שוב בעדכון היומי הבא";
const STALE_H = 26;                  // a page showing today's sessions is stale past this since the last check
const AWAIT_LONG_H = 48;             // past this since the window end, an awaiting row stops implying a next check
const SESSION_WINDOW_H = 3;          // a timed session counts as "now" from its start to +3h

const asDate = d => new Date(d + "T12:00:00");
const isUtc = v => typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?Z$/.test(v) && !isNaN(Date.parse(v));
const dayTitle = d => asDate(d).toLocaleDateString("he-IL", {weekday: "short", day: "numeric", month: "short", year: "numeric"});
// Built once; a new Intl.DateTimeFormat per call dominated #day (docs/perf/2026-10.md). IL_DAY comes from app.js.
const HHMM = new Intl.DateTimeFormat("he-IL", {hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem"});
const IL_HOUR = new Intl.DateTimeFormat("en-GB", {timeZone: "Asia/Jerusalem", hour: "numeric", hourCycle: "h23"});
const hhmm = iso => HHMM.format(new Date(iso));
const ilDate = iso => IL_DAY.format(new Date(iso));

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
      source: safeUrl(s.source), checkedAt: isUtc(s.checkedAt) ? s.checkedAt : "",
      startUtc: isUtc(s.startUtc) ? s.startUtc : null, day: isUtc(s.startUtc) ? ilDate(s.startUtc) : s.date,
      result: proven ? str(s.result).slice(0, 120) : "", resultSource: proven ? s.resultSource : "", resultAt: proven ? s.resultAt : ""} : null;
  }).filter(Boolean);
}

// The job records results in athletes' history (#137). Never a source-less result (near-live.md §4).
const historyResult = (a, d) => (Array.isArray(a.history) ? a.history : [])
  .find(h => h.kind === "result" && h.at === d && str(h.text).trim() && safeUrl(h.source));

// Fallback pseudo-sessions for day d, one per athlete (deduped by athlete + day; a recorded result wins).
function fallbackSessions(d){
  const out = new Map();
  for (const a of S.athletes) {
    const res = historyResult(a, d);
    if (!res && a.nextDate !== d) continue;   // most athletes have nothing that day: skip compOn() (docs/perf/2026-10.md)
    const base = {athletes: [a], sportId: a.sportId, comp: compOn(a.sportId, d), phase: a.event || "", startUtc: null};
    if (res) out.set(a.id, {...base, result: str(res.text).slice(0, 120), resultSource: res.source, resultAt: ""});
    else if (a.nextDate === d) out.set(a.id, {...base, result: ""});
  }
  return [...out.values()];
}

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
    return {...s, result: text.slice(0, 120), resultSource: found[0][1].source, resultAt: ""};   // a date only
  });
  const covered = new Set(real.flatMap(s => s.athletes.map(a => a.id)));
  return [...real, ...fallbackSessions(d).filter(s => !covered.has(s.athletes[0].id)
    && !(s.comp && inComp.has(`${s.comp.id}|${s.athletes[0].id}`)))];
}

// Shared near-live labels (docs/design/near-live.md §5), used by #day and #c-<id>.
const checkTime = () => { const ts = S.live ? S.lastRun : (S.generatedAt || S.lastRun); return isUtc(ts) ? ts : ""; };
const timeTag = (iso, text) => `<time datetime="${esc(new Date(iso).toISOString())}">${text}</time>`;

// "18:40" today, "29 באוק׳, 18:40" otherwise, with the year outside the current one; always Israel time.
const whenIL = iso => timeTag(iso, `${ilDate(iso) === today() ? "" : fmtShortY(ilDate(iso)) + ", "}${hhmm(iso)}`);

// "{label}: {host}"; <bdi> keeps the host's dots in order inside RTL text (#156).
const hostLink = (u, label) => safeUrl(u)
  ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(label)}: <bdi>${esc(host(u))}</bdi><span class="sr"> (נפתח בחלון חדש)</span></a>` : "";

// End of the session's window: start + 3h, or the end of Israel day d when untimed.
function windowEnd(s, d){
  if (s.startUtc) return Date.parse(s.startUtc) + SESSION_WINDOW_H * 36e5;
  const next = Date.parse(addDays(d, 1) + "T00:00:00Z");
  const ilHour = Number(IL_HOUR.format(next));
  return next - ilHour * 36e5;
}

// "result" | "resultDate" | "before" | "competing" | "awaitFresh" | "awaitChecked" | "awaitLong". A result wins, then
// the clock. "Checked" needs the session's own checkedAt after the window: a run's time doesn't prove it looked (#156).
function sessionState(s, d, now = Date.now()){
  if (str(s.result).trim() && safeUrl(s.resultSource)) return s.resultAt ? "result" : "resultDate";
  const t = today();
  if (s.startUtc ? now < Date.parse(s.startUtc) : d > t) return "before";
  const end = windowEnd(s, d);
  if (s.startUtc ? now < end : d === t) return "competing";
  if (now - end > AWAIT_LONG_H * 36e5) return "awaitLong";
  return s.checkedAt && Date.parse(s.checkedAt) > end ? "awaitChecked" : "awaitFresh";
}
const isAwait = state => state.startsWith("await");
const isResult = state => state.startsWith("result");

function statusChip(state){
  if (isAwait(state)) return `<span class="pill s-wait"><span aria-hidden="true">◷</span> בהמתנה לתוצאה</span>`;
  return {competing: `<span class="pill s-live">מתחרה היום</span>`, before: `<span class="pill s-before">לפני התחרות</span>`}[state] || "";
}

function sessionDetail(s, state){
  const line = html => `<span class="res">${html}</span>`;
  const src = hostLink(s.resultSource, "מקור");
  if (state === "result") return line(`<b>תוצאה:</b> ${esc(s.result)} · עודכן ב־${whenIL(s.resultAt)} · ${src}`);
  if (state === "resultDate") return line(`<b>תוצאה:</b> ${esc(s.result)} · ${src}`);
  if (state === "awaitFresh") return line(NEXT_CHECK);
  if (state === "awaitChecked") return line(`נבדק לאחרונה ב־${whenIL(s.checkedAt)} · התוצאה עוד לא נמצאה במקור הרשמי`);
  if (state === "awaitLong") {   // no time: it would read as a promise
    const board = linkOut(s.source || s.comp?.source, "לוח התחרות הרשמי");
    return line(`התוצאה עוד לא נמצאה${board ? ` · ${board}` : ""}`);
  }
  return "";
}

// Page line under the h1 (§3). Stale only when the page shows something happening today.
function freshLine(hasToday){
  const ts = checkTime();
  if (!ts) return `<p class="fresh"><i></i><span>${CADENCE}</span></p>`;
  return hasToday && Date.now() - Date.parse(ts) > STALE_H * 36e5
    ? `<p class="fresh stale"><i></i><span>הנתונים לא עודכנו מאז ${whenIL(ts)} · ייתכן שיש תוצאות שעוד לא מופיעות כאן</span></p>`
    : `<p class="fresh"><i></i><span>נכון ל־${whenIL(ts)} · ${CADENCE}</span></p>`;
}

// A group in which no session has a time says "תאריך בלבד" once, in its heading, instead of on every row
// (components.md §1). In a mixed group an untimed row keeps its own label (coordinator, #208).
const dateOnly = list => list.length > 0 && list.every(s => !s.startUtc);
const DATE_ONLY = `<span class="muted"> · תאריך בלבד</span>`;

function sessionRow(s, d, groupDateOnly = false){
  const names = s.athletes.map(a => `${S.follows.has(a.id) ? STAR + " " : ""}<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`).join(", ");
  const state = sessionState(s, d);
  // Untimed is always "תאריך בלבד", never a promised time (components.md §1); an all-untimed group says it in its heading.
  const when = s.startUtc ? timeTag(s.startUtc, hhmm(s.startUtc)) : groupDateOnly ? "" : "תאריך בלבד";
  // Keyed by day, competition and athletes, so the same session on #day and #c- is one row. The signature leaves out
  // what changes with the clock or a run without news (the status chip, checkedAt).
  const mark = rowMark(`sess|${d}|${s.comp?.id || ""}|${s.athletes.map(a => a.id).join(",")}|${s.phase}`,
    [s.result, s.resultSource, s.resultAt, s.startUtc, s.athletes.map(a => a.name).join(",")].join("\u241f"));
  return `<li><span class="d">${when}</span>
    <span class="t">${names}${s.phase ? ` · <bdi>${esc(s.phase)}</bdi>` : ""}${sessionDetail(s, state)}${mark}</span>
    <span>${statusChip(state)}</span></li>`;
}

const followedIn = s => s.athletes.some(a => S.follows.has(a.id));
// Followed first, then by start time (untimed last), then by name.
// Start time ascending, untimed last (explicit: localeCompare would put a "~" placeholder before digits).
const byStart = (a, b) => !a === !b ? (a ? Date.parse(a) - Date.parse(b) : 0) : a ? -1 : 1;
const sessionOrder = (x, y) => followedIn(y) - followedIn(x) || byStart(x.startUtc, y.startUtc)
  || heCmp(x.athletes[0].name, y.athletes[0].name);
