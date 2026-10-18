// Daily view: #today, #day and #day-YYYY-MM-DD (docs/design/daily-and-following.md §1; copy: Shira).
// Loaded after app.js and uses its helpers. Until data.json carries `sessions`, a day is built from fallback
// pseudo-sessions: an athlete's nextDate, and history entries of kind "result". There are no session times and
// no live results, so the page says when the data is from and never "live".
"use strict";

const CADENCE = "מתעדכן פעם ביום";   // the one place to change when event-day runs are approved (OD2)
const DAY_STRIP = 3;                 // chips on each side of the selected date
const DAY_LOOKAHEAD = 120;           // how far the empty state searches for the next day with Israelis

// The ≤ 31-day competition of a sport that contains day d (season-long series don't count).
const compOn = (sid, d) => S.comps.find(c => c.sportId === sid && c.start <= d && d <= (c.end || c.start) && dayNo(c.start, c.end || c.start) <= SERIES_DAYS) || null;

// Fallback pseudo-sessions for day d, one per athlete (deduped by athlete + day; a recorded result wins).
function daySessions(d){
  const out = new Map();
  for (const a of S.athletes) {
    const res = (Array.isArray(a.history) ? a.history : []).find(h => h.kind === "result" && h.at === d && str(h.text).trim());
    const comp = compOn(a.sportId, d);
    if (res) out.set(a.id, {a, comp, result: str(res.text).slice(0, 120), resultSource: res.source});
    else if (a.nextDate === d) out.set(a.id, {a, comp});
  }
  return [...out.values()];
}
const hasIsraelis = d => daySessions(d).length > 0;

const asDate = d => new Date(d + "T12:00:00");
// "Real" date: rejects 2026-02-30, which JS would roll over to 2 March.
const realDate = d => isDate(d) && !isNaN(asDate(d)) && addDays(d, 0) === d;
const dayTitle = d => asDate(d).toLocaleDateString("he-IL", {weekday: "short", day: "numeric", month: "short", year: "numeric"});
const chipText = d => `${asDate(d).toLocaleDateString("he-IL", {weekday: "narrow"})} ${asDate(d).getDate()}`;
const chipName = d => asDate(d).toLocaleDateString("he-IL", {weekday: "long", day: "numeric", month: "long"});
const hhmm = iso => new Date(iso).toLocaleTimeString("he-IL", {hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem"});
const ilDate = iso => new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Jerusalem"}).format(new Date(iso));
const followedSport = sid => !!S.followSports?.has?.(sid);

function sessionRow(s, d){
  const t = today(), a = s.a;
  const star = S.follows.has(a.id) ? `<span class="star-on" aria-label="במעקב שלך">★</span> ` : "";
  // No "עודכן ב־" without the result's own time (resultAt, from sessions); fallback results have only a date.
  const res = s.result ? `<p class="res"><b>תוצאה:</b> ${esc(s.result)}${safeUrl(s.resultSource) ? ` · ${linkOut(s.resultSource)}` : ""}</p>` : "";
  const chip = s.result ? ""
    : d < t ? `<span class="pill s-wait"><span aria-hidden="true">◷</span> בהמתנה לתוצאה</span>`
    : d === t ? `<span class="pill s-live">מתחרה היום</span>`
    : `<span class="pill s-before">לפני התחרות</span>`;
  return `<li><span class="d">תאריך בלבד</span>
    <span class="t">${star}<a href="#a-${esc(a.id)}">${esc(a.name)}</a>${a.event ? ` · <bdi>${esc(a.event)}</bdi>` : ""}${res}</span>
    <span>${chip}</span></li>`;
}

function compBlock(comp, sessions, sid, d){
  const t = today();
  const followedFirst = (x, y) => (S.follows.has(y.a.id) ? 1 : 0) - (S.follows.has(x.a.id) ? 1 : 0) || heCmp(x.a.name, y.a.name);
  const list = `<ul class="rows sess">${sessions.sort(followedFirst).map(s => sessionRow(s, d)).join("")}</ul>`;
  if (!comp) return `<h3>${esc(sessions[0].a.next || sportName(sid))}</h3>${list}`;
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
  const bySport = new Map();
  for (const s of sessions) {
    const sid = s.a.sportId, key = s.comp ? s.comp.id || s.comp.name : "";
    if (!bySport.has(sid)) bySport.set(sid, new Map());
    const comps = bySport.get(sid);
    if (!comps.has(key)) comps.set(key, {comp: s.comp, list: []});
    comps.get(key).list.push(s);
  }
  const rank = sid => followedSport(sid) ? 0 : [...bySport.get(sid).values()].some(c => c.list.some(s => S.follows.has(s.a.id))) ? 1 : 2;
  const sports = [...bySport.keys()].sort((x, y) => rank(x) - rank(y) || heCmp(sportName(x), sportName(y)));
  let after = "";
  if (!sessions.length) for (let i = 1; i <= DAY_LOOKAHEAD && !after; i++) if (hasIsraelis(addDays(d, i))) after = addDays(d, i);
  const chips = Array.from({length: DAY_STRIP * 2 + 1}, (_, i) => addDays(d, i - DAY_STRIP));
  const ts = S.live ? S.lastRun : (S.generatedAt || S.lastRun), tsOk = ts && !isNaN(Date.parse(ts));
  return `<div class="day-nav">
      <a href="#day-${prev}">→ ${isToday ? "אתמול" : "היום הקודם"}</a>
      <h1 tabindex="-1">${dayTitle(d)}</h1>
      <a href="#day-${next}">${isToday ? "מחר" : "היום הבא"} ←</a>
    </div>
  <nav class="daystrip" aria-label="בחירת יום">${chips.map(x => { const has = hasIsraelis(x);
    return `<a href="#day-${x}" class="${has ? "has" : ""}" aria-label="${chipName(x)}${has ? " · יש תחרויות של ישראלים" : ""}"${x === d ? ` aria-current="date"` : ""}>${chipText(x)}</a>`; }).join("")}
    ${isToday ? "" : `<a href="#today">היום</a>`}</nav>
  <p class="foot">${tsOk ? `נכון ל־${fmt(ilDate(ts))}, ${hhmm(ts)} · ` : ""}${CADENCE}</p>
  ${sessions.length ? sports.map(sid => `<section class="panel day-sport" aria-labelledby="ds-${esc(sid)}">
      <h2 id="ds-${esc(sid)}">${followedSport(sid) ? `<span class="star-on" aria-label="במעקב שלך">★</span> ` : ""}<a href="#sport-${esc(sid)}">${esc(sportName(sid))}</a></h2>
      ${[...bySport.get(sid).values()].map(c => compBlock(c.comp, c.list, sid, d)).join("")}
    </section>`).join("")
    : `<div class="empty"><p>אין תחרויות ידועות של ספורטאים ונבחרות מישראל ביום הזה.</p>${after ? `<p><a href="#day-${after}">לתחרות הבאה: ${fmt(after)}</a></p>` : ""}</div>`}`;
}
