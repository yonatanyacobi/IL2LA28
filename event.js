// Competition page #c-<id> (docs/design/event-page.md). Loaded after app.js and sessions.js, whose sessions,
// near-live labels and rows it shares with #day, so both render a session identically. No live scores: results arrive with the job run, and the line under the h1 says when.
"use strict";
let eventFollowingOnly = false;
const eventParticipantFilters = new Map();

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

// A quota event must identify one competition; overlapping dates alone don't establish its stakes.
// Earned items show "מכסה הושגה" and never their pre-event stakes.
function eventStakes(c){
  const items = quotasOf(c.sportId).filter(q => {
    const event = q.nextQuotaEvent;
    if (!event) return false;
    const matches = S.comps.filter(comp => comp.sportId === q.sportId && comp.start <= event.start && event.start <= (comp.end || comp.start)
      && str(comp.name).trim() === str(event.name).trim());
    return matches.length === 1 && matches[0].id === c.id;
  });
  if (!items.length) return "";
  return `<section class="panel" aria-labelledby="evStakesH"><h2 id="evStakesH">מה על הכף</h2>
    <ul class="qlist">${items.map(q => `<li>
      <div class="q-top"><b><bdi>${esc(q.event)}</bdi></b><span class="actions">${quotaStatusPill(q.israelStatus)}${awaitingOf(q) ? AWAIT_PILL : ""}</span></div>
      ${q.israelStatus !== "in-contention" || !stakesLine(q) ? "" : israelIn(q) ? stakesLine(q) : `<p class="muted">לא ידוע על ספורטאי/ת מישראל בשלב הזה</p>`}</li>`).join("")}</ul>
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
  const nextDay = flat.filter(([s, d]) => isDate(d) && d >= t
    && s.athletes.some(a => ["before", "competing"].includes(athleteStatus(s, d, a))))
    .map(([, d]) => d).sort()[0];
  const athletes = [...new Map(flat.flatMap(([s]) => s.athletes.map(a => [a.id, a]))).values()]
    .sort((x, y) => S.follows.has(y.id) - S.follows.has(x.id) || heCmp(x.name, y.name));
  let participant = eventParticipantFilters.get(id) || "";
  if (participant && !athletes.some(a => a.id === participant)) {
    eventParticipantFilters.delete(id); participant = "";
  }
  const filtered = eventFollowingOnly || !!participant;
  // Counted per athlete in each session, not per session.
  const count = is => flat.reduce((n, [s, d]) => n + s.athletes.filter(a => is(athleteStatus(s, d, a))).length, 0);
  const who = n => plural(n, "ספורטאי/ת או נבחרת אחת", "ספורטאים ונבחרות");
  // Label first ("תוצאות: 1"), so one count needs no singular form (Shira on #182).
  const kpi = [who(athletes.length), ...[[st => st === "competing", "מתחרה היום"], [isResult, "תוצאות"], [isAwait, "בהמתנה לתוצאה"], [st => st === "before", "לפני התחרות"]]
    .map(([is, label]) => (n => n ? `${label}: ${n}` : "")(count(is)))].filter(Boolean).join(" · ");
  const stakes = eventStakes(c);
  const tracked = athletesOf(c.sportId).length;
  const sportFollowed = followsSport(c.sportId), sportLabel = sportName(c.sportId);
  // Stale-aware only while something happens today; a season-long series isn't "running" on every day of it.
  const hasToday = series ? flat.some(([, d]) => d === t) : c.start <= t && t <= (c.end || c.start);
  const schedSrc = flat.map(([s]) => s.source).find(Boolean);
  const eventSrc = safeUrl(c.source), scheduleSrc = safeUrl(schedSrc);
  const sourceLinks = eventSrc && eventSrc === scheduleSrc
    ? [hostLink(eventSrc, "מקור פרטי התחרות ולוח הזמנים")]
    : [hostLink(eventSrc, "מקור פרטי התחרות"), hostLink(scheduleSrc, "לוח הזמנים")].filter(Boolean);
  const link = `${SITE_URL}#c-${id}`;
  const dayHead = (d, only) => `<h3><a class="hlink" href="#day-${d}"${d === t ? ` aria-current="date"` : ""}>${dayTitle(d)}</a> <span class="muted">(יום ${dayNo(c.start, d)})</span>${only ? DATE_ONLY : ""}</h3>`;
  const monthHead = m => `<h3>${new Date(m + "-15T12:00:00").toLocaleDateString("he-IL", {month: "long", year: "numeric"})}</h3>`;
  const scheduleGroups = [...groups].map(([d, list]) => [d, list.filter(s => (!eventFollowingOnly || followsSport(s.sportId) || followedIn(s))
    && (!participant || s.athletes.some(a => a.id === participant)))]);
  const shown = scheduleGroups.reduce((n, [, list]) => n + list.length, 0);
  const schedule = filtered && flat.length && !shown
    ? `<p class="muted">${participant ? "אין הופעות שמתאימות למסננים שנבחרו בתחרות הזו." : "אין הופעות שמתאימות למעקב שלך בתחרות הזו."}</p>`
    : !flat.length
    ? calEmpty(t <= (c.end || c.start) ? "עוד אין הופעות ידועות של ישראלים בתחרות הזו." : "לא תועדו הופעות של ישראלים בתחרות הזו.", c.sportId)
    : scheduleGroups.filter(([, list]) => list.length).sort(([x], [y]) => series ? x.localeCompare(y) : 0)
      .map(([k, list]) => `<div class="sess-day">${series ? monthHead(k) : dayHead(k, dateOnly(list))}
        <ul class="rows sess">${list.slice().sort((x, y) => (series ? x.day.localeCompare(y.day) : 0) || sessionOrder(x, y))
          .map(s => sessionRow(s, series ? s.day : k, !series && dateOnly(list), series
            ? `<small><a class="hlink" href="#day-${esc(s.day)}">${esc(dayTitle(s.day))}</a></small>` : "")).join("")}</ul></div>`).join("")
      + ((n => n ? `<p class="muted">${n === 1 ? "ביום נוסף בתחרות" : `ב־${n} ימים נוספים בתחרות`} לא ידועות הופעות של ישראלים.</p>` : "")(
        series || filtered ? 0 : [...groups].filter(([, list]) => !list.length).length));
  return `<p class="crumb"><a href="#sport-${esc(c.sportId)}"><span aria-hidden="true">→</span>&nbsp;${esc(sportName(c.sportId))}</a></p>
  <div class="event-head" data-event="${esc(id)}">
    <h1 tabindex="-1">${esc(c.name)}</h1>
    <button class="btn ghost follow" type="button" id="evFollowSport" data-event-follow-sport="${esc(c.sportId)}" aria-pressed="${sportFollowed}" aria-label="${esc(sportFollowed ? `הסרת הענף ${sportLabel} מהמעקב` : `מעקב אחרי ${sportLabel}`)}">${sportFollowed ? "★ הענף במעקב שלך" : `☆ מעקב אחרי ${esc(sportLabel)}`}</button>
    ${freshLine(hasToday)}
    <p class="muted">${[fmtRange(c.start, c.end), esc(c.location)].filter(Boolean).join(" · ")}</p>
    <div class="pills">${eventStatus(c, flat)}${c.qualifying ? `<span class="pill open">העפלה</span>` : ""}${series ? `<span class="pill ended">סדרה עונתית</span>` : ""}</div>
    ${!stakes && c.qualifying ? `<p>תחרות שנספרת להעפלה. <a href="#sport-${esc(c.sportId)}">שיטת ההעפלה בענף</a></p>` : ""}
  </div>
  <section class="panel" aria-labelledby="evSumH"><h2 id="evSumH">בקצרה</h2>
    ${typeof c.notes === "string" && c.notes.trim() ? `<p class="muted" id="evNotes"><b>הערות מהנתונים:</b> ${esc(c.notes)}</p>` : ""}
    ${filtered ? `<p class="muted">הסיכום והסגל מציגים את כלל הישראלים בתחרות, ללא סינון המשתתף או המעקב.</p>` : ""}
    ${athletes.length ? `<p class="kpi">${kpi}</p>`
      : tracked ? emptyLine("לא ידוע על ספורטאים או נבחרות מישראל בתחרות הזו.", `#sport-${c.sportId}`, `${who(tracked)} ברשימה בענף`)
        : calEmpty("לא ידוע על ספורטאים או נבחרות מישראל בתחרות הזו.", c.sportId)}
    ${nextDay ? `<p>ההופעה הבאה של ישראלים: <a href="#day-${esc(nextDay)}">${esc(dayTitle(nextDay))}</a></p>` : ""}
    ${sourceLinks.length ? `<p class="foot" id="evSources">${sourceLinks.join(" · ")}</p>` : ""}
  </section>
  <div class="event-cols">
    <section class="panel" aria-labelledby="evSchedH"><h2 id="evSchedH">לוח הזמנים של הישראלים</h2>
      <div class="toolbar"><label class="chk"><input type="checkbox" id="eventFollowOnly" ${eventFollowingOnly ? "checked" : ""}> רק המעקב שלי</label>
        ${flat.length ? `<label for="eventParticipant">משתתף בלוח התחרות</label><select id="eventParticipant"><option value=""${participant ? "" : " selected"}>כל המשתתפים</option>${athletes.map(a => `<option value="${esc(a.id)}"${a.id === participant ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select>` : ""}
        ${filtered ? `<button class="btn ghost small" type="button" data-event-show-all>הצגת כל ההופעות</button>` : ""}</div>
      ${flat.length || filtered ? `<p class="muted" role="status">מציגים ${shown} מתוך ${flat.length} הופעות · ${participant ? `משתתף: ${esc(athletes.find(a => a.id === participant).name)}` : "כל המשתתפים"} · ${eventFollowingOnly ? "לפי המעקב שלי" : "ללא סינון מעקב"}</p>` : ""}
      ${eventFollowingOnly && !S.follows.size && !S.followSports.size ? `<p class="muted">עוד אין ספורטאים או ענפים במעקב שלך. <a href="#sports">לבחירת ענפים למעקב</a></p>` : ""}
      ${schedule}</section>
    <div class="stack">
      ${stakes}
      ${athletes.length ? `<section class="panel" aria-labelledby="evAthH"><h2 id="evAthH">הישראלים בתחרות (${athletes.length})</h2>
        <ul class="rows">${athletes.map(a => { const mine = flat.filter(([s]) => s.athletes.includes(a))
          .sort(([x, xd], [y, yd]) => xd.localeCompare(yd) || byStart(x.startUtc, y.startUtc)), last = mine[mine.length - 1];
          const st = last ? athleteStatus(last[0], last[1], a) : "";
          const followed = S.follows.has(a.id);
          const button = `<button class="btn ghost small follow" type="button" id="evFollow-${esc(a.id)}" data-event-follow="${esc(a.id)}" aria-pressed="${followed}" aria-label="${esc(followed ? `הסרת ${a.name} מהמעקב` : `מעקב אחרי ${a.name}`)}">${followed ? "★ במעקב שלך" : "☆ מעקב"}</button>`;
          // A result is shown only in the schedule row, next to its source; components.md §6 row.
          return athleteRow(a, `<span class="actions">${isResult(st) ? `<span class="muted">תוצאה בלוח הזמנים</span>` : statusChip(st)}${button}</span>`); }).join("")}</ul></section>` : ""}
    </div>
  </div>
  <section class="panel" aria-labelledby="evShareH"><h2 id="evShareH">שיתוף</h2>
    <div class="share"><input id="evShare" readonly value="${esc(link)}" dir="ltr" aria-label="קישור לתחרות"><button class="btn ghost small" data-copy="evShare" data-copy-msg="evShareMsg">העתקה</button></div>
    <p class="foot" id="evShareMsg" aria-live="polite"></p>
  </section>
  ${reportBox(`טעות בדף תחרות: ${c.name}`, link)}`;
}

document.addEventListener("change", e => {
  if (e.target?.id !== "eventFollowOnly" || !currentRoute().startsWith("c-")) return;
  eventFollowingOnly = e.target.checked;
  refresh();
});
document.addEventListener("change", e => {
  if (e.target?.id !== "eventParticipant" || !currentRoute().startsWith("c-")) return;
  const c = S.comps.find(comp => comp.id === currentRoute().slice(2));
  if (!c) return;
  const id = e.target.value;
  if (id && ![...eventSessions(c).groups.values()].some(list => list.some(s => s.athletes.some(a => a.id === id)))) return;
  if (id) eventParticipantFilters.set(c.id, id); else eventParticipantFilters.delete(c.id);
  refresh();
});
document.addEventListener("click", e => {
  const button = e.target.closest?.("[data-event-follow],[data-event-follow-sport]");
  if (!button || !currentRoute().startsWith("c-")) return;
  const c = S.comps.find(comp => comp.id === currentRoute().slice(2));
  if (!c) return;
  if (button.dataset.eventFollowSport !== undefined) {
    if (button.dataset.eventFollowSport !== c.sportId || !sportById(c.sportId)) return;
    toggleFollowSport(c.sportId);
  } else {
    const id = button.dataset.eventFollow;
    if (![...eventSessions(c).groups.values()].some(list => list.some(s => s.athletes.some(a => a.id === id)))) return;
    toggleFollow(id);
  }
  refresh();
});
document.addEventListener("click", e => {
  if (!e.target.closest?.("[data-event-show-all]") || !currentRoute().startsWith("c-")) return;
  eventFollowingOnly = false;
  eventParticipantFilters.delete(currentRoute().slice(2));
  refresh();
  $("eventFollowOnly")?.focus({preventScroll: true});
});
