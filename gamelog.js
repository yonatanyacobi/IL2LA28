// Athlete results log ("game log", issue #178; docs/design/athlete-game-log.md) on the athlete page.
// Loaded after sessions.js (exportedSessions, compOn, byStart). Results are shown as written: nothing is parsed or added.
"use strict";

const GAMELOG_ROWS = 10;
const ATHLETE_UPCOMING_ROWS = 6;

function documentedResults(sportId = ""){
  const t = today(), now = Date.now(), rows = [];
  for (const s of exportedSessions()) {
    if ((sportId && s.sportId !== sportId) || !realDate(s.day) || s.day > t || !s.result
      || !safeUrl(s.resultSource) || !isUtc(s.resultAt) || Date.parse(s.resultAt) > now) continue;
    rows.push({day: s.day, sportId: s.sportId, athletes: s.athletes, comp: s.comp, phase: s.phase,
      result: s.result, source: s.resultSource, resultAt: s.resultAt, startUtc: s.startUtc});
  }
  const sessionRows = rows.slice();
  for (const a of S.athletes) {
    if (sportId && a.sportId !== sportId) continue;
    for (const h of Array.isArray(a.history) ? a.history : []) {
      if (!inGameLog(h) || !realDate(h.at) || h.at > t || (h.resultAt && (!isUtc(h.resultAt) || Date.parse(h.resultAt) > now))) continue;
      const result = str(h.text).trim();
      // A different individual result on the same day must survive a shared session result.
      if (sessionRows.some(s => s.day === h.at && s.athletes.includes(a) && s.result.trim() === result && s.source === h.source)) continue;
      const matches = (IDX.compsBySport().get(a.sportId) || []).filter(c => c.start <= h.at && h.at <= (c.end || c.start)
        && dayNo(c.start, c.end || c.start) <= SERIES_DAYS);
      rows.push({day: h.at, sportId: a.sportId, athletes: [a], comp: matches.length === 1 ? matches[0] : null,
        phase: "", result, source: h.source, resultAt: h.resultAt || "", startUtc: null});
    }
  }
  return rows.sort((a, b) => b.day.localeCompare(a.day)
    || (a.startUtc && b.startUtc ? byStart(b.startUtc, a.startUtc) : byStart(a.startUtc, b.startUtc)));
}

function documentedResultRow(r){
  return `<li><span class="d"><a href="#day-${esc(r.day)}">${esc(fmtShortY(r.day))}</a>${r.startUtc ? `<br>${timeTag(r.startUtc, hhmm(r.startUtc))}` : ""}</span>
    <span class="t">${r.athletes.map(a => `<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`).join(" · ")}
      ${r.comp ? `<small>${compLink(r.comp, esc(r.comp.name))}</small>` : ""}${r.phase ? `<small><bdi>${esc(r.phase)}</bdi></small>` : ""}
      <span class="res">${esc(r.result)} · ${linkOut(r.source, `מקור: ${host(r.source)}`)}</span></span></li>`;
}

function sportRecentResultsSection(id){
  const rows = documentedResults(id), more = rows.slice(6);
  return `<section class="panel" aria-labelledby="sportRecentResultsH"><h2 id="sportRecentResultsH">תוצאות מתועדות אחרונות בענף</h2>
    ${rows.length ? `<ul class="rows">${rows.slice(0, 6).map(documentedResultRow).join("")}</ul>
      ${more.length ? `<details><summary>${more.length === 1 ? "עוד תוצאה אחת" : `עוד ${more.length} תוצאות`}</summary><ul class="rows">${more.map(documentedResultRow).join("")}</ul></details>` : ""}`
      : `<p class="muted">עוד לא תועדו תוצאות בענף באתר</p>`}
  </section>`;
}

function athleteUpcomingSessions(a){
  const t = today(), through = addDays(t, 13);
  return exportedSessions().filter(s => s.athletes.includes(a) && t <= s.day && s.day <= through
    && ["before", "competing"].includes(athleteStatus(s, s.day, a)))
    .sort((x, y) => x.day.localeCompare(y.day) || byStart(x.startUtc, y.startUtc));
}

