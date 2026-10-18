// Public visitors read the static data.json snapshot (works signed-out, read-only by construction).
// Editors (canEdit) additionally get the live database, edit controls and the review queue.
"use strict";

// ---------- constants & helpers ----------
const STAGES = ["במעקב", "בחלון ההעפלה", "מכסה הושגה", "נבחר/ה לנבחרת"];
const OPENING = new Date("2028-07-14T00:00:00-07:00");
const PARIS_ATHLETES = 88;
const SITE_NAME = "הדרך ללוס אנג׳לס 28";
const SITE_URL ="https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT";
const CONTACT_EMAIL = "il2la28.site@gmail.com";
// Corrections log (docs/design/corrections-log.md). The launch date comes only from data.json.launchAt
// (export_data.py LAUNCH_AT); reports go to CONTACT_EMAIL.
const FIX_FIELDS = ["name", "event", "rank", "next", "nextDate", "notes", "stage", "sportId", "quota"];
const FIX_MAX = 300;
const EDIT_FIELDS = ["name", "name_en", "sportId", "event", "stage", "rank", "rankNum", "rankList", "rankAsOf", "next", "nextDate", "notes", "source"];
const RANK_MAX_AGE_D = 60;
const HISTORY_MAX = 20;
const QUOTA_STATUSES = ["earned", "in-contention", "outside", "unknown"];

