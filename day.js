// Daily view: #today, #day and #day-YYYY-MM-DD (docs/design/daily-and-following.md §1; copy: Shira).
// Loaded after app.js and sessions.js (sessions, near-live labels and rows).
"use strict";

const DAY_STRIP = 3;                 // chips on each side of the selected date
const DAY_LOOKAHEAD = 120;           // how far the empty state searches for the next day with Israelis

// "Real" date: rejects 2026-02-30, which JS would roll over to 2 March.
const realDate = d => isDate(d) && !isNaN(asDate(d)) && addDays(d, 0) === d;
const chipText = d => `${asDate(d).toLocaleDateString("he-IL", {weekday: "narrow"})} ${asDate(d).getDate()}`;
const chipName = d => asDate(d).toLocaleDateString("he-IL", {weekday: "long", day: "numeric", month: "long"});

const hasIsraelis = d => daySessions(d).length > 0;

function compBlock(comp, sessions, sid, d){
  const t = today();
  const only = dateOnly(sessions), tail = only ? DATE_ONLY : "";
  const list = `<ul class="rows sess">${sessions.sort(sessionOrder).map(s => sessionRow(s, d, only)).join("")}</ul>`;
  // An athlete's "next" names day d only when nextDate is d: a history result's athlete has usually moved on.
  const nexts = new Set(sessions.flatMap(s => s.athletes.map(a => a.nextDate === d ? str(a.next).trim() : "")));
  if (!comp) return `<h3>${esc(nexts.size === 1 && [...nexts][0] || sportName(sid))}${tail}</h3>${list}`;
  const total = dayNo(comp.start, comp.end || comp.start);
  const now = comp.start <= t && t <= (comp.end || comp.start) && d === t;
  // Stakes: in-contention items whose quota event covers this day (an earned item mustn't show pre-event stakes).
  const stakes = quotasOf(sid).filter(q => q.israelStatus === "in-contention" && q.stakes && q.nextQuotaEvent
    && q.nextQuotaEvent.start <= d && d <= quotaEventEnd(q) && israelIn(q)).slice(0, STAKES_MAX);
  return `<h3>${compLink(comp, esc(comp.name), "hlink")}${tail}</h3>
    ${now ? `<p><span class="pill s-live">מתקיימת עכשיו${total > 1 ? ` · יום ${dayNo(comp.start, d)} מתוך ${total}` : ""}</span></p>` : ""}
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
  return `<div class="day-nav">
      <h1 tabindex="-1">${isToday ? `היום, ${dayTitle(d)}` : dayTitle(d)}</h1>
      <a class="day-prev" href="#day-${prev}"><span aria-hidden="true">→</span>&nbsp;${isToday ? "אתמול" : "היום הקודם"}<span class="sr">, ${chipName(prev)}</span></a>
      <a href="#day-${next}">${isToday ? "מחר" : "היום הבא"}<span class="sr">, ${chipName(next)}</span>&nbsp;<span aria-hidden="true">←</span></a>
    </div>
  ${freshLine(isToday && sessions.length > 0)}
  <nav class="daystrip" aria-label="בחירת יום">${chips.map(x => { const has = hasIsraelis(x);
    return `<a href="#day-${x}" class="${has ? "has" : ""}"${x === d ? ` aria-current="date"` : ""}>${chipText(x)}<span class="sr"> · ${chipName(x)}${has ? " · יש תחרויות של ישראלים" : ""}</span></a>`; }).join("")}
    ${isToday ? "" : `<a href="#today">היום</a>`}</nav>
  ${sessions.length ? sports.map(sid => `<section class="panel day-sport" aria-labelledby="ds-${esc(sid)}">
      <h2 id="ds-${esc(sid)}">${followsSport(sid) ? STAR + " " : ""}<a class="hlink" href="#sport-${esc(sid)}">${esc(sportName(sid))}</a></h2>
      ${[...bySport.get(sid).values()].sort((x, y) => byStart(firstStart(x), firstStart(y))).map(c => compBlock(c.comp, c.list, sid, d)).join("")}
    </section>`).join("")
    : `<div class="empty"><p>אין תחרויות ידועות של ספורטאים או נבחרות מישראל ביום הזה.</p>${after ? `<p><a href="#day-${after}">לתחרות הבאה: ${fmt(after)}</a></p>` : ""}</div>`}`;
}
