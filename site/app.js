// Public visitors read the static data.json snapshot (works signed-out, read-only by construction).
// Editors (canEdit) additionally get the live database, edit controls and the review queue.
"use strict";

// ---------- constants & helpers ----------
const STAGES = ["במעקב", "בחלון ההעפלה", "מכסה הושגה", "נבחר/ה לנבחרת"];
const OPENING = new Date("2028-07-14T00:00:00-07:00");
const PARIS_ATHLETES = 88;
const SITE_URL = "https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT";
const CONTACT_EMAIL = "yacobiyonatan@gmail.com";
const EDIT_FIELDS = ["name", "name_en", "sportId", "event", "stage", "rank", "next", "nextDate", "notes", "source"];
const HISTORY_MAX = 20;
const QUOTA_STATUSES = ["earned", "in-contention", "outside", "unknown"];

const $ = id => document.getElementById(id);
const str = v => typeof v === "string" ? v : (v == null ? "" : String(v));
const esc = s => str(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl = u => /^https:\/\//i.test(str(u)) ? str(u) : "";
const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(str(d));
const fmt = d => isDate(d) ? new Date(d + "T12:00:00").toLocaleDateString("he-IL", {day:"numeric", month:"short", year:"numeric"}) : "";
const fmtShort = d => isDate(d) ? new Date(d + "T12:00:00").toLocaleDateString("he-IL", {day:"numeric", month:"short"}) : "";
// Israel's calendar date, so "live"/"past" don't flip at UTC midnight.
const today = () => new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Jerusalem"}).format(new Date());
const addDays = (d, n) => new Date(new Date(d + "T12:00:00").getTime() + n * 864e5).toISOString().slice(0, 10);
const daysSince = iso => (Date.now() - new Date(str(iso))) / 864e5;
const stageOf = a => Math.min(3, Math.max(0, Number(a.stage) | 0));
const heCmp = (a, b) => str(a).localeCompare(str(b), "he");
const slug = s => str(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "מקור"; } };
const linkOut = (u, label = "מקור") => safeUrl(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(label)}<span class="sr"> (נפתח בחלון חדש)</span></a>` : "";

// Per-viewer conveniences only; the page must work when storage is blocked.
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ---------- state ----------
const S = {
  loaded: false, live: false, failed: false, liveLost: false, generatedAt: "", lastRun: "",
  sports: [], athletes: [], comps: [], changes: [], proposals: [],
  quotas: [], quotasUpdatedAt: "",   // empty when quotas.json is missing or bad: quota UI must not render
  db: null, uid: null, isAdmin: false,
  cal: {sport: "", qual: false, past: false},
  q: "",
  follows: new Set(store.get("la28.follows", [])),
  // Previous visit; a first visit sets the baseline silently, so nothing is marked new.
  seenBefore: store.get("la28.seen", null),
};
store.set("la28.seen", new Date().toISOString());

const sportById = id => S.sports.find(s => s.id === id);
const sportName = id => sportById(id)?.he || id;
const athletesOf = sid => S.athletes.filter(a => a.sportId === sid);
const quotasOf = sid => S.quotas.filter(q => q.sportId === sid);
const upcoming = () => S.comps.filter(c => (c.end || c.start) >= today()).sort((a, b) => a.start.localeCompare(b.start));
const upcomingIn = sid => upcoming().filter(c => c.sportId === sid);
const isNew = a => !!S.seenBefore && str(a.updatedAt) > S.seenBefore;
// Compared as instants: the job and the page write ISO strings with different precision.
const trustOf = a => { const v = Date.parse(str(a.verifiedAt)), u = Date.parse(str(a.updatedAt)); return isNaN(v) ? "auto" : isNaN(u) || v >= u ? "ok" : "stale"; };

// ---------- quotas (shared by #quotas, the sport page, #sports cards and home) ----------
// S.quotas is filled by the quotas.json loader; until then every quota fragment renders nothing.
const Q_ORDER = ["earned", "in-contention", "outside", "unknown"];
const Q_LABEL = {earned: ["✓", "מכסה הושגה"], "in-contention": ["◐", "במרוץ למכסה"],
                 outside: ["○", "מחוץ למכסות כרגע"], unknown: ["?", "אין מידע עדיין"]};
const qStatus = s => Q_LABEL[s] ? s : "unknown";
const quotaItems = () => Array.isArray(S.quotas) ? S.quotas : [];
const quotaCounts = list => Object.fromEntries(Q_ORDER.map(k => [k, list.filter(q => qStatus(q.israelStatus) === k).length]));
// Symbol + text so status never depends on colour; `text` overrides the label (e.g. "1 הושגה").
const quotaStatusPill = (status, text) => { const k = qStatus(status); return `<span class="pill q-${k}">${Q_LABEL[k][0]} ${esc(text ?? Q_LABEL[k][1])}</span>`; };

function quotaCardSummary(sid){
  const list = quotaItems().filter(q => q.sportId === sid);
  if (!list.length) return "";
  const n = quotaCounts(list), short = {earned: "הושגה", "in-contention": "במרוץ", outside: "מחוץ"};
  const shown = Q_ORDER.filter(k => k !== "unknown" && n[k]);
  return shown.length ? `<span class="qsum"><span class="sr">מכסות: </span>${shown.map(k => quotaStatusPill(k, `${n[k]} ${short[k]}`)).join("")}</span>`
    : `<span class="qsum">מכסות: אין מידע עדיין</span>`;
}

function quotaKpi(){
  const list = quotaItems();
  if (!list.length) return "";
  const n = quotaCounts(list), k = new Set(list.filter(q => ["earned", "in-contention"].includes(qStatus(q.israelStatus))).map(q => q.sportId)).size;
  const link = `<a href="#quotas">תמונת המכסות</a>`;
  return `<p class="kpi">${n.earned ? `<b>${n.earned}</b> מקצים עם מכסה לישראל · <b>${n["in-contention"]}</b> במרוץ למכסה · ב־${k} ענפים`
    : `טרם הושגו מכסות לישראל · <b>${n["in-contention"]}</b> מקצים במרוץ למכסה ב־${k} ענפים`} · ${link}</p>`;
}

function winStatus(w){
  if (!w || !isDate(w.from)) return null;
  const t = today();
  return t < w.from ? ["soon", "טרם נפתח"] : isDate(w.to) && t > w.to ? ["done", "נסגר"] : ["open", "פתוח"];
}

function toggleFollow(id){
  S.follows.has(id) ? S.follows.delete(id) : S.follows.add(id);
  store.set("la28.follows", [...S.follows]);
}

// ---------- shared fragments ----------
function stageBar(list, thin){
  const n = list.length || 1;
  const counts = STAGES.map((_, i) => list.filter(a => stageOf(a) === i).length);
  return {counts, html: `<div class="bar4 ${thin ? "thin" : ""}" role="img" aria-label="${esc(STAGES.map((s,i) => `${s}: ${counts[i]}`).join(", "))}">${
    counts.map((c, i) => c ? `<i class="s${i}" style="width:${(c / n * 100).toFixed(2)}%"></i>` : "").join("")}</div>`};
}

function trustChip(a){
  const t = trustOf(a), d = fmt(str(a.verifiedAt).slice(0, 10));
  return `<span class="trust ${t}">${t === "auto" ? "◌ איסוף אוטומטי" : t === "ok" ? `✓ נבדק ידנית ${d}` : `✓ נבדק ${d} · עודכן מאז`}</span>`;
}

function compRow(c, withSport){
  const t = today(), end = c.end || c.start, live = c.start <= t && end >= t, past = end < t;
  return `<div class="comp ${past ? "past" : ""}">
    <span class="when">${fmt(c.start)}${c.end && c.end !== c.start ? " – " + fmt(c.end) : ""}</span>
    <span class="what"><b>${withSport ? `<a href="#sport-${esc(c.sportId)}">${esc(sportName(c.sportId))}</a> · ` : ""}${esc(c.name)}</b>
      <span>${esc(c.location)}${c.notes ? " · " + esc(c.notes) : ""}${safeUrl(c.source) ? " · " + linkOut(c.source) : ""}</span></span>
    <span>${live ? `<span class="now">מתקיימת עכשיו</span>` : past ? `<span class="pill ended">הסתיימה</span>` : c.qualifying ? `<span class="pill open">העפלה</span>` : ""}</span>
  </div>`;
}

function athleteCard(a){
  const s = stageOf(a), fav = S.follows.has(a.id);
  return `<a class="card" href="#a-${esc(a.id)}">
    <span class="nm">${fav ? `<span class="star-on" aria-label="במעקב שלך">★</span> ` : ""}${esc(a.name)}${isNew(a) ? ` <span class="new">חדש</span>` : ""}</span>
    ${a.event ? `<span class="ev">${esc(a.event)}</span>` : ""}
    <span><span class="pill st${s}">${STAGES[s]}</span> ${trustChip(a)}</span>
    ${a.rank ? `<span class="ln"><span>דירוג או הישג: </span>${esc(a.rank)}</span>` : ""}
    ${a.next ? `<span class="ln"><span>התחרות הבאה: </span>${esc(a.next)}${isDate(a.nextDate) ? ` (${fmtShort(a.nextDate)})` : ""}</span>` : ""}
  </a>`;
}

function changeRow(c){
  const txt = esc(c.text);
  const body = c.athleteId && S.athletes.some(a => a.id === c.athleteId) ? `<a href="#a-${esc(c.athleteId)}">${txt}</a>` : txt;
  return `<li><span class="d">${fmt(str(c.at).slice(0, 10))}</span><span class="t">${body}</span><span></span></li>`;
}

// From the schedule, not live results: an athlete counts as competing on every day of a running
// competition in their sport whose dates contain their nextDate.
function competingToday(){
  const t = today();
  return S.athletes.flatMap(a => {
    if (!isDate(a.nextDate)) return [];
    const c = S.comps.find(c => c.sportId === a.sportId && c.start <= t && t <= (c.end || c.start)
      && c.start <= a.nextDate && a.nextDate <= (c.end || c.start));
    return c || a.nextDate === t ? [{a, comp: c ? c.name : a.next}] : [];
  }).sort((x, y) => heCmp(sportName(x.a.sportId), sportName(y.a.sportId)) || heCmp(x.a.name, y.a.name));
}

function todayStrip(){
  const list = competingToday();
  if (!list.length) return "";
  const ts = S.live ? S.lastRun : (S.generatedAt || S.lastRun);
  const when = ts ? new Date(ts).toLocaleString("he-IL", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"}) : "";
  return `<section class="panel today-strip">
    <h2>ישראלים מתחרים היום</h2>
    <p class="foot">${when ? `לפי הנתונים מ־${when}` : "לפי לוח התחרויות"}, תוצאות יתעדכנו בעדכון היומי</p>
    <ul class="rows">${list.map(({a, comp}) => `<li><span class="d">${esc(sportName(a.sportId))}</span>
      <span class="t"><a href="#a-${esc(a.id)}">${esc(a.name)}</a><small>${[a.event, comp].filter(Boolean).map(esc).join(" · ")}</small></span><span></span></li>`).join("")}</ul>
  </section>`;
}

// ---------- views ----------
function viewHome(){
  const {counts, html: bar} = stageBar(S.athletes);
  const quota = counts[2] + counts[3];
  const t = today(), soon = addDays(t, 14);
  const busy = S.athletes.filter(a => isDate(a.nextDate) && a.nextDate >= t && a.nextDate <= soon)
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate) || heCmp(a.name, b.name));
  const mine = S.athletes.filter(a => S.follows.has(a.id)).sort((a, b) => heCmp(a.name, b.name));
  const mineNew = mine.filter(isNew).length;
  const colors = ["var(--stage0)", "var(--blue)", "var(--sun)", "var(--ok)"];
  const verified = S.athletes.filter(a => trustOf(a) !== "auto").length;
  return `
  <section class="hero">
    <div>
      <h1 tabindex="-1">הדרך ללוס אנג׳לס 28</h1>
      <p class="muted">מעקב אחרי מסלול ההעפלה של ספורטאיות וספורטאים ישראלים לאולימפיאדת לוס אנג׳לס, 14–30 ביולי 2028.<span class="tag">מעקב לא רשמי</span></p>
      ${freshness()}
    </div>
    <div class="count"><b class="digits" id="days">${daysLeft()}</b><span>ימים לטקס הפתיחה</span></div>
  </section>
  ${todayStrip()}
  ${reviewPanel()}
  <input class="search" id="q" type="search" placeholder="חיפוש ספורטאי/ת, נבחרת או ענף" aria-label="חיפוש" aria-describedby="qCount" value="${esc(S.q)}">
  <p class="sr" id="qCount" aria-live="polite"></p>
  <div id="results"></div>
  ${mine.length ? `<section class="panel">
      <div class="sec-head"><h2>הספורטאים שלי</h2>${mineNew ? `<span class="new">${mineNew} עודכנו מאז הביקור הקודם</span>` : ""}</div>
      <div class="cards">${mine.map(athleteCard).join("")}</div></section>`
    : `<p class="foot">טיפ: לחצו על ☆ בדף של ספורטאי/ת כדי לעקוב, והם יופיעו כאן. המעקב נשמר רק בדפדפן הזה.</p>`}
  <section class="panel" aria-label="התקדמות">
    <p class="kpi"><b>${S.athletes.length}</b> ספורטאים ונבחרות במעקב · <b>${counts[1]}</b> בחלון העפלה פתוח · <b>${quota}</b> עם מכסה · <b>${verified}</b> מתוך ${S.athletes.length} נבדקו ידנית</p>
    ${quotaKpi()}
    ${bar}
    <ul class="legend">${STAGES.map((s, i) => `<li><i style="background:${colors[i]}"></i>${s} <b>${counts[i]}</b></li>`).join("")}</ul>
    <p class="foot">${quota ? "" : "טרם הושגו מכסות. "}לשם השוואה: לפריז 2024 ישראל שלחה ${PARIS_ATHLETES} ספורטאים. נבחרת נספרת כאן כרשומה אחת.</p>
  </section>
  <div class="grid2">
    <section class="panel">
      <h2>ישראלים בפעולה ב־14 הימים הקרובים</h2>
      ${busy.length ? `<ul class="rows">${busy.map(a => `<li><span class="d">${fmtShort(a.nextDate)}</span>
        <span class="t"><a href="#a-${esc(a.id)}">${esc(a.name)}</a><small>${esc(sportName(a.sportId))} · ${esc(a.next)}</small></span><span></span></li>`).join("")}</ul>`
        : `<p class="muted">אין תחרויות ידועות של ספורטאים ישראלים בשבועיים הקרובים.</p>`}
    </section>
    <section class="panel">
      <div class="sec-head"><h2>מה התעדכן</h2><a href="#updates">כל העדכונים</a></div>
      ${S.changes.length ? `<ul class="rows">${S.changes.slice(0, 5).map(changeRow).join("")}</ul>` : `<p class="muted">עוד אין עדכונים.</p>`}
    </section>
  </div>
  <section class="panel">
    <div class="sec-head"><h2>תחרויות קרובות</h2><a href="#calendar">ללוח התחרויות</a></div>
    <div class="stack">${upcoming().slice(0, 6).map(c => compRow(c, true)).join("") || `<p class="muted">אין תחרויות קרובות במאגר.</p>`}</div>
  </section>`;
}

function renderResults(){
  const box = $("results");
  if (!box) return;
  const q = S.q.trim().toLowerCase();
  if (!q) { box.innerHTML = ""; $("qCount").textContent = ""; return; }
  const sports = S.sports.filter(s => (s.he + " " + s.en).toLowerCase().includes(q));
  const hits = S.athletes.filter(a => [a.name, a.name_en, a.event, sportName(a.sportId)].map(str).join(" ").toLowerCase().includes(q));
  $("qCount").textContent = `נמצאו ${hits.length} ספורטאים ו־${sports.length} ענפים`;
  box.innerHTML = `<section class="panel"><h2>תוצאות חיפוש</h2>
    ${sports.length ? `<div class="chips">${sports.map(s => `<a href="#sport-${esc(s.id)}">${esc(s.he)}</a>`).join("")}</div>` : ""}
    ${hits.length ? `<div class="cards">${hits.slice(0, 24).map(athleteCard).join("")}</div>` : `<p class="muted">לא נמצאו ספורטאים שמתאימים לחיפוש.</p>`}
  </section>`;
}

function viewSports(){
  const withA = S.sports.filter(s => athletesOf(s.id).length);
  const without = S.sports.filter(s => !athletesOf(s.id).length).sort((a, b) => heCmp(a.he, b.he));
  const nextStart = s => upcomingIn(s.id)[0]?.start || "9999";
  withA.sort((a, b) => nextStart(a).localeCompare(nextStart(b)) || heCmp(a.he, b.he));
  return `
  <h1 tabindex="-1">ענפים</h1>
  <p class="muted">${withA.length} ענפים עם ספורטאים ישראלים במעקב, לפי התחרות הקרובה.${quotaItems().length ? ` <a href="#quotas">תמונת המכסות</a>` : ""}</p>
  <ul class="sports">${withA.map(s => {
    const list = athletesOf(s.id), ws = winStatus(s.window), nc = upcomingIn(s.id)[0], fresh = list.filter(isNew).length;
    return `<li><a class="sport" href="#sport-${esc(s.id)}">
      <span class="top"><h2>${esc(s.he)}</h2>${ws ? `<span class="pill ${ws[0]}">חלון ${ws[1]}</span>` : ""}</span>
      ${stageBar(list, true).html}
      ${quotaCardSummary(s.id)}
      <span class="meta">${list.length} במעקב${fresh ? ` · <span class="new">${fresh} חדש</span>` : ""}${nc ? ` · התחרות הבאה: ${esc(nc.name)} (${fmtShort(nc.start)})` : ""}</span>
    </a></li>`;
  }).join("")}</ul>
  ${without.length ? `<section class="panel"><h2>ענפים בלי מתמודד ישראלי במעקב כרגע</h2>
    <div class="chips">${without.map(s => `<a href="#sport-${esc(s.id)}">${esc(s.he)}</a>`).join("")}</div></section>` : ""}`;
}

function viewSport(id){
  const s = sportById(id);
  if (!s) return notFound();
  const list = athletesOf(id).sort((a, b) => stageOf(b) - stageOf(a) || heCmp(a.event, b.event) || heCmp(a.name, b.name));
  const ws = winStatus(s.window), w = s.window;
  const comps = upcomingIn(id);
  return `
  <p class="crumb"><a href="#sports">← כל הענפים</a></p>
  <div class="sec-head"><h1 tabindex="-1">${esc(s.he)}</h1>${S.isAdmin ? `<button class="btn small" data-add="${esc(id)}">+ הוספת ספורטאי/ת</button>` : ""}</div>
  <section class="panel">
    <div class="sec-head"><h2>שיטת ההעפלה</h2>${ws ? `<span class="pill ${ws[0]}">חלון ${ws[1]}</span>` : ""}</div>
    ${w ? `<p class="muted">${fmt(w.from)} – ${isDate(w.to) ? fmt(w.to) : "מועד סיום טרם פורסם"}</p>
      ${w.summary ? `<p>${esc(w.summary)}</p>` : ""}${w.source ? `<p class="foot">${linkOut(w.source, "מערכת ההעפלה הרשמית")}</p>` : ""}`
      : `<p class="muted">עוד לא נאספו פרטים על שיטת ההעפלה בענף הזה.</p>`}
  </section>
  <section class="stack">
    <h2>${list.length ? `ספורטאים ונבחרות (${list.length})` : "ספורטאים ונבחרות"}</h2>
    ${list.length ? `<div class="cards">${list.map(athleteCard).join("")}</div>` : `<div class="empty">אין כרגע ספורטאים ישראלים במעקב בענף הזה.</div>`}
  </section>
  <section class="stack">
    <div class="sec-head"><h2>תחרויות קרובות בענף</h2>${comps.length > 5 ? `<a href="#calendar-${esc(id)}">כל ${comps.length} התחרויות</a>` : ""}</div>
    ${comps.slice(0, 5).map(c => compRow(c, false)).join("") || `<p class="muted">אין תחרויות קרובות במאגר.</p>`}
  </section>`;
}

function viewAthlete(id){
  const a = S.athletes.find(x => x.id === id);
  if (!a) return notFound();
  const s = stageOf(a), sp = sportById(a.sportId), fav = S.follows.has(id);
  const upd = str(a.updatedAt).slice(0, 10), old = upd && daysSince(a.updatedAt) > 30;
  const comps = upcomingIn(a.sportId).slice(0, 3);
  const hist = (Array.isArray(a.history) ? a.history : []).filter(h => isDate(h.at)).slice().reverse();
  const link = `${SITE_URL}#a-${id}`;
  return `
  <p class="crumb"><a href="#sport-${esc(a.sportId)}">← ${esc(sp?.he || "ענף")}</a></p>
  <div class="sec-head">
    <div><h1 tabindex="-1">${esc(a.name)}</h1>${a.name_en ? `<p class="muted" dir="ltr" style="text-align:right">${esc(a.name_en)}</p>` : ""}</div>
    <div class="actions">
      <button class="btn ghost follow" data-follow="${esc(id)}" aria-pressed="${fav}">${fav ? "★ במעקב שלך" : `☆ מעקב אחרי ${esc(a.name)}`}</button>
      ${S.isAdmin ? `<button class="btn small" data-edit="${esc(id)}">עריכה</button><button class="btn ghost small" data-verify="${esc(id)}">סימון כנבדק</button>` : ""}
    </div>
  </div>
  <section class="panel">
    <div class="track s${s}" aria-hidden="true">${STAGES.map((_, i) => `<i class="${i <= s ? "on" : ""}"></i>`).join("")}</div>
    <ol class="track-labels">${STAGES.map((x, i) => `<li ${i === s ? `class="cur" aria-current="step"` : ""}>${x}${i === s ? `<span class="sr"> (שלב נוכחי)</span>` : ""}</li>`).join("")}</ol>
    <dl class="facts">
      <dt>ענף</dt><dd><a href="#sport-${esc(a.sportId)}">${esc(sp?.he || a.sportId)}</a>${a.event ? ` · ${esc(a.event)}` : ""}</dd>
      ${a.rank ? `<dt>דירוג או הישג</dt><dd>${esc(a.rank)}</dd>` : ""}
      ${a.next ? `<dt>התחרות הבאה</dt><dd>${esc(a.next)}${isDate(a.nextDate) ? ` <span class="muted">(${fmt(a.nextDate)})</span>` : ""}</dd>` : ""}
      <dt>בדיקה</dt><dd>${trustChip(a)}</dd>
      ${upd ? `<dt>עודכן</dt><dd class="${old ? "old" : "muted"}">${fmt(upd)}${old ? " · לא עודכן מעל חודש" : ""}</dd>` : ""}
      ${safeUrl(a.source) ? `<dt>מקור</dt><dd>${linkOut(a.source, host(a.source))}</dd>` : ""}
    </dl>
    ${a.notes ? `<p>${esc(a.notes)}</p>` : ""}
  </section>
  <section class="panel">
    <h2>היסטוריה</h2>
    ${hist.length ? `<ol class="timeline">${hist.map(h => `<li class="k-${esc(h.kind)}"><span class="d">${fmt(h.at)}</span>
      <span>${esc(h.text)}${safeUrl(h.source) ? ` · ${linkOut(h.source)}` : ""}</span></li>`).join("")}</ol>`
      : `<p class="muted">עוד אין אירועים מתועדים.</p>`}
  </section>
  <section class="stack">
    <h2>תחרויות קרובות בענף</h2>
    ${comps.map(c => compRow(c, false)).join("") || `<p class="muted">אין תחרויות קרובות במאגר.</p>`}
  </section>
  <section class="panel">
    <h2>שיתוף</h2>
    <div class="share"><input id="shareUrl" readonly value="${esc(link)}" dir="ltr" aria-label="קישור לדף"><button class="btn ghost small" data-copy="shareUrl">העתקה</button></div>
    <p class="foot" id="copyMsg" aria-live="polite"></p>
  </section>
  ${reportBox(`טעות בדף: ${a.name}`, link)}`;
}

