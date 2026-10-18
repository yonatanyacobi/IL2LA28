// "Following" (#following, #following-sports; docs/design/daily-and-following.md §2): followed athletes and
// sports, and what changed since the viewer last opened this page. Loaded after app.js; uses its helpers and
// state. Per-viewer only (localStorage via store, which already wraps every access in try/catch).
"use strict";

const FEED_MAX = 20;
// Baseline for "since your last visit to #following". A first visit sets it silently, so nothing is "new".
const followSeenAtLoad = store.get("la28.followingSeen", null);
// What the viewer saw of each followed record at that visit, so an updatedAt bump that changes nothing visible
// (a source link, a verification stamp) doesn't count as news.
const SHOWN_FIELDS = ["name", "event", "stage", "rank", "next", "nextDate"];
const shownOf = a => SHOWN_FIELDS.map(k => str(a[k])).join("\u241f");
const shownAtLoad = store.get("la28.followingShown", {});
let badgeSince = followSeenAtLoad;
S.followSports = new Set(store.get("la28.followSports", []));

function toggleFollowSport(id){
  S.followSports.has(id) ? S.followSports.delete(id) : S.followSports.add(id);
  saveFollows("la28.followSports", [...S.followSports]);
}

const followedAthletes = () => S.athletes.filter(a => S.follows.has(a.id) || S.followSports.has(a.sportId));

// History entries of followed athletes (or athletes in followed sports) newer than `since`. History is dated by
// day only, so an entry on the day of the last visit counts when its record changed after that visit.
// A record that changed without a new history entry (most daily updates, until results land) still gets one
// "הפרטים עודכנו" row, dated by updatedAt.
function followFeed(since){
  if (!since) return [];
  const day = since.slice(0, 10);
  return followedAthletes().flatMap(a => {
    const items = (Array.isArray(a.history) ? a.history : [])
      .filter(h => isDate(h.at) && (h.at > day || (h.at === day && str(a.updatedAt) > since))).map(h => ({a, h}));
    const at = str(a.updatedAt).slice(0, 10), was = shownAtLoad[a.id];
    const changed = str(a.updatedAt) > since && isDate(at) && was !== undefined && was !== shownOf(a);
    return items.length || !changed ? items : [{a, h: {at, text: "הפרטים עודכנו"}}];
  }).sort((x, y) => y.h.at.localeCompare(x.h.at) || heCmp(x.a.name, y.a.name)).slice(0, FEED_MAX);
}

const compLinkOr = c => typeof compLink === "function" ? compLink(c, esc(c.name)) : esc(c.name);

function followUpcoming(){
  const t = today();
  const athletes = followedAthletes().filter(a => isDate(a.nextDate) && a.nextDate >= t)
    .map(a => ({d: a.nextDate, chip: a.nextDate === t ? statusChip("competing") : "",
      html: `<a href="#a-${esc(a.id)}">${esc(a.name)}</a><small>${esc(sportName(a.sportId))}${a.next ? ` · ${esc(a.next)}` : ""}</small>`}));
  const comps = upcoming().filter(c => S.followSports.has(c.sportId))
    .map(c => ({d: c.start, chip: c.start <= t ? `<span class="now">מתקיימת עכשיו</span>` : "",
      html: `<a href="#sport-${esc(c.sportId)}">${esc(sportName(c.sportId))}</a> · ${compLinkOr(c)}<small>${esc(c.location)}</small>`}));
  return [...athletes, ...comps].sort((x, y) => x.d.localeCompare(y.d)).slice(0, 5);
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
  const empty = `<div class="empty"><p>עוד אין כאן אף אחד. לחצו על ☆ בדף של ספורטאי/ת, נבחרת או ענף כדי לעקוב.</p></div>`;
  const emptyTab = tab ? `<div class="empty"><p>עוד אין ענפים במעקב. לחצו על ☆ בדף של ענף כדי לעקוב.</p></div>`
    : `<div class="empty"><p>עוד אין ספורטאים או נבחרות במעקב. לחצו על ☆ בדף של ספורטאי/ת או נבחרת כדי לעקוב.</p></div>`;
  if (!athletes.length && !sports.length) {
    const t = today(), seen = new Set(), picks = [];
    for (const g of closestGroups(todayRows(), t)) for (const {as} of g.items) for (const a of as) if (!seen.has(a.id) && picks.length < 3) { seen.add(a.id); picks.push(a); }
    return `${head}${empty}
    ${picks.length ? `<section class="panel"><h2>הצעות למעקב</h2><div class="cards">${picks.map(athleteCard).join("")}</div></section>` : ""}${foot}`;
  }
  const feed = followFeed(followSeenAtLoad), next = followUpcoming();
  return `${head}
  <section class="panel" aria-labelledby="feedH">
    <h2 id="feedH">מאז הביקור הקודם (${feed.length})</h2>
    ${feed.length ? `<ul class="rows">${feed.map(({a, h}) => `<li><span class="d">${fmt(h.at)}</span>
      <span class="t"><a href="#a-${esc(a.id)}">${esc(a.name)}</a><small>${esc(h.text)}${safeUrl(h.source) ? ` · ${linkOut(h.source)}` : ""}</small></span><span></span></li>`).join("")}</ul>`
      : `<p class="muted">${followSeenAtLoad ? "אין עדכונים חדשים מאז הביקור הקודם." : "עדכונים על מי שבמעקב שלך יופיעו כאן מהביקור הבא."}</p>`}
  </section>
  ${next.length ? `<section class="panel" aria-labelledby="nextH"><h2 id="nextH">הבא בתור במעקב שלי</h2>
    <ul class="rows">${next.map(x => `<li><span class="d">${fmtShort(x.d)}</span><span class="t">${x.html}</span><span>${x.chip}</span></li>`).join("")}</ul></section>` : ""}
  ${tab ? (sports.length ? `<ul class="sports">${sports.map(s => { const ws = winStatus(s.window); return `<li><a class="sport" href="#sport-${esc(s.id)}">
      <span class="top"><h2>${esc(s.he)}</h2>${ws ? `<span class="pill ${ws[0]}">חלון העפלה ${ws[1]}</span>` : ""}</span>${stageBar(athletesOf(s.id), true).html}
      ${quotaCardSummary(s.id)}<span class="meta">${athletesOf(s.id).length} במעקב</span></a></li>`; }).join("")}</ul>`
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
