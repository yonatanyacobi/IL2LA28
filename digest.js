// Weekly digest (#digest, docs/design/round2.md §2): plain text for WhatsApp. Loaded after app.js; uses its helpers and state.
"use strict";

const DIGEST_MAX = 3500, DIGEST_LINE = 160;
// Data must not toggle WhatsApp formatting or break a bullet over lines.
const waText = s => str(s).replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();
const waCut = s => s.length > DIGEST_LINE ? s.slice(0, DIGEST_LINE - 1) + "…" : s;
const names = list => list.map(a => waText(a.name)).sort(heCmp);
// A comma list over as many ≤160-char lines as needed, so no name is cut off.
function waList(prefix, items){
  const lines = [];
  for (const it of items) {
    const cur = lines.at(-1);
    if (cur && (cur + ", " + it).length <= DIGEST_LINE) lines[lines.length - 1] = cur + ", " + it;
    else lines.push(waCut((lines.length ? "  " : prefix) + it));
  }
  return lines;
}
// Per-class stakes repeat a shared lead ("<event>: points, not a direct quota; <athlete detail>"); the digest
// keeps only what all classes share, and the per-class detail stays on the sport page.
function commonStakes(list){
  const all = list.map(q => waText(q.stakes));
  if (all.some(s => !s)) return "";
  if (list.length === 1 || all.every(s => s === all[0])) return all[0];
  const lead = all[0].split(";")[0];
  return all.every(s => s.split(";")[0] === lead) ? lead.trim() : "";
}

// A digest is read for days after it's sent, so no relative time ("היום", "עכשיו"): the head already carries the date.
// A one-day competition adds nothing, the last day says so, and anything else is "בעיצומה".
const runningHead = c => (c.end || c.start) === c.start ? `• ${fmtShort(c.start)}` : `• עד ${fmtShort(c.end)}`;
const runningWhen = (c, t) => (c.end || c.start) === c.start ? "" : c.end === t ? "יום אחרון" : "בעיצומה";

