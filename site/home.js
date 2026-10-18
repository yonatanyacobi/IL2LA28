// Home "now" panels (docs/design/home-today.md §2–3, #176): today's Israeli sessions and the last 48 h of results.
// Loaded after sessions.js; every row is the shared sessionRow() (components.md §1). viewHome() calls homeNow().
"use strict";

const HOME_RESULTS_H = 48, HOME_RESULTS_MAX = 5, HOME_STAKES_MAX = 2, HOME_NEXT_ROWS = 3, HOME_NEXT_LOOKAHEAD = 60;
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
      .filter(({q}) => stakesLine(q) && c.start <= q.nextQuotaEvent.start && q.nextQuotaEvent.start <= (c.end || c.start)).sort(cmp)[0])
    .filter(Boolean).sort(cmp).slice(0, HOME_STAKES_MAX);
  // The quota event, not the competition: the stakes text already opens with the competition (UX on #171).
  return picks.map(({q}) => `<p class="stakes"><b>על הכף היום · <bdi>${esc(q.event)}</bdi>:</b> ${esc(q.stakes)}</p>`).join("");
}

// The competition link under the names; "תאריך בלבד" goes on the group heading when no row has a time (§1).
const homeRows = (list, d) => `<ul class="rows sess">${list.map(s =>
  sessionRow(s, d, dateOnly(list), `<small>${s.comp ? compA(s.comp) : sportLink(s.sportId)}</small>`)).join("")}</ul>`;

function homeToday(){
  const t = today(), sessions = daySessions(t).sort(sessionOrder);
  const more = sessions.length - TODAY_MAX;
  const withComp = new Set(sessions.map(s => s.comp?.id).filter(Boolean));
  const running = S.comps.filter(c => c.start <= t && t <= (c.end || c.start) && dayNo(c.start, c.end || c.start) <= SERIES_DAYS
    && athletesOf(c.sportId).length && !withComp.has(c.id)).sort((x, y) => heCmp(x.name, y.name));
  let next = "";
  if (!sessions.length) for (let i = 1; i <= HOME_NEXT_LOOKAHEAD && !next; i++) if (hasIsraelis(addDays(t, i))) next = addDays(t, i);
  const shown = sessions.slice(0, TODAY_MAX), nextList = next ? daySessions(next).sort(sessionOrder).slice(0, HOME_NEXT_ROWS) : [];
  // PM on #171: an empty day shows the next session day's first rows, so the home still opens on sessions.
  const nextBlock = () => `<h3>הבא בתור: ${homeDayTitle(next)}${dateOnly(nextList) ? DATE_ONLY : ""}</h3>
    ${homeRows(nextList, next)}
    <p><a href="#day-${next}">לכל ההופעות ב־${fmtShort(next)}</a></p>`;
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
    seen.add(`${a.id}|${d}`);
    rows.push({athletes: [a], comp: compOn(a.sportId, d), sportId: a.sportId, phase: "", startUtc: null, day: d,
      result: str(h.text).slice(0, 120), resultSource: h.source, resultAt: ""});
  }
  const fav = r => r.athletes.some(a => S.follows.has(a.id)) ? 0 : 1, key = r => r.resultAt || r.day + "T00:00:00Z";
  return rows.sort((x, y) => fav(x) - fav(y) || key(y).localeCompare(key(x)) || heCmp(x.athletes[0].name, y.athletes[0].name));
}

// Grouped by Israel day under an h3, in the given order. sessionRow shows no chip for a result (it can be an elimination).
function resultGroups(list){
  const days = new Map();
  for (const s of list) days.set(s.day, [...(days.get(s.day) || []), s]);
  return [...days].map(([d, g]) => `<h3>${homeDayTitle(d)}${dateOnly(g) ? DATE_ONLY : ""}</h3>${homeRows(g, d)}`).join("");
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
