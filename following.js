// "Following" (#following, #following-sports; docs/design/daily-and-following.md §2): followed athletes and
// sports, and what changed since the viewer last opened this page. Loaded after app.js; uses its helpers and
// state. Per-viewer only (localStorage via store, which already wraps every access in try/catch).
"use strict";

const FEED_MAX = 20;
// Baseline for "since your last visit to #following". A first visit sets it silently, so nothing is "new".
const savedFollowSeen = store.get("la28.followingSeen", null);
const followSeenAtLoad = typeof savedFollowSeen === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(savedFollowSeen) &&
  isDate(savedFollowSeen.slice(0, 10)) && Number.isFinite(Date.parse(savedFollowSeen)) ? savedFollowSeen : null;
// What the viewer saw of each followed record at that visit, so an updatedAt bump that changes nothing visible
// (a source link, a verification stamp) doesn't count as news.
const SHOWN_FIELDS = ["name", "event", "stage", "rank", "next", "nextDate"];
const shownOf = a => SHOWN_FIELDS.map(k => str(a[k])).join("\u241f");
const savedFollowingShown = store.get("la28.followingShown", {});
const shownAtLoad = Object.fromEntries(savedFollowingShown && typeof savedFollowingShown === "object" && !Array.isArray(savedFollowingShown)
  ? Object.entries(savedFollowingShown).filter(([, value]) => typeof value === "string") : []);
let badgeSince = followSeenAtLoad;
S.followSports = new Set(store.getArray("la28.followSports"));

function toggleFollowSport(id){
  S.followSports.has(id) ? S.followSports.delete(id) : S.followSports.add(id);
  saveFollows("la28.followSports", [...S.followSports]);
}

const followedAthletes = () => S.athletes.filter(a => S.follows.has(a.id) || S.followSports.has(a.sportId));

// Proven session results win same-day result history. Date-only history counts on the visit's Israel day
// only when the athlete record changed after that visit.
// A record that changed without a new history entry (most daily updates, until results land) still gets one
// "הפרטים עודכנו" row, dated by updatedAt.
function followFeed(since){
  if (!since) return [];
  const day = IL_DAY.format(new Date(since));
  const sinceAt = Date.parse(since), now = Date.now();
  const results = (typeof exportedSessions === "function" ? exportedSessions() : []).filter(s => {
    const at = Date.parse(s.resultAt);
    return s.result && at > sinceAt && at <= now;
  });
  const athleteItems = followedAthletes().flatMap(a => {
    const sessionItems = results.filter(s => s.athletes.includes(a)).map(s => ({a, session: true,
      h: {kind: "result", at: s.day, text: s.result, source: s.resultSource}}));
    const resultDays = new Set(sessionItems.map(item => item.h.at));
    const historyItems = (Array.isArray(a.history) ? a.history : [])
      .filter(h => h && typeof h === "object" && !Array.isArray(h) && isDate(h.at)
        && !(h.kind === "result" && resultDays.has(h.at))
        && (h.at > day || (h.at === day && str(a.updatedAt) > since))).map(h => ({a, h}));
    const items = [...sessionItems, ...historyItems];
    const updatedAt = str(a.updatedAt), was = shownAtLoad[a.id];
    const at = Number.isFinite(Date.parse(updatedAt)) ? IL_DAY.format(new Date(updatedAt)) : "";
    const changed = updatedAt > since && isDate(at) && was !== undefined && was !== shownOf(a);
    return items.length || !changed ? items : [{a, h: {at, text: "הפרטים עודכנו"}}];
  });
  const quotas = new Map(), t = today();
  for (const q of S.quotas || []) {
    if (!S.followSports.has(q.sportId) || !safeUrl(q.source)) continue;
    const kind = q.israelStatus === "earned" ? "earned" : "awaiting";
    const waiting = kind === "awaiting" ? awaitingOf(q) : null;
    const at = kind === "earned" ? q.earnedAt : waiting ? addDays(waiting.end, 1) : "";
    if (!isDate(at) || at <= day || at > t) continue;
    const key = JSON.stringify([q.sportId, q.event, kind]);
    if (quotas.has(key) && quotas.get(key).h.at >= at) continue;
    quotas.set(key, {type: "quota", q, h: {at, text: kind === "earned" ? "מכסה הושגה" : "בהמתנה לתוצאות", source: q.source}});
  }
  const name = item => item.type === "quota" ? `${sportName(item.q.sportId)} · ${item.q.event}` : item.a.name;
  return [...athleteItems, ...quotas.values()]
    .sort((x, y) => y.h.at.localeCompare(x.h.at) || heCmp(name(x), name(y))).slice(0, FEED_MAX);
}