const $ = id => document.getElementById(id);
const str = v => typeof v === "string" ? v : (v == null ? "" : String(v));
const esc = s => str(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl = u => /^https:\/\//i.test(str(u)) ? str(u) : "";
const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(str(d));
const fmt = d => isDate(d) ? new Date(d + "T12:00:00").toLocaleDateString("he-IL", {day:"numeric", month:"short", year:"numeric"}) : "";
const fmtShort = d => isDate(d) ? new Date(d + "T12:00:00").toLocaleDateString("he-IL", {day:"numeric", month:"short"}) : "";
const fmtShortY = d => isDate(d) && d.slice(0, 4) !== today().slice(0, 4) ? fmt(d) : fmtShort(d);
// Same-year ranges show the year once, at the end.
const fmtRange = (a, b) => !isDate(b) || a === b ? fmt(a) : (a.slice(0, 4) === b.slice(0, 4) ? fmtShort(a) : fmt(a)) + " – " + fmt(b);
// Israel's calendar date, so "live"/"past" don't flip at UTC midnight.
const today = () => new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Jerusalem"}).format(new Date());
const addDays = (d, n) => new Date(new Date(d + "T12:00:00").getTime() + n * 864e5).toISOString().slice(0, 10);
const daysSince = iso => (Date.now() - new Date(str(iso))) / 864e5;
const stageOf = a => Math.min(3, Math.max(0, Number(a.stage) | 0));
const heCmp = (a, b) => str(a).localeCompare(str(b), "he");
const plural = (n, one, many) => n === 1 ? one : `${n} ${many}`;
const slug = s => str(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "מקור"; } };
// Match key for search: keyboards type ' and " where the data has ׳ and ״ (and vice versa).
const searchKey = s => str(s).normalize("NFD").replace(/[֑-ׇֽֿׁׂׅׄ]/g, "")
  .replace(/[׳'`’‘]/g, "'").replace(/[״"“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();
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
  corrections: [], launchAt: "",   // the corrections log is public iff launchAt (data.json) is set
  quotas: [], quotasUpdatedAt: "", quotasLoaded: false, quotasError: false, quotasUnpublished: null,   // empty when quotas.json is missing or bad: quota UI must not render
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
// Per-viewer follows: athletes in S.follows, sports in S.followSports (following.js; absent before it loads).
const followsSport = id => !!S.followSports?.has(id);
// Compared as instants: the job and the page write ISO strings with different precision.
const trustOf = a => { const v = Date.parse(str(a.verifiedAt)), u = Date.parse(str(a.updatedAt)); return isNaN(v) ? "auto" : isNaN(u) || v >= u ? "ok" : "stale"; };

// ---------- quotas (shared by #quotas, the sport page, #sports cards and home) ----------
// Statuses render in QUOTA_STATUSES order; S.quotas holds only validated items (see applyQuotas).
const Q_LABEL = {earned: ["✓", "מכסה הושגה"], "in-contention": ["◐", "במרוץ למכסה"],
                 outside: ["○", "מחוץ למכסות כרגע"], unknown: ["?", "אין מידע עדיין"]};
const qStatus = s => Q_LABEL[s] ? s : "unknown";
const quotaCounts = list => Object.fromEntries(QUOTA_STATUSES.map(k => [k, list.filter(q => qStatus(q.israelStatus) === k).length]));
// Symbol + text so status never depends on colour; `text` overrides the label (e.g. "1 הושגה").
const quotaStatusPill = (status, text) => { const k = qStatus(status); return `<span class="pill q-${k}"><span aria-hidden="true">${Q_LABEL[k][0]}</span> ${esc(text ?? Q_LABEL[k][1])}</span>`; };

function quotaCardSummary(sid){
  const list = quotasOf(sid);
  if (!list.length) return "";
  const n = quotaCounts(list), short = {earned: "הושגה", "in-contention": "במרוץ", outside: "מחוץ"};
  const shown = QUOTA_STATUSES.filter(k => k !== "unknown" && n[k]);
  return shown.length ? `<span class="qsum"><span class="sr">מכסות: </span>${shown.map(k => quotaStatusPill(k, `${n[k]} ${short[k]}`)).join("")}</span>`
    : `<span class="qsum">מכסות: אין מידע עדיין</span>`;
}

function quotaKpi(){
  const list = S.quotas;
  if (!list.length) return "";
  const n = quotaCounts(list), k = new Set(list.filter(q => ["earned", "in-contention"].includes(qStatus(q.israelStatus))).map(q => q.sportId)).size;
  const link = `<a href="#quotas">תמונת המכסות</a>`;
  const events = c => c === 1 ? "מקצה אחד" : `<b>${c}</b> מקצים`;
  const sports = k === 1 ? "בענף אחד" : k ? `ב־${k} ענפים` : "";
  return `<p class="kpi">${n.earned ? [`${events(n.earned)} עם מכסה לישראל`, `<b>${n["in-contention"]}</b> במרוץ למכסה`, sports].filter(Boolean).join(" · ")
    : `טרם הושגו מכסות לישראל · ${events(n["in-contention"])} במרוץ למכסה${sports ? " " + sports : ""}`}${
    (w => w ? ` · ${w === 1 ? "מקצה אחד" : `<b>${w}</b> מקצים`} בהמתנה לתוצאות` : "")(list.filter(q => awaitingOf(q)).length)} · ${link}</p>`;
}

function winStatus(w){
  if (!w || !isDate(w.from)) return null;
  const t = today();
  return t < w.from ? ["soon", "טרם נפתח"] : isDate(w.to) && t > w.to ? ["done", "נסגר"] : ["open", "פתוח"];
}

// When the browser blocks storage the follow still holds until the page closes; say so instead of failing
// silently (QA F1). Uses the same status bar as the visitor toggle.
function saveFollows(key, list){
  store.set(key, list);
  if (JSON.stringify(store.get(key, null)) === JSON.stringify(list)) return;
  $("visitorMsgText").textContent = "לא הצלחנו לשמור את המעקב: הדפדפן חוסם שמירת נתונים באתר הזה. השינוי יישאר רק עד שתסגרו או תרעננו את הדף.";
  $("visitorMsg").hidden = false;
}

function toggleFollow(id){
  S.follows.has(id) ? S.follows.delete(id) : S.follows.add(id);
  saveFollows("la28.follows", [...S.follows]);
}

// ---------- shared fragments ----------
function stageBar(list, thin){
  const n = list.length || 1;
  const counts = STAGES.map((_, i) => list.filter(a => stageOf(a) === i).length);
  return {counts, html: `<div class="bar4 ${thin ? "thin" : ""}" role="img" aria-label="${esc(STAGES.map((s,i) => `${s}: ${counts[i]}`).join(", "))}">${
    counts.map((c, i) => c ? `<i class="s${i}" style="width:${(c / n * 100).toFixed(2)}%"></i>` : "").join("")}</div>`};
}

// Show the check where it exists; its absence is explained once, on the athlete page (trustNote), never as a verdict.
function trustChip(a, where){
  const t = trustOf(a), v = str(a.verifiedAt).slice(0, 10), sym = s => `<span aria-hidden="true">${s}</span>`;
  if (where === "card") return t === "ok" ? `<span class="trust ok">${sym("✓")} נבדק ${fmtShortY(v)}</span>` : "";
  return `<span class="trust ${t}">${t === "auto" ? `${sym("◌")} טרם נבדק ידנית` : t === "ok" ? `${sym("✓")} נבדק ידנית ב־${fmt(v)}` : `${sym("✓")} נבדק ב־${fmt(v)}`}</span>`;
}
function trustNote(a){
  const t = trustOf(a), src = safeUrl(a.source);
  const line = t === "ok" ? `הרשומה הושוותה למקור${src ? ` (${esc(host(src))})` : ""} ולא השתנתה מאז.`
    : t === "stale" ? `מאז התעדכנו פרטים אוטומטית (${fmt(str(a.updatedAt).slice(0, 10))}). הם ייכללו בבדיקה הבאה.`
    : `הפרטים נאספו אוטומטית ממקורות פומביים, והרשומות נבדקות ידנית בהדרגה.${src ? " בינתיים כדאי להיעזר בקישור למקור." : ""}`;
  return `${trustChip(a)}<span class="muted">${line}</span><a href="#about-trust">איך אנחנו בודקים</a>`;
}

// A quota event is current until its last day: nextQuotaEvent.end, else the end of the competition in the same
// sport that it starts inside (names are free text; season-long series don't count), else its start day.
function quotaEventEnd(q){
  const e = q.nextQuotaEvent;
  if (!e) return "";
  if (e.end) return e.end;
  const c = S.comps.find(c => c.sportId === q.sportId && c.start <= e.start && e.start <= (c.end || c.start) && dayNo(c.start, c.end || c.start) <= SERIES_DAYS);
  return c ? c.end || c.start : e.start;
}
// Last fact-check of an item (build_quotas.py publishes review.at); older files only have the file date.
const checkedOf = q => q.checkedAt || str(S.quotasUpdatedAt).slice(0, 10);
// Past quota events are hidden in the UI; the loader keeps them for #admin checks.
const nxt = (q, t = today()) => q.nextQuotaEvent?.name && quotaEventEnd(q) >= t ? q.nextQuotaEvent : null;
// The quota event is over but quotas.json predates its end: the item still shows the pre-event state.
// "earned" never waits; after AWAIT_DAYS the row falls back to showing no event at all.
const AWAIT_DAYS = 14;
const awaitingOf = (q, t = today()) => {
  const e = q.nextQuotaEvent, end = quotaEventEnd(q);
  if (!e?.name || !end || end >= t || q.israelStatus === "earned") return null;
  if (checkedOf(q) > end) return null;   // re-checked after the event: trust the status
  return dayNo(end, t) - 1 <= AWAIT_DAYS ? {...e, end} : null;
};
const AWAITING = `<span aria-hidden="true">◷</span> בהמתנה לתוצאות`;
const AWAIT_PILL = `<span class="pill q-awaiting">${AWAITING}</span>`;
// No verb: event names are both masculine and feminine ("גרנד סלאם", "אליפות").
const awaitingLine = w => `${esc(w.name)} (${fmtRange(w.start, w.end)}). עדכון המכסות יפורסם אחרי ההודעה הרשמית.`;
// "What it means" for Israel at the next quota event; meaningless once that event is past.
// An earned item's stakes describe the pre-event state, so they go once it is earned.
const stakesLine = (q, cls = "stakes", tag = "p") => q.stakes && nxt(q) && q.israelStatus !== "earned" ? `<${tag} class="${cls}"><b>מה זה אומר:</b> ${esc(q.stakes)}</${tag}>` : "";

function quotaSection(id){
  const items = quotasOf(id);
  if (!items.length) return "";
  // Awaiting rows come right after "earned": they are the newsiest.
  const order = q => q.israelStatus === "earned" ? 0 : awaitingOf(q) ? 1 : 2 + QUOTA_STATUSES.indexOf(qStatus(q.israelStatus));
  items.sort((a, b) => order(a) - order(b) || (nxt(a)?.start || "9999").localeCompare(nxt(b)?.start || "9999") || heCmp(a.event, b.event));
  const n = quotaCounts(items);
  return `<section class="panel" aria-labelledby="qH">
    <div class="sec-head"><h2 id="qH">מכסות לישראל</h2><span class="foot">${plural(items.length, "מקצה אחד", "מקצים")}</span></div>
    <div class="bar4 qbar" role="img" aria-label="${QUOTA_STATUSES.map(k => `${Q_LABEL[k][1]}: ${n[k]}`).join(", ")}">${
      QUOTA_STATUSES.map(k => n[k] ? `<i class="q-${k}" style="width:${(n[k] / items.length * 100).toFixed(2)}%"></i>` : "").join("")}</div>
    <ul class="legend">${QUOTA_STATUSES.map(k => n[k] ? `<li><i class="q-${k}"></i>${Q_LABEL[k][1]} <b>${n[k]}</b></li>` : "").join("")}</ul>
    ${n.unknown === items.length ? `<p class="muted">עוד אין מידע על מצב ישראל במקצים האלה.</p>` : ""}
    ${n.earned && !athletesOf(id).some(a => stageOf(a) >= 2) ? `<p class="foot">${n.earned === 1 ? "המכסה הושגה" : "המכסות הושגו"} למדינה. שלב הספורטאים והנבחרות יתעדכן אחרי בדיקה ידנית.</p>` : ""}
    <ul class="qlist">${items.map(q => {
      const tot = q.totalQuotas, max = q.maxPerNOC, e = nxt(q), w = awaitingOf(q), src = linkOut(q.source, host(q.source));
      const meta = [tot != null && `${plural(tot, "מכסה אחת", "מכסות")} בעולם`, max != null && `עד ${plural(max, "מכסה אחת", "מכסות")} למדינה`].filter(Boolean).join(" · ");
      return `<li>
        <div class="q-top"><b><bdi>${esc(q.event)}</bdi></b>${w ? `<span class="actions">${quotaStatusPill(q.israelStatus)}${AWAIT_PILL}</span>` : quotaStatusPill(q.israelStatus)}</div>
        ${meta ? `<p class="q-meta">${meta}</p>` : ""}
        ${q.israelStatus === "earned" && isDate(q.earnedAt) ? `<p class="q-meta">הושגה ב־${fmt(q.earnedAt)}</p>` : ""}
        ${q.israelNote ? `<p>${esc(q.israelNote)}</p>` : ""}
        ${e ? `<p class="q-meta">אירוע המכסה הבא: ${esc(e.name)} · ${fmt(e.start)}</p>` : w ? `<p class="q-meta">${awaitingLine(w)}</p>` : ""}
        ${stakesLine(q)}
        ${q.allocation || src ? `<details><summary>איך מחולקות המכסות</summary><p>${q.allocation ? esc(q.allocation) : `<span class="muted">פרטי השיטה טרם נאספו.</span>`}</p>${src ? `<p class="foot">${src}</p>` : ""}</details>` : ""}
      </li>`;
    }).join("")}</ul>
    <p class="foot">ברוב הענפים המכסה שייכת למדינה ולא לספורטאי/ת; הוועד האולימפי בישראל בוחר בהמשך מי ישתמש בה.${isDate(S.quotasUpdatedAt.slice(0, 10)) ? ` נתוני מכסות עודכנו: ${fmt(S.quotasUpdatedAt.slice(0, 10))}.` : ""}</p>
  </section>`;
}

function compRow(c, withSport){
  const t = today(), end = c.end || c.start, live = c.start <= t && end >= t, past = end < t;
  return `<div class="comp ${past ? "past" : ""}">
    <span class="when">${fmtRange(c.start, c.end)}</span>
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
    <span><span class="pill st${s}">${STAGES[s]}</span> ${trustChip(a, "card")}</span>
    ${a.rank ? `<span class="ln"><span>דירוג או הישג: </span>${esc(a.rank)}</span>` : ""}
    ${a.next ? `<span class="ln"><span>התחרות הבאה: </span>${esc(a.next)}${isDate(a.nextDate) ? ` (${fmtShort(a.nextDate)})` : ""}</span>` : ""}
  </a>`;
}

function changeRow(c){
  const txt = esc(c.text);
  const body = c.athleteId && S.athletes.some(a => a.id === c.athleteId) ? `<a href="#a-${esc(c.athleteId)}">${txt}</a>` : txt;
  return `<li><span class="d">${fmt(str(c.at).slice(0, 10))}</span><span class="t">${body}</span><span></span></li>`;
}

const TODAY_MAX = 6, SERIES_DAYS = 31, STAKES_MAX = 2;   // STAKES_MAX: quota lines per strip row
// Quota items don't reference athletes: link by the athlete's name in the item text, or by weight class,
// which the two files spell differently ("עד 57 ק״ג (נשים)" vs "57- ק״ג נשים").
function weightKey(s){
  const m = str(s).match(/(מעל|עד)?\s*(\d+)\s*([-+])?\s*ק[״"]ג.*(נשים|גברים)/);
  const sign = m && (m[3] || {מעל: "+", עד: "-"}[m[1]]);
  return sign ? m[2] + sign + m[4] : "";
}
const quotaAthletes = q => athletesOf(q.sportId).filter(a => (a.name && (q.israelNote.includes(a.name) || q.stakes.includes(a.name)))
  || (weightKey(a.event) && weightKey(a.event) === weightKey(q.event)));
// Tie-break only (docs/product/spec-rank-tiebreak.md): rankNum counts while its list is at most 60 days old.
// Compared only within one sport, so different lists never meet.
const rankOf = (a, t = today()) => Number.isInteger(a.rankNum) && a.rankNum >= 1 && isDate(a.rankAsOf) && a.rankAsOf <= t
  && dayNo(a.rankAsOf, t) - 1 <= RANK_MAX_AGE_D ? a.rankNum : Infinity;
const byRank = (x, y) => rankOf(x) - rankOf(y) || 0;
// Athlete page (round3.md §3). The matcher is heuristic, so the copy never says the quota is the athlete's.
function athleteQuotaFacts(a){
  const items = S.quotas.filter(q => q.sportId === a.sportId && quotaAthletes(q).includes(a))
    .sort((x, y) => QUOTA_STATUSES.indexOf(qStatus(x.israelStatus)) - QUOTA_STATUSES.indexOf(qStatus(y.israelStatus))).slice(0, 3);
  if (!items.length) return "";
  const line = q => {
    const w = awaitingOf(q), e = nxt(q), s = q.israelStatus;
    if (s === "earned") return `המכסה שייכת למדינה, לא לספורטאי/ת.${isDate(q.earnedAt) ? ` היא הושגה ב־${fmt(q.earnedAt)}.` : ""}`;
    if (w) return awaitingLine(w);
    if (s === "in-contention") return e ? `אירוע המכסה הבא: ${esc(e.name)} · ${fmt(e.start)}` : "";
    return s === "outside" ? "לפי המצב הנוכחי, ישראל מחוץ למקומות המכסה." : "עוד אין מידע על מצב ישראל במקצה הזה.";
  };
  return `<dt>${items.length === 1 ? "מכסה" : "מכסות"}</dt><dd class="stack">${items.map(q => { const l = line(q); return `
    <span>${quotaStatusPill(q.israelStatus)} <bdi>${esc(q.event)}</bdi>${awaitingOf(q) ? AWAIT_PILL : ""}</span>${l ? `
    <span class="muted">${l}</span>` : ""}${q.israelStatus === "in-contention" && !awaitingOf(q) ? stakesLine(q, "stakes", "span") : ""}`; }).join("")}
    <a href="#sport-${esc(a.sportId)}">לכל המכסות בענף</a></dd>`;
}
const dayNo = (from, to) => Math.round((new Date(to + "T12:00:00") - new Date(from + "T12:00:00")) / 864e5) + 1;

// From the schedule, not live results. One row per running competition in a tracked sport, listing the
// athletes whose nextDate falls inside it (or is today); athletes due today with no such competition get
// their own row. Each athlete appears at most once.
function todayRows(){
  const t = today(), end = c => c.end || c.start;
  // Season-long series (e.g. a 16-month World Cup) would otherwise fill the strip every day.
  const running = S.comps.filter(c => c.start <= t && t <= end(c) && dayNo(c.start, end(c)) <= SERIES_DAYS && athletesOf(c.sportId).length);
  const rows = new Map(running.map(c => [c, {comp: c, sportId: c.sportId, athletes: []}]));
  for (const a of S.athletes) {
    if (!isDate(a.nextDate)) continue;
    const mine = running.filter(c => c.sportId === a.sportId);
    const c = mine.find(c => c.start <= a.nextDate && a.nextDate <= end(c)) || (a.nextDate === t ? mine[0] : null);
    if (c) rows.get(c).athletes.push(a);
    else if (a.nextDate === t) rows.set(a, {comp: null, sportId: a.sportId, athletes: [a]});
  }
  const fav = r => r.athletes.some(a => S.follows.has(a.id)) || followsSport(r.sportId) ? 0 : 1;
  return [...rows.values()].sort((x, y) => fav(x) - fav(y) || heCmp(sportName(x.sportId), sportName(y.sportId))
    || heCmp(x.comp?.name || x.athletes[0].name, y.comp?.name || y.athletes[0].name));
}

const WON_DAYS = 14;
// Quotas earned in the last two weeks (round3.md §2). Items without earnedAt are earned but never "new".
function wonPanel(){
  const t = today(), from = addDays(t, -(WON_DAYS - 1));
  const list = S.quotas.filter(q => q.israelStatus === "earned" && q.earnedAt && q.earnedAt >= from && q.earnedAt <= t)
    .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt) || heCmp(sportName(a.sportId), sportName(b.sportId)) || heCmp(a.event, b.event));
  if (!list.length) return "";
  return `<section class="panel won" aria-labelledby="wonH">
    <h2 id="wonH">${list.length === 1 ? "מכסה חדשה לישראל" : "מכסות חדשות לישראל"}</h2>
    <ul class="rows">${list.map(q => `<li><span class="d">${fmtShort(q.earnedAt)}</span>
      <span class="t"><a href="#sport-${esc(q.sportId)}">${esc(sportName(q.sportId))}</a> · ${esc(q.event)}${q.israelNote ? `<small>${esc(q.israelNote)}</small>` : ""}</span>
      ${quotaStatusPill("earned")}</li>`).join("")}</ul>
    <p class="foot">ברוב הענפים המכסה שייכת למדינה; הוועד האולימפי בישראל יחליט בהמשך מי ישתמש בה.</p>
  </section>`;
}

function todayStrip(rows){
  if (!rows.length) return "";
  const t = today();
  const star = a => S.follows.has(a.id) ? `<span class="star-on" aria-label="במעקב שלך">★</span> ` : "";
  const who = a => `${star(a)}<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`;
  const row = ({comp: c, sportId, athletes}) => {
    if (!c) { const a = athletes[0]; return `<li><span class="d">היום</span>
      <span class="t">${who(a)}<small>${[sportName(sportId), a.next].filter(Boolean).map(esc).join(" · ")}</small></span><span></span></li>`; }
    const total = dayNo(c.start, c.end || c.start);
    const small = [athletes.length ? athletes.sort((a, b) => heCmp(a.name, b.name)).map(who).join(", ") : "",
      esc(c.location), athletes.length ? "" : (n => n === 1 ? "ספורטאי/ת או נבחרת אחת במעקב בענף" : `${n} ספורטאים ונבחרות במעקב בענף`)(athletesOf(sportId).length), linkOut(c.source)].filter(Boolean).join(" · ");
    // Matched by sport + date (names are free text). Not via stakesLine: the event may have started before today.
    // Followed athletes' items first, then items of athletes listed in this row, then file order (stable sort).
    const rank = q => { const as = quotaAthletes(q); return as.some(a => S.follows.has(a.id)) ? 0 : as.some(a => athletes.includes(a)) ? 1 : 2; };
    const best = q => Math.min(Infinity, ...quotaAthletes(q).map(a => rankOf(a, t)));
    // An earned item shows "earned" (only with earnedAt; otherwise nothing, as its stakes are stale). An item whose
    // own event already ended inside this still-running competition (a team final in a 9-day Worlds) shows
    // "awaiting" instead of its stale stakes.
    const won = q => q.israelStatus === "earned";
    // An earned item is matched by earnedAt: once earned, its nextQuotaEvent is usually cleared to null.
    const inComp = d => isDate(d) && c.start <= d && d <= (c.end || c.start);
    const stakes = quotasOf(sportId).filter(q => won(q) ? inComp(q.earnedAt)
        : (q.stakes && nxt(q) || awaitingOf(q)) && inComp(q.nextQuotaEvent?.start))
      .sort((x, y) => won(y) - won(x) || rank(x) - rank(y) || (best(x) - best(y) || 0));   // earned first; || 0: Infinity - Infinity is NaN
    const onLine = stakes.slice(0, STAKES_MAX).map(q => won(q)
      ? `<small class="stakes won-line"><b>✓ מכסה הושגה:</b> <bdi>${esc(q.event)}</bdi></small>`
      : awaitingOf(q)
      ? (w => `<small class="stakes awaiting"><b>${AWAITING}:</b> <bdi>${esc(q.event)}</bdi> · ${fmtRange(w.start, w.end)}</small>`)(awaitingOf(q))
      : `<small class="stakes"><b>מה זה אומר:</b> <bdi>${esc(q.event)}</bdi>: ${esc(q.stakes)}</small>`).join("")
      + (stakes.length > STAKES_MAX ? `<small>ועוד ${plural(stakes.length - STAKES_MAX, "מקצה אחד", "מקצים")} — <a href="#sport-${esc(sportId)}">בדף הענף</a></small>` : "");
    return `<li><span class="d">${total > 1 ? `יום ${dayNo(c.start, t)} מתוך ${total}` : "היום"}</span>
      <span class="t"><a href="#sport-${esc(sportId)}">${esc(sportName(sportId))}</a> · ${esc(c.name)}<small>${small}</small>${onLine}</span>
      <span class="now">מתקיימת עכשיו</span></li>`;
  };
  const ts = S.live ? S.lastRun : (S.generatedAt || S.lastRun);
  const when = ts ? new Date(ts).toLocaleString("he-IL", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"}) : "";
  const more = rows.length - TODAY_MAX;
  return `<section class="panel today" aria-labelledby="todayH">
    <h2 id="todayH">${rows.some(r => r.athletes.length) ? "ישראלים מתחרים היום" : "היום בענפים שבמעקב"}</h2>
    <ul class="rows">${rows.slice(0, TODAY_MAX).map(row).join("")}</ul>
    ${more > 0 ? `<p><a href="#calendar">ועוד ${more} בלוח התחרויות</a></p>` : ""}
    <p class="foot">${when ? `לפי הנתונים מ־${when}` : "לפי לוח התחרויות"}, תוצאות יתעדכנו בעדכון היומי</p>
  </section>`;
}

// ---------- home: next quota chances + "הבא בתור" (round3.md §5) ----------
const CLOSE_MAX = 5, CLOSE_EVENTS = 3;
// Sorted by date only: the data says when the next chance is, not how close anyone is to a quota.
function closestGroups(rows, t = today()){
  if (!S.quotasLoaded || S.quotasError) return [];
  const inStrip = q => rows.some(r => r.comp && r.comp.sportId === q.sportId
    && r.comp.start <= q.nextQuotaEvent.start && q.nextQuotaEvent.start <= (r.comp.end || r.comp.start));
  // nxt() already drops past events, so items awaiting results never get here.
  const groups = new Map();
  for (const q of S.quotas) {
    if (q.israelStatus !== "in-contention" || !nxt(q, t) || inStrip(q)) continue;
    const k = [q.sportId, q.nextQuotaEvent.start, q.nextQuotaEvent.name].join("|");
    if (!groups.has(k)) groups.set(k, {sportId: q.sportId, start: q.nextQuotaEvent.start, name: q.nextQuotaEvent.name, items: []});
    groups.get(k).items.push({q, as: quotaAthletes(q)});
  }
  const fav = g => followsSport(g.sportId) || g.items.some(i => i.as.some(a => S.follows.has(a.id))) ? 0 : 1;
  const matched = g => g.items.some(i => i.as.length) ? 0 : 1;
  for (const g of groups.values()) g.items.sort((x, y) => (y.as.length > 0) - (x.as.length > 0) || heCmp(x.q.event, y.q.event));
  // Followed first (also so the cap never drops them), then by date.
  return [...groups.values()].sort((x, y) => fav(x) - fav(y) || x.start.localeCompare(y.start) || matched(x) - matched(y)
    || heCmp(sportName(x.sportId), sportName(y.sportId))).slice(0, CLOSE_MAX);
}

function closestPanel(rows){
  const t = today(), groups = closestGroups(rows, t);
  if (!groups.length) return "";
  const when = s => s < t ? "מתקיים עכשיו" : s === t ? "היום" : s === addDays(t, 1) ? "מחר" : (d => d === 2 ? "בעוד יומיים" : `בעוד ${d} ימים`)(dayNo(t, s) - 1);
  const item = ({q, as}) => `<bdi>${esc(q.event)}</bdi>${as.length ? ` (${as.map(a => `<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`).join(", ")})` : ""}`;
  const row = g => {
    const more = g.items.length - CLOSE_EVENTS;
    return `<li><span class="d">${fmtShort(g.start)}</span>
      <span class="t"><a href="#sport-${esc(g.sportId)}">${esc(sportName(g.sportId))}</a> · ${esc(g.name)}
        <small>${g.items.slice(0, CLOSE_EVENTS).map(item).join(" · ")}${more > 0 ? ` · ועוד ${plural(more, "מקצה אחד", "מקצים")}` : ""}</small>
        ${g.items.length === 1 ? stakesLine(g.items[0].q, "stakes", "small") : ""}</span>
      <span class="muted">${when(g.start)}</span></li>`;
  };
  return `<section class="panel today" aria-labelledby="closeH">
    <h2 id="closeH">ההזדמנויות הקרובות למכסה</h2>
    <ul class="rows closest">${groups.map(row).join("")}</ul>
    <p class="foot">מקצים שבהם ישראל במרוץ למכסה. מה שבמעקב שלך מופיע ראשון, והשאר לפי מועד אירוע המכסה הבא. <a href="#quotas">לתמונת המכסות המלאה${groups.length > 3 ? `<span class="sm-only"> (עוד ${groups.length - 3})</span>` : ""}</a></p>
  </section>`;
}

// Only on days without a strip: the strip already answers "what's next" on event days.
function nextUpLine(rows){
  if (rows.length) return "";
  const t = today(), end = c => c.end || c.start;
  const cands = S.comps.filter(c => c.start > t && dayNo(c.start, end(c)) <= SERIES_DAYS && athletesOf(c.sportId).length)
    .map(c => ({c, who: athletesOf(c.sportId).filter(a => isDate(a.nextDate) && c.start <= a.nextDate && a.nextDate <= end(c))}));
  if (!cands.length) return "";
  const withWho = cands.filter(x => x.who.length);
  const pick = (withWho.length ? withWho : cands).sort((x, y) => x.c.start.localeCompare(y.c.start) || y.who.length - x.who.length
    || (y.c.qualifying ? 1 : 0) - (x.c.qualifying ? 1 : 0) || heCmp(x.c.name, y.c.name))[0];
  const {c, who} = pick, n = athletesOf(c.sportId).length;
  const names = who.length === 0 ? (n === 1 ? "ספורטאי/ת או נבחרת אחת במעקב בענף" : `${n} ספורטאים ונבחרות במעקב בענף`)
    : who.length > 3 ? `${who.length} ישראלים`
    : who.sort((a, b) => heCmp(a.name, b.name)).map(a => `<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`).join(", ");
  return `<p class="next-up"><b>הבא בתור:</b> <a href="#sport-${esc(c.sportId)}">${esc(sportName(c.sportId))}</a> · ${esc(c.name)} · ${fmtRange(c.start, c.end)} · ${names}${c.qualifying ? ` · <span class="pill open">העפלה</span>` : ""}</p>`;
}

// ---------- views ----------
function viewHome(){
  const {counts, html: bar} = stageBar(S.athletes);
  const quota = counts[2] + counts[3];
  const t = today(), soon = addDays(t, 14), rows = todayRows();
  // Athletes in the strip (all of today's, plus later days of a running competition) aren't repeated below.
  const inStrip = new Set(rows.flatMap(r => r.athletes.map(a => a.id)));
  const busy = S.athletes.filter(a => isDate(a.nextDate) && a.nextDate >= t && a.nextDate <= soon && !inStrip.has(a.id))
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate) || heCmp(a.name, b.name));
  const mine = S.athletes.filter(a => S.follows.has(a.id)).sort((a, b) => heCmp(a.name, b.name));
  const mineNew = mine.filter(isNew).length;
  const colors = ["var(--stage0)", "var(--blue)", "var(--sun)", "var(--ok)"];
  const verified = S.athletes.filter(a => trustOf(a) !== "auto").length;
  return `
  <section class="hero">
    <div>
      <h1 tabindex="-1">הדרך ללוס אנג׳לס 28</h1>
      <p class="muted">מעקב אחרי מסלול ההעפלה של ספורטאיות, ספורטאים ונבחרות מישראל לאולימפיאדת לוס אנג׳לס, 14–30 ביולי 2028.<span class="tag">מעקב לא רשמי</span></p>
      ${freshness()}
      ${nextUpLine(rows)}
    </div>
    <div class="count"><b class="digits" id="days">${daysLeft()}</b><span>ימים לטקס הפתיחה</span></div>
  </section>
  <input class="search" id="q" type="search" placeholder="חיפוש ספורטאי/ת, נבחרת או ענף" aria-label="חיפוש" aria-describedby="qCount" value="${esc(S.q)}">
  <p class="sr" id="qCount" aria-live="polite"></p>
  <div id="results"></div>
  ${todayStrip(rows)}
  ${typeof viewDay === "function" ? `<p class="foot"><a href="#today">לכל התחרויות היום</a></p>` : ""}
  ${wonPanel()}
  ${closestPanel(rows)}
  ${reviewPanel()}
  ${mine.length ? `<section class="panel">
      <div class="sec-head"><h2>במעקב שלי</h2>${mineNew ? `<span class="new">${mineNew} עודכנו מאז הביקור הקודם</span>` : ""}</div>
      <div class="cards">${mine.map(athleteCard).join("")}</div></section>`
    : `<p class="foot">טיפ: לחצו על ☆ בדף של ספורטאי/ת או נבחרת כדי לעקוב, והמעקב שלכם יופיע כאן. הוא נשמר רק בדפדפן הזה.</p>`}
  <section class="panel" aria-label="התקדמות בהעפלה">
    <p class="kpi">${S.athletes.length === 1 ? "ספורטאי/ת או נבחרת אחת" : `<b>${S.athletes.length}</b> ספורטאים ונבחרות`} במעקב · <b>${counts[1]}</b> בחלון העפלה פתוח · <b>${quota}</b> עם מכסה${verified ? ` · <b>${verified}</b> מתוך ${S.athletes.length} ${verified === 1 ? "נבדק/ה" : "נבדקו"} ידנית עד כה · <a href="#about-trust">איך בודקים</a>` : ""}</p>
    ${quotaKpi()}
    ${bar}
    <ul class="legend">${STAGES.map((s, i) => `<li><i style="background:${colors[i]}"></i>${s} <b>${counts[i]}</b></li>`).join("")}</ul>
    <p class="foot">${quota ? "" : "טרם הושגו מכסות. "}לשם השוואה: ישראל שלחה לפריז 2024 ${PARIS_ATHLETES} ספורטאיות וספורטאים. נבחרת נספרת כאן כרשומה אחת.</p>
  </section>
  <div class="grid2">
    <section class="panel">
      <h2>ישראלים בפעולה ב־14 הימים הקרובים</h2>
      ${busy.length ? `<ul class="rows">${busy.map(a => `<li><span class="d">${fmtShort(a.nextDate)}</span>
        <span class="t"><a href="#a-${esc(a.id)}">${esc(a.name)}</a><small>${esc(sportName(a.sportId))} · ${esc(a.next)}</small></span><span></span></li>`).join("")}</ul>`
        : `<p class="muted">אין תחרויות ידועות של ספורטאים ונבחרות מישראל בשבועיים הקרובים.</p>`}
    </section>
    <section class="panel">
      <div class="sec-head"><h2>מה התעדכן</h2><span class="actions">${typeof viewDigest === "function" ? `<a href="#digest">תקציר שבועי לשיתוף</a>` : ""}<a href="#updates">כל העדכונים</a></span></div>
      ${S.changes.length ? `<ul class="rows">${S.changes.slice(0, 5).map(changeRow).join("")}</ul>` : `<p class="muted">עוד אין עדכונים.</p>`}
    </section>
  </div>
  <section class="panel">
    <div class="sec-head"><h2>תחרויות קרובות</h2><a href="#calendar">ללוח התחרויות</a></div>
    <div class="stack">${upcoming().slice(0, 6).map(c => compRow(c, true)).join("") || `<p class="muted">אין תחרויות קרובות במאגר.</p>`}</div>
  </section>`;
}

const SEARCH_MAX = 24;
function renderResults(){
  const box = $("results");
  if (!box) return;
  const q = searchKey(S.q);
  if (!q) { box.innerHTML = ""; $("qCount").textContent = ""; return; }
  const sportKey = s => [s.id, s.he, s.en].map(str).join(" ");
  const sports = S.sports.filter(s => searchKey(sportKey(s)).includes(q));
  const hits = S.athletes.filter(a => searchKey([a.name, a.name_en, a.event, sportKey(sportById(a.sportId) || {id: a.sportId})].map(str).join(" ")).includes(q));
  $("qCount").textContent = `נמצאו ${hits.length === 1 ? "ספורטאי/ת או נבחרת אחת" : `${hits.length} ספורטאים ונבחרות`} ${sports.length === 1 ? "וענף אחד" : `ו־${sports.length} ענפים`}`;
  box.innerHTML = `<section class="panel"><h2>תוצאות חיפוש</h2>
    ${sports.length ? `<div class="chips">${sports.map(s => `<a href="#sport-${esc(s.id)}">${esc(s.he)}</a>`).join("")}</div>` : ""}
    ${hits.length ? `<div class="cards">${hits.slice(0, SEARCH_MAX).map(athleteCard).join("")}</div>
    ${hits.length > SEARCH_MAX ? `<p class="muted">מציג ${SEARCH_MAX} מתוך ${hits.length}. אפשר לצמצם את החיפוש.</p>` : ""}` : `<p class="muted">לא נמצאו ספורטאים או נבחרות שמתאימים לחיפוש.</p>`}
  </section>`;
}

function viewSports(){
  const withA = S.sports.filter(s => athletesOf(s.id).length);
  const without = S.sports.filter(s => !athletesOf(s.id).length).sort((a, b) => heCmp(a.he, b.he));
  const nextStart = s => upcomingIn(s.id)[0]?.start || "9999";
  withA.sort((a, b) => followsSport(b.id) - followsSport(a.id) || nextStart(a).localeCompare(nextStart(b)) || heCmp(a.he, b.he));
  return `
  <h1 tabindex="-1">ענפים</h1>
  <p class="muted">${withA.length === 1 ? "ענף אחד עם ספורטאים ונבחרות מישראל במעקב." : `${withA.length} ענפים עם ספורטאים ונבחרות מישראל במעקב, ממוינים לפי התחרות הקרובה.`}${S.quotas.length ? ` <a href="#quotas">תמונת המכסות</a>` : ""}</p>
  <ul class="sports">${withA.map(s => {
    const list = athletesOf(s.id), ws = winStatus(s.window), nc = upcomingIn(s.id)[0], fresh = list.filter(isNew).length;
    return `<li><a class="sport" href="#sport-${esc(s.id)}">
      <span class="top"><h2>${esc(s.he)}</h2>${ws ? `<span class="pill ${ws[0]}">חלון העפלה ${ws[1]}</span>` : ""}</span>
      ${stageBar(list, true).html}
      ${quotaCardSummary(s.id)}
      <span class="meta">${list.length} במעקב${fresh ? ` · <span class="new">${fresh} עודכנו</span>` : ""}${nc ? ` · התחרות הבאה: ${esc(nc.name)} (${fmtShort(nc.start)})` : ""}</span>
    </a></li>`;
  }).join("")}</ul>
  ${without.length ? `<section class="panel"><h2>ענפים בלי ספורטאים או נבחרות מישראל במעקב כרגע</h2>
    <div class="chips">${without.map(s => `<a href="#sport-${esc(s.id)}">${esc(s.he)}</a>`).join("")}</div></section>` : ""}`;
}

function viewSport(id){
  const s = sportById(id);
  if (!s) return notFound();
  const list = athletesOf(id).sort((a, b) => stageOf(b) - stageOf(a) || heCmp(a.event, b.event) || heCmp(a.name, b.name));
  const ws = winStatus(s.window), w = s.window;
  const comps = upcomingIn(id);
  return `
  <p class="crumb"><a href="#sports">→ כל הענפים</a></p>
  <div class="sec-head"><h1 tabindex="-1">${esc(s.he)}</h1>${S.isAdmin ? `<button class="btn small" data-add="${esc(id)}">+ הוספת ספורטאי/ת</button>` : ""}</div>
  <section class="panel">
    <div class="sec-head"><h2>שיטת ההעפלה</h2>${ws ? `<span class="pill ${ws[0]}">חלון העפלה ${ws[1]}</span>` : ""}</div>
    ${w ? `<p class="muted">${isDate(w.to) ? fmtRange(w.from, w.to) : fmt(w.from) + " – מועד סיום טרם פורסם"}</p>
      ${w.summary ? `<p>${esc(w.summary)}</p>` : ""}${w.source ? `<p class="foot">${linkOut(w.source, "שיטת ההעפלה הרשמית")}</p>` : ""}`
      : `<p class="muted">עוד לא נאספו פרטים על שיטת ההעפלה בענף הזה.</p>`}
  </section>
  ${quotaSection(id)}
  <section class="stack">
    <h2>${list.length ? `ספורטאים ונבחרות (${list.length})` : "ספורטאים ונבחרות"}</h2>
    ${list.length ? `<div class="cards">${list.map(athleteCard).join("")}</div>` : `<div class="empty">אין כרגע ספורטאים או נבחרות מישראל במעקב בענף הזה.</div>`}
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
  <p class="crumb"><a href="#sport-${esc(a.sportId)}">→ ${esc(sp?.he || "ענף")}</a></p>
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
      ${athleteQuotaFacts(a)}
      ${a.next ? `<dt>התחרות הבאה</dt><dd>${esc(a.next)}${isDate(a.nextDate) ? ` <span class="muted">(${fmt(a.nextDate)})</span>` : ""}</dd>` : ""}
      <dt>בדיקה</dt><dd class="stack">${trustNote(a)}</dd>
      ${upd ? `<dt>עודכן</dt><dd class="${old ? "old" : "muted"}">${fmt(upd)}${old ? " · לא עודכן יותר מחודש" : ""}</dd>` : ""}
      ${safeUrl(a.source) ? `<dt>מקור</dt><dd>${linkOut(a.source, host(a.source))}</dd>` : ""}
      ${(n => n && fixLogLive() ? `<dt>תיקונים</dt><dd><a href="#corrections-${esc(id)}">${plural(n, "תיקון אחד", "תיקונים")}</a></dd>` : "")(
        S.corrections.filter(c => c.target.kind === "athlete" && c.target.id === id).length)}
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
    ${fixLogLive() ? `<p class="foot">כל התיקונים מתפרסמים ב<a href="#corrections">יומן התיקונים</a>, והיעד הוא תוך 48 שעות.</p>` : ""}
  </section>`;
}

// The hash is the source of truth, so "#calendar" clears a filter left over from "#calendar-<id>".
// Filters re-render only this list, so the focused control and scroll position survive.
function calendarResults(){
  const t = today(), {sport, qual, past} = S.cal;
  const rows = S.comps.filter(c => (!sport || c.sportId === sport) && (!qual || c.qualifying) && (past || (c.end || c.start) >= t))
    .sort((a, b) => a.start.localeCompare(b.start));
  const months = {};
  rows.forEach(c => (months[c.start.slice(0, 7)] ??= []).push(c));
  return rows.length ? Object.keys(months).sort().map(m => `<section class="month">
      <h2>${new Date(m + "-15T12:00:00").toLocaleDateString("he-IL", {month:"long", year:"numeric"})} <span>${months[m].length}<span class="sr"> ${months[m].length === 1 ? "תחרות" : "תחרויות"}</span></span></h2>
      ${months[m].map(c => compRow(c, !sport)).join("")}</section>`).join("")
    : `<div class="empty">אין תחרויות שמתאימות לסינון.</div>`;
}

function viewCalendar(sportFilter = ""){
  if (sportFilter && !sportById(sportFilter)) return notFound();
  S.cal.sport = sportFilter;
  const {sport, qual, past} = S.cal;
  const used = [...new Set(S.comps.map(c => c.sportId))].map(sportById).filter(Boolean).sort((a, b) => heCmp(a.he, b.he));
  const wins = S.sports.filter(s => s.window && isDate(s.window.from)).sort((a, b) => a.window.from.localeCompare(b.window.from));
  return `
  <h1 tabindex="-1">לוח תחרויות</h1>
  <div class="toolbar">
    <select id="cSport" aria-label="סינון לפי ענף"><option value="">כל הענפים</option>${used.map(s => `<option value="${esc(s.id)}" ${s.id === sport ? "selected" : ""}>${esc(s.he)}</option>`).join("")}</select>
    <label class="chk"><input type="checkbox" id="cQual" ${qual ? "checked" : ""}> רק תחרויות העפלה</label>
    <label class="chk"><input type="checkbox" id="cPast" ${past ? "checked" : ""}> כולל תחרויות שהסתיימו</label>
  </div>
  <div id="calResults" class="cal-results">${calendarResults()}</div>
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
  ${typeof viewDigest === "function" ? `<p><a href="#digest">תקציר שבועי לשיתוף</a></p>` : ""}
  <section class="panel">${S.changes.length ? `<ul class="rows">${S.changes.map(changeRow).join("")}</ul>` : `<p class="muted">עוד אין עדכונים.</p>`}</section>
  <p class="foot">העדכונים נאספים פעם ביום ממקורות רשמיים ומכלי תקשורת. שינוי שלב (מכסה או בחירה לנבחרת) מתפרסם רק אחרי בדיקה ידנית.</p>`;
}

function viewAbout(){
  return `<h1 tabindex="-1">אודות</h1>
  <section class="panel prose">
    <h2>על האתר</h2>
    <p>אתר עצמאי ולא רשמי שעוקב אחרי ספורטאיות, ספורטאים ונבחרות מישראל בדרך לאולימפיאדת לוס אנג׳לס 2028. אין לאתר קשר לוועד האולימפי הבין־לאומי, לוועדה המארגנת של המשחקים או לוועד האולימפי בישראל.</p>
    <h2>ארבעת השלבים</h2>
    <ol>
      <li><b>במעקב</b>: ספורטאי/ת או נבחרת עם סיכוי ריאלי, לפני שחלון ההעפלה בענף נפתח.</li>
      <li><b>בחלון ההעפלה</b>: חלון ההעפלה בענף פתוח, ותוצאות ודירוגים נספרים להעפלה.</li>
      <li><b>מכסה הושגה</b>: הושגה מכסה אולימפית לפי הודעה רשמית של ההתאחדות הבין־לאומית. ברוב הענפים המכסה שייכת למדינה ולא לספורטאי/ת.</li>
      <li><b>נבחר/ה לנבחרת</b>: הוועד האולימפי בישראל הודיע רשמית על הבחירה.</li>
    </ol>
  </section>
  ${trustBlock()}
  ${reportBox("טעות באתר הדרך ללוס אנג׳לס 28", SITE_URL)}`;
}

// About trust block (docs/design/about-trust.md). Numbers come from the data; #about-trust focuses #trustH.
function trustBlock(){
  const N = S.athletes.length, V = S.athletes.filter(a => trustOf(a) === "ok").length, Q = S.quotas.length;
  const hosts = {};
  S.athletes.forEach(a => { if (safeUrl(a.source)) { const h = host(a.source); hosts[h] = (hosts[h] || 0) + 1; } });
  const top = Object.keys(hosts).sort((x, y) => hosts[y] - hosts[x] || x.localeCompare(y)).slice(0, 5);
  // The legend renders the real chips, so it can't drift from what cards and athlete pages show.
  const d = today() + "T08:00:00Z", earlier = addDays(today(), -3) + "T08:00:00Z", later = today() + "T12:00:00Z";
  const legend = [
    [{verifiedAt: d, updatedAt: earlier}, "אדם בדק את הרשומה מול המקור, והיא לא השתנתה מאז."],
    [{verifiedAt: d, updatedAt: later}, "נבדקה ידנית, ואחר כך התעדכנה אוטומטית. ייתכן שהעדכון עוד לא נבדק."],
    [{}, "נאספה אוטומטית ועוד לא נבדקה ידנית. כדאי לבדוק מול המקור."],
  ];
  const tile = (n, label) => `<div class="adm-tile"><b class="digits">${n}</b><span>${label}</span></div>`;
  return `<section class="panel prose" aria-labelledby="trustH">
    <h2 id="trustH">אפשר לסמוך? ככה זה עובד</h2>
    <div class="adm-tiles">
      ${tile(N, "ספורטאים ונבחרות במעקב")}
      ${tile(V, "נבדקו ידנית מול המקור")}
      ${Q ? tile(Q, "מקצים בתמונת המכסות, כולם נבדקו לפני פרסום") : ""}
    </div>
    <p>${freshness() || "מועד העדכון האחרון לא ידוע."}</p>
    <h3>מאיפה הנתונים</h3>
    <ul>
      <li>דירוגים, תוצאות ושיטות העפלה: האתרים הרשמיים של ההתאחדויות הבין־לאומיות.</li>
      <li>בחירות לנבחרת והודעות: הוועד האולימפי בישראל וכלי תקשורת.</li>
    </ul>
    ${top.length ? `<p class="foot">המקורות הנפוצים באתר: <span dir="ltr">${top.map(esc).join(" · ")}</span>. בכל דף ספורטאי/ת יש קישור למקור.</p>` : ""}
    <p class="foot">„דירוג או הישג” הוא דירוג עולמי רשמי כשיש כזה, ואחרת התוצאה הבולטת האחרונה (מסומנת „מיקום, לא דירוג”).</p>
    <h3>שלוש רמות ביטחון</h3>
    <dl class="facts trust-legend">${legend.map(([a, text]) => `<dt>${trustChip(a)}</dt><dd>${text}</dd>`).join("")}</dl>
    <h3>מה אוטומטי ומה לא</h3>
    <ul>
      <li><b>אוטומטי, פעם ביום:</b> דירוגים, תוצאות אחרונות, תחרויות קרובות.</li>
      <li><b>רק אחרי אישור של אדם:</b> שינוי שלב, ספורטאי/ת חדש/ה, הסרה מהרשימה, וכל נתוני המכסות.</li>
    </ul>
    <h3>תיקונים</h3>
    <p>כל דיווח נבדק מול מקור לפני שהוא מתפרסם.${typeof fixLogLive === "function" && fixLogLive() ? ` כל תיקון נרשם ב<a href="#corrections">יומן התיקונים</a>.` : ""} אין לנו גישה למידע שאינו פומבי.</p>
  </section>`;
}

const notFound = () => `<div class="empty"><h1 tabindex="-1">הדף לא נמצא</h1><p><a href="#home">חזרה לדף הראשי</a></p></div>`;

function freshness(){
  const ts = S.live ? S.lastRun : (S.generatedAt || S.lastRun);
  if (!ts) return "";
  const stale = daysSince(ts) > 1.5;
  const when = new Date(ts).toLocaleString("he-IL", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"});
  return `<span class="fresh ${stale ? "stale" : ""}"><i></i><span>${S.live ? "נתונים חיים · עדכון אוטומטי אחרון: " : "נכון ל־"}${when}</span></span>`;
}
const daysLeft = () => Math.max(0, Math.ceil((OPENING - Date.now()) / 864e5)).toLocaleString("he-IL");

function banner(){
  if (S.liveLost) return `<div class="banner">החיבור לנתונים החיים נותק. מוצגת הגרסה הציבורית האחרונה. רעננו את הדף כדי להתחבר מחדש.</div>`;
  const ts = S.generatedAt;
  if (!S.live && ts && daysSince(ts) > 2) return `<div class="banner">הנתונים לא עודכנו כבר ${Math.floor(daysSince(ts))} ימים, וייתכן שחלקם אינם עדכניים.</div>`;
  return "";
}

// ---------- review queue (editors) ----------
function reviewPanel(){
  if (!S.isAdmin) return "";
  const pend = S.proposals.filter(p => p.status === "pending");
  const note = `<p class="foot">את/ה רואה נתונים חיים. הציבור רואה את הפרסום האחרון, שמתעדכן בכל ריצה של העדכון היומי.</p>`;
  if (!pend.length) return `<section class="panel">${note}</section>`;
  return `<section class="panel review"><h2>ממתינים לאישורך (${pend.length})</h2>${note}
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

const FIELD_LABELS = {rank:"דירוג או הישג", next:"התחרות הבאה", nextDate:"תאריך התחרות", notes:"הערות", event:"מקצה", name:"שם",
  stage:"שלב", sportId:"ענף", quota:"מכסה"};
function describePatch(p, t){
  const labels = FIELD_LABELS;
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
    // An empty update patch changes nothing: writing updatedAt would only mark a verified record as stale.
    const empty = p.kind !== "create" && !Object.keys(p.patch || {}).length;
    if (approve && !empty) {
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
  $("fRankNum").value = Number.isInteger(a?.rankNum) ? String(a.rankNum) : ""; $("fRankList").value = str(a?.rankList);
  $("fRankAsOf").value = isDate(a?.rankAsOf) ? a.rankAsOf : "";
  $("fNext").value = str(a?.next); $("fNextDate").value = isDate(a?.nextDate) ? a.nextDate : "";
  $("fNotes").value = str(a?.notes); $("fSource").value = str(a?.source);
  $("archBtn").hidden = !a; $("archBtn").textContent = "הסרה מהרשימה";
  $("frmErr").hidden = true; $("frmWarn").hidden = true;
  // A correction only exists for a published record, so the fieldset is hidden for new athletes.
  $("fixSet").hidden = !a; $("fIsFix").checked = false; $("fixRows").hidden = true;
  $("fFixBy").value = "reader"; $("fFixAt").value = today(); $("fFixSrc").value = "";
  $("dlg").showModal();
}

async function logCorrection(fix){
  try {
    await S.db.collection("corrections").doc(fix.id).set({...fix, createdBy: S.uid || "manual"});
    editing.pendingFix = null;
    return true;
  } catch (e) {
    editing.pendingFix = fix;
    showFormErr("הרשומה עודכנה, אבל התיקון לא נרשם ביומן. לחצו שוב על „שמירה” כדי לרשום אותו.");
    return false;
  }
}

// The corrections/<id> doc for an edit marked as a correction (shape: docs/design/corrections-log.md §1),
// or a Hebrew error message. Values are stored raw; the log renders stage and sportId labels.
function correctionDoc(cur, v, patch){
  const src = $("fFixSrc").value.trim(), day = $("fFixAt").value, by = $("fFixBy").value;
  if (!safeUrl(src)) return "לתיקון חייב להיות מקור שמתחיל ב־https://";
  if (!isDate(day) || day > today()) return "תאריך קבלת הדיווח חסר או עתידי";
  const fields = FIX_FIELDS.filter(k => k in patch);
  if (!fields.length) return "התיקון צריך לשנות לפחות שדה אחד שמוצג באתר (לא רק קישור או שם באנגלית)";
  if (fields.length > 5) return "אפשר לתעד עד 5 שדות בתיקון אחד";
  const now = new Date().toISOString(), raw = (o, k) => k === "stage" ? String(stageOf(o)) : str(o[k]);
  return {
    // id: target, day and fields, plus the minute so two fixes on one day don't collide.
    id: `${cur.id}-${now.slice(0, 16).replace(/\D/g, "")}-${fields.join("-")}`.slice(0, 120),
    at: now,
    // A date-only report counts from the start of that day (UTC), so the 48-hour figure is never flattered.
    reportedAt: day === today() ? now : `${day}T00:00:00Z`,
    target: {kind: "athlete", id: cur.id, name: v.name || cur.name},
    changes: fields.map(k => ({field: k, wrong: raw(cur, k), right: raw(v, k)})),
    source: src, by,
  };
}

function formValues(){
  return {
    name: $("fName").value.trim(), name_en: $("fNameEn").value.trim(), sportId: $("fSportIn").value,
    event: $("fEvent").value.trim(), stage: +$("fStageIn").value, rank: $("fRank").value.trim(),
    rankNum: $("fRankNum").value.trim() === "" ? null : Number($("fRankNum").value), rankList: $("fRankList").value.trim(),
    rankAsOf: $("fRankAsOf").value,
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
  if (v.rankNum !== null && !(Number.isInteger(v.rankNum) && v.rankNum >= 1 && v.rankList && isDate(v.rankAsOf)))
    return showFormErr("מיקום בדירוג הוא מספר שלם מ־1 ומעלה, ונשמר רק יחד עם שם הרשימה ותאריך הפרסום שלה.");
  const stamp = {updatedAt: new Date().toISOString(), updatedBy: S.uid || "manual"};
  const col = S.db.collection("athletes");
  $("saveBtn").disabled = true;
  try {
    if (editing.pendingFix) {   // the record was saved; only its log entry failed
      if (await logCorrection(editing.pendingFix)) $("dlg").close();
      return;
    }
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
      const fix = $("fIsFix").checked ? correctionDoc({...editing, ...(cur || {})}, v, patch) : null;
      if (typeof fix === "string") return showFormErr(fix);
      if (patch.sportId) patch.sport = sportName(patch.sportId);
      const src = safeUrl(v.source) ? {source: v.source} : {};
      if ("stage" in patch) patch.history = historyWith(cur, {at: today(), kind: "stage", text: STAGES[v.stage], ...src});
      else if ("rank" in patch && v.rank) patch.history = historyWith(cur, {at: today(), kind: "rank", text: v.rank, ...src});
      if (fix) patch.history = historyWith({history: patch.history || cur?.history}, {at: today(), kind: "correction",
        text: "תוקן: " + fix.changes.map(c => FIELD_LABELS[c.field] || c.field).join(", "), source: fix.source});
      await col.doc(editing.id).update({...patch, ...stamp});
      // Written after the record, so the public log never shows a fix that didn't land.
      if (fix && !(await logCorrection(fix))) return;
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
  if (!archArmed) { archArmed = true; $("archBtn").textContent = "לחצו שוב לאישור ההסרה"; return; }
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

let renderedDay = "";
function route(){
  const h = currentRoute();
  renderedDay = today();
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
  else if (h === "about" || h === "about-trust") html = viewAbout(), nav = "about";
  else if ((h === "today" || /^day(-|$)/.test(h)) && typeof viewDay === "function") html = viewDay(h === "today" || h === "day" ? today() : h.slice(4)), nav = "calendar";
  // Before launch only editors see the log (as a preview); visitors get not-found and no links to it.
  else if (/^corrections(-|$)/.test(h) && typeof viewCorrections === "function" && (S.launchAt || S.isAdmin)) html = viewCorrections(h.slice(12)), nav = "about";
  else if (/^following(-|$)/.test(h) && typeof viewFollowing === "function") html = viewFollowing(h.slice(10)), nav = "following";
  else if (h === "quotas" && typeof viewQuotas === "function") html = viewQuotas(), nav = "sports";
  else if (h === "digest" && typeof viewDigest === "function") html = viewDigest(), nav = "updates";
  else if (/^admin(-|$)/.test(h) && S.isAdmin && S.live && typeof viewAdmin === "function") html = viewAdmin(h.slice(6)), nav = "admin";
  else html = notFound();
  if (html === notFound()) nav = "";   // sub-views (#sport-nope, #a-nope) return it too
  if (typeof followingDecorate === "function") html = followingDecorate(h, html);
  $("view").innerHTML = banner() + html;
  $("fixLink").innerHTML = fixLogLive() ? ` · <a href="#corrections">יומן התיקונים</a>` : "";
  if (focusTrust && S.loaded) {   // once per arrival, so data refreshes don't steal focus
    focusTrust = false;
    const el = document.getElementById("trustH");   // the About trust block (#48); before it lands the page top stays
    if (el) { el.tabIndex = -1; el.focus({preventScroll: false}); }
  }
  // Here, not in navigate(): a deep link's first render is the skeleton, and navigate() skips the re-render after load.
  const h1 = document.querySelector("#view h1")?.textContent.trim();
  document.title = h1 && h1 !== SITE_NAME ? `${h1} · ${SITE_NAME}` : SITE_NAME;
  $("adminLink").hidden = !(S.isAdmin && S.live);
  document.querySelectorAll(".links a").forEach(a => a.dataset.nav === nav ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  // On mobile the links row scrolls sideways; keep the current tab visible.
  document.querySelector(".links a[aria-current]")?.scrollIntoView({block: "nearest", inline: "nearest"});
  if (nav === "home") renderResults();
  return h;
}

let lastRoute = null, focusTrust = false;
function navigate(){
  // Filters last only while you stay on the calendar: arriving at it (from elsewhere or another sport) starts clean.
  const next = currentRoute();
  if (next !== lastRoute && /^calendar(-|$)/.test(next)) S.cal = {sport: "", qual: false, past: false};
  if (next !== lastRoute && next === "about-trust") focusTrust = true;
  const h = route();
  if (h === lastRoute) return;
  const first = lastRoute === null;
  lastRoute = h;
  scrollTo({top: 0, behavior: "auto"});
  // Move focus to the new page's heading so screen readers announce the page, not the whole view.
  if (!first && h !== "about-trust") document.querySelector("#view h1")?.focus({preventScroll: true});
  $("routeStatus").textContent = document.querySelector("#view h1")?.textContent || "";
}
// Data refreshes re-render in place without jumping the scroll position or losing search focus.
// Focus is restored by id (search box, filters, buttons with ids); the scroll position is kept explicitly.
// Re-rendering replaces #view, so focus is found again by a stable key: the id, else a data-* action attribute,
// else the link's href (with its index among equal matches). Open <details> are reopened by index.
const FOCUS_ATTRS = ["data-follow", "data-follow-sport", "data-edit", "data-add", "data-verify", "data-copy", "href"];
const attrSel = (k, v) => `[${k}="${str(v).replace(/["\\]/g, "\\$&")}"]`;
function focusKey(el){
  if (!el || el === document.body) return null;
  if (el.id) return {id: el.id};
  const k = FOCUS_ATTRS.find(a => el.getAttribute?.(a) != null);
  if (!k) return null;
  const sel = attrSel(k, el.getAttribute(k));
  return {sel, idx: Math.max(0, [...($("view").querySelectorAll?.(sel) || [])].indexOf(el))};
}
function refresh(){
  const el = document.activeElement, key = focusKey(el), y = window.scrollY;
  const open = [...($("view").querySelectorAll?.("details") || [])].map((d, i) => d.open ? i : -1).filter(i => i >= 0);
  let pos = null;
  try { pos = typeof el?.selectionStart === "number" ? el.selectionStart : null; } catch {}
  route();
  const details = [...($("view").querySelectorAll?.("details") || [])];
  open.forEach(i => { if (details[i]) details[i].open = true; });
  const again = !key ? null : key.id ? $(key.id) : (m => m[key.idx] || m[0])([...($("view").querySelectorAll?.(key.sel) || [])]);
  if (again && again !== el) {
    again.focus({preventScroll: true});
    if (pos !== null) try { again.setSelectionRange(pos, pos); } catch {}
  }
  if (typeof y === "number") scrollTo({top: y, behavior: "auto"});
}

// ---------- events ----------
addEventListener("hashchange", navigate);
document.addEventListener("input", e => {
  if (e.target.id === "q") { S.q = e.target.value; renderResults(); }
  if (e.target.id === "cSport") { S.cal.sport = e.target.value; history.replaceState(null, "", S.cal.sport ? "#calendar-" + S.cal.sport : "#calendar"); }
  if (e.target.id === "cQual") S.cal.qual = e.target.checked;
  if (e.target.id === "cPast") S.cal.past = e.target.checked;
  if (/^c(Sport|Qual|Past)$/.test(e.target.id) && $("calResults")) $("calResults").innerHTML = calendarResults();
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
    const msg = $(t.dataset.copyMsg || (t.dataset.copy === "mailAddr" ? "copyMsg2" : "copyMsg"));
    const done = ok => { msg.textContent = ok ? "הועתק." : "לא ניתן להעתיק אוטומטית. הטקסט מסומן, אפשר להעתיק ידנית."; if (!ok) input.select(); };
    try { navigator.clipboard.writeText(input.value).then(() => done(true), () => done(false)); } catch { done(false); }
  }
});
$("frm").addEventListener("submit", saveForm);
$("fIsFix").addEventListener("change", e => { $("fixRows").hidden = !e.target.checked; });
$("visitorBtn").addEventListener("click", () => setVisitorView(true));
$("visitorMsgClose").addEventListener("click", () => { $("visitorMsg").hidden = true; });
$("editModeBtn").addEventListener("click", () => setVisitorView(false));
$("archBtn").addEventListener("click", archive);
$("cancelBtn").addEventListener("click", () => $("dlg").close());
// Past Israel midnight the today strip and "live"/"past" labels are stale.
setInterval(() => { if (today() !== renderedDay) return refresh(); const d = $("days"); if (d) d.textContent = daysLeft(); }, 60e3);
// The skip link must not change the hash: the router would treat "#view" as an unknown page.
document.querySelector(".skip")?.addEventListener("click", e => { e.preventDefault(); $("view").focus(); });

