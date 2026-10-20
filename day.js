// Daily view: #today, #day and #day-YYYY-MM-DD (docs/design/daily-and-following.md §1; copy: Shira).
// Loaded after app.js and sessions.js (sessions, near-live labels and rows).
"use strict";

const DAY_STRIP = 3;                 // chips on each side of the selected date
const DAY_LOOKAHEAD = 120;           // empty-state search limit in each direction
let dayFollowingOnly = false;
let dayDateChoice = null;
const DAY_DATE_ERROR = "יש לבחור תאריך תקין כדי לעבור ליום אחר.";

// "Real" date: rejects 2026-02-30, which JS would roll over to 2 March.
const realDate = d => isDate(d) && !isNaN(asDate(d)) && addDays(d, 0) === d;
const chipText = d => `${asDate(d).toLocaleDateString("he-IL", {weekday: "narrow"})} ${asDate(d).getDate()}`;
const chipName = d => asDate(d).toLocaleDateString("he-IL", {weekday: "long", day: "numeric", month: "long"});

const hasIsraelis = d => daySessions(d).length > 0;
const DAY_PLAN_MAX = 3500;
const dayPlanScope = () => dayFollowingOnly ? "הופעות מיוצאות — לפי המעקב שלי" : "הופעות מיוצאות — כל ההופעות";

function dayWatchPlanText(d){
  if (!realDate(d) || typeof exportedSessions !== "function") return "";
  const sessions = exportedSessions().filter(s => s.day === d && (!dayFollowingOnly || followsSport(s.sportId) || followedIn(s)))
    .sort((a, b) => byStart(a.startUtc, b.startUtc));
  if (!sessions.length) return "";
  const at = typeof publicSnapshot !== "undefined" ? publicSnapshot?.generatedAt : "";
  const stamp = isUtc(at) ? `${fmt(ilDate(at))}, ${hhmm(at)}` : realDate(at) ? fmt(at) : "";
  const head = [`תכנון יום צפייה · ${fmt(d)}`, dayPlanScope(),
    stamp ? `נכון לייצוא מ־${stamp}` : "חותמת הייצוא אינה זמינה."];
  const rows = sessions.map(s => `• ${isUtc(s.startUtc) ? hhmm(s.startUtc) : "השעה טרם פורסמה"} · ${waText(s.comp.name)}${s.phase ? " · " + waText(s.phase) : ""} · ${s.athletes.map(a => waText(a.name)).join(", ")}`);
  const foot = ["", "הקישור מציג את היום המלא; סינון המעקב אישי לדפדפן.",
    `${SITE_URL}#day-${d}`, "השעות לפי ישראל; כדאי לבדוק מול המקור."];
  let omitted = 0;
  const build = () => [...head, "", ...rows, ...(omitted ? [omitted === 1 ? "ועוד הופעה אחת בקישור" : `ועוד ${omitted} הופעות בקישור`] : []), ...foot].join("\n");
  let text = build();
  while (text.length > DAY_PLAN_MAX && rows.length) {
    rows.pop(); omitted++;
    text = build();
  }
  return text;
}

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
  const stakes = quotasOf(sid).filter(q => {
    if (q.israelStatus !== "in-contention" || !q.stakes || !q.nextQuotaEvent
      || q.nextQuotaEvent.start > d || d > quotaEventEnd(q) || !israelIn(q)) return false;
    const event = q.nextQuotaEvent;
    const matches = S.comps.filter(c => c.sportId === q.sportId && c.start <= event.start && event.start <= (c.end || c.start)
      && str(c.name).trim() === str(event.name).trim());
    return matches.length === 1 && matches[0].id === comp.id;
  }).slice(0, STAKES_MAX);
  return `<h3>${compLink(comp, esc(comp.name), "hlink")}${tail}</h3>
    ${now ? `<p><span class="pill s-live">מתקיימת עכשיו${total > 1 ? ` · יום ${dayNo(comp.start, d)} מתוך ${total}` : ""}</span></p>` : ""}
    ${list}
    ${stakes.map(q => `<p class="stakes"><b>מה זה אומר:</b> <bdi>${esc(q.event)}</bdi>: ${esc(q.stakes)}</p>`).join("")}
    <p class="foot">${[fmtRange(comp.start, comp.end), esc(comp.location), linkOut(comp.source)].filter(Boolean).join(" · ")}</p>`;
}

