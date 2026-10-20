// Home "now" panels (docs/design/home-today.md §2–3, #176): today's Israeli sessions and the last 48 h of results.
// Loaded after sessions.js; every row is the shared sessionRow() (components.md §1). viewHome() calls homeNow().
"use strict";

const HOME_RESULTS_H = 48, HOME_RESULTS_MAX = 5, HOME_STAKES_MAX = 2, HOME_NEXT_ROWS = 3, HOME_NEXT_LOOKAHEAD = 60;
const WEEK_DAYS = 7, WEEK_COMPS = 2, WEEK_NAMES = 2;
const homeDayTitle = d => asDate(d).toLocaleDateString("he-IL", {weekday: "short", day: "numeric", month: "short"});
const compA = c => c ? compLink(c, esc(c.name)) : "";
const sportLink = sid => `<a href="#sport-${esc(sid)}">${esc(sportName(sid))}</a>`;

// PM on #171: one "על הכף היום" line per quota competition running today, at most 2. Each competition's item is
// picked followed → athlete in today's rows → best rank → file order; stakesLine()'s rules decide what may show
// (in-contention, event not over).
function todayStakes(sessions, t){
  const listed = new Set(sessions.flatMap(s => s.athletes.map(a => a.id)));
  const key = q => { const as = quotaAthletes(q);
    return [as.some(a => S.follows.has(a.id)) ? 0 : 1, as.some(a => listed.has(a.id)) ? 0 : 1, Math.min(Infinity, ...as.map(a => rankOf(a, t)))]; };
  const cmp = (x, y) => x.k[0] - y.k[0] || x.k[1] - y.k[1] || (x.k[2] - y.k[2] || 0) || x.i - y.i;   // || 0: Infinity - Infinity
  const picks = S.comps.filter(c => c.start <= t && t <= (c.end || c.start) && dayNo(c.start, c.end || c.start) <= SERIES_DAYS)
    .map(c => quotasOf(c.sportId).map((q, i) => ({c, q, i, k: key(q)}))
      .filter(({q}) => {
        if (!stakesLine(q) || !israelIn(q)) return false;
        const event = q.nextQuotaEvent;
        const matches = S.comps.filter(comp => comp.sportId === q.sportId && comp.start <= event.start && event.start <= (comp.end || comp.start)
          && str(comp.name).trim() === str(event.name).trim());
        return matches.length === 1 && matches[0].id === c.id;
      }).sort(cmp)[0])
    .filter(Boolean).sort(cmp).slice(0, HOME_STAKES_MAX);
  // The quota event, not the competition: the stakes text already opens with the competition (UX on #171).
  return picks.map(({q}) => `<p class="stakes"><b>על הכף היום · <bdi>${esc(q.event)}</bdi>:</b> ${esc(q.stakes)}</p>`).join("");
}

// The competition link under the names; "תאריך בלבד" goes on the group heading when no row has a time (§1).
const homeRows = (list, d) => `<ul class="rows sess">${list.map(s =>
  sessionRow(s, d, dateOnly(list), `<small>${s.comp ? compA(s.comp) : sportLink(s.sportId)}</small>`)).join("")}</ul>`;

// "הבא בתור" in homeToday(): on a day without Israelis, the next day that has them. weekPanel() leaves it out.
function homeNextDay(t){
  for (let i = 1; i <= HOME_NEXT_LOOKAHEAD; i++) if (hasIsraelis(addDays(t, i))) return addDays(t, i);
  return "";
}

function homeToday(){
  const t = today(), sessions = daySessions(t).sort(sessionOrder);
  const more = sessions.length - TODAY_MAX;
  const withComp = new Set(sessions.map(s => s.comp?.id).filter(Boolean));
  const running = S.comps.filter(c => c.start <= t && t <= (c.end || c.start) && dayNo(c.start, c.end || c.start) <= SERIES_DAYS
    && athletesOf(c.sportId).length && !withComp.has(c.id)).sort((x, y) => heCmp(x.name, y.name));
  const next = sessions.length ? "" : homeNextDay(t);
  const shown = sessions.slice(0, TODAY_MAX), nextSessions = next ? daySessions(next).sort(sessionOrder) : [];
  const watchable = s => ["before", "competing"].includes(sessionState(s, t));
  if (more > 0 && !shown.some(watchable)) {
    const candidate = sessions.slice(TODAY_MAX).filter(watchable)
      .sort((a, b) => (sessionState(b, t) === "competing") - (sessionState(a, t) === "competing") || sessionOrder(a, b))[0];
    if (candidate) shown[shown.length - 1] = candidate;
  }
  const nextList = nextSessions.slice(0, HOME_NEXT_ROWS), nextMore = nextSessions.length - nextList.length;
  // PM on #171: an empty day shows the next session day's first rows, so the home still opens on sessions.
  const nextBlock = () => `<h3>הבא בתור: ${homeDayTitle(next)}${dateOnly(nextList) ? DATE_ONLY : ""}</h3>
    ${homeRows(nextList, next)}
    <p>${nextMore > 0 ? `${nextMore === 1 ? "ועוד הופעה אחת" : `ועוד ${nextMore} הופעות`} · ` : ""}<a href="#day-${next}">לכל ההופעות ב־${fmtShort(next)}</a></p>`;
  return `<section class="panel" aria-labelledby="todayH">
    <h2 id="todayH"><a class="hlink" href="#today">היום, ${homeDayTitle(t)}</a>${dateOnly(shown) ? DATE_ONLY : ""}</h2>
    ${sessions.length ? homeRows(shown, t) : `<p class="muted">אין היום הופעות ידועות של ספורטאים או נבחרות מישראל.</p>`}
    ${todayStakes(sessions, t)}
    ${more > 0 ? `<p><a href="#today">${more === 1 ? "ועוד הופעה אחת היום" : `ועוד ${more} הופעות היום`}</a></p>` : ""}
    ${next ? nextBlock() : ""}
    ${running.length ? `<p class="foot">עוד היום, בלי הופעה ידועה של ישראלים: ${running.map(compA).join(" · ")}</p>` : ""}
  </section>`;
}