// ---------- data ----------
function applySnapshot(d){
  S.generatedAt = str(d.generatedAt); S.lastRun = str(d.lastRun);
  S.sports = Array.isArray(d.sports) ? d.sports : [];
  S.athletes = Array.isArray(d.athletes) ? d.athletes : [];
  S.comps = (Array.isArray(d.competitions) ? d.competitions : []).filter(c => isDate(c.start));
  S.changes = Array.isArray(d.changes) ? d.changes : [];
  S.launchAt = isDate(str(d.launchAt).slice(0, 10)) ? str(d.launchAt) : "";
  // The export already drops pre-launch entries; this keeps the page right if an older export slips through.
  // Before launch (editors' preview) nothing is filtered.
  S.corrections = correctionsFrom(d.corrections).filter(c => !S.launchAt || Date.parse(c.at) >= Date.parse(S.launchAt));
  S.loaded = true;
  applyQuotas();
}

const fixLogLive = () => !!S.launchAt && typeof viewCorrections === "function";
// A correction without a source, target name or real change is dropped; reporters are never in the data.
function correctionsFrom(list){
  const kinds = ["athlete", "sport", "quota"], by = ["reader", "audit", "job"];
  return (Array.isArray(list) ? list : []).filter(c => c && typeof c === "object" && isDate(str(c.at).slice(0, 10))
      && kinds.includes(c.target?.kind) && str(c.target?.name).trim() && safeUrl(c.source) && by.includes(c.by) && Array.isArray(c.changes))
    .map(c => ({...c, at: str(c.at), reportedAt: str(c.reportedAt), target: {kind: c.target.kind, id: str(c.target.id), name: str(c.target.name)},
      changes: c.changes.filter(x => x && FIX_FIELDS.includes(x.field) && (str(x.wrong) || str(x.right))).slice(0, 5)
        .map(x => ({field: x.field, wrong: str(x.wrong).slice(0, 200), right: str(x.right).slice(0, 200)}))}))
    .filter(c => c.changes.length)
    .sort((a, b) => b.at.localeCompare(a.at)).slice(0, FIX_MAX);
}