function viewDay(d){
  if (!realDate(d)) return notFound();
  // Today aliases advance at midnight without an explicit navigation.
  const route = currentRoute(), choiceRoute = route === "today" || route === "day" ? route : `day-${d}`;
  if (dayDateChoice?.route !== choiceRoute) dayDateChoice = {route: choiceRoute, day: d, value: d, invalid: false, edited: false};
  else if (dayDateChoice.day !== d) {
    dayDateChoice.day = d;
    if (!dayDateChoice.edited) dayDateChoice.value = d;
  }
  const t = today(), isToday = d === t, prev = addDays(d, -1), next = addDays(d, 1);
  const fullSessions = daySessions(d);
  const inFollowing = s => followsSport(s.sportId) || followedIn(s);
  const sessions = dayFollowingOnly ? fullSessions.filter(inFollowing) : fullSessions;
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
  const athleteCount = new Set(sessions.flatMap(s => s.athletes.map(a => a.id))).size;
  const firstStart = c => c.list.map(s => s.startUtc).sort(byStart)[0] || null;
  let before = "", after = "";
  const hasRelevantDay = date => dayFollowingOnly ? daySessions(date).some(inFollowing) : hasIsraelis(date);
  if (!sessions.length) for (let i = 1; i <= DAY_LOOKAHEAD && (!before || !after); i++) {
    if (!before && hasRelevantDay(addDays(d, -i))) before = addDays(d, -i);
    if (!after && hasRelevantDay(addDays(d, i))) after = addDays(d, i);
  }
  const chips = Array.from({length: DAY_STRIP * 2 + 1}, (_, i) => addDays(d, i - DAY_STRIP));
  const watchPlan = dayWatchPlanText(d);
  return `<div class="day-nav">
      <h1 tabindex="-1">${isToday ? `היום, ${dayTitle(d)}` : dayTitle(d)}</h1>
      <a class="day-prev" href="#day-${prev}"><span aria-hidden="true">→</span>&nbsp;${isToday ? "אתמול" : "היום הקודם"}<span class="sr">, ${chipName(prev)}</span></a>
      <a href="#day-${next}">${isToday ? "מחר" : "היום הבא"}<span class="sr">, ${chipName(next)}</span>&nbsp;<span aria-hidden="true">←</span></a>
    </div>
  ${freshLine(isToday && sessions.length > 0)}
  <nav class="daystrip" aria-label="בחירת יום">${chips.map(x => { const has = hasIsraelis(x);
    return `<a href="#day-${x}" class="${has ? "has" : ""}"${x === d ? ` aria-current="date"` : ""}>${chipText(x)}<span class="sr"> · ${chipName(x)}${has ? " · יש תחרויות של ישראלים" : ""}</span></a>`; }).join("")}
    ${isToday ? "" : `<a href="#today">היום</a>`}</nav>
  <form class="toolbar" id="dayDateForm" novalidate>
    <label for="dayDate">בחירת תאריך</label>
    <input type="date" id="dayDate" value="${esc(dayDateChoice.value)}" aria-describedby="dayDateError"${dayDateChoice.invalid ? ` aria-invalid="true"` : ""}>
    <button class="btn ghost small" type="submit">מעבר לתאריך</button>
    <p class="err" id="dayDateError" role="alert"${dayDateChoice.invalid ? "" : " hidden"}>${dayDateChoice.invalid ? DAY_DATE_ERROR : ""}</p>
  </form>
  <div class="toolbar"><label class="chk"><input type="checkbox" id="dayFollowOnly" ${dayFollowingOnly ? "checked" : ""}> רק המעקב שלי</label>
    ${dayFollowingOnly ? `<button class="btn ghost small" type="button" data-day-show-all>הצגת כל ההופעות</button>` : ""}</div>
  ${dayFollowingOnly ? `<p class="muted">מציגים ${sessions.length} מתוך ${fullSessions.length} הופעות</p>${!S.follows.size && !S.followSports.size ? `<p class="muted">עוד אין ספורטאים או ענפים במעקב שלך. <a href="#sports">לבחירת ענפים למעקב</a></p>` : ""}` : ""}
  ${sessions.length ? `<p class="kpi day-summary">${plural(sessions.length, "הופעה אחת", "הופעות")} · ${plural(athleteCount, "ספורטאי/ת או נבחרת אחת", "ספורטאים ונבחרות")} · ${plural(sports.length, "ענף אחד", "ענפים")}</p>` : ""}
  ${sessions.length ? sports.map(sid => `<section class="panel day-sport" aria-labelledby="ds-${esc(sid)}">
      <h2 id="ds-${esc(sid)}">${followsSport(sid) ? STAR + " " : ""}<a class="hlink" href="#sport-${esc(sid)}">${esc(sportName(sid))}</a></h2>
      ${[...bySport.get(sid).values()].sort((x, y) => byStart(firstStart(x), firstStart(y))).map(c => compBlock(c.comp, c.list, sid, d)).join("")}
    </section>`).join("")
    : `<div class="empty"><p>${dayFollowingOnly && fullSessions.length ? "אין הופעות שמתאימות למעקב שלך ביום הזה." : "אין תחרויות ידועות של ספורטאים או נבחרות מישראל ביום הזה."}</p>${before ? `<p><a href="#day-${before}">${dayFollowingOnly ? "להופעות הקודמות במעקב שלך" : "לתחרות הקודמת"}: ${fmt(before)}</a></p>` : ""}${after ? `<p><a href="#day-${after}">${dayFollowingOnly ? "להופעות הבאות במעקב שלך" : "לתחרות הבאה"}: ${fmt(after)}</a></p>` : ""}</div>`}
  <section class="panel" aria-labelledby="dayShareH"><h2 id="dayShareH">שיתוף היום</h2>
    <div class="share"><input id="dayShare" readonly value="${esc(SITE_URL + "#day-" + d)}" dir="ltr" aria-label="קישור ליום התחרויות"><button class="btn ghost small" type="button" data-copy="dayShare" data-copy-msg="dayShareMsg">העתקת הקישור</button></div>
    <p class="foot" id="dayShareMsg" aria-live="polite"></p>
    <div class="digest" aria-labelledby="dayPlanH"><h3 id="dayPlanH">תכנון יום להעתקה</h3>
      <p class="muted" id="dayPlanScope">${dayPlanScope()}. הקישור מציג את היום המלא; סינון המעקב אישי לדפדפן.</p>
      ${watchPlan ? `<textarea id="dayPlan" readonly rows="8" aria-labelledby="dayPlanH" aria-describedby="dayPlanScope">${esc(watchPlan)}</textarea>
        <button class="btn ghost small" type="button" data-copy="dayPlan" data-copy-msg="dayPlanMsg">העתקת התכנון</button>
        <p class="foot" id="dayPlanMsg" aria-live="polite"></p>`
        : `<p class="muted">${dayFollowingOnly ? "אין הופעות מיוצאות שמתאימות למעקב שלך ביום הזה." : "אין הופעות מיוצאות ביום הזה להכנת תכנון."}</p>`}
    </div>
  </section>`;
}

