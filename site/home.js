// Home "now" panels (docs/design/home-today.md §2–3, #176): today's Israeli sessions and the last 48 h of results.
// Loaded after day.js and event.js; reuses their sessions and near-live labels. viewHome() calls homeNow().
"use strict";

const HOME_RESULTS_H = 48, HOME_RESULTS_MAX = 5;
const homeDayTitle = d => asDate(d).toLocaleDateString("he-IL", {weekday: "short", day: "numeric", month: "short"});
const compLink = c => c ? `<a href="#c-${esc(c.id)}">${esc(c.name)}</a>` : "";
const sportLink = sid => `<a href="#sport-${esc(sid)}">${esc(sportName(sid))}</a>`;

const HOME_STAKES_MAX = 2, HOME_NEXT_ROWS = 3;

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
      .filter(({q}) => stakesLine(q) && c.start <= q.nextQuotaEvent.start && q.nextQuotaEvent.start <= (c.end || c.start)).sort(cmp)[0])
    .filter(Boolean).sort(cmp).slice(0, HOME_STAKES_MAX);
  return picks.map(({c, q}) => `<p class="stakes"><b>על הכף היום · ${compLink(c)}:</b> <bdi>${esc(q.event)}</bdi>: ${esc(q.stakes)}</p>`).join("");
}

function homeToday(){
  const t = today(), sessions = daySessions(t).sort(sessionOrder);
  const more = sessions.length - TODAY_MAX;
  const withComp = new Set(sessions.map(s => s.comp?.id).filter(Boolean));
  const running = S.comps.filter(c => c.start <= t && t <= (c.end || c.start) && dayNo(c.start, c.end || c.start) <= SERIES_DAYS
    && athletesOf(c.sportId).length && !withComp.has(c.id)).sort((x, y) => heCmp(x.name, y.name));
  let next = "";
  if (!sessions.length) for (let i = 1; i <= DAY_LOOKAHEAD && !next; i++) if (hasIsraelis(addDays(t, i))) next = addDays(t, i);
  const where = s => `<small>${[sportLink(s.sportId), compLink(s.comp)].filter(Boolean).join(" · ")}</small>`;
  const rows = (list, d) => `<ul class="rows sess">${list.map(s => sessionRow(s, d, where(s))).join("")}</ul>`;
  // PM on #171: an empty day shows the next session day's first rows, so the home still opens on sessions.
  const nextBlock = () => `<h3>הבא בתור, ${homeDayTitle(next)}</h3>
    ${rows(daySessions(next).sort(sessionOrder).slice(0, HOME_NEXT_ROWS), next)}
    <p><a href="#day-${next}">לכל הסשנים ב־${fmtShort(next)}</a></p>`;
  return `<section class="panel" aria-labelledby="homeTodayH">
    <div class="sec-head"><h2 id="homeTodayH">היום, ${homeDayTitle(t)}</h2>${sessions.length && more <= 0 ? `<a href="#today">לכל התחרויות היום</a>` : ""}</div>
    ${sessions.length ? rows(sessions.slice(0, TODAY_MAX), t) : `<p class="muted">אין היום סשנים ידועים של ספורטאים ונבחרות מישראל.</p>`}
    ${todayStakes(sessions, t)}
    ${more > 0 ? `<p><a href="#today">${more === 1 ? "ועוד סשן אחד היום" : `ועוד ${more} סשנים היום`}</a></p>` : ""}
    ${next ? nextBlock() : ""}
    ${running.length ? `<p class="foot">מתקיימות היום, בלי סשן ידוע של ישראלים: ${running.map(compLink).join(" · ")}</p>` : ""}
  </section>`;
}

// Exported session results from the last 48 h, plus history results from today and yesterday (date only).
// One row per athlete and day; the session wins. historyResult() already drops source-less entries.
function recentResults(){
  const t = today(), now = Date.now(), since = now - HOME_RESULTS_H * 36e5;
  const exported = exportedSessions().filter(s => s.result);
  const seen = new Set(exported.flatMap(s => s.athletes.map(a => `${a.id}|${s.day}`)));
  const rows = exported.filter(s => { const at = Date.parse(s.resultAt); return at >= since && at <= now; })
    .map(s => ({athletes: s.athletes, comp: s.comp, sportId: s.sportId, result: s.result, source: s.resultSource, resultAt: s.resultAt, key: s.resultAt}));
  for (const d of [t, addDays(t, -1)]) for (const a of S.athletes) {
    const h = historyResult(a, d);
    if (!h || seen.has(`${a.id}|${d}`)) continue;
    seen.add(`${a.id}|${d}`);
    rows.push({athletes: [a], comp: compOn(a.sportId, d), sportId: a.sportId, result: str(h.text).slice(0, 120), source: h.source, at: d, key: d + "T00:00:00Z"});
  }
  const fav = r => r.athletes.some(a => S.follows.has(a.id)) ? 0 : 1;
  return rows.sort((x, y) => fav(x) - fav(y) || y.key.localeCompare(x.key) || heCmp(x.athletes[0].name, y.athletes[0].name));
}

// No chip or ✓: a result can be an elimination.
function homeResults(){
  const rows = recentResults();
  const row = r => `<li><span class="d">${r.resultAt ? whenIL(r.resultAt) : fmtShort(r.at)}</span>
    <span class="t">${r.athletes.map(a => `${S.follows.has(a.id) ? STAR + " " : ""}<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`).join(", ")}
      · ${compLink(r.comp) || sportLink(r.sportId)}
      <span class="res"><b>תוצאה:</b> ${esc(r.result)} · ${hostLink(r.source, "מקור")}</span></span><span></span></li>`;
  return `<section class="panel" aria-labelledby="homeResH">
    <h2 id="homeResH">תוצאות אחרונות</h2>
    <p class="foot">מ־48 השעות האחרונות · ${CADENCE}</p>
    ${rows.length ? `<ul class="rows">${rows.slice(0, HOME_RESULTS_MAX).map(row).join("")}</ul>` : `<p class="muted">אין תוצאות חדשות מ־48 השעות האחרונות.</p>`}
    ${rows.length > HOME_RESULTS_MAX ? `<p><a href="#updates">לכל העדכונים</a></p>` : ""}
  </section>`;
}

const homeNow = () => `<div class="home-now">${homeToday()}${homeResults()}</div>`;