// quotas.json is hand-curated and optional: a bad item is dropped, a bad file only hides the quota UI.
// Re-applied whenever sports change, since an item needs a known sportId.
let quotaFile = null;
const quotaCount = v => v == null || (Number.isInteger(v) && v >= 0);
// Optional; an over-long line is dropped but the item is kept.
const stakesOf = q => { const v = str(q.stakes).trim(); return v.length <= 140 ? v : ""; };
function applyQuotas(){
  const items = Array.isArray(quotaFile?.items) ? quotaFile.items : [];
  S.quotas = items.filter(q => q && typeof q === "object" && sportById(q.sportId) && QUOTA_STATUSES.includes(q.israelStatus)
      && safeUrl(q.source) && quotaCount(q.totalQuotas) && quotaCount(q.maxPerNOC)
      && (q.nextQuotaEvent == null || (typeof q.nextQuotaEvent === "object" && isDate(q.nextQuotaEvent.start))))
    .map(q => ({sportId: q.sportId, event: str(q.event), totalQuotas: q.totalQuotas ?? null, maxPerNOC: q.maxPerNOC ?? null,
      allocation: str(q.allocation), israelStatus: q.israelStatus, israelNote: str(q.israelNote), source: q.source, stakes: stakesOf(q),
      checkedAt: isDate(q.checkedAt) ? q.checkedAt : "",
      earnedAt: isDate(q.earnedAt) ? q.earnedAt : "",
      nextQuotaEvent: q.nextQuotaEvent ? {name: str(q.nextQuotaEvent.name), start: q.nextQuotaEvent.start,
        ...(isDate(q.nextQuotaEvent.end) && q.nextQuotaEvent.end >= q.nextQuotaEvent.start ? {end: q.nextQuotaEvent.end} : {})} : null}));
  S.quotasUpdatedAt = S.quotas.length ? str(quotaFile.updatedAt) : "";
  S.quotasUnpublished = Number.isInteger(quotaFile?.unpublished) && quotaFile.unpublished >= 0 ? quotaFile.unpublished : null;
}