// Exported session results from the last 48 h, plus history results from today and yesterday (date only).
// One row per athlete and day; the session wins. historyResult() already drops source-less entries.
function recentResults(){
  const t = today(), now = Date.now(), since = now - HOME_RESULTS_H * 36e5;
  const exported = exportedSessions().filter(s => s.result);
  const seen = new Set(exported.flatMap(s => s.athletes.map(a => `${a.id}|${s.day}`)));
  const rows = exported.filter(s => { const at = Date.parse(s.resultAt); return at >= since && at <= now; });
  // A history result becomes a date-only session (like fallbackSessions), so it renders through sessionRow too.
  for (const d of [t, addDays(t, -1)]) for (const a of S.athletes) {
    const h = historyResult(a, d);
    if (!h || seen.has(`${a.id}|${d}`)) continue;
    const results = a.history.filter(h => h && typeof h === "object" && !Array.isArray(h) && h.kind === "result"
      && h.at === d && str(h.text).trim() && safeUrl(h.source)).map(h => ({text: str(h.text), source: h.source}));
    seen.add(`${a.id}|${d}`);
    rows.push({athletes: [a], comp: compOn(a.sportId, d), sportId: a.sportId, phase: "", startUtc: null, day: d,
      result: str(h.text).slice(0, 120), resultSource: h.source, resultAt: "", ...(results.length > 1 ? {historyResults: results} : {})});
  }
  const fav = r => followsSport(r.sportId) || r.athletes.some(a => S.follows.has(a.id)) ? 0 : 1, key = r => r.resultAt || r.day + "T00:00:00Z";
  return rows.sort((x, y) => fav(x) - fav(y) || key(y).localeCompare(key(x)) || heCmp(x.athletes[0].name, y.athletes[0].name));
}

// Grouped by Israel day under an h3, in the given order. sessionRow shows no chip for a result (it can be an elimination).
function resultGroups(list){
  const days = new Map();
  for (const s of list) days.set(s.day, [...(days.get(s.day) || []), s]);
  return [...days].map(([d, g]) => `<h3><a class="hlink" href="#day-${esc(d)}">${esc(homeDayTitle(d))}</a>${dateOnly(g) ? DATE_ONLY : ""}</h3>${homeRows(g, d)}`).join("");
}

function homeResults(){
  const rows = recentResults();
  const more = rows.length - HOME_RESULTS_MAX;
  // Every result stays on the home; #updates is the change log, never worded as "more results".
  return `<section class="panel" aria-labelledby="homeResH">
    <h2 id="homeResH">תוצאות אחרונות</h2>
    ${rows.length ? resultGroups(rows.slice(0, HOME_RESULTS_MAX)) : `<p class="muted">אין תוצאות חדשות ב־48 השעות האחרונות.</p>`}
    ${more > 0 ? `<details><summary>${more === 1 ? "ועוד תוצאה אחת" : `ועוד ${more} תוצאות`} ב־48 השעות האחרונות</summary>
      ${resultGroups(rows.slice(HOME_RESULTS_MAX))}</details>` : ""}
    <p class="foot">ב־48 השעות האחרונות · ${CADENCE} · <a href="#updates">לכל העדכונים באתר</a></p>
  </section>`;
}

const homeNow = () => `<div class="home-now">${homeToday()}${homeResults()}</div>`;

// ---------- "השבוע" (sprint6-ux-specs.md S4): one row per day with Israelis, tomorrow to today+7 ----------
// A day's competitions in session order, once each; a session without a known competition stands for its sport.
const dayComps = list => [...new Map(list.slice().sort(sessionOrder)
  .map(s => [s.comp ? s.comp.id : `sport|${s.sportId}`, s.comp ? compA(s.comp) : sportLink(s.sportId)])).values()];