// Athletes followed only through their sport have no star, so their feed rows say why they're there.
const viaSport = a => S.follows.has(a.id) ? "" : `<small>ענף במעקב: ${esc(sportName(a.sportId))}</small>`;

function followingFeedRow({type, q, a, h, session}){
  const quota = type === "quota";
  const href = quota ? `#sport-${esc(q.sportId)}` : session ? `#day-${esc(h.at)}` : `#a-${esc(a.id)}`;
  const label = quota ? sportName(q.sportId) : a.name;
  const text = quota ? `<bdi>${esc(q.event)}</bdi>: ${esc(h.text)}` : esc(h.text);
  const key = quota ? `feed|quota|${JSON.stringify([q.sportId, q.event, h.at, h.text])}` : `feed|${a.id}|${h.at}|${h.text}`;
  return `<li><span class="d">${fmt(h.at)}</span><span class="t"><a href="${href}">${esc(label)}</a><small>${text}${safeUrl(h.source) ? ` · ${linkOut(h.source)}` : ""}</small>${quota ? "" : viaSport(a)}${rowMark(key, key)}</span><span></span></li>`;
}

const compLinkOr = c => typeof compLink === "function" ? compLink(c, esc(c.name)) : esc(c.name);

function followUpcoming(){
  const t = today(), through = addDays(t, 13), followed = followedAthletes();
  const ids = new Set(followed.map(a => a.id));
  const knownSessions = (typeof exportedSessions === "function" ? exportedSessions() : [])
    .filter(s => t <= s.day && s.day <= through && s.athletes.some(a => ids.has(a.id)));
  // Completed known appearances must not return through an older nextDate fallback.
  const represented = new Set(knownSessions.flatMap(s => s.athletes.filter(a => ids.has(a.id)).map(a => `${a.id}|${s.day}`)));
  const competitions = new Set(knownSessions.map(s => s.comp.id));
  const sessions = knownSessions.filter(s => ["before", "competing"].includes(sessionState(s, s.day)));
  const appearances = sessions.flatMap(s => s.athletes.filter(a => ids.has(a.id)).map(a => ({
    k: `up|s|${s.comp.id}|${s.day}|${a.id}|${s.phase}|${s.startUtc || ""}`, d: s.day, session: true, startUtc: s.startUtc,
    chip: s.day === t ? statusChip(sessionState(s, s.day)) : "",
    html: `<a href="#day-${esc(s.day)}">${esc(a.name)}</a><small>${esc(sportName(s.sportId))} · ${compLinkOr(s.comp)}${s.phase ? ` · ${esc(s.phase)}` : ""}${safeUrl(s.source) ? ` · ${linkOut(s.source)}` : ""}</small>`,
  })));
  const athletes = followed.filter(a => isDate(a.nextDate) && a.nextDate >= t && !represented.has(`${a.id}|${a.nextDate}`))
    .map(a => ({k: `up|a|${a.id}`, d: a.nextDate, chip: a.nextDate === t ? statusChip("competing") : "",
      html: `<a href="#a-${esc(a.id)}">${esc(a.name)}</a><small>${esc(sportName(a.sportId))}${a.next ? ` · ${nextCompFact(a)}` : ""}</small>`}));
  const comps = upcoming().filter(c => S.followSports.has(c.sportId) && !competitions.has(c.id))
    .map(c => ({k: `up|c|${c.id}`, d: c.start, chip: c.start <= t ? `<span class="pill s-live">מתקיימת עכשיו</span>` : "",
      html: `<a href="#sport-${esc(c.sportId)}">${esc(sportName(c.sportId))}</a> · ${compLinkOr(c)}<small>${esc(c.location)}</small>`}));
  return [...appearances, ...athletes, ...comps].sort((x, y) => x.d.localeCompare(y.d) || byStart(x.startUtc, y.startUtc));
}