async function loadQuotas(){
  try {
    const r = await fetch("quotas.json", {cache: "no-cache"});
    // 404 = not published yet (an empty list); anything else unusable is an error.
    quotaFile = r.status === 404 ? {items: []} : r.ok ? await r.json() : null;
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
  S.quotasLoaded = true; S.quotasError = !Array.isArray(quotaFile?.items);
  if (S.loaded) refresh();
}

// A dead live subscription must not keep showing stale data labelled "live".
function dropLive(){
  if (!S.live) return;
  S.live = false; S.liveLost = true;
  if (publicSnapshot) applySnapshot(publicSnapshot);
  refresh();
}

// Editors can preview the public site: nothing editor-only is set up (no DB, controls, review queue or #admin),
// so the page runs on data.json exactly as for a visitor. A reload applies the switch cleanly in both directions.
const VISITOR_KEY = "la28.viewAsVisitor";
function setVisitorView(on){
  store.set(VISITOR_KEY, on);
  if (store.get(VISITOR_KEY, !on) !== on) {   // storage blocked: a reload would land in the same mode
    $("visitorMsgText").textContent = "אי אפשר להחליף תצוגה: הדפדפן חוסם שמירה מקומית באתר הזה.";
    $("visitorMsg").hidden = false;
    return;
  }
  try { location.reload(); } catch {}
}

async function goLive(){
  try {
    const user = await window.claude?.use?.("user");
    if (!user || !(await user.canEdit())) return;
    if (store.get(VISITOR_KEY, false) === true) { $("visitorBar").hidden = false; $("visitorChip").hidden = false; return; }
    const db = await window.claude.use("db");
    if (!db) return;
    S.db = db; S.isAdmin = true; S.uid = await user.id();
    $("adminChip").hidden = false; $("visitorBtn").hidden = false;
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

// ---------- auto-refresh (public data) ----------
// An open tab re-reads data.json every REFRESH_MS and re-renders only when the export changed. Hidden tabs
// don't poll; on return the check runs at once if it's due. Editors get live DB snapshots instead.
const REFRESH_MS = 5 * 60e3;   // acceptance item 11: at most 5 minutes
let lastCheck = Date.now(), refreshTimer = 0;
async function checkForUpdate(){
  lastCheck = Date.now();
  if (S.live || !S.loaded) return;
  try {
    const prevQ = quotaFile, prevJson = JSON.stringify(quotaFile);
    const [r] = await Promise.all([fetch("data.json", {cache: "no-cache"}), loadQuotas()]);
    // A failed re-read keeps the quotas already shown; a 404 is an empty list (file removed on purpose), so they go.
    if (quotaFile === null) quotaFile = prevQ;
    const quotasChanged = JSON.stringify(quotaFile) !== prevJson;
    if (quotasChanged) applyQuotas();
    const d = r.ok ? await r.json() : null;
    if (S.live || !d || (str(d.generatedAt) === S.generatedAt && str(d.lastRun) === S.lastRun)) { if (quotasChanged) refresh(); return; }
    publicSnapshot = d;
    applySnapshot(d);
    refresh();
    showUpdateNote();
  } catch { /* keep what is on screen; freshness() turns stale after 1.5 days */ }
}
// A small visible note (also the screen-reader announcement); it hides itself after a few seconds.
let noteTimer = 0;
function showUpdateNote(){
  const n = $("updateNote");
  if (!n) return;
  n.textContent = "יש עדכון: הנתונים התחדשו";
  n.hidden = false;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { n.hidden = true; }, 8000);
}
function scheduleRefresh(){
  clearTimeout(refreshTimer);
  if (document.hidden) return;
  refreshTimer = setTimeout(async () => { await checkForUpdate(); scheduleRefresh(); }, Math.max(0, REFRESH_MS - (Date.now() - lastCheck)));
}
document.addEventListener("visibilitychange", scheduleRefresh);

navigate();
loadPublic();
goLive();
scheduleRefresh();
