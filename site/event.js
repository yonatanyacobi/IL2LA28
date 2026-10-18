// Competition page #c-<id> (docs/design/event-page.md). Loaded after app.js and sessions.js, whose sessions, status
// rule and rows it shares with #day.
// No live scores: results arrive with the job run, and the footer says when.
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
function athleteStatus(s, d, a){
  const own = historyResult(a, d) || (s.result && (s.athletes.length === 1 || s.resultAt));
  return own ? "result" : sessStatus({...s, result: ""}, d);
}

function eventStatus(c, sessions){
  const t = today(), end = c.end || c.start, total = dayNo(c.start, end);
  if (t < c.start) return `<span class="pill s-before">מתחילה ב־${fmt(c.start)}</span>`;
  // "יום 243 מתוך 487" says nothing for a season-long series.
  if (t <= end) return `<span class="pill s-live">מתקיימת עכשיו${total > 1 && total <= SERIES_DAYS ? ` · יום ${dayNo(c.start, t)} מתוך ${total}` : ""}</span>`;
  return sessions.some(([s, d]) => s.athletes.some(a => athleteStatus(s, d, a) === "wait"))
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

// On arrival (the view isn't showing this competition yet), scroll today's day group into view after navigate()'s
// scroll-to-top; data refreshes re-render the same page and leave the scroll alone. Focus stays on the h1.
function scrollToTodayOnArrival(id){
  if (str($("view")?.innerHTML).includes(`data-event="${esc(id)}"`)) return;
  setTimeout(() => {
    if ((typeof scrollY === "number" ? scrollY : 0) > 0) return;   // the reader already scrolled (e.g. while data loaded)
    const day = document.querySelector('#view .sess-day a[aria-current="date"]')?.closest(".sess-day");
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    day?.scrollIntoView({block: "start", behavior: reduce ? "auto" : "smooth"});
  }, 0);
}

function viewEvent(id){
  const c = S.comps.find(x => x.id === id);
  if (!c) return notFound();
  scrollToTodayOnArrival(id);
  const t = today(), {series, groups} = eventSessions(c);
  const flat = [...groups].flatMap(([d, list]) => list.map(s => [s, series ? s.day : d]));
  const athletes = [...new Map(flat.flatMap(([s]) => s.athletes.map(a => [a.id, a]))).values()]
    .sort((x, y) => S.follows.has(y.id) - S.follows.has(x.id) || heCmp(x.name, y.name));
  // Counted per athlete in each session, not per session.
  const count = k => flat.reduce((n, [s, d]) => n + s.athletes.filter(a => athleteStatus(s, d, a) === k).length, 0);
  const who = n => plural(n, "ספורטאי/ת או נבחרת אחת", "ספורטאים ונבחרות");
  const kpi = [who(athletes.length), ...[["live", n => `מתחרים היום: ${n}`], ["result", n => plural(n, "תוצאה אחת", "תוצאות")], ["wait", n => `${n} בהמתנה לתוצאה`], ["before", n => `${n} לפני התחרות`]]
    .map(([k, label]) => (n => n ? label(n) : "")(count(k)))].filter(Boolean).join(" · ");
  const stakes = eventStakes(c);
  const tracked = athletesOf(c.sportId).length;
  const ts = S.live ? S.lastRun : (S.generatedAt || S.lastRun), tsOk = ts && !isNaN(Date.parse(ts));
  const link = `${SITE_URL}#c-${id}`;
  const dayHead = d => `<h3><a href="#day-${d}"${d === t ? ` aria-current="date"` : ""}>${dayTitle(d)}</a> <span class="muted">(יום ${dayNo(c.start, d)})</span></h3>`;
  const monthHead = m => `<h3>${new Date(m + "-15T12:00:00").toLocaleDateString("he-IL", {month: "long", year: "numeric"})}</h3>`;
  const schedule = !flat.length
    ? `<p class="muted">${t <= (c.end || c.start) ? "הסשנים של הישראלים יפורסמו לפי לוח הזמנים הרשמי." : "לא תועדו סשנים של ישראלים בתחרות הזו."}</p>`
    : [...groups].filter(([, list]) => list.length).map(([k, list]) => `<div class="sess-day">${series ? monthHead(k) : dayHead(k)}
        <ul class="rows sess">${list.sort(sessionOrder).map(s => sessionRow(s, series ? s.day : k)).join("")}</ul></div>`).join("")
      + ((n => n ? `<p class="muted">${n === 1 ? "ביום נוסף בתחרות" : `ב־${n} ימים נוספים בתחרות`} לא ידועים סשנים של ישראלים.</p>` : "")(
        series ? 0 : [...groups].filter(([, list]) => !list.length).length));
  return `<p class="crumb"><a href="#sport-${esc(c.sportId)}">→ ${esc(sportName(c.sportId))}</a></p>
  <div class="event-head" data-event="${esc(id)}">
    <h1 tabindex="-1">${esc(c.name)}</h1>
    <p class="muted">${[fmtRange(c.start, c.end), esc(c.location)].filter(Boolean).join(" · ")}</p>
    <div class="pills">${eventStatus(c, flat)}${c.qualifying ? `<span class="pill open">העפלה</span>` : ""}${series ? `<span class="pill ended">סדרה עונתית</span>` : ""}</div>
    ${!stakes && c.qualifying ? `<p>תחרות שנספרת להעפלה. <a href="#sport-${esc(c.sportId)}">שיטת ההעפלה בענף</a></p>` : ""}
  </div>
  <section class="panel" aria-labelledby="evSumH"><h2 id="evSumH">בקצרה</h2>
    ${athletes.length ? `<p class="kpi">${kpi}</p>`
      : `<p>לא ידוע על ספורטאים או נבחרות מישראל בתחרות הזו.${tracked ? ` <a href="#sport-${esc(c.sportId)}">${who(tracked)} במעקב בענף</a>` : ""}</p>`}
  </section>
  <div class="event-cols">
    <section class="panel" aria-labelledby="evSchedH"><h2 id="evSchedH">לוח הסשנים</h2>${schedule}</section>
    <div class="stack">
      ${stakes}
      ${athletes.length ? `<section class="panel" aria-labelledby="evAthH"><h2 id="evAthH">הישראלים בתחרות (${athletes.length})</h2>
        <ul class="rows">${athletes.map(a => { const mine = flat.filter(([s]) => s.athletes.includes(a)), last = mine[mine.length - 1];
          const st = last ? athleteStatus(last[0], last[1], a) : "";
          // A result is shown only in the schedule row, next to its source.
          return athleteRow(a, st === "result" ? `<span class="muted">תוצאה בלוח הסשנים</span>` : statusChip(st)); }).join("")}</ul></section>` : ""}
    </div>
  </div>
  <p class="foot">${[tsOk ? `נכון ל־${fmt(ilDate(ts))}, ${hhmm(ts)}` : "", CADENCE, safeUrl(c.source) ? `<bdi>${linkOut(c.source, host(c.source))}</bdi>` : ""].filter(Boolean).join(" · ")}</p>
  <section class="panel" aria-labelledby="evShareH"><h2 id="evShareH">שיתוף</h2>
    <div class="share"><input id="evShare" readonly value="${esc(link)}" dir="ltr" aria-label="קישור לתחרות"><button class="btn ghost small" data-copy="evShare" data-copy-msg="evShareMsg">העתקה</button></div>
    <p class="foot" id="evShareMsg" aria-live="polite"></p>
  </section>`;
}