function submitDayDate(e){
  if (e.target?.id !== "dayDateForm") return;
  e.preventDefault();
  const input = $("dayDate"), error = $("dayDateError"), value = input.value;
  dayDateChoice.value = value;
  dayDateChoice.edited = true;
  dayDateChoice.invalid = !realDate(value);
  if (dayDateChoice.invalid) {
    input.setAttribute("aria-invalid", "true");
    error.textContent = DAY_DATE_ERROR; error.hidden = false;
    input.focus({preventScroll: true});
    return;
  }
  input.removeAttribute("aria-invalid");
  error.textContent = ""; error.hidden = true;
  location.hash = `#day-${value}`;
}
document.addEventListener("submit", submitDayDate);
document.addEventListener("input", e => {
  if (e.target?.id === "dayDate" && dayDateChoice) {
    dayDateChoice.value = e.target.value;
    dayDateChoice.edited = true;
  }
});

document.addEventListener("change", e => {
  if (e.target?.id !== "dayFollowOnly") return;
  dayFollowingOnly = e.target.checked;
  refresh();
});
document.addEventListener("click", e => {
  if (!e.target.closest?.("[data-day-show-all]")) return;
  dayFollowingOnly = false;
  refresh();
  $("dayFollowOnly")?.focus({preventScroll: true});
});
