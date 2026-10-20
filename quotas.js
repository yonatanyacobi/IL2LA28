// National quota overview (#quotas). Loaded after app.js; uses its quota helpers (QUOTA_STATUSES, quotaStatusPill) and loader state (S.quotas*).
"use strict";
let quotaSportFilter = "";
let quotaSearch = "";
let quotaFollowOnly = false;
const quotaSports = () => S.sports.filter(s => S.quotas.some(q => q.sportId === s.id)).sort((a, b) => heCmp(a.he, b.he));

function viewQuotas(){
  const head = `<p class="crumb"><a href="#sports"><span aria-hidden="true">→</span>&nbsp;כל הענפים</a></p><h1 tabindex="-1">תמונת המכסות</h1>`;
  if (S.quotasError) return head + `<p class="muted">נתוני המכסות לא נטענו כרגע. אפשר לרענן את הדף בעוד רגע.</p>`;
  if (!S.quotasLoaded) return head + `<p class="muted">טוען נתוני מכסות…</p>`;
  const all = S.quotas.slice().sort((a, b) => heCmp(sportName(a.sportId), sportName(b.sportId)) || heCmp(a.event, b.event));
  const sports = quotaSports();
  if (quotaSportFilter && !sports.some(s => s.id === quotaSportFilter)) quotaSportFilter = "";
  if (!all.length) return head + `<p class="muted">עוד לא נאספו נתוני מכסות.</p>`;
  const query = searchKey(quotaSearch);
  const list = all.filter(q => {
    const sport = sportById(q.sportId);
    return (!quotaSportFilter || q.sportId === quotaSportFilter)
      && (!quotaFollowOnly || S.followSports.has(q.sportId))
      && (!query || searchKey([q.event, sport?.he, sport?.en].map(str).join(" ")).includes(query));
  });
  const n = quotaCounts(list);
  const upcoming = new Map();
  for (const q of list.filter(q => nxt(q))) {
    const key = JSON.stringify([q.sportId, q.nextQuotaEvent.start, q.nextQuotaEvent.name]);
    if (!upcoming.has(key)) upcoming.set(key, []);
    upcoming.get(key).push(q);
  }
  const next = [...upcoming.values()]
    .sort((a, b) => a[0].nextQuotaEvent.start.localeCompare(b[0].nextQuotaEvent.start));
  const more = next.slice(5);
  const eventLink = q => {
    const event = q.nextQuotaEvent;
    const matches = S.comps.filter(c => c.sportId === q.sportId && c.start <= event.start && event.start <= (c.end || c.start)
      && str(c.name).trim() === str(event.name).trim());
    return matches.length === 1 ? compLink(matches[0], esc(event.name)) : esc(event.name);
  };
  const eventRow = items => { const q = items[0]; return `<li>
      <div class="q-top"><b>${eventLink(q)}</b><span>${fmt(q.nextQuotaEvent.start)}</span></div>
      <small><a href="#sport-${esc(q.sportId)}">${esc(sportName(q.sportId))}</a></small>
      <ul class="qlist">${items.map(item => `<li><div class="q-top"><b><bdi>${esc(item.event)}</bdi></b><span>${quotaStatusPill(item.israelStatus)}</span></div>${stakesLine(item, "stakes", "small")}</li>`).join("")}</ul>
    </li>`; };
  const waiting = list.map(q => [q, awaitingOf(q)]).filter(([, w]) => w).sort(([, x], [, y]) => y.end.localeCompare(x.end));
  const quotaEvidence = q => {
    const earned = qStatus(q.israelStatus) === "earned";
    const at = q.earnedAt;
    const valid = earned && isDate(at) && !isNaN(new Date(at + "T12:00:00")) && addDays(at, 0) === at && at <= today();
    const date = valid ? `<small>הושגה ב־${fmt(at)}</small>` : "";
    const source = linkOut(q.source, earned ? "מקור למכסה" : "מקור לפרטי המכסה");
    return date + (source ? `<small>${source}</small>` : "");
  };
  const row = q => `<li><span class="d"><a href="#sport-${esc(q.sportId)}">${esc(sportName(q.sportId))}</a></span>
    <span class="t"><bdi>${esc(q.event)}</bdi>${q.israelNote ? `<small>${esc(q.israelNote)}</small>` : ""}</span>
    <span>${quotaEvidence(q)}${nxt(q) ? `<small class="muted">${fmtShortY(q.nextQuotaEvent.start)}</small>` : ""}</span></li>`;
  const at = str(S.quotasUpdatedAt).slice(0, 10);
  return head + `
  <div class="toolbar"><label for="quotaSport">סינון מכסות לפי ענף</label>
    <select id="quotaSport"><option value=""${quotaSportFilter ? "" : " selected"}>כל הענפים</option>${sports.map(s => `<option value="${esc(s.id)}"${s.id === quotaSportFilter ? " selected" : ""}>${esc(s.he)}</option>`).join("")}</select>
    <label for="quotaSearch">חיפוש מקצה במכסות</label>
    <input type="search" id="quotaSearch" value="${esc(quotaSearch)}">
    <label class="chk"><input type="checkbox" id="quotaFollowOnly" ${quotaFollowOnly ? "checked" : ""}> רק ענפים שבמעקב שלי</label>
    ${quotaSportFilter || quotaSearch || quotaFollowOnly ? `<button class="btn ghost small" type="button" data-quota-reset>איפוס כל המסננים</button>` : ""}
  </div>
  <p class="muted" role="status">מציגים ${list.length} מתוך ${all.length} מקצים${quotaSportFilter ? ` בענף ${esc(sportName(quotaSportFilter))}${quotaFollowOnly ? " · לפי ענפי המעקב שלי" : ""}` : quotaFollowOnly ? " בענפים שבמעקב שלי" : " בכל הענפים"}.</p>
  ${!list.length ? `<p class="muted">${quotaFollowOnly && !S.followSports.size
    ? `אין ענפים במעקב שלך. <a href="#sports">לבחירת ענפים למעקב</a>`
    : "לא נמצאו מקצים שמתאימים לסינון. אפשר לאפס את המסננים כדי להציג את כל המקצים."}</p>` : ""}
  <section class="panel" aria-label="סיכום">
    <p class="kpi">${QUOTA_STATUSES.map(k => `<b>${n[k]}</b> ${Q_LABEL[k][1]}`).join(" · ")}</p>
    <p class="foot">הספירה היא לפי מקצים, לא לפי ספורטאים. ברוב הענפים המכסה שייכת למדינה ולא לספורטאי/ת.${isDate(at) ? ` נכון ל־${fmt(at)}.` : ""}</p>
  </section>
  ${waiting.length ? `<section class="panel" aria-labelledby="qWaitH">
    <h2 id="qWaitH">בהמתנה לתוצאות</h2>
    <ul class="rows">${waiting.map(([q, w]) => `<li><span class="d">${fmtShortY(w.end)}</span>
      <span class="t"><bdi>${esc(w.name)}</bdi><small><a href="#sport-${esc(q.sportId)}">${esc(sportName(q.sportId))}</a> · <bdi>${esc(q.event)}</bdi></small></span>
      <span>${quotaStatusPill(q.israelStatus)}</span></li>`).join("")}</ul>
  </section>` : ""}
  ${next.length ? `<section class="panel" aria-labelledby="qNextH">
    <h2 id="qNextH">אירועי המכסה הקרובים</h2>
    <ul class="qlist">${next.slice(0, 5).map(eventRow).join("")}</ul>
    ${more.length ? `<details><summary id="quotaNextMoreSummary">${more.length === 1 ? "עוד אירוע מכסה אחד" : `עוד ${more.length} אירועי מכסה`}</summary><ul class="qlist">${more.map(eventRow).join("")}</ul></details>` : ""}
  </section>` : ""}
  ${QUOTA_STATUSES.filter(k => n[k]).map(k => `<section class="panel" aria-labelledby="qH-${k}">
    <h2 id="qH-${k}">${quotaStatusPill(k)} <span class="muted">${n[k]}</span></h2>
    <ul class="rows">${list.filter(q => qStatus(q.israelStatus) === k).map(row).join("")}</ul>
  </section>`).join("")}`;
}

document.addEventListener("change", e => {
  if (e.target?.id !== "quotaSport" || currentRoute() !== "quotas") return;
  const id = e.target.value;
  if (id && !quotaSports().some(s => s.id === id)) return;
  quotaSportFilter = id;
  refresh();
});
document.addEventListener("input", e => {
  if (e.target?.id !== "quotaSearch" || currentRoute() !== "quotas") return;
  quotaSearch = e.target.value;
  refresh();
});
document.addEventListener("change", e => {
  if (e.target?.id !== "quotaFollowOnly" || currentRoute() !== "quotas") return;
  quotaFollowOnly = !!e.target.checked;
  refresh();
});
document.addEventListener("click", e => {
  if (!e.target.closest?.("[data-quota-reset]") || currentRoute() !== "quotas") return;
  quotaSportFilter = "";
  quotaSearch = "";
  quotaFollowOnly = false;
  refresh();
  $("quotaSport")?.focus({preventScroll: true});
});
