// Standings vs. the quota line on #sport-<id> and the athlete page (docs/design/standings.md, #179).
// The line is a position on an official list, never a forecast: no copy here may turn a rank into a verdict.
// Loaded after app.js; app.js validates q.cutoff (cutoffOf) and calls standingsPanel() / standingsFact().
"use strict";

const ranked = a => Number.isInteger(a.rankNum) && a.rankNum >= 1;
// Raw rankNum orders the rows (not rankOf(), which hides stale ranks); stale ones are flagged instead.
const rankStale = a => !isDate(a.rankAsOf) || dayNo(a.rankAsOf, today()) - 1 > RANK_MAX_AGE_D;

function standingsGroups(q){
  const as = quotaAthletes(q);
  const onList = as.filter(a => ranked(a) && a.rankList === q.cutoff.list)
    .sort((x, y) => x.rankNum - y.rankNum || heCmp(x.name, y.name));
  return {onList, other: as.filter(a => ranked(a) && a.rankList !== q.cutoff.list), none: as.filter(a => !ranked(a))};
}

function standingsItem(q){
  const c = q.cutoff, t = today();
  const head = `<h3><bdi>${esc(q.event)}</bdi></h3>
    <p class="foot">${[linkOut(c.url, c.list), linkOut(q.source, "שיטת ההעפלה")].filter(Boolean).join(" · ")}</p>`;
  if (c.opens && t < c.opens) return head + `<p class="muted">תקופת הדירוג להעפלה נפתחת ב־${fmt(c.opens)}.</p>`;
  const {onList, other, none} = standingsGroups(q);
  const above = onList.filter(a => a.rankNum <= c.rank).length;
  const row = a => `<li><span class="d">${a.rankNum}</span>
    <span class="t">${S.follows.has(a.id) ? STAR + " " : ""}<a href="#a-${esc(a.id)}">${esc(a.name)}</a>${isDate(a.rankAsOf) ? ` · ${fmt(a.rankAsOf)}` : ""}<span class="sr">, ${a.rankNum <= c.rank ? "מעל קו המכסה" : "מתחת לקו המכסה"}</span></span>
    <span>${rankStale(a) ? `<span class="pill ended">דירוג מ־${isDate(a.rankAsOf) ? fmt(a.rankAsOf) : "תאריך לא ידוע"}</span>` : ""}</span></li>`;
  const line = `<li class="cutline" aria-hidden="true">קו המכסה: מקום ${c.rank}</li>`;
  const rows = onList.map(row);
  rows.splice(above, 0, line);
  return head + `<ol class="rows standings">${rows.join("")}</ol>
    ${other.length ? `<p class="muted">${other.map(a => `בדירוג אחר: <a href="#a-${esc(a.id)}">${esc(a.name)}</a>, מקום ${a.rankNum} ב־<bdi>${esc(a.rankList)}</bdi>`).join(" · ")}</p>` : ""}
    ${none.length ? `<p class="muted">ללא דירוג: ${none.map(a => `<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`).join(", ")}</p>` : ""}
    <p class="foot">הקו הוא מקום ברשימה, לא תחזית. ברוב השיטות כל מדינה יכולה לקבל לכל היותר מכסה אחת במקצה, ויש גם מסלולים יבשתיים. הדירוג הסופי נקבע ב־${fmt(c.final)}.</p>`;
}

function standingsPanel(sid){
  const items = quotasOf(sid).filter(q => q.cutoff);
  if (!items.length) return "";
  return `<section class="panel" aria-labelledby="standH"><h2 id="standH">דירוג מול קו המכסה</h2>
    ${items.map(standingsItem).join("")}</section>`;
}

// Athlete page: one fact per block the athlete is ranked in on the cutoff's own list.
function standingsFact(a){
  if (!ranked(a)) return "";
  return quotasOf(a.sportId).filter(q => q.cutoff && q.cutoff.list === a.rankList && quotaAthletes(q).includes(a))
    .map(q => `<dt>מול קו המכסה</dt><dd><a href="#sport-${esc(a.sportId)}">מקום ${a.rankNum} · הקו: מקום ${q.cutoff.rank}</a> · <bdi>${esc(q.cutoff.list)}</bdi>${isDate(a.rankAsOf) ? `, ${fmt(a.rankAsOf)}` : ""}</dd>`).join("");
}
