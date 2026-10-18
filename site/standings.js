// Standings vs. the quota line on #sport-<id> and the athlete page (docs/design/standings.md, #179).
// The line is a position on an official list, never a forecast: no copy here may turn a rank into a verdict.
// Loaded after app.js; app.js validates q.cutoff (cutoffOf) and calls standingsPanel() / standingsFact().
"use strict";

// PM on #218: rankNum is the world rank; an Olympic qualification list lives in olympicRank*. Standings use the
// Olympic rank and fall back to the world rank (the row then sits on that list, e.g. tennis' WTA list).
const rankOn = (n, list, asOf) => Number.isInteger(n) && n >= 1 ? {n, list: str(list), asOf} : null;
const ranksOf = a => [rankOn(a.olympicRankNum, a.olympicRankList, a.olympicRankAsOf), rankOn(a.rankNum, a.rankList, a.rankAsOf)].filter(Boolean);
// Raw numbers order the rows (not rankOf(), which hides stale ranks); stale ones are flagged instead.
const rankStale = r => !isDate(r.asOf) || dayNo(r.asOf, today()) - 1 > RANK_MAX_AGE_D;
const STANDINGS_CAVEAT = "הקו הוא מקום ברשימה, לא תחזית. ברוב השיטות כל מדינה יכולה לקבל לכל היותר מכסה אחת במקצה, ויש גם מסלולים יבשתיים.";

function standingsGroups(q){
  const placed = [], other = [], none = [];
  for (const a of quotaAthletes(q)) {
    const rs = ranksOf(a), r = rs.find(x => x.list === q.cutoff.list);
    r ? placed.push({a, r}) : rs.length ? other.push({a, r: rs[0]}) : none.push(a);
  }
  placed.sort((x, y) => x.r.n - y.r.n || heCmp(x.a.name, y.a.name));
  return {placed, other, none};
}

function standingsItem(q){
  const c = q.cutoff, t = today();
  const head = `<h3><bdi>${esc(q.event)}</bdi></h3>
    <p class="foot">${[linkOut(c.url, c.list), linkOut(q.source, "שיטת ההעפלה")].filter(Boolean).join(" · ")}</p>`;
  if (c.opens && t < c.opens) return head + `<p class="muted">תקופת הדירוג להעפלה נפתחת ב־${fmt(c.opens)}.</p>`;
  const {placed, other, none} = standingsGroups(q);
  const above = placed.filter(({r}) => r.n <= c.rank).length;
  // A stale rank shows its date in the pill only (UX QA).
  const row = ({a, r}) => `<li><span class="d">${r.n}</span>
    <span class="t">${S.follows.has(a.id) ? STAR + " " : ""}<a href="#a-${esc(a.id)}">${esc(a.name)}</a>${isDate(r.asOf) && !rankStale(r) ? ` · ${fmt(r.asOf)}` : ""}<span class="sr">, ${r.n <= c.rank ? "מעל קו המכסה" : "מתחת לקו המכסה"}</span></span>
    <span>${rankStale(r) && isDate(r.asOf) ? `<span class="pill ended">דירוג מ־${fmt(r.asOf)}</span>` : ""}</span></li>`;
  const rows = placed.map(row);
  rows.splice(above, 0, `<li class="cutline" aria-hidden="true">קו המכסה: מקום ${c.rank}</li>`);
  return head + `${placed.length ? `<ol class="rows standings">${rows.join("")}</ol>` : ""}
    ${other.length ? `<p class="muted">בדירוג אחר: ${other.map(({a, r}) => `<a href="#a-${esc(a.id)}">${esc(a.name)}</a>, מקום ${r.n} ב־<bdi>${esc(r.list)}</bdi>`).join(" · ")}</p>` : ""}
    ${none.length ? `<p class="muted">ללא דירוג: ${none.map(a => `<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`).join(", ")}</p>` : ""}
    <p class="foot">הדירוג הסופי נקבע ב־${fmt(c.final)}.</p>`;
}

function standingsPanel(sid){
  const items = quotasOf(sid).filter(q => q.cutoff);
  if (!items.length) return "";
  return `<section class="panel" aria-labelledby="standH"><h2 id="standH">דירוג מול קו המכסה</h2>
    ${items.map(standingsItem).join("")}
    <p class="foot">${STANDINGS_CAVEAT}</p></section>`;
}

// Athlete page: the Olympic qualification rank under the world one (PM on #218), then one fact per block the
// athlete is ranked in on the cutoff's own list.
function standingsFact(a){
  const o = rankOn(a.olympicRankNum, a.olympicRankList, a.olympicRankAsOf);
  const olympic = o ? `<dt>דירוג ההעפלה לאולימפיאדת לוס אנג׳לס 2028</dt><dd>${o.n} (<bdi>${esc(o.list)}</bdi>${isDate(o.asOf) ? `, נכון ל־${fmt(o.asOf)}` : ""})</dd>` : "";
  return olympic + quotasOf(a.sportId).map(q => [q, q.cutoff && quotaAthletes(q).includes(a) && ranksOf(a).find(r => r.list === q.cutoff.list)])
    .filter(([, r]) => r)
    .map(([q, r]) => `<dt>מול קו המכסה</dt><dd><a href="#sport-${esc(a.sportId)}">מקום ${r.n} · הקו: מקום ${q.cutoff.rank}</a> · <bdi>${esc(q.cutoff.list)}</bdi>${isDate(r.asOf) ? `, ${fmt(r.asOf)}` : ""}</dd>`).join("");
}
