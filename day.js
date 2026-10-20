// Daily view: #today, #day and #day-YYYY-MM-DD (docs/design/daily-and-following.md §1; copy: Shira).
// Loaded after app.js and sessions.js (sessions, near-live labels and rows).
"use strict";

const DAY_STRIP = 3;                 // chips on each side of the selected date
const DAY_LOOKAHEAD = 120;           // known-day search limit in each direction
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

const DAY_RESULTS_MAX = 3500;
const dayResultsScope = () => dayFollowingOnly ? "תוצאות מתועדות — לפי המעקב שלי" : "תוצאות מתועדות — כל ההופעות";

function dayResultsShareText(d, fullSessions = null){
  if (!realDate(d) || d > today()) return "";
  const plain = value => str(value).replace(/\s+/g, " ").trim();
  const official = exportedSessions().filter(s => s.day === d);
  const rows = [], seenHistory = new Set();
  for (const s of (fullSessions ?? daySessions(d)).filter(s => !dayFollowingOnly || followsSport(s.sportId) || followedIn(s)).sort(sessionOrder)) {
    if (!str(s.result).trim() || !safeUrl(s.resultSource)
      || (s.resultAt && (!isUtc(s.resultAt) || Date.parse(s.resultAt) > Date.now()))) continue;
    const candidates = official.filter(x => x.comp.id === s.comp?.id && x.startUtc === s.startUtc && x.phase === s.phase
      && x.athletes.length === s.athletes.length && x.athletes.every((a, i) => a.id === s.athletes[i].id));
    const original = candidates.find(x => x.result && x.result === s.result && x.resultSource === s.resultSource && x.resultAt === s.resultAt)
      || candidates.find(x => !x.result);
    const matches = S.comps.filter(c => c.sportId === s.sportId && c.start <= d && d <= (c.end || c.start)
      && dayNo(c.start, c.end || c.start) <= SERIES_DAYS);
    const comp = s.comp && (original?.result || (matches.length === 1 && matches[0].id === s.comp.id)) ? s.comp : null;
    // The daily row may merge personal history into an otherwise result-less shared session.
    const results = original?.result ? [{athletes: s.athletes, text: original.result, source: original.resultSource}]
      : s.athletes.flatMap(a => (Array.isArray(a.history) ? a.history : [])
        .filter(h => h && h.kind === "result" && h.at === d && str(h.text).trim() && safeUrl(h.source))
        .filter(h => {
          const key = JSON.stringify([a.id, d, h.text, h.source]);
          if (seenHistory.has(key)) return false;
          seenHistory.add(key);
          return true;
        })
        .map(h => ({athletes: [a], text: h.text, source: h.source})));
    for (const result of results) {
      rows.push([`• ${result.athletes.map(a => plain(a.name)).join(", ")}${comp ? " · " + plain(comp.name) : ""}`,
        plain(result.text), result.source].join("\n"));
    }
  }
  if (!rows.length) return "";
  const at = typeof publicSnapshot !== "undefined" ? publicSnapshot?.generatedAt : "";
  const stamp = isUtc(at) ? `${fmt(ilDate(at))}, ${hhmm(at)}` : realDate(at) ? fmt(at) : "";
  const head = [`תוצאות מתועדות · ${fmt(d)}`, dayResultsScope(),
    "תיעוד שפורסם באתר, בעדכונים תקופתיים.",
    stamp ? `תמונת הנתונים הכללית מ־${stamp}; לכל תוצאה המקור שלה.` : "תאריך תמונת הנתונים הכללית אינו זמין; לכל תוצאה המקור שלה."];
  const foot = ["", "הקישור מציג את היום המלא; סינון המעקב אישי לדפדפן.", `${SITE_URL}#day-${d}`];
  let omitted = 0;
  const build = () => [...head, "", ...rows, ...(omitted ? [omitted === 1 ? "ועוד תוצאה אחת בקישור" : `ועוד ${omitted} תוצאות בקישור`] : []), ...foot].join("\n");
  let text = build();
  while (text.length > DAY_RESULTS_MAX && rows.length) {
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
  const schedules = new Map();
  for (const s of sessions) {
    const source = safeUrl(s.source);
    if (!source) continue;
    if (!schedules.has(source)) schedules.set(source, new Set());
    if (s.phase) schedules.get(source).add(s.phase);
  }
  const context = phases => [comp.name, d, ...phases].filter(Boolean).join(" · ");
  const eventSource = safeUrl(comp.source), sourceLinks = [];
  if (eventSource) sourceLinks.push(hostLink(eventSource, schedules.has(eventSource)
    ? "מקור פרטי התחרות ולוח ההופעות" : "מקור פרטי התחרות", context(schedules.get(eventSource) || [])));
  for (const [source, phases] of schedules) {
    if (source !== eventSource) sourceLinks.push(hostLink(source, "מקור לוח ההופעות", context(phases)));
  }
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
    <p class="foot day-sources">${[fmtRange(comp.start, comp.end), esc(comp.location), ...sourceLinks].filter(Boolean).join(" · ")}</p>`;
}

function dayGeneralCompetitions(d){
  if (!realDate(d)) return [];
  const rows = S.comps.filter(c => realDate(c.start) && realDate(c.end || c.start)
    && c.start <= d && d <= (c.end || c.start) && dayNo(c.start, c.end || c.start) <= SERIES_DAYS);
  return [...new Map(rows.map(c => [c.id, c])).values()]
    .sort((a, b) => a.start.localeCompare(b.start) || heCmp(a.name, b.name));
}

function dayGeneralCompetitionsSection(d){
  const rows = dayGeneralCompetitions(d), more = rows.slice(5);
  if (!rows.length) return "";
  return `<section class="panel" id="dayGeneralCompetitions" aria-labelledby="dayGeneralCompetitionsH">
    <h2 id="dayGeneralCompetitionsH">תחרויות כלליות שמועדיהן כוללים את היום</h2>
    <p class="muted">${plural(rows.length, "תחרות אחת", "תחרויות")} בלוח הכללי. הרשימה כוללת את כל הענפים ואינה מסוננת לפי המעקב שלך.</p>
    <p class="muted">טווח התחרות כולל את התאריך שנבחר; אין בכך אישור למקצה באותו יום או להשתתפות ספורטאים מישראל. חלונות דירוג וסדרות ארוכות אינם מוצגים כאן.</p>
    ${rows.slice(0, 5).map(c => compRow(c, true)).join("")}
    ${more.length ? `<details id="dayGeneralCompetitionsOverflow"><summary id="dayGeneralCompetitionsMore">${more.length === 1 ? "עוד תחרות אחת" : `עוד ${more.length} תחרויות`}</summary>${more.map(c => compRow(c, true)).join("")}</details>` : ""}
  </section>`;
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
  const days = new Map();
  const sessionsOn = date => {
    if (!days.has(date)) days.set(date, daySessions(date));
    return days.get(date);
  };
  const fullSessions = sessionsOn(d);
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
  const hasRelevantDay = date => dayFollowingOnly ? sessionsOn(date).some(inFollowing) : sessionsOn(date).length > 0;
  for (let i = 1; i <= DAY_LOOKAHEAD && (!before || !after); i++) {
    if (!before && hasRelevantDay(addDays(d, -i))) before = addDays(d, -i);
    if (!after && hasRelevantDay(addDays(d, i))) after = addDays(d, i);
  }
  const neighbourLabel = direction => `יום ${direction} עם הופעות ${dayFollowingOnly ? "במעקב שלי" : "ידועות"}`;
  const neighbours = [[before, prev, "קודם"], [after, next, "הבא"]]
    .filter(([date, adjacent]) => date && date !== adjacent)
    .map(([date, , direction]) => `<a href="#day-${date}">${neighbourLabel(direction)}: ${fmt(date)}</a>`);
  const neighbourNav = neighbours.length ? `<nav class="toolbar" aria-label="מעבר לימי הופעות ${dayFollowingOnly ? "במעקב שלי" : "ידועים"}">${neighbours.join("")}</nav>` : "";
  const chips = Array.from({length: DAY_STRIP * 2 + 1}, (_, i) => addDays(d, i - DAY_STRIP));
  const watchPlan = dayWatchPlanText(d), resultsText = dayResultsShareText(d, fullSessions);
  return `<div class="day-nav">
      <h1 tabindex="-1">${isToday ? `היום, ${dayTitle(d)}` : dayTitle(d)}</h1>
      <a class="day-prev" href="#day-${prev}"><span aria-hidden="true">→</span>&nbsp;${isToday ? "אתמול" : "היום הקודם"}${before === prev ? ` · ${neighbourLabel("קודם")}: ${fmt(prev)}` : ""}<span class="sr">, ${chipName(prev)}</span></a>
      <a href="#day-${next}">${isToday ? "מחר" : "היום הבא"}${after === next ? ` · ${neighbourLabel("הבא")}: ${fmt(next)}` : ""}<span class="sr">, ${chipName(next)}</span>&nbsp;<span aria-hidden="true">←</span></a>
    </div>
  ${freshLine(isToday && sessions.length > 0)}
  <nav class="daystrip" aria-label="בחירת יום">${chips.map(x => { const has = sessionsOn(x).length > 0;
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
  ${sessions.length ? neighbourNav : ""}
  ${sessions.length ? `<p class="kpi day-summary">${plural(sessions.length, "הופעה אחת", "הופעות")} · ${plural(athleteCount, "ספורטאי/ת או נבחרת אחת", "ספורטאים ונבחרות")} · ${plural(sports.length, "ענף אחד", "ענפים")}</p>` : ""}
  ${sessions.length ? sports.map(sid => `<section class="panel day-sport" aria-labelledby="ds-${esc(sid)}">
      <h2 id="ds-${esc(sid)}">${followsSport(sid) ? STAR + " " : ""}<a class="hlink" href="#sport-${esc(sid)}">${esc(sportName(sid))}</a></h2>
      ${[...bySport.get(sid).values()].sort((x, y) => byStart(firstStart(x), firstStart(y))).map(c => compBlock(c.comp, c.list, sid, d)).join("")}
    </section>`).join("")
    : `<div class="empty"><p>${dayFollowingOnly && fullSessions.length ? "אין הופעות שמתאימות למעקב שלך ביום הזה." : "אין תחרויות ידועות של ספורטאים או נבחרות מישראל ביום הזה."}</p>${neighbourNav}</div>`}
  ${dayGeneralCompetitionsSection(d)}
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
    <div class="digest" aria-labelledby="dayResultsH"><h3 id="dayResultsH">תוצאות היום להעתקה</h3>
      <p class="muted" id="dayResultsScope">${dayResultsScope()}. הקישור מציג את היום המלא; סינון המעקב אישי לדפדפן.</p>
      ${resultsText ? `<textarea id="dayResults" readonly rows="8" aria-labelledby="dayResultsH" aria-describedby="dayResultsScope">${esc(resultsText)}</textarea>
        <button class="btn ghost small" type="button" data-copy="dayResults" data-copy-msg="dayResultsMsg">העתקת התוצאות</button>
        <p class="foot" id="dayResultsMsg" aria-live="polite"></p>`
        : `<p class="muted">${dayFollowingOnly ? "אין תוצאות מתועדות שמתאימות למעקב שלך ביום הזה." : "אין תוצאות מתועדות ביום הזה להעתקה."}</p>`}
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