const FOLLOW_UPCOMING_ROWS = 5;
let renderedFollowingUpcoming = "";
const followingUpcomingMarks = new Map();

function followingUpcomingContent(clockOnly = false){
  const next = followUpcoming(), more = next.slice(FOLLOW_UPCOMING_ROWS);
  const row = x => {
      const mark = clockOnly ? followingUpcomingMarks.get(x.k) || "" : rowMark(x.k, x.d + x.html);
      if (!clockOnly) followingUpcomingMarks.set(x.k, mark);
      const time = x.session ? `<br>${isUtc(x.startUtc) ? timeTag(x.startUtc, hhmm(x.startUtc)) : "השעה טרם פורסמה"}` : "";
      return `<li><span class="d">${fmtShort(x.d)}${time}</span><span class="t">${x.html}${mark}</span><span>${x.chip}</span></li>`;
  };
  return next.length ? `<section class="panel" aria-labelledby="nextH"><h2 id="nextH">הבא בתור במעקב שלי</h2>
    <ul class="rows">${next.slice(0, FOLLOW_UPCOMING_ROWS).map(row).join("")}</ul>
    ${more.length ? `<details><summary id="followingUpcomingMore">${more.length === 1 ? "עוד פריט אחד במעקב שלי" : `עוד ${more.length} פריטים במעקב שלי`}</summary><ul class="rows">${more.map(row).join("")}</ul></details>` : ""}</section>` : "";
}

function refreshFollowingUpcoming(){
  const panel = $("followingUpcoming");
  if (!panel) return;
  const html = followingUpcomingContent(true);
  if (html === renderedFollowingUpcoming) return;
  const active = document.activeElement, key = panel.contains?.(active) ? focusKey(active) : null, y = window.scrollY;
  const open = [...panel.querySelectorAll("details")].map((d, i) => d.open ? i : -1).filter(i => i >= 0);
  if (key?.sel) key.idx = Math.max(0, [...panel.querySelectorAll(key.sel)].indexOf(active));
  panel.innerHTML = html;
  renderedFollowingUpcoming = html;
  const details = [...panel.querySelectorAll("details")];
  open.forEach(i => { if (details[i]) details[i].open = true; });
  if (key) {
    const matches = key.sel ? [...panel.querySelectorAll(key.sel)] : [];
    const again = key.id ? panel.querySelector(attrSel("id", key.id)) : matches[key.idx] || matches[0];
    (again || panel).focus({preventScroll: true});
  }
  if (typeof y === "number") scrollTo({top: y, behavior: "auto"});
}

