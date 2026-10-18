// National quota overview (#quotas). Loaded after app.js; uses its quota helpers (QUOTA_STATUSES, quotaStatusPill) and loader state (S.quotas*).
"use strict";

function viewQuotas(){
  const head = `<p class="crumb"><a href="#sports">→ כל הענפים</a></p><h1 tabindex="-1">תמונת המכסות</h1>`;
  if (S.quotasError) return head + `<p class="muted">נתוני המכסות לא נטענו כרגע. שאר האתר מעודכן.</p>`;
  if (!S.quotasLoaded) return head + `<p class="muted">טוען נתוני מכסות…</p>`;
  const list = S.quotas.slice().sort((a, b) => heCmp(sportName(a.sportId), sportName(b.sportId)) || heCmp(a.event, b.event));
  if (!list.length) return head + `<p class="muted">עוד לא נאספו נתוני מכסות.</p>`;
  const n = quotaCounts(list);
  const next = list.filter(q => nxt(q))
    .sort((a, b) => a.nextQuotaEvent.start.localeCompare(b.nextQuotaEvent.start)).slice(0, 5);
  const waiting = list.map(q => [q, awaitingOf(q)]).filter(([, w]) => w).sort(([, x], [, y]) => y.end.localeCompare(x.end));
  const row = q => `<li><span class="d"><a href="#sport-${esc(q.sportId)}">${esc(sportName(q.sportId))}</a></span>
    <span class="t"><bdi>${esc(q.event)}</bdi>${q.israelNote ? `<small>${esc(q.israelNote)}</small>` : ""}</span>
    <span>${nxt(q) ? `<small class="muted">${fmtShort(q.nextQuotaEvent.start)}</small>` : ""}</span></li>`;
  const at = str(S.quotasUpdatedAt).slice(0, 10);
  return head + `
  <section class="panel" aria-label="סיכום">
    <p class="kpi">${QUOTA_STATUSES.map(k => `<b>${n[k]}</b> ${Q_LABEL[k][1]}`).join(" · ")}</p>
    <p class="foot">הספירה היא לפי מקצים, לא לפי ספורטאים. ברוב הענפים המכסה שייכת למדינה ולא לספורטאי/ת.${isDate(at) ? ` נכון ל־${fmt(at)}.` : ""}</p>
  </section>
  ${waiting.length ? `<section class="panel" aria-labelledby="qWaitH">
    <h2 id="qWaitH">בהמתנה לתוצאות</h2>
    <ul class="rows">${waiting.map(([q, w]) => `<li><span class="d">${fmtShort(w.end)}</span>
      <span class="t"><bdi>${esc(w.name)}</bdi><small><a href="#sport-${esc(q.sportId)}">${esc(sportName(q.sportId))}</a> · <bdi>${esc(q.event)}</bdi></small></span>
      <span>${quotaStatusPill(q.israelStatus)}</span></li>`).join("")}</ul>
  </section>` : ""}
  ${next.length ? `<section class="panel" aria-labelledby="qNextH">
    <h2 id="qNextH">אירועי המכסה הקרובים</h2>
    <ul class="rows">${next.map(q => `<li><span class="d">${fmt(q.nextQuotaEvent.start)}</span>
      <span class="t">${esc(q.nextQuotaEvent.name)}<small><a href="#sport-${esc(q.sportId)}">${esc(sportName(q.sportId))}</a> · <bdi>${esc(q.event)}</bdi></small>${stakesLine(q, "stakes", "small")}</span>
      <span>${quotaStatusPill(q.israelStatus)}</span></li>`).join("")}</ul>
  </section>` : ""}
  ${QUOTA_STATUSES.filter(k => n[k]).map(k => `<section class="panel" aria-labelledby="qH-${k}">
    <h2 id="qH-${k}">${quotaStatusPill(k)} <span class="muted">${n[k]}</span></h2>
    <ul class="rows">${list.filter(q => qStatus(q.israelStatus) === k).map(row).join("")}</ul>
  </section>`).join("")}`;
}
