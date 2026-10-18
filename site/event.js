// Competition page #c-<id> (docs/design/event-page.md). Loaded after app.js and day.js; reuses day.js's sessions
// (exported sessions plus nextDate/history fallbacks), sessionRow() and the near-live labels, so #day and #c- render
// identically. No live scores: results arrive with the job run, and the line under the h1 says when.
"use strict";

// Sessions of one competition, grouped by Israel day. A season-long series (> SERIES_DAYS) has no daily fallback
// (compOn() skips it), so only its exported sessions count, grouped by month.
function eventSessions(c){
  const end = c.end || c.start, series = dayNo(c.start, end) > SERIES_DAYS;
  if (series) return {series, groups: groupBy(exportedSessions().filter(s => s.comp.id === c.id), s => s.day.slice(0, 7))};
  const days = Array.from({length: dayNo(c.start, end)}, (_, i) => addDays(c.start, i));
  return {series, groups: new Map(days.map(d => [d, daySessions(d).filter(s => s.comp?.id === c.id)]))};
}
const groupBy = (list, key) => list.reduce((m, x) => m.set(key(x), [...(m.get(key(x)) || []), x]), new Map());

// One athlete's status in a session. A shared session's merged text ("תמנע נלסון לוי: ארד") is not every athlete's
// result: an athlete has a result only from her own history entry, a single-athlete session, or an exported
// session result (resultAt, official for the whole session, e.g. a team).
// Returns a sessionState() state.
function athleteStatus(s, d, a){
  const shared = isResult(sessionState(s, d)) && (s.athletes.length === 1 || s.resultAt);
  return historyResult(a, d) || shared ? "result" : sessionState({...s, result: ""}, d);
}

function eventStatus(c, sessions){
  const t = today(), end = c.end || c.start, total = dayNo(c.start, end);
  if (t < c.start) return `<span class="pill s-before">מתחילה ב־${fmt(c.start)}</span>`;
  // "יום 243 מתוך 487" says nothing for a season-long series.
  if (t <= end) return `<span class="pill s-live">מתקיימת עכשיו${total > 1 && total <= SERIES_DAYS ? ` · יום ${dayNo(c.start, t)} מתוך ${total}` : ""}</span>`;
  return sessions.some(([s, d]) => s.athletes.some(a => isAwait(athleteStatus(s, d, a))))
    ? `<span class="pill s-wait"><span aria-hidden="true">◷</span> הסתיימה · בהמתנה לתוצאות</span>` : `<span class="pill ended">הסתיימה</span>`;
}

// Quota items decided here: their next quota event starts inside the competition (the strip's rule), including
// ones now awaiting results. Earned items show "מכסה הושגה" and never their pre-event stakes.
function eventStakes(c){
  const end = c.end || c.start;
  const items = quotasOf(c.sportId).filter(q => q.nextQuotaEvent && c.start <= q.nextQuotaEvent.start && q.nextQuotaEvent.start <= end);
  if (!items.length) return "";
  return `<section class="panel" aria-labelledby="evStakesH"><h2 id="evStakesH">מה על הכף</h2>
    <ul class="qlist">${items.map(q => `<li>
      <div class="q-top"><b><bdi>${esc(q.event)}</bdi></b><span class="actions">${quotaStatusPill(q.israelStatus)}${awaitingOf(q) ? AWAIT_PILL : ""}</span></div>
      ${q.israelStatus === "in-contention" ? stakesLine(q) : ""}</li>`).join("")}</ul>
    <p><a href="#sport-${esc(c.sportId)}">לכל המכסות בענף</a></p></section>`;
}

