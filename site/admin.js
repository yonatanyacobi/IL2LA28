// Editors-only data-quality dashboard (#admin, #admin-<check>[-<sportId>]).
// Loaded after app.js and relies on its globals (S, esc, route helpers); the router only calls it when S.isAdmin && S.live.
"use strict";

const RUN_MAX_AGE_H = 36, RUN_SOURCES_SHOWN = 8;
const ADM = {runs: [], runsState: "idle"};   // idle | loading | ready | error

const CHECKS = {
  unverified: {label: "לא נבדקו ידנית (או עודכנו מאז)", test: a => trustOf(a) !== "ok",
    why: a => trustOf(a) === "stale" ? "עודכן מאז הבדיקה הידנית" : "לא נבדק/ה ידנית"},
  stale: {label: "לא עודכנו יותר מ־30 יום", test: a => !isDate(str(a.updatedAt).slice(0, 10)) || daysSince(a.updatedAt) > 30,
    why: a => isDate(str(a.updatedAt).slice(0, 10)) ? "עודכן " + fmt(str(a.updatedAt).slice(0, 10)) : "אין תאריך עדכון"},
  norank: {label: "חסר דירוג", test: a => !str(a.rank).trim(), why: () => "אין דירוג או הישג"},
  nonext: {label: "אין תחרות הבאה (או שעברה)", test: a => !isDate(a.nextDate) || a.nextDate < today(),
    why: a => isDate(a.nextDate) ? "התחרות הבאה עברה: " + fmt(a.nextDate) : "אין תאריך לתחרות הבאה"},
};

// Lazy and once: the runs collection is only needed by editors who open the dashboard.
function subscribeRuns(){
  if (ADM.runsState !== "idle" || !S.db) return;
  ADM.runsState = "loading";
  const onAdmin = () => currentRoute().startsWith("admin");
  try {
    S.db.collection("runs").orderBy("started", "desc").limit(7).onSnapshot(snap => {
      ADM.runs = snap.docs.map(d => ({id: d.id, ...d.data()}));
      ADM.runsState = "ready";
      if (onAdmin()) refresh();
    }, () => { ADM.runsState = "error"; if (onAdmin()) refresh(); });
  } catch { ADM.runsState = "error"; }
}