function viewFollowing(tab = ""){
  if (tab && tab !== "sports") return notFound();
  // Opening the page is the "visit": the badge clears, and the feed keeps showing what was new on arrival.
  badgeSince = new Date().toISOString();
  store.set("la28.followingSeen", badgeSince);
  store.set("la28.followingShown", Object.fromEntries(followedAthletes().map(a => [a.id, shownOf(a)])));
  const athletes = S.athletes.filter(a => S.follows.has(a.id)).sort((a, b) => heCmp(a.name, b.name));
  const sports = S.sports.filter(s => S.followSports.has(s.id)).sort((a, b) => heCmp(a.he, b.he));
  const head = `<h1 tabindex="-1">במעקב שלי</h1>
  <nav class="chips" aria-label="סוג המעקב">
    <a href="#following" ${tab ? "" : `aria-current="page"`}>ספורטאים ונבחרות (${athletes.length})</a>
    <a href="#following-sports" ${tab ? `aria-current="page"` : ""}>ענפים (${sports.length})</a></nav>`;
  const foot = `<p class="foot">המעקב נשמר רק בדפדפן הזה, בלי חשבון.</p>`;
  const todayLink = typeof viewDay === "function" ? `<a href="#today">היום</a>` : "היום";
  // Replaces `foot`, whose limit line it already says.
  const empty = `<div class="empty">
    <p><b>מה מקבלים:</b> תג עם מספר השינויים מאז הביקור הקודם, רשימת עדכונים, ומי שבמעקב שלך מופיעים ראשונים בדף ${todayLink}.</p>
    <p><b>איך:</b> לחצו על ☆ בדף של ספורטאי/ת, נבחרת או ענף.</p>
    <p><b>שימו לב:</b> המעקב נשמר רק בדפדפן הזה, בלי חשבון.</p></div>`;
  const emptyTab = tab ? `<div class="empty"><p>עוד אין ענפים במעקב. לחצו על ☆ בדף של ענף כדי לעקוב.</p></div>`
    : `<div class="empty"><p>עוד אין ספורטאים או נבחרות במעקב. לחצו על ☆ בדף של ספורטאי/ת או נבחרת כדי לעקוב.</p></div>`;
  if (!athletes.length && !sports.length) {
    const t = today(), seen = new Set(), picks = [];
    for (const g of closestGroups(todayRows(), t)) for (const {as} of g.items) for (const a of as) if (!seen.has(a.id) && picks.length < 3) { seen.add(a.id); picks.push(a); }
    return `${head}${empty}
    ${picks.length ? `<section class="panel"><h2>הצעות למעקב</h2><div class="cards">${picks.map(athleteCard).join("")}</div></section>` : ""}`;
  }
  const feed = followFeed(followSeenAtLoad);
  followingUpcomingMarks.clear();
  renderedFollowingUpcoming = followingUpcomingContent();
  return `${head}
  <section class="panel" aria-labelledby="feedH">
    <h2 id="feedH">מאז הביקור הקודם (${feed.length})</h2>
    ${feed.length ? `<ul class="rows">${feed.map(followingFeedRow).join("")}</ul>`
      : `<p class="muted">${followSeenAtLoad ? "אין עדכונים חדשים מאז הביקור הקודם." : "עדכונים על מי שבמעקב שלך יופיעו כאן מהביקור הבא."}</p>`}
  </section>
  <div id="followingUpcoming" tabindex="-1">${renderedFollowingUpcoming}</div>
  ${tab ? (sports.length ? `<ul class="sports">${sports.map(s => { const ws = winStatus(s.window); return `<li><a class="sport" href="#sport-${esc(s.id)}">
      <span class="top"><h2>${esc(s.he)}</h2>${ws ? `<span class="pill ${ws[0]}">חלון העפלה ${ws[1]}</span>` : ""}</span>${stageBar(athletesOf(s.id), true).html}
      ${quotaCardSummary(s.id)}<span class="meta">${athletesOf(s.id).length} ברשימה</span></a></li>`; }).join("")}</ul>`
      : emptyTab)
    : (athletes.length ? `<div class="cards">${athletes.map(athleteCard).join("")}</div>`
      : emptyTab)}
  ${foot}`;
}

// Called by route() on every render: the sport page's follow button and the nav badge live here, so app.js only
// needs the router lines.
function followingDecorate(h, html){
  if (h.startsWith("sport-") && sportById(h.slice(6))) {
    const id = h.slice(6), on = S.followSports.has(id), he = esc(sportName(id));
    html = html.replace("</h1>", `</h1><button class="btn ghost follow" data-follow-sport="${esc(id)}" aria-pressed="${on}">${on ? `<span aria-hidden="true">★</span> הענף<span class="sr"> ${he}</span> במעקב שלך` : `<span aria-hidden="true">☆</span> מעקב אחרי הענף<span class="sr"> ${he}</span>`}</button>`);
  }
  if (h === "home") html = html.replace("<h2>במעקב שלי</h2>", `<h2>במעקב שלי</h2><a href="#following">לדף המעקב</a>`);
  // The visible badge is aria-hidden; screen readers get "מעקב, N עדכונים חדשים" from the link text.
  const n = followFeed(badgeSince).length, badge = $("followBadge"), sr = $("followBadgeSr");
  if (badge) { badge.hidden = !n; badge.textContent = n > 9 ? "9+" : String(n); }
  if (sr) sr.textContent = !n ? "" : n === 1 ? ", עדכון חדש אחד" : `, ${n} עדכונים חדשים`;
  return html;
}

document.addEventListener("click", e => {
  const t = e.target.closest?.("[data-follow-sport]");
  if (!t) return;
  toggleFollowSport(t.dataset.followSport);
  route();
  $("view").querySelector("[data-follow-sport]")?.focus();
});