function viewEvent(id){
  const c = S.comps.find(x => x.id === id);
  if (!c) return notFound();
  const t = today(), {series, groups} = eventSessions(c);
  const flat = [...groups].flatMap(([d, list]) => list.map(s => [s, series ? s.day : d]));
  const athletes = [...new Map(flat.flatMap(([s]) => s.athletes.map(a => [a.id, a]))).values()]
    .sort((x, y) => S.follows.has(y.id) - S.follows.has(x.id) || heCmp(x.name, y.name));
  // Counted per athlete in each session, not per session.
  const count = is => flat.reduce((n, [s, d]) => n + s.athletes.filter(a => is(athleteStatus(s, d, a))).length, 0);
  const who = n => plural(n, "ספורטאי/ת או נבחרת אחת", "ספורטאים ונבחרות");
  // Label first ("תוצאות: 1"), so one count needs no singular form (Shira on #182).
  const kpi = [who(athletes.length), ...[[isResult, "תוצאות"], [isAwait, "בהמתנה לתוצאה"], [st => st === "before", "לפני התחרות"]]
    .map(([is, label]) => (n => n ? `${label}: ${n}` : "")(count(is)))].filter(Boolean).join(" · ");
  const stakes = eventStakes(c);
  const tracked = athletesOf(c.sportId).length;
  // Stale-aware only while something happens today; a season-long series isn't "running" on every day of it.
  const hasToday = series ? flat.some(([, d]) => d === t) : c.start <= t && t <= (c.end || c.start);
  const schedSrc = flat.map(([s]) => s.source).find(Boolean) || c.source;
  const link = `${SITE_URL}#c-${id}`;
  const dayHead = d => `<h3><a href="#day-${d}"${d === t ? ` aria-current="date"` : ""}>${dayTitle(d)}</a> <span class="muted">(יום ${dayNo(c.start, d)})</span></h3>`;
  const monthHead = m => `<h3>${new Date(m + "-15T12:00:00").toLocaleDateString("he-IL", {month: "long", year: "numeric"})}</h3>`;
  const schedule = !flat.length
    ? calEmpty(t <= (c.end || c.start) ? "הסשנים של הישראלים יפורסמו לפי לוח הזמנים הרשמי." : "לא תועדו סשנים של ישראלים בתחרות הזו.", c.sportId)
    : [...groups].filter(([, list]) => list.length).map(([k, list]) => `<div class="sess-day">${series ? monthHead(k) : dayHead(k)}
        <ul class="rows sess">${list.sort(sessionOrder).map(s => sessionRow(s, series ? s.day : k)).join("")}</ul></div>`).join("")
      + ((n => n ? `<p class="muted">${n === 1 ? "ביום נוסף בתחרות" : `ב־${n} ימים נוספים בתחרות`} לא ידועים סשנים של ישראלים.</p>` : "")(
        series ? 0 : [...groups].filter(([, list]) => !list.length).length));
  return `<p class="crumb"><a href="#sport-${esc(c.sportId)}">→ ${esc(sportName(c.sportId))}</a></p>
  <div class="event-head">
    <h1 tabindex="-1">${esc(c.name)}</h1>
    ${freshLine(hasToday)}
    <p class="muted">${[fmtRange(c.start, c.end), esc(c.location)].filter(Boolean).join(" · ")}</p>
    <div class="pills">${eventStatus(c, flat)}${c.qualifying ? `<span class="pill open">העפלה</span>` : ""}${series ? `<span class="pill ended">סדרה עונתית</span>` : ""}</div>
    ${!stakes && c.qualifying ? `<p>תחרות שנספרת להעפלה. <a href="#sport-${esc(c.sportId)}">שיטת ההעפלה בענף</a></p>` : ""}
  </div>
  <section class="panel" aria-labelledby="evSumH"><h2 id="evSumH">בקצרה</h2>
    ${athletes.length ? `<p class="kpi">${kpi}</p>`
      : tracked ? emptyState("לא ידוע על ספורטאים או נבחרות מישראל בתחרות הזו.", `#sport-${c.sportId}`, `${who(tracked)} במעקב בענף`)
        : calEmpty("לא ידוע על ספורטאים או נבחרות מישראל בתחרות הזו.", c.sportId)}
  </section>
  <div class="event-cols">
    <section class="panel" aria-labelledby="evSchedH"><h2 id="evSchedH">לוח הסשנים</h2>${schedule}</section>
    <div class="stack">
      ${stakes}
      ${athletes.length ? `<section class="panel" aria-labelledby="evAthH"><h2 id="evAthH">הישראלים בתחרות (${athletes.length})</h2>
        <div class="stack">${athletes.map(a => { const mine = flat.filter(([s]) => s.athletes.includes(a)), last = mine[mine.length - 1];
          const st = last ? athleteStatus(last[0], last[1], a) : "";
          // A result is shown only in the schedule row, next to its source.
          const line = st ? statusChip(st) : "";
          return `<div class="stack">${athleteCard(a)}${line ? `<p>${line}</p>` : ""}</div>`; }).join("")}</div></section>` : ""}
    </div>
  </div>
  ${safeUrl(schedSrc) ? `<p class="foot">${hostLink(schedSrc, "לוח הזמנים")}</p>` : ""}
  <section class="panel" aria-labelledby="evShareH"><h2 id="evShareH">שיתוף</h2>
    <div class="share"><input id="evShare" readonly value="${esc(link)}" dir="ltr" aria-label="קישור לתחרות"><button class="btn ghost small" data-copy="evShare" data-copy-msg="evShareMsg">העתקה</button></div>
    <p class="foot" id="evShareMsg" aria-live="polite"></p>
  </section>`;
}