const weekComps = list => (cs => cs.slice(0, WEEK_COMPS).join(" · ") + (cs.length > WEEK_COMPS ? ` · ועוד ${plural(cs.length - WEEK_COMPS, "תחרות אחת", "תחרויות")}` : ""))(dayComps(list));

// Followed athletes first (★ + at most 2 names); otherwise only the count.
function weekWho(list){
  const as = [...new Map(list.flatMap(s => s.athletes).map(a => [a.id, a])).values()];
  const fav = as.filter(a => S.follows.has(a.id)).sort((x, y) => heCmp(x.name, y.name)).slice(0, WEEK_NAMES);
  if (!fav.length) return as.length === 1 ? "ספורטאי/ת או נבחרת אחת" : `${as.length} ספורטאים ונבחרות`;
  const more = as.length - fav.length;
  return `${STAR}${fav.map(a => `<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`).join(", ")}${more > 0 ? ` · ועוד ${plural(more, "ספורטאי/ת או נבחרת אחת", "ספורטאים ונבחרות")}` : ""}`;
}

// Only the sports competing that day, as #day's stakes lines: a quota event elsewhere doesn't make the day one.
const weekQuotaDay = (list, d, t) => [...new Set(list.map(s => s.sportId))].some(sid => quotasOf(sid).some(q => {
  if (q.israelStatus !== "in-contention" || !nxt(q, t) || q.nextQuotaEvent.start > d || d > quotaEventEnd(q)) return false;
  const event = q.nextQuotaEvent;
  const matches = S.comps.filter(c => c.sportId === q.sportId && c.start <= event.start && event.start <= (c.end || c.start)
    && str(c.name).trim() === str(event.name).trim());
  return matches.length === 1 && list.some(s => s.sportId === q.sportId && s.comp?.id === matches[0].id);
}));
const WEEK_QUOTA_PILL = `<span class="pill q-in-contention"><span aria-hidden="true">◐</span> אירוע מכסה</span>`;
const WEEK_WAIT_PILL = `<span class="pill s-wait"><span aria-hidden="true">◷</span> בהמתנה לתוצאה</span>`;
const weekRow = (day, comps, small, pill) =>
  `<li><span class="d">${day}</span><span class="t">${comps}<small>${small}</small></span>${pill ? `<span>${pill}</span>` : ""}</li>`;

function weekPanel(){
  if (typeof daySessions !== "function" || typeof hasIsraelis !== "function") return "";
  const t = today(), y = addDays(t, -1), last = addDays(t, WEEK_DAYS);
  const todayHas = hasIsraelis(t), next = todayHas ? "" : homeNextDay(t);
  const days = Array.from({length: WEEK_DAYS}, (_, i) => addDays(t, i + 1)).filter(d => d !== next)
    .map(d => [d, daySessions(d)]).filter(([, list]) => list.length);
  // Result night: yesterday's sessions still awaiting a result (awaitLong no longer implies a check is coming).
  const waiting = daySessions(y).filter(s => ["awaitFresh", "awaitChecked"].includes(sessionState(s, y)));
  const rows = [
    waiting.length ? weekRow(`<a href="#day-${y}">אתמול</a>`, weekComps(waiting),
      waiting.length === 1 ? "הופעה אחת ממתינה לתוצאה" : `${waiting.length} הופעות ממתינות לתוצאה`, WEEK_WAIT_PILL) : "",
    ...days.map(([d, list]) => weekRow(`<a href="#day-${d}">${homeDayTitle(d)}</a>`,
      weekComps(list) + (list.some(s => s.athletes.some(isNew)) ? NEW_MARK : ""), weekWho(list),
      weekQuotaDay(list, d, t) ? WEEK_QUOTA_PILL : ""))].filter(Boolean);
  let empty = "";
  if (!days.length) {
    const after = todayHas && nextIsraeliDay(last);
    if (todayHas) empty = emptyLine("אחרי היום אין עוד תחרויות ידועות של ספורטאים או נבחרות מישראל בשבוע הקרוב.",
      after ? `#day-${after}` : "#calendar", after ? `ליום התחרויות הבא: ${fmt(after)}` : "ללוח התחרויות");
    // "הבא בתור" inside the week is its only day, so the panel would repeat it.
    else if (!next || next > last) empty = emptyLine("אין תחרויות ידועות של ספורטאים או נבחרות מישראל בשבוע הקרוב.", "#calendar", "ללוח התחרויות");
  }
  if (!rows.length && !empty) return "";
  return `<section class="panel" aria-labelledby="weekH"><h2 id="weekH">השבוע</h2>
    ${rows.length ? `<ul class="rows week">${rows.join("")}</ul>` : ""}${empty}
    ${empty.includes('href="#calendar"') ? "" : `<p class="foot"><a href="#calendar">ללוח התחרויות</a></p>`}
  </section>`;
}