function athleteUpcomingSection(a){
  const sessions = athleteUpcomingSessions(a), more = sessions.length - ATHLETE_UPCOMING_ROWS;
  const row = s => `<li><span class="d"><a href="#day-${esc(s.day)}">${esc(fmt(s.day))}</a><br>${s.startUtc
    ? timeTag(s.startUtc, hhmm(s.startUtc)) : "השעה טרם פורסמה"}</span>
    <span class="t">${compLink(s.comp, esc(s.comp.name))}${s.phase ? `<small><bdi>${esc(s.phase)}</bdi></small>` : ""}${safeUrl(s.source) ? `<small>${linkOut(s.source, "לוח הזמנים")}</small>` : ""}</span>
    <span>${statusChip(athleteStatus(s, s.day, a))}</span></li>`;
  return `<section class="panel" aria-labelledby="athleteUpcomingH"><h2 id="athleteUpcomingH">ההופעות הקרובות</h2>
    ${sessions.length ? `<ul class="rows">${sessions.slice(0, ATHLETE_UPCOMING_ROWS).map(row).join("")}</ul>
      ${more > 0 ? `<details><summary>${more === 1 ? "הצגת עוד הופעה אחת" : `הצגת עוד ${more} הופעות`}</summary><ul class="rows">${sessions.slice(ATHLETE_UPCOMING_ROWS).map(row).join("")}</ul></details>` : ""}`
      : `<p class="muted">אין הופעות ידועות של ${esc(a.name)} בשבועיים הקרובים.</p><p><a href="#calendar-${esc(a.sportId)}">ללוח התחרויות בענף</a></p>`}
  </section>`;
}

// A history result the log shows: it needs an https source, since every log line names one. Any other result stays
// in the history timeline (app.js asks this too), so nothing disappears.
const inGameLog = h => h?.kind === "result" && isDate(h.at) && !!str(h.text).trim() && !!safeUrl(h.source);

// One athlete's results, newest first: [{date, comp, phase, result, source, resultAt, startUtc}]. Sources:
// - exported sessions she is in with a result. exportedSessions() keeps only proven results (https source + resultAt),
//   which are official for the whole session (e.g. a team). The merged per-athlete text that daySessions() builds
//   for #day is not used here, so a teammate's result never lands in her log;
// - her history results (inGameLog), matched to the competition running that day.
// A history result for the same day and competition as one of her session results is that result: the session wins.
// No cap: the job keeps at most RESULTS_MAX history results, and a cut here would hide them from both places.
function gameLog(a){
  if (!a) return [];
  const rows = [], key = (date, comp) => `${date}|${comp?.id || ""}`;
  for (const s of exportedSessions()) {
    if (!s.athletes.includes(a) || !s.result) continue;
    rows.push({date: s.day, comp: s.comp, phase: s.phase, result: s.result, source: s.resultSource, resultAt: s.resultAt, startUtc: s.startUtc});
  }
  const fromSessions = new Set(rows.map(r => key(r.date, r.comp)));
  for (const h of Array.isArray(a.history) ? a.history : []) {
    if (!inGameLog(h)) continue;
    const comp = compOn(a.sportId, h.at);
    if (fromSessions.has(key(h.at, comp))) continue;
    rows.push({date: h.at, comp, phase: "", result: str(h.text).trim().slice(0, 120), source: h.source, resultAt: "", startUtc: null});
  }
  return rows.sort((x, y) => y.date.localeCompare(x.date) || heCmp(x.comp?.name, y.comp?.name));
}

// Rows for the page: one per competition (prelims and final together), one per result without a competition.
// Rows newest first by their last day; entries inside a row oldest first (day, then start time).
function gameLogRows(a){
  const groups = new Map();
  gameLog(a).forEach((r, i) => { const k = r.comp?.id || `none-${i}`; groups.set(k, [...(groups.get(k) || []), r]); });
  return [...groups.values()].map(entries => {
    entries.sort((x, y) => x.date.localeCompare(y.date) || byStart(x.startUtc, y.startUtc));
    return {comp: entries[0].comp, entries, first: entries[0].date, last: entries[entries.length - 1].date};
  }).sort((x, y) => y.last.localeCompare(x.last));
}

// The year only when it isn't this year: "29–30 באוק׳", "12 בספט׳ 2025".
// A range within one month names the month once: "29–31 באוק׳".
function logDays(first, last){
  const year = today().slice(0, 4), one = d => `<time datetime="${d}">${d.slice(0, 4) === year ? fmtShort(d) : fmt(d)}</time>`;
  if (first === last) return one(first);
  return first.slice(0, 7) === last.slice(0, 7) ? `<time datetime="${first}">${Number(first.slice(8))}</time>–${one(last)}` : `${one(first)}–${one(last)}`;
}

function gameLogRow({comp, entries, first, last}, id){
  // One source for the whole row is shown once, on its last entry.
  const shared = entries.every(e => e.source === entries[0].source);
  const multipleDays = new Set(entries.map(e => e.date)).size > 1;
  const src = e => linkOut(e.source, `מקור: ${host(e.source)}`);
  // Each entry is tracked for "השתנה ב־", but the row shows one mark (the latest): the marks sit out of the flow,
  // so two in one row would overlap (Gil on #268).
  const keys = entries.map(e => `log|${id}|${e.date}|${e.phase}|${e.result}`);
  keys.forEach(k => rowMark(k, k));
  const latest = keys.filter(k => changedRows.has(k)).sort((x, y) => changedRows.get(y).localeCompare(changedRows.get(x)))[0];
  return `<li><span class="d">${logDays(first, last)}</span>
    <span class="t">${comp ? compLink(comp, esc(comp.name)) : `<span class="muted">תחרות שאינה ברשימה</span> · <a href="#day-${esc(first)}">ליום התוצאה</a>`}${entries.map((e, i) =>
      `<span class="res">${multipleDays ? `<a href="#day-${esc(e.date)}"><time datetime="${esc(e.date)}">${esc(fmtShortY(e.date))}</time></a> · ` : ""}${e.phase ? `<bdi>${esc(e.phase)}</bdi>: ` : ""}${esc(e.result)}${isUtc(e.resultAt) ? ` · עודכן ב־${whenIL(e.resultAt)}` : ""}${!shared || i === entries.length - 1 ? ` · ${src(e)}` : ""}${latest && i === entries.length - 1 ? rowMark(latest, latest) : ""}</span>`).join("")}</span></li>`;
}