// Depends only on `t` and the loaded data in S, so tests can pin the week.
function digestText(t = today()){
  const from = addDays(t, -6);
  const localDay = value => isUtc(value) ? ilDate(value) : isDate(value) ? value : "";
  const dataTs = localDay(str(S.live ? S.lastRun : (S.generatedAt || S.lastRun)));
  const day = c => localDay(str(c.at));
  const end = c => c.end || c.start;
  const weekChanges = S.changes.filter(c => isDate(day(c)) && day(c) >= from && day(c) <= t);
  // Results: competitions in tracked sports that ended in the 7 days before today, each with all changes about its
  // sport since it started (a 9-day Worlds' first results are older than a week by the next Sunday).
  // 7 full days, not t-6, so a Sunday digest still covers last Sunday's finals.
  // Changes carry no competition id, so the sport is taken from athleteId, else from the "<sport>: " prefix the
  // daily job writes.
  const resFrom = addDays(t, -7);
  const resChanges = S.changes.filter(c => isDate(day(c)) && day(c) <= t);
  const sessionResults = exportedSessions().filter(s => s.result && safeUrl(s.resultSource) && isUtc(s.resultAt)
    && s.day <= t && ilDate(s.resultAt) <= t && Date.parse(s.resultAt) <= Date.now());
  const changeSport = c => S.athletes.find(a => a.id === c.athleteId)?.sportId
    || S.sports.find(s => waText(c.text).startsWith(waText(s.he) + ":"))?.id || "";
  const used = new Set();
  const results = S.comps.filter(c => end(c) >= resFrom && end(c) < t && dayNo(c.start, end(c)) <= SERIES_DAYS && athletesOf(c.sportId).length)
    .sort((a, b) => end(b).localeCompare(end(a)) || heCmp(a.name, b.name))
    .map(c => {
      // Results written straight into athlete history (results-assist, e.g. tri_results.py) count too; such an
      // athlete's nextDate has usually moved on to the next event already, so they are matched by the entry's date.
      const inComp = d => isDate(d) && c.start <= d && d <= end(c);
      const sessions = sessionResults.filter(s => s.comp.id === c.id && inComp(s.day));
      const covered = (a, d) => sessions.some(s => s.day === d && s.athletes.some(p => p.id === a.id));
      const resultsOf = a => (Array.isArray(a.history) ? a.history : []).filter(h => h && h.kind === "result" && inComp(h.at)
        && str(h.text).trim() && safeUrl(h.source) && !covered(a, h.at));
      const who = S.athletes.filter(a => a.sportId === c.sportId && (inComp(a.nextDate) || resultsOf(a).length
        || sessions.some(s => s.athletes.some(p => p.id === a.id))));
      const loggedBy = who.filter(a => resultsOf(a).length);
      const logged = [...loggedBy.flatMap(a => resultsOf(a).map(h => [h.at, waCut(`  – ${waText(a.name)}: ${waText(h.text)}`)])),
        ...sessions.map(s => [s.day, waCut(`  – ${names(s.athletes).join(", ")}: ${waText(s.result)}`)])]
        .sort((x, y) => x[0].localeCompare(y[0]) || heCmp(x[1], y[1])).map(([, line]) => line);
      const fromJob = resChanges.filter(x => !used.has(x) && changeSport(x) === c.sportId && day(x) >= c.start);
      fromJob.forEach(x => used.add(x));
      // An editor's change about an athlete whose result is already logged above would repeat it.
      // The near-live status "…מתקיימת עכשיו" from before the event is stale under its results (Gil's rehearsal). Only
      // that phrase: any other text, a result included, stays. Dropped notes stay used, so they don't resurface below.
      // A line without athleteId (hand-written, #301's per-athlete lines) repeats a result when it names that athlete and
      // is dated the result's day or the morning after, when the job writes it.
      const repeats = x => loggedBy.some(a => x.athleteId ? x.athleteId === a.id
        : waText(x.text).includes(waText(a.name)) && resultsOf(a).some(h => day(x) === h.at || day(x) === addDays(h.at, 1)));
      const sessionRepeat = x => sessions.some(s => day(x) === s.day && waText(x.text) === waText(s.result)
        && (!x.athleteId || s.athletes.some(a => a.id === x.athleteId)));
      const about = fromJob.filter(x => !repeats(x) && !sessionRepeat(x) && !/מתקיימ(ת|ים|ות) עכשיו/.test(str(x.text)));
      const lines = [...logged, ...about.map(x => waCut(`  – ${waText(x.text)}`))];
      return [waCut(`• ${fmtShort(end(c))} · ${waText(c.name)} (${waText(sportName(c.sportId))})`),
        ...(who.length ? waList("  ישראלים: ", names(who)) : []),
        ...(lines.length ? lines : ["  התוצאות עוד לא עודכנו באתר."])].join("\n");
    });
  const changes = weekChanges.filter(c => !used.has(c))
    .sort((a, b) => day(b).localeCompare(day(a)))
    .map(c => waCut(`• ${waText(c.text)}`));
  // Competitions already under way, listed per competition with the athletes still to compete in it (nextDate from
  // today to its end): a finalist from yesterday isn't "competing this week" (PL on #351).
  const running = S.comps.filter(c => c.start <= t && t <= end(c) && dayNo(c.start, end(c)) <= SERIES_DAYS)
    .map(c => ({c, list: S.athletes.filter(a => a.sportId === c.sportId && isDate(a.nextDate) && a.nextDate >= t && c.start <= a.nextDate && a.nextDate <= end(c))}))
    .filter(r => r.list.length);
  const inRunning = new Set(running.flatMap(r => r.list.map(a => a.id)));
  const competing = [
    ...running.sort((x, y) => heCmp(sportName(x.c.sportId), sportName(y.c.sportId)))
      .map(({c, list}) => [waCut(`${runningHead(c)} · ${waText(c.name)} (${waText(sportName(c.sportId))})${(w => w ? `, ${w}` : "")(runningWhen(c, t))}`), ...waList("  ", names(list))].join("\n")),
    ...S.athletes.filter(a => !inRunning.has(a.id) && isDate(a.nextDate) && a.nextDate >= t && a.nextDate <= addDays(t, 6))
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate) || heCmp(a.name, b.name))
      .map(a => waCut(`• ${fmtShort(a.nextDate)} · ${waText(a.name)} (${waText(sportName(a.sportId))})${a.next ? ": " + waText(a.next) : ""}`)),
  ];
  // One bullet per quota event (e.g. a Grand Slam deciding 7 weight classes), not one per class.
  const byEvent = new Map();
  for (const q of S.quotas) {
    if (q.israelStatus === "earned" || !nxt(q, t) || q.nextQuotaEvent.start > addDays(t, 13)) continue;
    const key = [q.nextQuotaEvent.start, q.sportId, q.nextQuotaEvent.name].join("|");
    byEvent.set(key, [...(byEvent.get(key) || []), q]);
  }
  const quotas = [...byEvent.keys()].sort().map(key => {
    const list = byEvent.get(key).sort((a, b) => heCmp(a.event, b.event)), q = list[0], e = q.nextQuotaEvent, last = quotaEventEnd(q);
    const who = S.athletes.filter(a => a.sportId === q.sportId && isDate(a.nextDate) && e.start <= a.nextDate && a.nextDate <= last);
    const stakes = israelIn(q) ? commonStakes(list) : "";
    return [
      waCut(`• ${fmtShort(e.start)} · ${waText(sportName(q.sportId))}${list.length === 1 ? `, ${waText(q.event)}` : ""}: ${waText(e.name)}`),
      ...(list.length > 1 ? waList("  מקצים: ", list.map(x => waText(x.event))) : []),
      // Ranked first (best rankNum), then by name.
      ...(who.length ? waList("  ישראלים: ", who.sort((a, b) => byRank(a, b) || heCmp(a.name, b.name)).map(a => waText(a.name))) : []),
      ...(stakes ? [waCut(`  מה זה אומר: ${stakes}`)] : []),
    ].join("\n");
  });
  const sections = [["תוצאות השבוע", results], ["מה התעדכן", changes], ["ישראלים מתחרים השבוע", competing], ["אירועי מכסה בשבועיים הקרובים", quotas]]
    .filter(([, items]) => items.length).map(([title, items]) => ({title, items, cut: 0}));
  // Results always get a heading once anything else is said, so "no results" is explicit rather than missing.
  if (sections.length && !results.length) sections.unshift({title: "תוצאות השבוע", items: [], none: "לא הסתיימו השבוע תחרויות בענפים שברשימה.", cut: 0});
  const head = [`*הדרך ללוס אנג׳לס 28 · תקציר שבועי*`, `${fmtRange(from, t)}${isDate(dataTs) ? ` · נכון ל־${fmt(dataTs)}` : ""}`,
    ...(isDate(dataTs) && dataTs < addDays(t, -2) ? [`שימו לב: הנתונים לא עודכנו מאז ${fmt(dataTs)}.`] : [])];
  const foot = ["", `לכל הפרטים: ${SITE_URL}`, "אתר לא רשמי. הנתונים ממקורות פומביים, כדאי לבדוק מול המקור."];
  const build = () => [...head,
    ...(sections.length ? sections.flatMap(s => ["", `*${s.title}*`, ...s.items, ...(s.none ? [s.none] : []), ...(s.cut ? [`• ועוד ${s.cut} באתר`] : [])])
      : ["", "שבוע שקט: אין עדכונים, תחרויות או אירועי מכסה ידועים."]),
    ...foot].join("\n");
  let text = build();
  while (text.length > DIGEST_MAX) {
    const s = sections.reduce((a, b) => b.items.length > a.items.length ? b : a, {items: []});
    if (!s.items.length) break;
    s.items = s.items.slice(0, -1); s.cut++;
    text = build();
  }
  return text;
}

function viewDigest(){
  const t = today(), text = digestText(t);
  return `<p class="crumb"><a href="#updates"><span aria-hidden="true">→</span>&nbsp;עדכונים</a></p>
  <h1 tabindex="-1">תקציר שבועי</h1>
  <p class="muted">טקסט מוכן להדבקה בוואטסאפ או בכל מקום אחר. ${fmtRange(addDays(t, -6), t)}.</p>
  <section class="panel digest" aria-labelledby="dgH">
    <h2 id="dgH" class="sr">טקסט התקציר</h2>
    <textarea id="digestText" readonly rows="16" aria-labelledby="dgH" aria-describedby="dgCount">${esc(text)}</textarea>
    <div class="actions">
      <button class="btn" data-copy="digestText" data-copy-msg="digestMsg">העתקת התקציר</button>
      <span class="foot" id="dgCount">${text.length.toLocaleString("he-IL")} תווים</span>
    </div>
    <p class="foot" id="digestMsg" aria-live="polite"></p>
  </section>`;
}