const fmtTs = ts => { const d = new Date(str(ts)); return str(ts) && !isNaN(d) ? d.toLocaleString("he-IL", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"}) : "—"; };
const countOf = v => Array.isArray(v) ? v.length : (Number(v) || 0);
const errList = v => (Array.isArray(v) ? v : v ? [v] : []).map(e => typeof e === "string" ? e : JSON.stringify(e)).filter(Boolean);
const RUN_STATUS = {done: "הסתיימה", started: "רצה / נתקעה", failed: "נכשלה"};

function runPanel(){
  if (ADM.runsState === "error") return `<section class="panel adm-alert"><h2>הריצה היומית</h2><p>לא הצלחנו לקרוא את יומן הריצות.</p></section>`;
  if (ADM.runsState !== "ready") return `<section class="panel"><h2>הריצה היומית</h2><p class="muted">טוען…</p></section>`;
  const r = ADM.runs[0];
  if (!r) return `<section class="panel adm-alert"><h2>הריצה היומית</h2><p>אין ריצות מתועדות.</p></section>`;
  const hours = daysSince(r.started) * 24;
  const warns = [
    !(hours <= RUN_MAX_AGE_H) && `הריצה האחרונה התחילה לפני יותר מ־${RUN_MAX_AGE_H} שעות.`,
    r.status !== "done" && `סטטוס הריצה האחרונה: ${esc(RUN_STATUS[r.status] || r.status || "לא ידוע")}.`,
    r.published !== true && "הנתונים הציבוריים לא פורסמו בריצה האחרונה.",
  ].filter(Boolean);
  const errs = errList(r.errors);
  // Job reminders (e.g. "לעדכן quotas.json: …"): action items for editors, not failures.
  const todo = errList(r.warnings);
  const changes = errList(r.changes);
  const sources = (Array.isArray(r.sources) ? r.sources : []).filter(s => s && safeUrl(s.source));
  return `<section class="panel ${warns.length ? "adm-alert" : ""}">
    <div class="sec-head"><h2>הריצה היומית האחרונה</h2><span class="pill ${warns.length ? "bad" : todo.length ? "soon" : "open"}">${warns.length ? "דורש בדיקה" : todo.length ? "יש משימות" : "תקין"}</span></div>
    ${warns.length ? `<ul class="adm-warn">${warns.map(w => `<li>${w}</li>`).join("")}</ul>` : ""}
    ${todo.length ? `<div class="adm-todo" id="runWarnings"><h3>לטיפול מהריצה האחרונה (${todo.length})</h3>
      <ul>${todo.map(w => `<li>${esc(w)}</li>`).join("")}</ul></div>` : ""}
    <dl class="facts">
      <dt>ריצה</dt><dd>${esc(r.id)} · ${esc(RUN_STATUS[r.status] || r.status || "—")}</dd>
      <dt>הסתיימה</dt><dd>${fmtTs(r.ended)}</dd>
      <dt>פורסם</dt><dd>${r.published === true ? "כן" : "לא"}</dd>
      <dt>עדכונים / הצעות</dt><dd>${countOf(r.writes)} / ${countOf(r.proposals)}</dd>
      <dt>שגיאות</dt><dd>${errs.length ? `<ul class="adm-errs">${errs.map(e => `<li>${esc(e)}</li>`).join("")}</ul>` : "אין"}</dd>
      <dt>שינויים</dt><dd id="runChanges">${changes.length ? `<ul>${changes.map(c => `<li>${esc(c)}</li>`).join("")}</ul>` : "אין"}</dd>
      <dt>מקורות שנבדקו</dt><dd id="runSources">${sources.length ? `<ul>${sources.slice(0, RUN_SOURCES_SHOWN).map(s =>
        `<li>${linkOut(s.source, host(s.source))} · ${fmtTs(s.checkedAt)}${s.sportId ? ` · ${esc(sportName(s.sportId))}` : ""}</li>`).join("")}${
        sources.length > RUN_SOURCES_SHOWN ? `<li>ועוד ${sources.length - RUN_SOURCES_SHOWN}</li>` : ""}</ul>` : "לא תועדו"}</dd>
    </dl>
    ${ADM.runs.length > 1 ? `<div class="tbl"><table>
      <thead><tr><th scope="col">ריצה</th><th scope="col">סטטוס</th><th scope="col">הסתיימה</th><th scope="col">פורסם</th><th scope="col">עדכונים</th><th scope="col">שגיאות</th><th scope="col">משימות</th><th scope="col">שינויים</th></tr></thead>
      <tbody>${ADM.runs.map(x => `<tr><td>${esc(x.id)}</td><td>${esc(RUN_STATUS[x.status] || x.status || "—")}</td><td>${fmtTs(x.ended)}</td>
        <td>${x.published === true ? "כן" : "לא"}</td><td>${countOf(x.writes)}</td><td>${errList(x.errors).length}</td><td>${errList(x.warnings).length}</td><td>${errList(x.changes).length}</td></tr>`).join("")}</tbody>
    </table></div>` : ""}
  </section>`;
}

// quotas.json is hand-curated (data/quotas → job/build_quotas.py); nothing refreshes it, so editors get reminders here.
const QUOTA_MAX_AGE_D = 14, QUOTA_SOON_D = 3;
// Event over and the item not reviewed since its last day. Re-checked items that still name the past event are
// left alone: the reviewer kept them on purpose.
const uncheckedEnd = (q, t = today()) => { const end = quotaEventEnd(q); return q.nextQuotaEvent && end && end < t && checkedOf(q) <= end ? end : ""; };
const daysAgo = (end, t = today()) => dayNo(end, t) - 1;
function recheckCounts(t = today()){
  const ends = S.quotas.map(q => uncheckedEnd(q, t)).filter(Boolean);
  return {overdue: ends.filter(e => daysAgo(e, t) > AWAIT_DAYS).length, awaiting: ends.filter(e => daysAgo(e, t) <= AWAIT_DAYS).length};
}
function quotaHealthPanel(){
  const h = `<h2>בריאות נתוני המכסות</h2>`;
  if (!S.quotasLoaded) return `<section class="panel">${h}<p class="muted">טוען…</p></section>`;
  if (S.quotasError) return `<section class="panel adm-alert">${h}<p>quotas.json לא נטען או שאינו תקין.</p></section>`;
  if (!S.quotas.length) return `<section class="panel">${h}<p class="muted">אין פריטי מכסות מפורסמים.</p></section>`;
  const t = today(), soon = addDays(t, QUOTA_SOON_D), start = q => q.nextQuotaEvent?.start || "";
  const age = daysSince(S.quotasUpdatedAt);
  const evt = q => `${esc(q.nextQuotaEvent.name)} · ${fmt(start(q))}`;
  // Hebrew counts: 2 → יומיים, 3–10 → ימים, 11+ → יום.
  const ago = q => { const n = daysAgo(quotaEventEnd(q), t); return n === 1 ? "אתמול" : n === 2 ? "לפני יומיים" : `לפני ${n} ${n <= 10 ? "ימים" : "יום"}`; };
  const recheck = q => `<bdi>${esc(q.nextQuotaEvent.name)}</bdi> (${fmtRange(start(q), quotaEventEnd(q))}) · ${ago(q)} · בדיקה ידנית אחרונה: ${fmt(checkedOf(q))}`;
  const recheckFoot = `לעדכן את <span dir="ltr">data/quotas/quotas.json</span> (סטטוס, אירוע מכסה הבא, review.at) ולהריץ את <span dir="ltr">build_quotas.py</span>.`;
  const unchecked = S.quotas.filter(q => uncheckedEnd(q, t));
  const flags = [
    {key: "overdue", alert: true, label: `אירוע מכסה עבר לפני יותר מ־${AWAIT_DAYS} יום ולא נבדק מחדש`, pill: true, foot: recheckFoot, byEnd: true,
      items: unchecked.filter(q => daysAgo(quotaEventEnd(q), t) > AWAIT_DAYS), why: recheck},
    {key: "awaiting", alert: false, label: "בהמתנה לבדיקה אחרי אירוע מכסה", pill: true, foot: recheckFoot, byEnd: true,
      items: unchecked.filter(q => daysAgo(quotaEventEnd(q), t) <= AWAIT_DAYS), why: recheck},
    {key: "earned", alert: true, label: "„מכסה הושגה” בלי ספורטאי/ת בשלב מכסה ומעלה בענף",
      items: S.quotas.filter(q => q.israelStatus === "earned" && !athletesOf(q.sportId).some(a => stageOf(a) >= 2)), why: () => "לבדוק את הפריט או את שלב הספורטאי/ת"},
    {key: "soon", alert: false, label: `אירוע מכסה ב־${QUOTA_SOON_D} הימים הקרובים: לעדכן אחרי התחרות`,
      items: S.quotas.filter(q => start(q) >= t && start(q) <= soon), why: evt},
  ].filter(f => f.items.length);
  const stale = !(age <= QUOTA_MAX_AGE_D);
  const alert = stale || flags.some(f => f.alert);
  const key = (f, q) => f.byEnd ? quotaEventEnd(q) : start(q);   // recheck flags: oldest event end first
  const sorted = (f, list) => list.slice().sort((a, b) => key(f, a).localeCompare(key(f, b)) || heCmp(sportName(a.sportId), sportName(b.sportId)) || heCmp(a.event, b.event));
  return `<section class="panel ${alert ? "adm-alert" : ""}" id="quotaHealth">
    <div class="sec-head">${h}<span class="pill ${alert ? "bad" : flags.length ? "soon" : "open"}">${alert ? "דורש בדיקה" : flags.length ? "תזכורת" : "תקין"}</span></div>
    <p class="${stale ? "adm-bad" : "muted"}">${plural(S.quotas.length, "פריט אחד", "פריטים")} · quotas.json עודכן ${isDate(str(S.quotasUpdatedAt).slice(0, 10)) ? `ב־${fmt(str(S.quotasUpdatedAt).slice(0, 10))}` : "בתאריך לא ידוע"}${stale ? ` · ישן מ־${QUOTA_MAX_AGE_D} יום` : ""}</p>
    ${flags.map(f => `<div class="stack" data-flag="${f.key}"><h3 class="${f.alert ? "adm-bad" : ""}">${esc(f.label)} (${f.items.length})</h3>
      <ul class="rows">${sorted(f, f.items).map(q => `<li><span class="d"><a href="#sport-${esc(q.sportId)}">${esc(sportName(q.sportId))}</a></span>
        <span class="t"><bdi>${esc(q.event)}</bdi><small>${f.why(q)}</small></span><span>${f.pill ? quotaStatusPill(q.israelStatus) : ""}</span></li>`).join("")}</ul>
      ${f.foot ? `<p class="foot">${f.foot}</p>` : ""}</div>`).join("")}
  </section>`;
}

// Launch checks get their own #admin-<key> lists but no tile or per-sport column.
const LAUNCH_CHECKS = {
  nosource: {label: "בלי קישור למקור", test: a => !safeUrl(a.source), why: () => "אין מקור https"},
  noverified: {label: "בלי בדיקה ידנית (verifiedAt)", test: a => !a.verifiedAt, why: () => "לא נבדק/ה ידנית אף פעם"},
  pastnext: {label: "תאריך התחרות הבאה עבר", test: a => isDate(a.nextDate) && a.nextDate < today(), why: a => "התחרות הבאה: " + fmt(a.nextDate)},
};

function launchPanel(){
  const pend = S.proposals.filter(p => p.status === "pending").length;
  const unpub = S.quotasUnpublished;
  const n = k => S.athletes.filter(LAUNCH_CHECKS[k].test).length;
  const rows = [
    {num: pend, label: "הצעות ממתינות לאישור", fix: `<a href="#home">לתור האישורים</a>`},
    {num: unpub, label: "פריטי מכסות שלא פורסמו (ממתינים לבדיקת עובדות)",
      fix: unpub == null ? "לא ידוע: quotas.json באתר לא כולל את הספירה" : `<span dir="ltr">data/quotas/quotas.json</span> → <span dir="ltr">job/build_quotas.py</span>`},
    ...Object.keys(LAUNCH_CHECKS).map(k => ({num: n(k), label: `ספורטאים ונבחרות ${LAUNCH_CHECKS[k].label}`, fix: `<a href="#admin-${k}">לרשימה</a>`})),
  ];
  const open = rows.filter(r => r.num !== 0).length;
  return `<section class="panel" id="launch">
    <div class="sec-head"><h2>מוכנות להשקה</h2><span class="pill ${open ? "soon" : "open"}">${open ? (open === 1 ? "נושא פתוח אחד" : `${open} נושאים פתוחים`) : "מוכן"}</span></div>
    <ul class="rows">${rows.map(r => `<li><span class="d"><b class="digits">${r.num == null ? "?" : r.num}</b></span>
      <span class="t">${r.label}<small>${r.fix}</small></span><span></span></li>`).join("")}</ul>
  </section>`;
}

function admList(key, sportId){
  const c = CHECKS[key] || LAUNCH_CHECKS[key];
  if (!c || (sportId && !sportById(sportId))) return notFound();
  const list = S.athletes.filter(a => c.test(a) && (!sportId || a.sportId === sportId))
    .sort((a, b) => heCmp(sportName(a.sportId), sportName(b.sportId)) || heCmp(a.name, b.name));
  return `<p class="crumb"><a href="#admin">→ בקרה</a></p>
  <h1 tabindex="-1">${esc(c.label)}${sportId ? ` · ${esc(sportName(sportId))}` : ""} (${list.length})</h1>
  <section class="panel">${list.length ? `<ul class="rows">${list.map(a => `<li><span class="d">${esc(sportName(a.sportId))}</span>
    <span class="t"><a href="#a-${esc(a.id)}">${esc(a.name)}</a><small>${esc(c.why(a))}</small></span><span></span></li>`).join("")}</ul>`
    : `<p class="muted">אין רשומות כאלה.</p>`}</section>`;
}

// ---------- result night (docs/runbooks/result-night.md) ----------
const RUNBOOK_URL = "https://github.com/yonatanyacobi/IL2LA28/blob/main/docs/runbooks/result-night.md";
// Step text mirrors the runbook's numbered sections; ticks are a per-browser convenience only.
const RN_STEPS = [
  q => `אימות התוצאה הרשמית של ההתאחדות והחלטה: מכסה הושגה / זמני / לא הושגה · ${linkOut(q.source, "שיטת ההעפלה")}`,
  () => `עריכת המאסטר בלבד: <span dir="ltr">data/quotas/quotas.json</span> (status, note, source, nextQuotaEvent, review: unchecked, updatedAt)`,
  () => "בדיקת עובדות וחתימה (דנה): review ok / fixed",
  q => `רק אם הושגה: שינוי לשלב 2 („מכסה הושגה”) לספורטאים ולנבחרות · ${rnAthletes(q.sportId)} · <a href="#home">לתור האישורים</a>`,
  () => `בנייה: <code dir="ltr">python3 job/build_quotas.py data/quotas/quotas.json site/quotas.json</code>`,
  () => `בדיקה: <code dir="ltr">validate_data.py --quotas</code> מול data.json המפורסם, ואז הבדיקות`,
  () => "PR לראש הצוות, מיזוג",
  () => "פרסום quotas.json לארטיפקט (אחרי המיזוג)",
  q => `בדיקה באתר: <a href="#sport-${esc(q.sportId)}">דף הענף</a> · <a href="#quotas">תמונת המכסות</a> · <a href="#home">ראשי</a>`,
];
const rnAthletes = sid => {
  const list = athletesOf(sid).filter(a => stageOf(a) < 2).sort((a, b) => heCmp(a.name, b.name));
  const props = S.proposals.filter(p => p.status === "pending" && "stage" in (p.patch || {}) && S.athletes.some(a => a.id === p.target && a.sportId === sid)).length;
  return (list.length ? list.map(a => `<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`).join(", ") : "אין ספורטאים בשלב נמוך מ־2")
    + (props ? ` · <b>${props === 1 ? "הצעת שלב אחת ממתינה" : `${props} הצעות שלב ממתינות`}</b>` : "");
};
const rnKey = q => `la28.rn.${q.sportId}|${q.event}|${q.nextQuotaEvent.start}`;

// Quota events whose last day was yesterday or is today: the window in which results need handling.
function resultNightPanel(){
  const t = today(), y = addDays(t, -1);
  const items = S.quotas.filter(q => q.nextQuotaEvent && [y, t].includes(quotaEventEnd(q)))
    .sort((a, b) => quotaEventEnd(a).localeCompare(quotaEventEnd(b)) || heCmp(sportName(a.sportId), sportName(b.sportId)) || heCmp(a.event, b.event));
  const runbook = linkOut(RUNBOOK_URL, "מדריך ליל התוצאות");
  if (!items.length) return `<section class="panel" id="resultNight"><div class="sec-head"><h2>ליל תוצאות</h2>${runbook}</div>
    <p class="muted">אין אירועי מכסה שמסתיימים היום או אתמול.</p></section>`;
  return `<section class="panel adm-rn" id="resultNight">
    <div class="sec-head"><h2>ליל תוצאות (${items.length})</h2>${runbook}</div>
    <p class="foot">אין מכסה פומבית בלי מקור רשמי. „הושגה” עולה רק אחרי ששלב הספורטאים פורסם (שלב 4 לפני שלב 6).</p>
    ${items.map(q => { const done = store.get(rnKey(q), []); return `<details class="rn-item" ${done.length < RN_STEPS.length ? "open" : ""}>
      <summary>${esc(sportName(q.sportId))} · ${esc(q.event)} ${quotaStatusPill(q.israelStatus)}
        <small class="muted">${esc(q.nextQuotaEvent.name)} · ${quotaEventEnd(q) === t ? "מסתיים היום" : "הסתיים אתמול"} · ${done.length} מתוך ${RN_STEPS.length} שלבים</small></summary>
      <ol class="rn-steps">${RN_STEPS.map((f, i) => `<li><label class="chk"><input type="checkbox" data-rn="${esc(rnKey(q))}" data-step="${i}" ${done.includes(i) ? "checked" : ""}>
        <span>${f(q)}</span></label></li>`).join("")}</ol>
    </details>`; }).join("")}
  </section>`;
}

document.addEventListener("change", e => {
  const box = e.target;
  if (!box?.dataset?.rn) return;
  const i = Number(box.dataset.step), done = new Set(store.get(box.dataset.rn, []));
  box.checked ? done.add(i) : done.delete(i);
  store.set(box.dataset.rn, [...done].sort((a, b) => a - b));
});

function viewAdmin(sub){
  subscribeRuns();
  if (sub) { const [key, ...rest] = sub.split("-"); return admList(key, rest.join("-")); }
  const pend = S.proposals.filter(p => p.status === "pending").length;
  const n = k => S.athletes.filter(CHECKS[k].test).length;
  const tile = (href, num, label, hot = num > 0) => `<a class="adm-tile ${hot ? "hot" : ""}" href="${href}"><b class="digits">${num}</b><span>${esc(label)}</span></a>`;
  const cell = (k, sid, list) => { const v = list.filter(CHECKS[k].test).length; return `<td>${v ? `<a href="#admin-${k}-${esc(sid)}">${v}</a>` : "0"}</td>`; };
  const sports = S.sports.filter(s => athletesOf(s.id).length).sort((a, b) => heCmp(a.he, b.he));
  return `<h1 tabindex="-1">בקרת נתונים</h1>
  <p class="muted">לעורכים בלבד. ${plural(S.athletes.length, "רשומה פעילה אחת", "רשומות פעילות")}.</p>
  ${resultNightPanel()}
  ${runPanel()}
  ${launchPanel()}
  ${quotaHealthPanel()}
  <div class="adm-tiles">
    ${tile("#home", pend, "הצעות ממתינות לאישור")}
    ${(r => tile("#admin", r.overdue + r.awaiting, "אירועי מכסה שלא נבדקו מחדש", r.overdue > 0))(recheckCounts())}
    ${Object.keys(CHECKS).map(k => tile(`#admin-${k}`, n(k), CHECKS[k].label)).join("")}
  </div>
  <section class="panel">
    <h2>לפי ענף</h2>
    <div class="tbl"><table>
      <thead><tr><th scope="col">ענף</th><th scope="col">ספורטאים</th><th scope="col">חסר דירוג</th><th scope="col">אין תחרות הבאה</th><th scope="col">לא נבדקו ידנית</th></tr></thead>
      <tbody>${sports.map(s => { const list = athletesOf(s.id); return `<tr><td><a href="#sport-${esc(s.id)}">${esc(s.he)}</a></td><td>${list.length}</td>
        ${cell("norank", s.id, list)}${cell("nonext", s.id, list)}${cell("unverified", s.id, list)}</tr>`; }).join("")}</tbody>
    </table></div>
  </section>`;
}