function athleteResultsShareText(a){
  const athlete = S.athletes.find(p => p.id === a?.id);
  if (!athlete) return "";
  const rows = documentedResults(athlete.sportId).filter(r => r.athletes.some(p => p.id === athlete.id));
  if (!rows.length) return "";
  const plain = value => str(value).replace(/\s+/g, " ").trim();
  const canonical = (type, id) => {
    try { return `${SITE_URL}#${type}-${encodeURIComponent(id)}`; } catch { return ""; }
  };
  const blocks = rows.map(r => [`• ${fmt(r.day)} · ${r.athletes.map(p => plain(p.name)).join(" · ")}`,
    plain(r.result), `מקור: ${r.source}`,
    ...(r.comp ? [plain(r.comp.name), canonical("c", r.comp.id)] : [])].filter(Boolean).join("\n"));
  const head = [`תוצאות שמתועדות באתר · ${plain(athlete.name)}`,
    "סיכום התוצאות שתועדו באתר; אינו רשימה מלאה של הישגי הקריירה או עדכונים חדשים."];
  const foot = [`לרשומה: ${canonical("a", athlete.id)}`];
  let keep = blocks.length;
  const build = () => [...head, "", ...blocks.slice(0, keep),
    ...(keep < blocks.length ? [`ועוד ${plural(blocks.length - keep, "תוצאה אחת", "תוצאות")} באתר.`] : []), "", ...foot].join("\n");
  let text = build();
  while (text.length > 3500 && keep) { keep--; text = build(); }
  return text;
}

function athleteResultsShareSection(a){
  const text = athleteResultsShareText(a);
  return `<details id="athleteResultsShare" class="digest"><summary>תוצאות מתועדות להעתקה</summary>
    ${text ? `<label for="athleteResultsText">התוצאות המתועדות של ${esc(a.name)} להעתקה</label>
      <textarea id="athleteResultsText" readonly rows="8">${esc(text)}</textarea>
      <div class="actions"><button class="btn" data-copy="athleteResultsText" data-copy-msg="athleteResultsMsg">העתקת התוצאות</button></div>
      <p class="foot" id="athleteResultsMsg" aria-live="polite"></p>`
      : `<p class="muted">עוד לא תועדו ברשומה זו תוצאות שאפשר להעתיק.</p>`}
  </details>`;
}

function gameLogSection(a){
  const rows = gameLogRows(a), n = rows.reduce((k, r) => k + r.entries.length, 0);
  const nextDay = !n ? exportedSessions().filter(s => s.athletes.includes(a) && isDate(s.day) && s.day >= today())
    .map(s => s.day).sort()[0] : null;
  const shown = rows.slice(0, GAMELOG_ROWS), more = rows.slice(GAMELOG_ROWS), k = more.reduce((x, r) => x + r.entries.length, 0);
  return `<section class="panel" aria-labelledby="logH"><h2 id="logH">תוצאות בתחרויות</h2>
    ${n ? `<p class="kpi muted">${plural(n, "תוצאה אחת", "תוצאות")}${(m => !m ? "" : m === 1 ? " בתחרות אחת" : ` ב־${m} תחרויות`)(rows.filter(r => r.comp).length)}</p>
    <ul class="rows game-log">${shown.map(r => gameLogRow(r, a.id)).join("")}</ul>
    ${more.length ? `<details><summary>${k === 1 ? "הצגת עוד תוצאה אחת" : `הצגת עוד ${k} תוצאות`}</summary><ul class="rows game-log">${more.map(r => gameLogRow(r, a.id)).join("")}</ul></details>` : ""}
    <p class="foot">כל תוצאה מופיעה עם המקור שלה · ${CADENCE}</p>`
    : `<p class="muted">עוד לא תועדו תוצאות של ${esc(a.name)} בתחרויות.</p>${nextDay ? `<p><a href="#day-${esc(nextDay)}">להופעה הבאה הידועה: ${esc(dayTitle(nextDay))}</a></p>` : ""}`}
    ${athleteResultsShareSection(a)}
  </section>`;
}