// Mail links often do nothing inside the artifact frame, so the address is always shown as copyable text too.
function reportBox(subject, link){
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent("קישור: " + link + "\n\nמה לא נכון ומה המקור הנכון:\n")}`;
  return `<section class="panel">
    <h2>מצאתם טעות?</h2>
    <p>שלחו מייל עם קישור לדף ועם מקור לנתון הנכון. כל תיקון נבדק לפני שהוא מתפרסם.</p>
    <div class="share"><input id="mailAddr" readonly value="${esc(CONTACT_EMAIL)}" dir="ltr" aria-label="כתובת לדיווח"><button class="btn ghost small" data-copy="mailAddr">העתקת הכתובת</button>
      <a class="btn ghost small" href="${esc(mailto)}">פתיחת מייל</a></div>
    <p class="foot" id="copyMsg2" aria-live="polite"></p>
  </section>`;
}

// The hash is the source of truth, so "#calendar" clears a filter left over from "#calendar-<id>".
function viewCalendar(sportFilter = ""){
  S.cal.sport = sportFilter;
  const t = today(), {sport, qual, past} = S.cal;
  const rows = S.comps.filter(c => (!sport || c.sportId === sport) && (!qual || c.qualifying) && (past || (c.end || c.start) >= t))
    .sort((a, b) => a.start.localeCompare(b.start));
  const months = {};
  rows.forEach(c => (months[c.start.slice(0, 7)] ??= []).push(c));
  const used = [...new Set(S.comps.map(c => c.sportId))].map(sportById).filter(Boolean).sort((a, b) => heCmp(a.he, b.he));
  const wins = S.sports.filter(s => s.window && isDate(s.window.from)).sort((a, b) => a.window.from.localeCompare(b.window.from));
  return `
  <h1 tabindex="-1">לוח תחרויות</h1>
  <div class="toolbar">
    <select id="cSport" aria-label="סינון לפי ענף"><option value="">כל הענפים</option>${used.map(s => `<option value="${esc(s.id)}" ${s.id === sport ? "selected" : ""}>${esc(s.he)}</option>`).join("")}</select>
    <label class="chk"><input type="checkbox" id="cQual" ${qual ? "checked" : ""}> רק תחרויות העפלה</label>
    <label class="chk"><input type="checkbox" id="cPast" ${past ? "checked" : ""}> כולל תחרויות שהסתיימו</label>
  </div>
  ${rows.length ? Object.keys(months).sort().map(m => `<section class="month">
      <h2>${new Date(m + "-15T12:00:00").toLocaleDateString("he-IL", {month:"long", year:"numeric"})} <span>${months[m].length}</span></h2>
      ${months[m].map(c => compRow(c, !sport)).join("")}</section>`).join("")
    : `<div class="empty">אין תחרויות שמתאימות לסינון.</div>`}
  <section class="panel">
    <h2>חלונות העפלה</h2>
    <div class="tbl"><table>
      <thead><tr><th scope="col">ענף</th><th scope="col">נפתח</th><th scope="col">נסגר</th><th scope="col">מצב</th></tr></thead>
      <tbody>${wins.map(s => { const ws = winStatus(s.window); return `<tr>
        <td><a href="#sport-${esc(s.id)}">${esc(s.he)}</a></td>
        <td>${fmt(s.window.from)}</td><td>${isDate(s.window.to) ? fmt(s.window.to) : "טרם פורסם"}</td>
        <td><span class="pill ${ws[0]}">${ws[1]}</span></td></tr>`; }).join("")}</tbody>
    </table></div>
  </section>`;
}

function viewUpdates(){
  return `<h1 tabindex="-1">מה התעדכן</h1>
  <section class="panel">${S.changes.length ? `<ul class="rows">${S.changes.map(changeRow).join("")}</ul>` : `<p class="muted">עוד אין עדכונים.</p>`}</section>
  <p class="foot">העדכונים נאספים פעם ביום ממקורות רשמיים ומכלי תקשורת. שינוי שלב (מכסה או בחירה לנבחרת) מתפרסם רק אחרי אימות ידני.</p>`;
}

function viewAbout(){
  return `<h1 tabindex="-1">אודות</h1>
  <section class="panel prose">
    <h2>מה זה</h2>
    <p>אתר עצמאי ולא רשמי שעוקב אחרי ספורטאיות, ספורטאים ונבחרות מישראל בדרך לאולימפיאדת לוס אנג׳לס 2028. אין לאתר קשר לוועד האולימפי הבין־לאומי, לוועדה המארגנת של המשחקים או לוועד האולימפי בישראל.</p>
    <h2>ארבעת השלבים</h2>
    <ol>
      <li><b>במעקב</b>: ספורטאי/ת או נבחרת עם סיכוי ריאלי, לפני שחלון ההעפלה בענף נפתח.</li>
      <li><b>בחלון ההעפלה</b>: החלון בענף פתוח, ותוצאות ודירוגים נספרים להעפלה.</li>
      <li><b>מכסה הושגה</b>: הושגה מכסה אולימפית לפי הודעה רשמית של ההתאחדות הבין־לאומית. ברוב הענפים המכסה שייכת למדינה ולא לספורטאי.</li>
      <li><b>נבחר/ה לנבחרת</b>: הוועד האולימפי בישראל הודיע רשמית על הבחירה.</li>
    </ol>
    <h2>איך הנתונים נאספים</h2>
    <p>פעם ביום תהליך אוטומטי בודק תוצאות, דירוגים רשמיים והודעות של התאחדויות, ומעדכן דירוגים ותחרויות קרובות. מעבר לשלב "מכסה" או "נבחר/ה", ספורטאים חדשים ופרישות מתפרסמים רק אחרי בדיקה ידנית. לכל נתון מצורף קישור למקור, וכדאי לבדוק מולו לפני הסתמכות.</p>
    <p>"דירוג או הישג" הוא דירוג עולמי רשמי כשיש כזה, ואחרת התוצאה הבולטת האחרונה (מסומנת "מיקום, לא דירוג").</p>
    <h2>עדכניות</h2>
    <p>${freshness() || "מועד העדכון האחרון לא ידוע."}</p>
  </section>
  ${reportBox("טעות באתר הדרך ללוס אנג׳לס 28", SITE_URL)}`;
}

const notFound = () => `<div class="empty">הדף לא נמצא. <a href="#home">חזרה לדף הראשי</a></div>`;

function freshness(){
  const ts = S.live ? S.lastRun : (S.generatedAt || S.lastRun);
  if (!ts) return "";
  const stale = daysSince(ts) > 1.5;
  const when = new Date(ts).toLocaleString("he-IL", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"});
  return `<span class="fresh ${stale ? "stale" : ""}"><i></i><span>${S.live ? "נתונים חיים · עדכון אוטומטי אחרון: " : "הנתונים עודכנו: "}${when}</span></span>`;
}
const daysLeft = () => Math.max(0, Math.ceil((OPENING - Date.now()) / 864e5)).toLocaleString("he-IL");

function banner(){
  if (S.liveLost) return `<div class="banner">החיבור לנתונים החיים נותק. מוצגת הגרסה הציבורית האחרונה. רעננו כדי להתחבר מחדש.</div>`;
  const ts = S.generatedAt;
  if (!S.live && ts && daysSince(ts) > 2) return `<div class="banner">הנתונים לא עודכנו כבר ${Math.floor(daysSince(ts))} ימים, וייתכן שחלקם כבר לא עדכניים.</div>`;
  return "";
}

// ---------- review queue (editors) ----------
function reviewPanel(){
  if (!S.isAdmin) return "";
  const pend = S.proposals.filter(p => p.status === "pending");
  const note = `<p class="foot">את/ה רואה נתונים חיים. הציבור רואה את הפרסום האחרון, שמתעדכן בכל ריצה של העדכון היומי.</p>`;
  if (!pend.length) return `<section class="panel">${note}</section>`;
  return `<section class="panel review"><h2>ממתין לאישור שלך (${pend.length})</h2>${note}
    <div class="stack">${pend.map(p => {
      const t = S.athletes.find(a => a.id === p.target);
      const who = p.kind === "create" ? `ספורטאי/ת חדש/ה: ${esc(p.patch?.name)}` : esc(t?.name || p.target);
      const ev = (Array.isArray(p.evidence) ? p.evidence : []).map(e => linkOut(e.url, e.label || "מקור")).filter(Boolean).join(" · ");
      return `<div class="prop" data-id="${esc(p.id)}"><b>${who}</b>
        ${p.summary ? `<span>${esc(p.summary)}</span>` : ""}<ul>${describePatch(p, t)}</ul>
        ${ev ? `<span class="foot">${ev}</span>` : ""}
        <div class="actions"><button class="btn small" data-act="approve">אישור</button><button class="btn ghost small" data-act="reject">דחייה</button></div></div>`;
    }).join("")}</div></section>`;
}

function describePatch(p, t){
  const labels = {rank:"דירוג או הישג", next:"התחרות הבאה", nextDate:"תאריך", notes:"הערות", event:"מקצה", name:"שם"};
  return Object.entries(p.patch || {}).map(([k, v]) => {
    if (k === "stage") return `<li>שלב: ${STAGES[stageOf(t || {})]} ← ${STAGES[stageOf({stage: v})]}</li>`;
    if (k === "sportId") return `<li>ענף: ${esc(sportName(v))}</li>`;
    if (k === "archived") return v ? `<li>הסרה מהרשימה</li>` : "";
    return labels[k] ? `<li>${labels[k]}: ${esc(v)}</li>` : "";
  }).join("");
}

const historyWith = (a, entry) => [...(Array.isArray(a?.history) ? a.history : []), entry].slice(-HISTORY_MAX);

async function decide(id, approve, btn){
  const p = S.proposals.find(x => x.id === id);
  if (!p) return;
  const stamp = {updatedAt: new Date().toISOString(), updatedBy: S.uid || "admin"};
  try {
    if (approve) {
      const t = S.athletes.find(a => a.id === p.target);
      const ref = S.db.collection("athletes").doc(p.target);
      const patch = {...p.patch, ...stamp};
      if (patch.sportId) patch.sport = sportName(patch.sportId);
      const src = safeUrl(p.evidence?.[0]?.url);
      if ("stage" in p.patch && !p.patch.archived)
        patch.history = historyWith(t, {at: today(), kind: "stage", text: STAGES[stageOf({stage: p.patch.stage})] + (p.summary ? " · " + p.summary : ""), ...(src ? {source: src} : {})});
      if (p.kind === "create") {
        if (t || (await ref.get()).exists) throw {code: "exists"};   // never overwrite, archived ids included
        patch.history = [{at: today(), kind: "start", text: "נכנס/ה למעקב · " + STAGES[stageOf(p.patch)], ...(src ? {source: src} : {})}];
        await ref.set(patch);
      } else await ref.update(patch);
      if (p.summary && !S.changes.some(c => c.text === p.summary)) {
        const changes = [{at: today(), text: p.summary, ...(p.patch?.archived ? {} : {athleteId: p.target})}, ...S.changes].slice(0, 30);
        await S.db.doc("meta/status").update({changes});
      }
    }
    await S.db.collection("proposals").doc(id).update({status: approve ? "approved" : "rejected", decidedAt: stamp.updatedAt, decidedBy: stamp.updatedBy});
  } catch (e) {
    btn.disabled = false;
    btn.closest(".prop").insertAdjacentHTML("beforeend", `<p class="err">${esc(e?.code === "exists" ? "כבר קיימת רשומה עם המזהה הזה (ייתכן שהיא מוסתרת). ההצעה לא אושרה." : errText(e))}</p>`);
  }
}

// ---------- editing (editors only) ----------
let editing = null, warnedStale = false, archArmed = false;

function errText(e){
  if (e?.code === "invalid_argument") return "השינוי נדחה: אין לך הרשאת עריכה, או שהרשומה כבר לא קיימת.";
  if (e?.code === "quota_exceeded") return "המאגר מלא, ולכן אי אפשר להוסיף רשומות חדשות.";
  return "השמירה נכשלה. נסו שוב בעוד רגע.";
}

function openForm(a, sportId){
  editing = a ? {...a} : {sportId};
  warnedStale = false; archArmed = false;
  $("fSportIn").innerHTML = [...S.sports].sort((x, y) => heCmp(x.he, y.he)).map(s => `<option value="${esc(s.id)}">${esc(s.he)}</option>`).join("");
  $("fStageIn").innerHTML = STAGES.map((s, i) => `<option value="${i}">${s}</option>`).join("");
  $("dlgTitle").textContent = a ? "עריכת " + a.name : "ספורטאי/ת חדש/ה";
  $("fName").value = str(a?.name); $("fNameEn").value = str(a?.name_en); $("fSportIn").value = str(editing.sportId);
  $("fEvent").value = str(a?.event); $("fStageIn").value = String(a ? stageOf(a) : 0); $("fRank").value = str(a?.rank);
  $("fNext").value = str(a?.next); $("fNextDate").value = isDate(a?.nextDate) ? a.nextDate : "";
  $("fNotes").value = str(a?.notes); $("fSource").value = str(a?.source);
  $("archBtn").hidden = !a; $("archBtn").textContent = "הסרה מהרשימה";
  $("frmErr").hidden = true; $("frmWarn").hidden = true;
  $("dlg").showModal();
}

function formValues(){
  return {
    name: $("fName").value.trim(), name_en: $("fNameEn").value.trim(), sportId: $("fSportIn").value,
    event: $("fEvent").value.trim(), stage: +$("fStageIn").value, rank: $("fRank").value.trim(),
    next: $("fNext").value.trim(), nextDate: $("fNextDate").value, notes: $("fNotes").value.trim(),
    source: $("fSource").value.trim(),
  };
}

function showFormErr(msg){ $("frmErr").textContent = msg; $("frmErr").hidden = false; }

async function saveForm(ev){
  ev.preventDefault();
  if (!S.db) return;
  const v = formValues();
  if (!v.name || !v.sportId) return;
  if (v.source && !safeUrl(v.source)) return showFormErr("קישור המקור חייב להתחיל ב־https://");
  const stamp = {updatedAt: new Date().toISOString(), updatedBy: S.uid || "manual"};
  const col = S.db.collection("athletes");
  $("saveBtn").disabled = true;
  try {
    if (editing.id) {
      // Only changed fields, so a concurrent automatic update to other fields survives.
      const patch = {};
      EDIT_FIELDS.forEach(k => { if (str(v[k]) !== str(k === "stage" ? stageOf(editing) : editing[k])) patch[k] = v[k]; });
      if (!Object.keys(patch).length) { $("dlg").close(); return; }
      const cur = S.athletes.find(a => a.id === editing.id);
      if (!warnedStale && cur && str(cur.updatedAt) !== str(editing.updatedAt)) {
        warnedStale = true;
        $("frmWarn").textContent = "הרשומה התעדכנה בזמן שערכת. לחיצה נוספת על „שמירה” תשמור רק את השדות ששינית.";
        $("frmWarn").hidden = false;
        return;
      }
      if (patch.sportId) patch.sport = sportName(patch.sportId);
      const src = safeUrl(v.source) ? {source: v.source} : {};
      if ("stage" in patch) patch.history = historyWith(cur, {at: today(), kind: "stage", text: STAGES[v.stage], ...src});
      else if ("rank" in patch && v.rank) patch.history = historyWith(cur, {at: today(), kind: "rank", text: v.rank, ...src});
      await col.doc(editing.id).update({...patch, ...stamp});
    } else {
      let id = slug(v.name_en) || col.doc().id;
      while (S.athletes.some(a => a.id === id) || (await col.doc(id).get()).exists) id += "-2";
      await col.doc(id).set({...v, sport: sportName(v.sportId), ...stamp, example: false,
        history: [{at: today(), kind: "start", text: "נכנס/ה למעקב · " + STAGES[v.stage], ...(v.source ? {source: v.source} : {})}]});
    }
    $("dlg").close();
  } catch (e) { showFormErr(errText(e)); }
  finally { $("saveBtn").disabled = false; }
}

// Soft delete: no undo exists for a hard delete, and the daily job could re-add the athlete.
async function archive(){
  if (!archArmed) { archArmed = true; $("archBtn").textContent = "ללחוץ שוב להסרה"; return; }
  try {
    await S.db.collection("athletes").doc(editing.id).update({archived: true, updatedAt: new Date().toISOString(), updatedBy: S.uid || "manual"});
    $("dlg").close();
    if (location.hash === "#a-" + editing.id) location.hash = "#sport-" + editing.sportId;
  } catch (e) { showFormErr(errText(e)); }
}

// Leaves updatedAt alone, so the chip reads "verified" until the next real change.
async function markVerified(id, btn){
  try {
    await S.db.collection("athletes").doc(id).update({verifiedAt: new Date().toISOString(), verifiedBy: S.uid || "admin"});
  } catch (e) {
    btn.disabled = false;
    btn.closest(".sec-head").insertAdjacentHTML("afterend", `<p class="err" role="alert">${esc(errText(e))}</p>`);
  }
}

// ---------- router ----------
function currentRoute(){
  try { return decodeURIComponent(location.hash.slice(1)) || "home"; } catch { return "home"; }
}

function route(){
  const h = currentRoute();
  let html, nav;
  if (S.failed && !S.loaded) html = `<div class="empty">לא הצלחנו לטעון את הנתונים. <button class="btn small" data-retry>נסו שוב</button></div>`, nav = "";
  else if (!S.loaded) html = `<div class="skeleton" aria-busy="true"><span></span><span></span><span></span></div>`, nav = "home";
  else if (h === "home") html = viewHome(), nav = "home";
  else if (h === "sports") html = viewSports(), nav = "sports";
  else if (h.startsWith("sport-")) html = viewSport(h.slice(6)), nav = "sports";
  else if (h.startsWith("a-")) html = viewAthlete(h.slice(2)), nav = "sports";
  else if (h === "calendar") html = viewCalendar(), nav = "calendar";
  else if (h.startsWith("calendar-")) html = viewCalendar(h.slice(9)), nav = "calendar";
  else if (h === "updates") html = viewUpdates(), nav = "updates";
  else if (h === "about") html = viewAbout(), nav = "about";
  else if (h === "quotas" && typeof viewQuotas === "function") html = viewQuotas(), nav = "sports";
  else if (/^admin(-|$)/.test(h) && S.isAdmin && S.live && typeof viewAdmin === "function") html = viewAdmin(h.slice(6)), nav = "admin";
  else html = notFound(), nav = "";
  $("view").innerHTML = banner() + html;
  $("adminLink").hidden = !(S.isAdmin && S.live);
  document.querySelectorAll(".links a").forEach(a => a.dataset.nav === nav ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  if (nav === "home") renderResults();
  return h;
}

let lastRoute = null;
function navigate(){
  const h = route();
  if (h === lastRoute) return;
  const first = lastRoute === null;
  lastRoute = h;
  scrollTo({top: 0, behavior: "auto"});
  // Move focus to the new page's heading so screen readers announce the page, not the whole view.
  if (!first) document.querySelector("#view h1")?.focus({preventScroll: true});
  $("routeStatus").textContent = document.querySelector("#view h1")?.textContent || "";
}
// Data refreshes re-render in place without jumping the scroll position or losing search focus.
function refresh(){
  const focused = document.activeElement?.id;
  const pos = focused === "q" ? $("q").selectionStart : null;
  route();
  if (focused === "q" && $("q")) { $("q").focus(); $("q").setSelectionRange(pos, pos); }
}

// ---------- events ----------
addEventListener("hashchange", navigate);
document.addEventListener("input", e => {
  if (e.target.id === "q") { S.q = e.target.value; renderResults(); }
  if (e.target.id === "cSport") { S.cal.sport = e.target.value; history.replaceState(null, "", S.cal.sport ? "#calendar-" + S.cal.sport : "#calendar"); route(); }
  if (e.target.id === "cQual") { S.cal.qual = e.target.checked; route(); }
  if (e.target.id === "cPast") { S.cal.past = e.target.checked; route(); }
});
document.addEventListener("click", e => {
  const t = e.target.closest("[data-edit],[data-add],[data-act],[data-verify],[data-follow],[data-copy],[data-retry]");
  if (!t) return;
  if (t.dataset.edit) return openForm(S.athletes.find(a => a.id === t.dataset.edit));
  if (t.dataset.add) return openForm(null, t.dataset.add);
  if (t.dataset.verify) { t.disabled = true; return markVerified(t.dataset.verify, t); }
  if (t.dataset.act) { t.disabled = true; return decide(t.closest(".prop").dataset.id, t.dataset.act === "approve", t); }
  if (t.dataset.follow) { toggleFollow(t.dataset.follow); route(); return $("view").querySelector("[data-follow]")?.focus(); }
  if ("retry" in t.dataset) { S.failed = false; route(); return loadPublic(); }
  if (t.dataset.copy) {
    const input = $(t.dataset.copy);
    const msg = $(t.dataset.copy === "mailAddr" ? "copyMsg2" : "copyMsg");
    const done = ok => { msg.textContent = ok ? "הועתק." : "לא ניתן להעתיק אוטומטית. הטקסט מסומן, אפשר להעתיק ידנית."; if (!ok) input.select(); };
    try { navigator.clipboard.writeText(input.value).then(() => done(true), () => done(false)); } catch { done(false); }
  }
});
$("frm").addEventListener("submit", saveForm);
$("archBtn").addEventListener("click", archive);
$("cancelBtn").addEventListener("click", () => $("dlg").close());
setInterval(() => { const d = $("days"); if (d) d.textContent = daysLeft(); }, 60e3);

// ---------- data ----------
function applySnapshot(d){
  S.generatedAt = str(d.generatedAt); S.lastRun = str(d.lastRun);
  S.sports = Array.isArray(d.sports) ? d.sports : [];
  S.athletes = Array.isArray(d.athletes) ? d.athletes : [];
  S.comps = (Array.isArray(d.competitions) ? d.competitions : []).filter(c => isDate(c.start));
  S.changes = Array.isArray(d.changes) ? d.changes : [];
  S.loaded = true;
  applyQuotas();
}

// quotas.json is hand-curated and optional: a bad item is dropped, a bad file only hides the quota UI.
// Re-applied whenever sports change, since an item needs a known sportId.
let quotaFile = null;
const quotaCount = v => v == null || (Number.isInteger(v) && v >= 0);
function applyQuotas(){
  const items = Array.isArray(quotaFile?.items) ? quotaFile.items : [];
  S.quotas = items.filter(q => q && typeof q === "object" && sportById(q.sportId) && QUOTA_STATUSES.includes(q.israelStatus)
      && safeUrl(q.source) && quotaCount(q.totalQuotas) && quotaCount(q.maxPerNOC)
      && (q.nextQuotaEvent == null || (typeof q.nextQuotaEvent === "object" && isDate(q.nextQuotaEvent.start))))
    .map(q => ({sportId: q.sportId, event: str(q.event), totalQuotas: q.totalQuotas ?? null, maxPerNOC: q.maxPerNOC ?? null,
      allocation: str(q.allocation), israelStatus: q.israelStatus, israelNote: str(q.israelNote), source: q.source,
      nextQuotaEvent: q.nextQuotaEvent ? {name: str(q.nextQuotaEvent.name), start: q.nextQuotaEvent.start} : null}));
  S.quotasUpdatedAt = S.quotas.length ? str(quotaFile.updatedAt) : "";
}

async function loadQuotas(){
  try {
    const r = await fetch("quotas.json", {cache: "no-cache"});
    quotaFile = r.ok ? await r.json() : null;
  } catch { quotaFile = null; }
}

let publicSnapshot = null;
async function loadPublic(){
  const quotas = loadQuotas();   // in parallel; never delays or fails the data.json render
  try {
    const r = await fetch("data.json", {cache: "no-cache"});
    if (!r.ok) throw new Error(r.status);
    publicSnapshot = await r.json();
    if (!S.live) { applySnapshot(publicSnapshot); navigate(); }
  } catch {
    if (!S.loaded) { S.failed = true; route(); }
  }
  await quotas;
  applyQuotas();
  if (S.loaded) refresh();
}

// A dead live subscription must not keep showing stale data labelled "live".
function dropLive(){
  if (!S.live) return;
  S.live = false; S.liveLost = true;
  if (publicSnapshot) applySnapshot(publicSnapshot);
  refresh();
}

async function goLive(){
  try {
    const user = await window.claude?.use?.("user");
    if (!user || !(await user.canEdit())) return;
    const db = await window.claude.use("db");
    if (!db) return;
    S.db = db; S.isAdmin = true; S.uid = await user.id();
    $("adminChip").hidden = false;
    const ready = {athletes: false, competitions: false, sports: false};
    const go = () => { if (!S.liveLost && Object.values(ready).every(Boolean)) { S.live = true; S.loaded = true; refresh(); } };
    db.collection("athletes").onSnapshot(snap => {
      S.athletes = snap.docs.map(d => ({id: d.id, ...d.data()})).filter(a => !a.archived);
      ready.athletes = true; go();
    }, dropLive);
    db.collection("competitions").onSnapshot(snap => {
      S.comps = snap.docs.map(d => ({id: d.id, ...d.data()})).filter(c => isDate(c.start) && c.sportId);
      ready.competitions = true; go();
    }, dropLive);
    db.collection("sports").onSnapshot(snap => {
      S.sports = snap.docs.map(d => ({id: d.id, ...d.data()}));
      applyQuotas();
      ready.sports = true; go();
    }, dropLive);
    db.doc("meta/status").onSnapshot(s => {
      if (!s.exists) return;
      const m = s.data(); S.changes = Array.isArray(m.changes) ? m.changes : []; S.lastRun = str(m.lastRun);
      if (S.live) refresh();
    }, dropLive);
    db.collection("proposals").where("status", "==", "pending").onSnapshot(snap => {
      S.proposals = snap.docs.map(d => ({id: d.id, ...d.data()}));
      if (S.live) refresh();
    }, dropLive);
  } catch { /* stay on the public snapshot */ }
}

navigate();
loadPublic();
goLive();
