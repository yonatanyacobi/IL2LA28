// Editors-only data-quality dashboard (#admin, #admin-<check>[-<sportId>]).
// Loaded after app.js and relies on its globals (S, esc, route helpers); the router only calls it when S.isAdmin && S.live.
"use strict";

const RUN_MAX_AGE_H = 36;
const ADM = {runs: [], runsState: "idle"};   // idle | loading | ready | error

const CHECKS = {
  unverified: {label: "לא אומתו ידנית (או עודכנו מאז)", test: a => trustOf(a) !== "ok",
    why: a => trustOf(a) === "stale" ? "עודכן מאז הבדיקה הידנית" : "ללא אימות ידני"},
  stale: {label: "לא עודכנו מעל 30 יום", test: a => !isDate(str(a.updatedAt).slice(0, 10)) || daysSince(a.updatedAt) > 30,
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
    </dl>
    ${ADM.runs.length > 1 ? `<div class="tbl"><table>
      <thead><tr><th scope="col">ריצה</th><th scope="col">סטטוס</th><th scope="col">הסתיימה</th><th scope="col">פורסם</th><th scope="col">עדכונים</th><th scope="col">שגיאות</th><th scope="col">משימות</th></tr></thead>
      <tbody>${ADM.runs.map(x => `<tr><td>${esc(x.id)}</td><td>${esc(RUN_STATUS[x.status] || x.status || "—")}</td><td>${fmtTs(x.ended)}</td>
        <td>${x.published === true ? "כן" : "לא"}</td><td>${countOf(x.writes)}</td><td>${errList(x.errors).length}</td><td>${errList(x.warnings).length}</td></tr>`).join("")}</tbody>
    </table></div>` : ""}
  </section>`;
}

// quotas.json is hand-curated (data/quotas → job/build_quotas.py); nothing refreshes it, so editors get reminders here.
const QUOTA_MAX_AGE_D = 14, QUOTA_SOON_D = 3;
function quotaHealthPanel(){
  const h = `<h2>בריאות נתוני המכסות</h2>`;
  if (!S.quotasLoaded) return `<section class="panel">${h}<p class="muted">טוען…</p></section>`;
  if (S.quotasError) return `<section class="panel adm-alert">${h}<p>quotas.json לא נטען או שאינו תקין.</p></section>`;
  if (!S.quotas.length) return `<section class="panel">${h}<p class="muted">אין פריטי מכסות מפורסמים.</p></section>`;
  const t = today(), soon = addDays(t, QUOTA_SOON_D), start = q => q.nextQuotaEvent?.start || "";
  const age = daysSince(S.quotasUpdatedAt);
  const evt = q => `${esc(q.nextQuotaEvent.name)} · ${fmt(start(q))}`;
  const flags = [
    {key: "past", alert: true, label: "אירוע המכסה הבא כבר עבר", items: S.quotas.filter(q => start(q) && quotaEventEnd(q) < t), why: evt},
    {key: "earned", alert: true, label: "„מכסה הושגה” בלי ספורטאי/ת בשלב מכסה ומעלה בענף",
      items: S.quotas.filter(q => q.israelStatus === "earned" && !athletesOf(q.sportId).some(a => stageOf(a) >= 2)), why: () => "לבדוק את הפריט או את שלב הספורטאי/ת"},
    {key: "soon", alert: false, label: `אירוע מכסה ב־${QUOTA_SOON_D} הימים הקרובים: לעדכן אחרי התחרות`,
      items: S.quotas.filter(q => start(q) >= t && start(q) <= soon), why: evt},
  ].filter(f => f.items.length);
  const stale = !(age <= QUOTA_MAX_AGE_D);
  const alert = stale || flags.some(f => f.alert);
  const sorted = list => list.slice().sort((a, b) => start(a).localeCompare(start(b)) || heCmp(sportName(a.sportId), sportName(b.sportId)) || heCmp(a.event, b.event));
  return `<section class="panel ${alert ? "adm-alert" : ""}" id="quotaHealth">
    <div class="sec-head">${h}<span class="pill ${alert ? "bad" : flags.length ? "soon" : "open"}">${alert ? "דורש בדיקה" : flags.length ? "תזכורת" : "תקין"}</span></div>
    <p class="${stale ? "adm-bad" : "muted"}">${S.quotas.length} פריטים · quotas.json עודכן ${isDate(str(S.quotasUpdatedAt).slice(0, 10)) ? `ב־${fmt(str(S.quotasUpdatedAt).slice(0, 10))}` : "בתאריך לא ידוע"}${stale ? ` · ישן מ־${QUOTA_MAX_AGE_D} ימים` : ""}</p>
    ${flags.map(f => `<div class="stack" data-flag="${f.key}"><h3 class="${f.alert ? "adm-bad" : ""}">${esc(f.label)} (${f.items.length})</h3>
      <ul class="rows">${sorted(f.items).map(q => `<li><span class="d"><a href="#sport-${esc(q.sportId)}">${esc(sportName(q.sportId))}</a></span>
        <span class="t">${esc(q.event)}<small>${f.why(q)}</small></span><span></span></li>`).join("")}</ul></div>`).join("")}
  </section>`;
}

// Launch checks get their own #admin-<key> lists but no tile or per-sport column.
const LAUNCH_CHECKS = {
  nosource: {label: "בלי קישור למקור", test: a => !safeUrl(a.source), why: () => "אין מקור https"},
  noverified: {label: "בלי אימות ידני (verifiedAt)", test: a => !a.verifiedAt, why: () => "לא נבדק/ה ידנית אף פעם"},
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
    ...Object.keys(LAUNCH_CHECKS).map(k => ({num: n(k), label: `ספורטאים ${LAUNCH_CHECKS[k].label}`, fix: `<a href="#admin-${k}">לרשימה</a>`})),
  ];
  const open = rows.filter(r => r.num !== 0).length;
  return `<section class="panel" id="launch">
    <div class="sec-head"><h2>מוכנות להשקה</h2><span class="pill ${open ? "soon" : "open"}">${open ? `${open} נושאים פתוחים` : "מוכן"}</span></div>
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

function viewAdmin(sub){
  subscribeRuns();
  if (sub) { const [key, ...rest] = sub.split("-"); return admList(key, rest.join("-")); }
  const pend = S.proposals.filter(p => p.status === "pending").length;
  const n = k => S.athletes.filter(CHECKS[k].test).length;
  const tile = (href, num, label) => `<a class="adm-tile ${num ? "hot" : ""}" href="${href}"><b class="digits">${num}</b><span>${esc(label)}</span></a>`;
  const cell = (k, sid, list) => { const v = list.filter(CHECKS[k].test).length; return `<td>${v ? `<a href="#admin-${k}-${esc(sid)}">${v}</a>` : "0"}</td>`; };
  const sports = S.sports.filter(s => athletesOf(s.id).length).sort((a, b) => heCmp(a.he, b.he));
  return `<h1 tabindex="-1">בקרת נתונים</h1>
  <p class="muted">לעורכים בלבד. ${S.athletes.length} רשומות פעילות במאגר החי.</p>
  ${runPanel()}
  ${launchPanel()}
  ${quotaHealthPanel()}
  <div class="adm-tiles">
    ${tile("#home", pend, "הצעות ממתינות לאישור")}
    ${Object.keys(CHECKS).map(k => tile(`#admin-${k}`, n(k), CHECKS[k].label)).join("")}
  </div>
  <section class="panel">
    <h2>לפי ענף</h2>
    <div class="tbl"><table>
      <thead><tr><th scope="col">ענף</th><th scope="col">ספורטאים</th><th scope="col">חסר דירוג</th><th scope="col">אין תחרות הבאה</th><th scope="col">לא אומתו</th></tr></thead>
      <tbody>${sports.map(s => { const list = athletesOf(s.id); return `<tr><td><a href="#sport-${esc(s.id)}">${esc(s.he)}</a></td><td>${list.length}</td>
        ${cell("norank", s.id, list)}${cell("nonext", s.id, list)}${cell("unverified", s.id, list)}</tr>`; }).join("")}</tbody>
    </table></div>
  </section>`;
}
