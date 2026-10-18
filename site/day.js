// Daily view: #today, #day and #day-YYYY-MM-DD (docs/design/daily-and-following.md §1; copy: Shira).
// Loaded after app.js and uses its helpers. Sessions come from data.json.sessions (docs/design/sessions-contract.md);
// athletes with no session that day fall back to pseudo-sessions from their nextDate and history entries of kind
// "result". Results arrive with the job run, so the page says when, never "live".
"use strict";

const CADENCE = "מתעדכן פעם ביום";   // the one place to change when event-day runs are approved (OD2)
const DAY_STRIP = 3;                 // chips on each side of the selected date
const DAY_LOOKAHEAD = 120;           // how far the empty state searches for the next day with Israelis
const SESSION_WINDOW_H = 3;          // a timed session counts as "now" from its start to +3h

const asDate = d => new Date(d + "T12:00:00");
// "Real" date: rejects 2026-02-30, which JS would roll over to 2 March.
const realDate = d => isDate(d) && !isNaN(asDate(d)) && addDays(d, 0) === d;
const isUtc = v => typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?Z$/.test(v) && !isNaN(Date.parse(v));
const dayTitle = d => asDate(d).toLocaleDateString("he-IL", {weekday: "short", day: "numeric", month: "short", year: "numeric"});
const chipText = d => `${asDate(d).toLocaleDateString("he-IL", {weekday: "narrow"})} ${asDate(d).getDate()}`;
const chipName = d => asDate(d).toLocaleDateString("he-IL", {weekday: "long", day: "numeric", month: "long"});
const hhmm = iso => new Date(iso).toLocaleTimeString("he-IL", {hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem"});
const ilDate = iso => new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Jerusalem"}).format(new Date(iso));
const STAR = `<span class="star-on" aria-hidden="true">★</span><span class="sr">במעקב שלך, </span>`;

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
const hasIsraelis = d => daySessions(d).length > 0;

function sessionRow(s, d){
  const t = today(), now = Date.now();
  const names = s.athletes.map(a => `${S.follows.has(a.id) ? STAR + " " : ""}<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`).join(", ");
  // "עודכן ב־" only with the result's own time (resultAt); fallback results have only a date.
  const stamp = s.resultAt ? ` · עודכן ב־${ilDate(s.resultAt) === t ? hhmm(s.resultAt) : `${fmtShort(ilDate(s.resultAt))}, ${hhmm(s.resultAt)}`}` : "";
  const res = s.result ? `<span class="res"><b>תוצאה:</b> ${esc(s.result)}${stamp}${safeUrl(s.resultSource) ? ` · ${linkOut(s.resultSource)}` : ""}</span>` : "";
  const start = s.startUtc ? Date.parse(s.startUtc) : NaN;
  const status = s.result ? ""
    : !isNaN(start) ? (now < start ? "before" : now < start + SESSION_WINDOW_H * 36e5 ? "live" : "wait")
    : d < t ? "wait" : d === t ? "live" : "before";
  const chip = {wait: `<span class="pill s-wait"><span aria-hidden="true">◷</span> בהמתנה לתוצאה</span>`,
    live: `<span class="pill s-live">מתחרה היום</span>`, before: `<span class="pill s-before">לפני התחרות</span>`}[status] || "";
  const when = s.startUtc ? hhmm(s.startUtc) : s.timed ? "השעה תפורסם" : "תאריך בלבד";
  // Keyed by day, competition and athletes, so the same session on #day and #c- is one row; the chip is left out
  // of the signature because it changes with the clock.
  const mark = rowMark(`sess|${d}|${s.comp?.id || ""}|${s.athletes.map(a => a.id).join(",")}|${s.phase}`,
    [s.result, s.resultSource, s.resultAt, s.startUtc, s.athletes.map(a => a.name).join(",")].join("\u241f"));
  return `<li><span class="d">${when}</span>
    <span class="t">${names}${s.phase ? ` · <bdi>${esc(s.phase)}</bdi>` : ""}${res}${mark}</span>
    <span>${chip}</span></li>`;
}

const followedIn = s => s.athletes.some(a => S.follows.has(a.id));
// Followed first, then by start time (untimed last), then by name.
// Start time ascending, untimed last (explicit: localeCompare would put a "~" placeholder before digits).
const byStart = (a, b) => !a === !b ? (a ? Date.parse(a) - Date.parse(b) : 0) : a ? -1 : 1;
const sessionOrder = (x, y) => followedIn(y) - followedIn(x) || byStart(x.startUtc, y.startUtc)
  || heCmp(x.athletes[0].name, y.athletes[0].name);

function compBlock(comp, sessions, sid, d){
  const t = today();
  const list = `<ul class="rows sess">${sessions.sort(sessionOrder).map(s => sessionRow(s, d)).join("")}</ul>`;
  if (!comp) return `<h3>${esc(sessions[0].athletes[0].next || sportName(sid))}</h3>${list}`;
  const total = dayNo(comp.start, comp.end || comp.start);
  const now = comp.start <= t && t <= (comp.end || comp.start) && d === t;
  // Stakes: in-contention items whose quota event covers this day (an earned item mustn't show pre-event stakes).
  const stakes = quotasOf(sid).filter(q => q.israelStatus === "in-contention" && q.stakes && q.nextQuotaEvent
    && q.nextQuotaEvent.start <= d && d <= quotaEventEnd(q)).slice(0, STAKES_MAX);
  return `<h3>${esc(comp.name)}</h3>
    ${now ? `<p class="now">מתקיימת עכשיו${total > 1 ? ` · יום ${dayNo(comp.start, d)} מתוך ${total}` : ""}</p>` : ""}
    ${list}
    ${stakes.map(q => `<p class="stakes"><b>מה זה אומר:</b> <bdi>${esc(q.event)}</bdi>: ${esc(q.stakes)}</p>`).join("")}
    <p class="foot">${[fmtRange(comp.start, comp.end), esc(comp.location), linkOut(comp.source)].filter(Boolean).join(" · ")}</p>`;
}

function viewDay(d){
  if (!realDate(d)) return notFound();
  const t = today(), isToday = d === t, prev = addDays(d, -1), next = addDays(d, 1);
  const sessions = daySessions(d);
  // Group: sport → competition. Sports: followed, then with a followed athlete, then by name.
  // Competitions inside a sport: by their first session's start time.
  const bySport = new Map();
  for (const s of sessions) {
    const key = s.comp ? s.comp.id || s.comp.name : "";
    if (!bySport.has(s.sportId)) bySport.set(s.sportId, new Map());
    const comps = bySport.get(s.sportId);
    if (!comps.has(key)) comps.set(key, {comp: s.comp, list: []});
    comps.get(key).list.push(s);
  }
  const rank = sid => followsSport(sid) ? 0 : [...bySport.get(sid).values()].some(c => c.list.some(followedIn)) ? 1 : 2;
  const sports = [...bySport.keys()].sort((x, y) => rank(x) - rank(y) || heCmp(sportName(x), sportName(y)));
  const firstStart = c => c.list.map(s => s.startUtc).sort(byStart)[0] || null;
  let after = "";
  if (!sessions.length) for (let i = 1; i <= DAY_LOOKAHEAD && !after; i++) if (hasIsraelis(addDays(d, i))) after = addDays(d, i);
  const chips = Array.from({length: DAY_STRIP * 2 + 1}, (_, i) => addDays(d, i - DAY_STRIP));
  const ts = S.live ? S.lastRun : (S.generatedAt || S.lastRun), tsOk = ts && !isNaN(Date.parse(ts));
  return `<div class="day-nav">
      <h1 tabindex="-1">${dayTitle(d)}</h1>
      <a class="day-prev" href="#day-${prev}"><span aria-hidden="true">→</span> ${isToday ? "אתמול" : "היום הקודם"}<span class="sr">, ${chipName(prev)}</span></a>
      <a href="#day-${next}">${isToday ? "מחר" : "היום הבא"}<span class="sr">, ${chipName(next)}</span> <span aria-hidden="true">←</span></a>
    </div>
  <nav class="daystrip" aria-label="בחירת יום">${chips.map(x => { const has = hasIsraelis(x);
    return `<a href="#day-${x}" class="${has ? "has" : ""}"${x === d ? ` aria-current="date"` : ""}>${chipText(x)}<span class="sr"> · ${chipName(x)}${has ? " · יש תחרויות של ישראלים" : ""}</span></a>`; }).join("")}
    ${isToday ? "" : `<a href="#today">היום</a>`}</nav>
  <p class="foot">${tsOk ? `נכון ל־${fmt(ilDate(ts))}, ${hhmm(ts)} · ` : ""}${CADENCE}</p>
  ${sessions.length ? sports.map(sid => `<section class="panel day-sport" aria-labelledby="ds-${esc(sid)}">
      <h2 id="ds-${esc(sid)}">${followsSport(sid) ? STAR + " " : ""}<a href="#sport-${esc(sid)}">${esc(sportName(sid))}</a></h2>
      ${[...bySport.get(sid).values()].sort((x, y) => byStart(firstStart(x), firstStart(y))).map(c => compBlock(c.comp, c.list, sid, d)).join("")}
    </section>`).join("")
    : `<div class="empty"><p>אין תחרויות ידועות של ספורטאים ונבחרות מישראל ביום הזה.</p>${after ? `<p><a href="#day-${after}">לתחרות הבאה: ${fmt(after)}</a></p>` : ""}</div>`}`;
}
