// Public visitors read the static data.json snapshot (works signed-out, read-only by construction).
// Editors (canEdit) additionally get the live database, edit controls and the review queue.
"use strict";

// ---------- constants & helpers ----------
const STAGES = ["לפני חלון ההעפלה", "בחלון ההעפלה", "מכסה הושגה", "נבחר/ה לנבחרת"];
// One sentence per stage: under the athlete's track and in About's stage list (UX F2). Phrased as a definition, so it
// reads right both about one athlete and as a list.
const STAGE_HELP = [
  "יש סיכוי ריאלי להעפיל, וחלון ההעפלה בענף עוד לא נפתח.",
  "חלון ההעפלה בענף פתוח, ותוצאות ודירוגים נספרים להעפלה.",
  "הושגה מכסה (מקום באולימפיאדה) לפי הודעה רשמית של ההתאחדות הבין־לאומית. ברוב הענפים המכסה שייכת למדינה, לא לספורטאי/ת.",
  "הוועד האולימפי בישראל הודיע רשמית על הבחירה לנבחרת האולימפית.",
];
const OPENING = new Date("2028-07-14T00:00:00-07:00");
const PARIS_ATHLETES = 88;
const SITE_NAME = "הדרך ללוס אנג׳לס 28";
const SITE_URL = "https://yonatanyacobi.github.io/IL2LA28/";
const CONTACT_EMAIL = "il2la28.site@gmail.com";
// Corrections log (docs/design/corrections-log.md). The launch date comes only from data.json.launchAt
// (export_data.py LAUNCH_AT); reports go to CONTACT_EMAIL.
const FIX_FIELDS = ["name", "event", "rank", "next", "nextDate", "notes", "stage", "sportId", "quota"];
const FIX_MAX = 300;
const EDIT_FIELDS = ["name", "name_en", "sportId", "event", "stage", "rank", "rankNum", "rankList", "rankAsOf", "next", "nextDate", "notes", "source"];
const RANK_MAX_AGE_D = 60;
const HISTORY_MAX = 20, RESULTS_MAX = 60;   // = job/athlete_patch.py HISTORY_MAX, RESULTS_MAX
const QUOTA_STATUSES = ["earned", "in-contention", "outside", "unknown"];

const $ = id => document.getElementById(id);
const str = v => typeof v === "string" ? v : (v == null ? "" : String(v));
const esc = s => str(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl = u => /^https:\/\//i.test(str(u)) ? str(u) : "";
const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(str(d));
// Formatters are built once: building an Intl.DateTimeFormat costs far more than formatting (docs/perf/2026-10.md).
const FMT = new Intl.DateTimeFormat("he-IL", {day:"numeric", month:"short", year:"numeric"});
const FMT_SHORT = new Intl.DateTimeFormat("he-IL", {day:"numeric", month:"short"});
const IL_DAY = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Jerusalem"});
const fmt = d => isDate(d) ? FMT.format(new Date(d + "T12:00:00")) : "";
const fmtShort = d => isDate(d) ? FMT_SHORT.format(new Date(d + "T12:00:00")) : "";
const fmtShortY = d => isDate(d) && d.slice(0, 4) !== today().slice(0, 4) ? fmt(d) : fmtShort(d);
// Same-year ranges show the year once, at the end.
const fmtRange = (a, b) => !isDate(b) || a === b ? fmt(a) : (a.slice(0, 4) === b.slice(0, 4) ? fmtShort(a) : fmt(a)) + " – " + fmt(b);
// Israel's calendar date, so "live"/"past" don't flip at UTC midnight.
const today = () => IL_DAY.format(new Date());
const addDays = (d, n) => new Date(new Date(d + "T12:00:00").getTime() + n * 864e5).toISOString().slice(0, 10);
const daysSince = iso => (Date.now() - new Date(str(iso))) / 864e5;
const stageOf = a => Math.min(3, Math.max(0, Number(a.stage) | 0));
const heCmp = (a, b) => str(a).localeCompare(str(b), "he");
const plural = (n, one, many) => n === 1 ? one : `${n} ${many}`;
// A section's empty line (UX S5, components §9): what is known, plus at most one way on. `text` is trusted copy.
// Whole pages keep div.empty.
const emptyLine = (text, href, label) =>
  `<p class="muted">${text}${href && label ? ` <a href="${esc(href)}">${esc(label)}</a>` : ""}</p>`;
// The next day after `from` with Israelis on #day (day.js, loaded later), or "" when there is none or no day.js.
function nextIsraeliDay(from){
  if (typeof hasIsraelis !== "function") return "";
  for (let i = 1; i <= DAY_LOOKAHEAD; i++) if (hasIsraelis(addDays(from, i))) return addDays(from, i);
  return "";
}
const calEmpty = (text, sid) => emptyLine(text, sid ? `#calendar-${sid}` : "#calendar", "לוח התחרויות");
// "השתנה ב־HH:MM" (docs/design/changed-rows.md): a row whose signature differs from the previous render of the same
// page, compared only on an auto-refresh render, stays marked until the next navigation. Rows that are new count too.
// Only an advancing source time can date a change; supplementary documentation may retain the old export stamp.
const rowSigs = new Map(), changedRows = new Map();
const UNTIMED_CHANGE = "documentation-change"; // A string keeps game-log mark ordering compatible.
let diffRender = false, newlyChanged = 0, diffSourceTime;
const IL_TIME = new Intl.DateTimeFormat("he-IL", {hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem"});
const ilTime = ts => IL_TIME.format(new Date(ts));
function rowMark(key, sig){
  const ts = diffSourceTime ?? (S.generatedAt || S.lastRun);
  if (diffRender && rowSigs.get(key) !== sig && (ts === UNTIMED_CHANGE || (ts && !isNaN(Date.parse(ts))))) {
    if (!changedRows.has(key)) { changedRows.set(key, ts); newlyChanged++; }
    else if (ts === UNTIMED_CHANGE) changedRows.set(key, ts);
  }
  rowSigs.set(key, sig);
  const at = changedRows.get(key);
  // Out of the flow (styles.css), so visually it never touches the row's text; in the reading order it follows that text
  // directly, so an sr-only separator keeps "מקום 5" and "השתנה ב־" from running together.
  return at ? `<span class="pill chg"><span class="sr"> · </span>${at === UNTIMED_CHANGE ? "התיעוד השתנה" : `השתנה ב־<time datetime="${esc(at)}">${ilTime(at)}</time>`}</span>` : "";
}
const slug = s => str(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
// Every source label goes through host(). A long host (a CDN, a news subdomain) is cut to its registrable domain:
// the last 2 labels, or 3 under a .co.il-style second level ("sports.walla.co.il" → "walla.co.il").
// 17 keeps "ifsc.results.info", where the subdomain is the federation.
const HOST_MAX = 17, SECOND_LEVEL = /^(co|org|ac|gov|net|muni|k12)$/;
const shortHost = h => {
  const l = h.split("."), keep = l.length > 2 && l.at(-1).length === 2 && SECOND_LEVEL.test(l.at(-2)) ? 3 : 2;
  return h.length > HOST_MAX && l.length > keep ? l.slice(-keep).join(".") : h;
};
const host = u => { try { return shortHost(new URL(u).hostname.replace(/^www\./, "")); } catch { return "מקור"; } };
// Match key for search: keyboards type ' and " where the data has ׳ and ״ (and vice versa).
const searchKey = s => str(s).normalize("NFD").replace(/[֑-ׇֽֿׁׂׅׄ]/g, "")
  .replace(/[׳'`’‘]/g, "'").replace(/[״"“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();
const linkOut = (u, label = "מקור") => safeUrl(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(label)}<span class="sr"> (נפתח בחלון חדש)</span></a>` : "";

// Per-viewer conveniences only; the page must work when storage is blocked.
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  getArray(k){ const v = this.get(k, []); return Array.isArray(v) ? v : []; },
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
  fixOpen: new Set(),   // #corrections: older months the viewer expanded; reset on navigation
  q: "",
  follows: new Set(store.getArray("la28.follows")),
  // Previous visit; a first visit sets the baseline silently, so nothing is marked new.
  seenBefore: store.get("la28.seen", null),
};
store.set("la28.seen", new Date().toISOString());

// Lookup indexes (docs/perf/2026-10.md), rebuilt only when a source array is replaced. Every data load replaces
// S.athletes / S.sports / S.comps / S.quotas wholesale (nothing mutates them in place), so no invalidation hooks.
function memoOn(sources, build){
  let refs = null, value;
  return () => { const now = sources(); if (!refs || now.some((r, i) => r !== refs[i])) { refs = now; value = build(...now); } return value; };
}
const groupOn = (list, key) => { const m = new Map(); for (const x of list) { const k = key(x); m.has(k) ? m.get(k).push(x) : m.set(k, [x]); } return m; };
const firstById = list => { const m = new Map(); for (const x of list) if (!m.has(x.id)) m.set(x.id, x); return m; };   // as find(): first wins
const IDX = {
  sport: memoOn(() => [S.sports], firstById),
  athlete: memoOn(() => [S.athletes], firstById),
  athletesBySport: memoOn(() => [S.athletes], as => groupOn(as, a => a.sportId)),
  quotasBySport: memoOn(() => [S.quotas], qs => groupOn(qs, q => q.sportId)),
  compsBySport: memoOn(() => [S.comps], cs => groupOn(cs, c => c.sportId)),
};
const sportById = id => IDX.sport().get(id);
const athleteById = id => IDX.athlete().get(id);
const sportName = id => sportById(id)?.he || id;
const athletesOf = sid => (IDX.athletesBySport().get(sid) || []).slice();   // copies: callers sort them in place
const quotasOf = sid => (IDX.quotasBySport().get(sid) || []).slice();
const upcoming = () => { const t = today(); return S.comps.filter(c => (c.end || c.start) >= t).sort((a, b) => a.start.localeCompare(b.start)); };
const upcomingIn = sid => upcoming().filter(c => c.sportId === sid);
const isNew = a => !!S.seenBefore && str(a.updatedAt) > S.seenBefore;
const NEW_MARK = ` <span class="new">חדש</span>`;   // changed since this viewer's last visit (cards, #c-, the week)
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
  const line = t === "ok" ? `הפרטים הושוו ידנית למקור${src ? ` (${esc(host(src))})` : ""} ולא השתנו מאז.`
    : t === "stale" ? `מאז התעדכנו פרטים אוטומטית (${fmt(str(a.updatedAt).slice(0, 10))}). הם ייכללו בבדיקה הבאה.`
    : `הפרטים נאספו אוטומטית ממקורות פומביים, והבדיקה הידנית נעשית בהדרגה.${src ? " בינתיים כדאי להיעזר בקישור למקור." : ""}`;
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
// Stakes tied to a day or a competition (home, #day, #c-, digest) show only where Israel competes in that item: one
// of the item's own athletes (quotaAthletes: exact name in its text, copy-rules #307, or the same weight) has a
// nextDate or a session inside the item's quota event. Only an item that names nobody (e.g. a team event) falls back
// to any Israeli in the sport (sprint-7.md; the 20.10 men's team final, which Israel didn't reach, showed its stakes
// all day; on an Abu Dhabi day a weight with no Israeli entered showed them too).
function israelIn(q){
  const e = q.nextQuotaEvent, end = quotaEventEnd(q);
  if (!e || !isDate(e.start) || !end) return false;
  const inside = d => e.start <= d && d <= end;
  const named = quotaAthletes(q), pool = named.length ? named : athletesOf(q.sportId), ids = new Set(pool.map(a => a.id));
  return pool.some(a => isDate(a.nextDate) && inside(a.nextDate))
    || (typeof exportedSessions === "function" && exportedSessions().some(s => s.sportId === q.sportId && inside(s.day)
      && s.athletes.some(a => ids.has(a.id))));
}
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

// Entry points to the competition page (event-page.md §3): the name links to #c-<id> when event.js is loaded.
// Shared with day.js and quotas.js; `cls` is optional (e.g. "hlink" for heading links, components.md).
const compLink = (c, text, cls = "") => c?.id && typeof viewEvent === "function" ? `<a href="#c-${esc(c.id)}"${cls ? ` class="${cls}"` : ""}>${text}</a>` : text;

// A free-text competition mention (an athlete's "next", a quota event's name), linked to the competition running in
// that sport on that date. The text is the link only when it names that competition, so the link text describes the
// target; otherwise the text stays plain and the competition's own name is the link beside it.
// Free text adds a city (", רוטרדם"), a year or a parenthetical the official name lacks, and mixes - – ־.
const nameKey = s => str(s).toLowerCase().replace(/\([^)]*\)/g, " ").split(",")[0].replace(/\b(19|20)\d\d\b/g, " ")
  .replace(/[‐-―־]/g, "-").replace(/\s+/g, " ").replace(/^[\s-]+|[\s-]+$/g, "");
const sameName = (x, y) => { const a = nameKey(x), b = nameKey(y); return !!a && !!b && (a.includes(b) || b.includes(a)); };
function compMention(text, sportId, date){
  const c = isDate(date) && typeof compOn === "function" ? compOn(sportId, date) : null;
  if (!c || compLink(c, "") === "") return esc(text);
  return sameName(text, c.name) ? compLink(c, esc(text)) : `${esc(text)} · ${compLink(c, esc(c.name))}`;
}
const nextCompFact = a => compMention(a.next, a.sportId, a.nextDate);
const pastNextDate = a => realDate(a.nextDate) && a.nextDate < today();
const nextDateLabel = a => pastNextDate(a) ? "התחרות שצוינה ברשומה" : "התחרות הבאה";
function refreshAthleteNextLabels(){
  for (const node of $("view").querySelectorAll("[data-athlete-next]")) {
    const a = S.athletes.find(a => a.id === node.dataset.athleteNext);
    if (!a) continue;
    const label = node.querySelector("[data-next-label]"), note = node.querySelector("[data-next-past]");
    const text = nextDateLabel(a) + ": ", hidden = !pastNextDate(a);
    if (label && label.textContent !== text) label.textContent = text;
    if (note && note.hidden !== hidden) note.hidden = hidden;
  }
}

function compRow(c, withSport){
  const t = today(), end = c.end || c.start, live = c.start <= t && end >= t, past = end < t;
  return `<div class="comp ${past ? "past" : ""}">
    <span class="when">${fmtRange(c.start, c.end)}</span>
    <span class="what"><b>${withSport ? `<a href="#sport-${esc(c.sportId)}">${esc(sportName(c.sportId))}</a> · ` : ""}${compLink(c, esc(c.name))}</b>
      <span>${esc(c.location)}${c.notes ? " · " + esc(c.notes) : ""}${safeUrl(c.source) ? " · " + linkOut(c.source) : ""}</span></span>
    <span>${live ? `<span class="pill s-live">מתקיימת עכשיו</span>` : past ? `<span class="pill ended">הסתיימה</span>` : c.qualifying ? `<span class="pill open">העפלה</span>` : ""}</span>
  </div>`;
}

// Followed marker for every component (components.md): visible ★ plus screen-reader text.
const STAR = `<span class="star-on" aria-hidden="true">★</span><span class="sr">במעקב שלך, </span>`;

// components.md §6: a card for grids; a page-specific status goes inside it, as the last line.
function athleteCard(a, status = ""){
  const s = stageOf(a), fav = S.follows.has(a.id);
  return `<a class="card" href="#a-${esc(a.id)}">
    <span class="nm">${fav ? `<span class="star-on" aria-label="במעקב שלך">★</span> ` : ""}${esc(a.name)}${isNew(a) ? NEW_MARK : ""}</span>
    ${a.event ? `<span class="ev">${esc(a.event)}</span>` : ""}
    <span><span class="pill st${s}">${STAGES[s]}</span> ${trustChip(a, "card")}</span>
    ${a.rank ? `<span class="ln"><span>דירוג או הישג: </span>${esc(a.rank)}</span>` : ""}
    ${a.next ? `<span class="ln" data-athlete-next="${esc(a.id)}"><span data-next-label>${nextDateLabel(a)}: </span>${esc(a.next)}${realDate(a.nextDate) ? ` (${fmtShort(a.nextDate)})` : ""}<span data-next-past ${pastNextDate(a) ? "" : "hidden"}> · המועד המתועד חלף</span></span>` : ""}
    ${status ? `<span class="ln">${status}</span>` : ""}
  </a>`;
}

// components.md §6: a row for side columns or more than 4 athletes, in <ul class="rows">; the status is the last cell.
function athleteRow(a, status = ""){
  return `<li><span class="d"></span><span class="t">${S.follows.has(a.id) ? STAR + " " : ""}<a href="#a-${esc(a.id)}">${esc(a.name)}</a>${isNew(a) ? NEW_MARK : ""}${
    a.event ? `<small><bdi>${esc(a.event)}</bdi></small>` : ""}</span><span>${status}</span></li>`;
}

function changeRow(c){
  const txt = esc(c.text);
  const body = c.athleteId && S.athletes.some(a => a.id === c.athleteId) ? `<a href="#a-${esc(c.athleteId)}">${txt}</a>` : txt;
  const date = typeof c.at !== "string" ? "" : isUtc(c.at) && realDate(c.at.slice(0, 10)) ? ilDate(c.at) : realDate(c.at) ? c.at : "";
  return `<li><span class="d">${fmt(date)}</span><span class="t">${body}</span><span></span></li>`;
}

const TODAY_MAX = 6, SERIES_DAYS = 31, STAKES_MAX = 2;   // STAKES_MAX: quota lines per competition on #day
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
      <span class="t"><a href="#sport-${esc(g.sportId)}">${esc(sportName(g.sportId))}</a> · ${compMention(g.name, g.sportId, g.start)}
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
  const names = who.length === 0 ? (n === 1 ? "ספורטאי/ת או נבחרת אחת ברשימה בענף" : `${n} ספורטאים ונבחרות ברשימה בענף`)
    : who.length > 3 ? `${who.length} ספורטאים ונבחרות`
    : who.sort((a, b) => heCmp(a.name, b.name)).map(a => `<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`).join(", ");
  return `<p class="next-up"><b>הבא בתור:</b> <a href="#sport-${esc(c.sportId)}">${esc(sportName(c.sportId))}</a> · ${compLink(c, esc(c.name))} · ${fmtRange(c.start, c.end)} · ${names}${c.qualifying ? ` · <span class="pill open">העפלה</span>` : ""}</p>`;
}

// F3 (first-visitor audit): the hero's line also says where the data comes from and how much was checked by hand,
// in place of the cadence; when stale or with no check time, those parts stay after freshLine()'s own wording.
const heroFresh = (hasToday, verified) => freshLine(hasToday, ["ממקורות רשמיים",
  verified ? `${verified} מתוך ${S.athletes.length} ${verified === 1 ? "נבדק/ה" : "נבדקו"} ידנית` : "", `<a href="#about-trust">איך אנחנו בודקים</a>`]);

// ---------- views ----------
function viewHome(){
  const {counts, html: bar} = stageBar(S.athletes);
  const quota = counts[2] + counts[3];
  const t = today(), rows = todayRows();
  const hub = typeof homeNow === "function";
  const inToday = new Set(hub ? daySessions(t).flatMap(s => s.athletes.map(a => a.id)) : []);
  const mine = S.athletes.filter(a => S.follows.has(a.id)).sort((a, b) => heCmp(a.name, b.name));
  const mineNew = mine.filter(isNew).length;
  const mineSports = S.sports.filter(s => followsSport(s.id)).sort((a, b) => heCmp(a.he, b.he));
  const colors = ["var(--stage0)", "var(--blue)", "var(--sun)", "var(--ok)"];
  const verified = S.athletes.filter(a => trustOf(a) !== "auto").length;
  // PM on #171: a quota earned in the last 7 days is the biggest news, so it goes above "היום".
  const wonWeek = hub ? S.quotas.filter(q => q.israelStatus === "earned" && q.earnedAt >= addDays(t, -6) && q.earnedAt <= t) : [];
  const wonFirst = wonWeek.length > 0;
  // PM on #171 (Gil P2): on phones the full panel would push "היום" off the first screen, so a one-line link
  // stands in above it and the panel moves below the results (CSS order; desktop keeps it on top).
  const wonLine = !wonWeek.length ? "" : wonWeek.length === 1
    ? `<p class="won-compact"><a href="#sport-${esc(wonWeek[0].sportId)}">✓ מכסה חדשה לישראל: ${esc(sportName(wonWeek[0].sportId))} · <bdi>${esc(wonWeek[0].event)}</bdi> (${fmtShort(wonWeek[0].earnedAt)})</a></p>`
    : `<p class="won-compact"><a href="#quotas">✓ ${wonWeek.length} מכסות חדשות לישראל ב־7 הימים האחרונים</a></p>`;
  return `
  <section class="hero">
    <div>
      <div class="hero-title"><h1 tabindex="-1">הדרך ללוס אנג׳לס 28</h1><a class="tag" href="#about">מעקב לא רשמי · מה זה?</a></div>
      <p class="muted hero-sub">מעקב אחרי מסלול ההעפלה של ספורטאיות, ספורטאים ונבחרות מישראל לאולימפיאדת לוס אנג׳לס, 14–30 ביולי 2028.</p>
      ${hub ? heroFresh(inToday.size > 0, verified) : freshness()}
      ${nextUpLine(rows)}
      <button class="btn ghost small" type="button" data-home-search aria-controls="q">חיפוש באתר</button>
    </div>
    <div class="count"><b class="digits" id="days">${daysLeft()}</b><span>ימים לטקס הפתיחה</span></div>
  </section>
  ${wonFirst ? `${wonLine}<div class="home-top">${wonPanel()}${homeNow()}</div>` : hub ? homeNow() : ""}
  ${hub ? weekPanel() : ""}
  ${mine.length || mineSports.length ? `<section class="panel">
      <div class="sec-head"><h2>במעקב שלי</h2>${mineNew ? `<span class="new">${mineNew} עודכנו מאז הביקור הקודם</span>` : ""}</div>
      ${mineSports.length ? `<div class="chips" role="group" aria-labelledby="mineSportsL"><span class="chips-lbl" id="mineSportsL">ענפים במעקב:</span>${mineSports.map(s => `<a href="#sport-${esc(s.id)}">${esc(s.he)}</a>`).join("")}</div>` : ""}
      ${mine.length ? `<div class="cards">${mine.map(athleteCard).join("")}</div>` : ""}</section>` : ""}
  <input class="search" id="q" type="search" placeholder="חיפוש ספורטאי/ת, נבחרת, ענף או תחרות" aria-label="חיפוש" aria-describedby="qCount" value="${esc(S.q)}">
  <p class="sr" id="qCount" aria-live="polite"></p>
  <div id="results"></div>
  ${wonFirst ? "" : wonPanel()}
  ${closestPanel(rows)}
  ${reviewPanel()}
  <section class="panel" aria-label="התקדמות בהעפלה">
    <p class="kpi">${S.athletes.length === 1 ? "ספורטאי/ת או נבחרת אחת" : `<b>${S.athletes.length}</b> ספורטאים ונבחרות`} ברשימה · <b>${counts[1]}</b> בחלון העפלה פתוח · <b>${quota}</b> עם מכסה</p>
    ${quotaKpi()}
    ${bar}
    <ul class="legend">${STAGES.map((s, i) => `<li><i style="background:${colors[i]}"></i>${s} <b>${counts[i]}</b></li>`).join("")}</ul>
    <p class="foot"><a href="#about">מה אומרים השלבים?</a></p>
    <p class="foot">${quota ? "" : "טרם הושגו מכסות. "}לשם השוואה: ישראל שלחה לפריז 2024 ${PARIS_ATHLETES} ספורטאיות וספורטאים. נבחרת נספרת כאן פעם אחת.</p>
  </section>
  <section class="panel">
    <div class="sec-head"><h2>מה התעדכן</h2><span class="actions">${typeof viewDigest === "function" ? `<a href="#digest">תקציר שבועי לשיתוף</a>` : ""}<a href="#updates">כל העדכונים</a></span></div>
    ${S.changes.length ? `<ul class="rows">${S.changes.slice(0, 5).map(changeRow).join("")}</ul>` : calEmpty("עוד אין עדכונים.")}
  </section>
  ${S.seenBefore && !mine.length && !mineSports.length ? `<p class="foot">טיפ: לחצו על ☆ בדף של ספורטאי/ת, נבחרת או ענף כדי לעקוב, והמעקב שלכם יופיע כאן. הוא נשמר רק בדפדפן הזה.</p>` : ""}`;
}

const SEARCH_MAX = 24;
const HOME_SEARCH_DETAILS = ["homeSearchAthletesOverflow", "homeSearchCompetitionsOverflow"];
function renderResults(){
  const box = $("results");
  if (!box) return;
  const q = searchKey(S.q);
  if (!q) { box.innerHTML = ""; $("qCount").textContent = ""; return; }
  const sportKey = s => [s.id, s.he, s.en].map(str).join(" ");
  const sports = S.sports.filter(s => searchKey(sportKey(s)).includes(q));
  const hits = S.athletes.filter(a => searchKey([a.name, a.name_en, a.event, sportKey(sportById(a.sportId) || {id: a.sportId})].map(str).join(" ")).includes(q));
  const t = today(), end = c => c.end || c.start;
  const competitions = S.comps.filter(c => searchKey([c.name, c.location, sportKey(sportById(c.sportId) || {id: c.sportId})].map(str).join(" ")).includes(q))
    .sort((a, b) => (end(a) < t) - (end(b) < t)
      || (end(a) < t ? end(b).localeCompare(end(a)) : a.start.localeCompare(b.start)) || heCmp(a.name, b.name));
  $("qCount").textContent = `נמצאו ${hits.length === 1 ? "ספורטאי/ת או נבחרת אחת" : `${hits.length} ספורטאים ונבחרות`} ${sports.length === 1 ? "וענף אחד" : `ו־${sports.length} ענפים`} ${competitions.length === 1 ? "ותחרות אחת" : `ו־${competitions.length} תחרויות`}`;
  box.innerHTML = `<section class="panel"><h2>תוצאות חיפוש</h2>
    ${sports.length ? `<div class="chips">${sports.map(s => `<a href="#sport-${esc(s.id)}">${esc(s.he)}</a>`).join("")}</div>` : ""}
    ${hits.length ? `<div class="cards">${hits.slice(0, SEARCH_MAX).map(athleteCard).join("")}</div>
    ${hits.length > SEARCH_MAX ? `<details id="homeSearchAthletesOverflow"><summary id="homeSearchAthletesMore">${hits.length - SEARCH_MAX === 1 ? "עוד ספורטאי/ת או נבחרת אחת שמתאימים לחיפוש" : `עוד ${hits.length - SEARCH_MAX} ספורטאים ונבחרות שמתאימים לחיפוש`}</summary><div class="cards">${hits.slice(SEARCH_MAX).map(athleteCard).join("")}</div></details>` : ""}` : ""}
    ${competitions.length ? `<h3>תחרויות (${competitions.length})</h3>${competitions.slice(0, SEARCH_MAX).map(c => compRow(c, true)).join("")}
      ${competitions.length > SEARCH_MAX ? `<details id="homeSearchCompetitionsOverflow"><summary id="homeSearchCompetitionsMore">${competitions.length - SEARCH_MAX === 1 ? "עוד תחרות אחת שמתאימה לחיפוש" : `עוד ${competitions.length - SEARCH_MAX} תחרויות שמתאימות לחיפוש`}</summary>${competitions.slice(SEARCH_MAX).map(c => compRow(c, true)).join("")}</details>` : ""}` : ""}
    ${!hits.length && !sports.length && !competitions.length ? emptyLine("לא נמצאו ספורטאים, נבחרות, ענפים או תחרויות שמתאימים לחיפוש.", "#calendar", "לוח התחרויות") : ""}
  </section>`;
}

let sportsFollowedOnly = false;
function viewSports(){
  const shown = s => !sportsFollowedOnly || S.followSports.has(s.id);
  const withA = S.sports.filter(s => athletesOf(s.id).length && shown(s));
  const without = S.sports.filter(s => !athletesOf(s.id).length && shown(s)).sort((a, b) => heCmp(a.he, b.he));
  // One pass over the upcoming competitions, not one per sort comparison.
  const firstStart = new Map();
  for (const c of upcoming()) if (!firstStart.has(c.sportId)) firstStart.set(c.sportId, c.start);
  const nextStart = s => firstStart.get(s.id) || "9999";
  withA.sort((a, b) => followsSport(b.id) - followsSport(a.id) || nextStart(a).localeCompare(nextStart(b)) || heCmp(a.he, b.he));
  return `
  <h1 tabindex="-1">ענפים</h1>
  <div class="toolbar"><label class="chk"><input type="checkbox" id="sportsFollowedOnly" ${sportsFollowedOnly ? "checked" : ""} aria-describedby="sportsLibraryCount"> רק הענפים שבמעקב שלי</label>
    <button class="btn ghost small" type="button" data-sports-library-reset ${sportsFollowedOnly ? "" : "hidden"}>הצגת כל הענפים</button></div>
  <p class="muted" id="sportsLibraryCount" role="status">מציגים ${withA.length + without.length} מתוך ${S.sports.length} ענפים</p>
  <p class="muted">${withA.length === 1 ? "ענף אחד עם ספורטאים ונבחרות מישראל ברשימה." : `${withA.length} ענפים עם ספורטאים ונבחרות מישראל ברשימה.`} ברשימה עם סגל, ענפים שבמעקב שלך מופיעים תחילה; בתוך כל קבוצה המיון לפי התחרות הקרובה ושם הענף. תחרות בענף אינה אישור להשתתפות ישראלית.${S.quotas.length ? ` <a href="#quotas">תמונת המכסות</a>` : ""}</p>
  ${sportsFollowedOnly && !withA.length && !without.length ? `<div class="empty"><p>${S.followSports.size ? "אין ענפים מהמעקב שלך ברשימה הנוכחית." : "עוד אין ענפים במעקב שלך. אפשר לבחור מעקב בדף של ענף."} אפשר להציג את כל הענפים באמצעות הכפתור למעלה.</p></div>` : ""}
  <ul class="sports">${withA.map(s => {
    const list = athletesOf(s.id), ws = winStatus(s.window), nc = upcomingIn(s.id)[0], fresh = list.filter(isNew).length;
    return `<li><a class="sport" href="#sport-${esc(s.id)}">
      <span class="top"><h2>${esc(s.he)}</h2>${ws ? `<span class="pill ${ws[0]}">חלון העפלה ${ws[1]}</span>` : ""}</span>
      ${S.followSports.has(s.id) ? '<span class="meta"><span aria-hidden="true">★</span> במעקב שלי</span>' : ""}
      ${stageBar(list, true).html}
      ${quotaCardSummary(s.id)}
      <span class="meta">${list.length} ברשימה${fresh ? ` · <span class="new">${fresh} עודכנו</span>` : ""}${nc ? ` · התחרות הבאה: ${esc(nc.name)} (${fmtShort(nc.start)})` : ""}</span>
    </a></li>`;
  }).join("")}</ul>
  ${without.length ? `<section class="panel"><h2>ענפים בלי ספורטאים או נבחרות מישראל ברשימה כרגע</h2>
    <div class="chips">${without.map(s => `<a href="#sport-${esc(s.id)}">${esc(s.he)}${S.followSports.has(s.id) ? ' · <span aria-hidden="true">★</span> במעקב שלי' : ""}</a>`).join("")}</div></section>` : ""}`;
}

const SPORT_UPCOMING_ROWS = 6;
function sportUpcomingSessions(id){
  const t = today(), through = addDays(t, 13);
  return (typeof exportedSessions === "function" ? exportedSessions() : [])
    .filter(s => s.sportId === id && t <= s.day && s.day <= through && ["before", "competing"].includes(sessionState(s, s.day)))
    .sort((x, y) => x.day.localeCompare(y.day) || byStart(x.startUtc, y.startUtc));
}

function sportUpcomingSection(id){
  const sessions = sportUpcomingSessions(id), more = sessions.length - SPORT_UPCOMING_ROWS;
  const row = s => `<li><span class="d"><a href="#day-${esc(s.day)}">${esc(fmt(s.day))}</a><br>${s.startUtc
    ? timeTag(s.startUtc, hhmm(s.startUtc)) : "השעה טרם פורסמה"}</span>
    <span class="t">${compLink(s.comp, esc(s.comp.name))}${s.phase ? `<small><bdi>${esc(s.phase)}</bdi></small>` : ""}
      <small>${s.athletes.map(a => `<a href="#a-${esc(a.id)}">${esc(a.name)}</a>`).join(", ")}</small>
      ${safeUrl(s.source) ? `<small>${linkOut(s.source, "לוח הזמנים")}</small>` : ""}</span>
    <span>${statusChip(sessionState(s, s.day))}</span></li>`;
  return `<section class="panel" aria-labelledby="sportUpcomingH"><h2 id="sportUpcomingH">ההופעות הקרובות בענף</h2>
    ${sessions.length ? `<ul class="rows">${sessions.slice(0, SPORT_UPCOMING_ROWS).map(row).join("")}</ul>
      ${more > 0 ? `<details><summary>${more === 1 ? "הצגת עוד הופעה אחת" : `הצגת עוד ${more} הופעות`}</summary><ul class="rows">${sessions.slice(SPORT_UPCOMING_ROWS).map(row).join("")}</ul></details>` : ""}`
      : `<p class="muted">אין הופעות ידועות בענף בשבועיים הקרובים.</p><p><a href="#calendar-${esc(id)}">ללוח התחרויות בענף</a></p>`}
  </section>`;
}

const sportRosterQueries = new Map();
const sportRosterStages = new Map();
function sportPastCompetitionsSection(id){
  const t = today(), end = c => c.end || c.start;
  const rows = S.comps.filter(c => c.sportId === id && end(c) < t)
    .sort((a, b) => end(b).localeCompare(end(a)) || b.start.localeCompare(a.start) || heCmp(a.name, b.name));
  if (!rows.length) return "";
  const more = rows.slice(5);
  return `<section class="stack" aria-labelledby="sportPastCompetitionsH">
    <h2 id="sportPastCompetitionsH">תחרויות שהסתיימו בענף</h2>
    <p class="muted">${plural(rows.length, "תחרות אחת", "תחרויות")} ברשימה. תחרות בענף אינה אישור להשתתפות הסגל או הנבחרת.</p>
    ${rows.slice(0, 5).map(c => compRow(c, false)).join("")}
    ${more.length ? `<details id="sportPastCompetitionsOverflow"><summary id="sportPastCompetitionsMore">${plural(more.length, "עוד תחרות אחת שהסתיימה", "תחרויות נוספות שהסתיימו")}</summary>${more.map(c => compRow(c, false)).join("")}</details>` : ""}
  </section>`;
}

function viewSport(id){
  const s = sportById(id);
  if (!s) return notFound();
  const list = athletesOf(id).sort((a, b) => stageOf(b) - stageOf(a) || heCmp(a.event, b.event) || heCmp(a.name, b.name));
  const value = sportRosterQueries.get(id) || "", query = searchKey(value);
  const stage = sportRosterStages.get(id) ?? "";
  const matches = list.filter(a => (stage === "" || stageOf(a) === Number(stage))
    && (!query || searchKey([a.name, a.name_en, a.event].map(str).join(" ")).includes(query)));
  const ws = winStatus(s.window), w = s.window;
  const comps = upcomingIn(id);
  let html = `
  <p class="crumb"><a href="#sports"><span aria-hidden="true">→</span>&nbsp;כל הענפים</a></p>
  <div class="sec-head"><h1 tabindex="-1">${esc(s.he)}</h1>${S.isAdmin ? `<button class="btn small" data-add="${esc(id)}">+ הוספת ספורטאי/ת</button>` : ""}</div>
  <section class="panel">
    <div class="sec-head"><h2>שיטת ההעפלה</h2>${ws ? `<span class="pill ${ws[0]}">חלון העפלה ${ws[1]}</span>` : ""}</div>
    ${w ? `<p class="muted">${isDate(w.to) ? fmtRange(w.from, w.to) : fmt(w.from) + " – מועד סיום טרם פורסם"}</p>
      ${w.summary ? `<p>${esc(w.summary)}</p>` : ""}${w.source ? `<p class="foot">${linkOut(w.source, "שיטת ההעפלה הרשמית")}</p>` : ""}`
      : `<p class="muted">עוד לא נאספו פרטים על שיטת ההעפלה בענף הזה.</p>`}
  </section>
  ${typeof standingsPanel === "function" ? standingsPanel(id) : ""}
  ${quotaSection(id)}
  ${sportUpcomingSection(id)}
  ${typeof sportRecentResultsSection === "function" ? sportRecentResultsSection(id) : ""}
  <section class="stack" id="sportRoster" aria-labelledby="sportRosterH">
    <h2 id="sportRosterH">${list.length ? `ספורטאים ונבחרות (${list.length})` : "ספורטאים ונבחרות"}</h2>
    <div class="toolbar"><label for="sportRosterSearch">חיפוש בספורטאים ובמקצים בענף</label><input type="search" id="sportRosterSearch" value="${esc(value)}" aria-describedby="sportRosterCount">
      <label for="sportRosterStage">שלב בסגל הענף</label><select id="sportRosterStage" aria-describedby="sportRosterCount"><option value="">כל השלבים</option>${STAGES.map((label, i) => `<option value="${i}" ${stage === String(i) ? "selected" : ""}>${esc(label)} (${list.filter(a => stageOf(a) === i).length})</option>`).join("")}</select>
      <button class="btn ghost small" type="button" id="sportRosterReset" data-sport-roster-reset ${value || stage !== "" ? "" : "hidden"}>איפוס סינון הסגל</button></div>
    <p class="muted" id="sportRosterCount" role="status">מציגים ${matches.length} מתוך ${list.length} ספורטאים ונבחרות</p>
    ${matches.length ? `<div class="cards">${matches.map(athleteCard).join("")}</div>` : (query || stage !== "") && list.length
      ? `<div class="empty"><p>${stage !== "" ? "לא נמצאו ספורטאים או מקצים שמתאימים למסננים בענף. אפשר לאפס את סינון הסגל." : "לא נמצאו ספורטאים או מקצים שמתאימים לחיפוש בענף."}</p></div>`
      : calEmpty("אין כרגע ספורטאים או נבחרות מישראל ברשימה בענף הזה.", id)}
  </section>
  <section class="stack">
    <div class="sec-head"><h2 id="sportCompetitionsH">תחרויות קרובות בענף</h2>${comps.length > 5 ? `<a href="#calendar-${esc(id)}">כל ${comps.length} התחרויות</a>` : ""}</div>
    ${comps.slice(0, 5).map(c => compRow(c, false)).join("") || calEmpty("אין תחרויות קרובות ידועות בענף.", id)}
  </section>
  ${sportPastCompetitionsSection(id)}
  <section class="panel" aria-labelledby="sportShareH">
    <h2 id="sportShareH">שיתוף הענף</h2>
    <p class="muted">הקישור מציג את הענף המלא ואת שיטת ההעפלה, ללא בחירות אישיות או סינון הסגל.</p>
    <label for="sportShareUrl">קישור לענף ולשיטת ההעפלה</label>
    <div class="share"><input id="sportShareUrl" readonly value="${esc(`${SITE_URL}#sport-${encodeURIComponent(id)}`)}" dir="ltr"><button class="btn ghost small" type="button" data-copy="sportShareUrl" data-copy-msg="sportShareMsg">העתקת הקישור</button></div>
    <p class="foot" id="sportShareMsg" aria-live="polite"></p>
  </section>`;
  const sections = [["sportUpcomingH", "הופעות קרובות"], ["sportRecentResultsH", "תוצאות מתועדות"],
    ["sportRosterH", "ספורטאים ונבחרות"], ["sportCompetitionsH", "תחרויות בענף"],
    ["sportPastCompetitionsH", "תחרויות שהסתיימו"]]
    .filter(([target]) => html.includes(`<h2 id="${target}">`));
  for (const [target] of sections) html = html.replace(`<h2 id="${target}">`, `<h2 id="${target}" tabindex="-1">`);
  const navigation = `<div class="toolbar" role="group" aria-label="מעבר למקטע בענף">${sections.map(([target, label]) =>
    `<button class="btn ghost small" type="button" id="sportGo-${target}" data-sport-section="${target}">${label}</button>`).join("")}</div>`;
  return html.replace('<section class="panel">', navigation + '<section class="panel">');
}

function athleteSiteUpdates(a){
  const changes = S.changes.filter(c => c && typeof c.athleteId === "string" && c.athleteId === a.id);
  if (!changes.length) return "";
  const more = changes.slice(5);
  return `<section class="panel" aria-labelledby="athleteUpdatesH">
    <h2 id="athleteUpdatesH">עדכוני האתר על הספורטאי/ת או הנבחרת</h2>
    <p class="muted">עדכונים שפורסמו באתר, בנפרד מיומן התוצאות וההיסטוריה. <a href="#updates">לכל עדכוני האתר</a></p>
    <ul class="rows">${changes.slice(0, 5).map(changeRow).join("")}</ul>
    ${more.length ? `<details><summary>${more.length === 1 ? "עוד עדכון אחד על הרשומה" : `עוד ${more.length} עדכונים על הרשומה`}</summary><ul class="rows">${more.map(changeRow).join("")}</ul></details>` : ""}
  </section>`;
}

function viewAthlete(id){
  const a = S.athletes.find(x => x.id === id);
  if (!a) return notFound();
  const s = stageOf(a), sp = sportById(a.sportId), fav = S.follows.has(id);
  const upd = str(a.updatedAt).slice(0, 10), old = upd && daysSince(a.updatedAt) > 30;
  const allComps = upcomingIn(a.sportId), comps = allComps.slice(0, 3);
  // Results the game log shows (gamelog.js) leave the timeline; it keeps the rest, including unsourced results.
  const hist = (Array.isArray(a.history) ? a.history : []).filter(h => h && typeof h === "object" && !Array.isArray(h)
    && isDate(h.at) && !(typeof inGameLog === "function" && inGameLog(h))).slice().reverse();
  const link = `${SITE_URL}#a-${id}`;
  let html = `
  <p class="crumb"><a href="#sport-${esc(a.sportId)}"><span aria-hidden="true">→</span>&nbsp;${esc(sp?.he || "ענף")}</a></p>
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
    <p class="muted stage-help">${STAGE_HELP[s]} <a href="#about">מה אומרים השלבים?</a></p>
    <dl class="facts">
      <dt>ענף</dt><dd><a href="#sport-${esc(a.sportId)}">${esc(sp?.he || a.sportId)}</a>${a.event ? ` · ${esc(a.event)}` : ""}</dd>
      ${a.rank ? `<dt>דירוג או הישג</dt><dd>${esc(a.rank)}${rowMark(`rank|${id}`, a.rank)}</dd>` : ""}
      ${athleteQuotaFacts(a)}
      ${typeof standingsFact === "function" ? standingsFact(a) : ""}
      ${a.next ? `<dt>${nextDateLabel(a)}</dt><dd>${nextCompFact(a)}${realDate(a.nextDate) ? ` <span class="muted">(${fmt(a.nextDate)})</span>` : ""}${pastNextDate(a) ? ' <span class="muted">המועד המתועד חלף</span>' : ""}${rowMark(`next|${id}`, a.next + a.nextDate)}</dd>` : ""}
      <dt>בדיקה</dt><dd class="stack">${trustNote(a)}</dd>
      ${upd ? `<dt>עודכן</dt><dd class="${old ? "old" : "muted"}">${fmt(upd)}${old ? " · לא עודכן יותר מחודש" : ""}</dd>` : ""}
      ${safeUrl(a.source) ? `<dt>מקור</dt><dd>${linkOut(a.source, host(a.source))}</dd>` : ""}
      ${(n => n && fixLogLive() ? `<dt>תיקונים</dt><dd><a href="#corrections-${esc(id)}">${plural(n, "תיקון אחד", "תיקונים")}</a></dd>` : "")(
        S.corrections.filter(c => c.target.kind === "athlete" && c.target.id === id).length)}
    </dl>
    ${a.notes ? `<p>${esc(a.notes)}</p>` : ""}
  </section>
  ${typeof athleteUpcomingSection === "function" ? athleteUpcomingSection(a) : ""}
  ${typeof gameLogSection === "function" ? gameLogSection(a) : ""}
  <section class="panel">
    <h2 id="athleteHistoryH">היסטוריה</h2>
    ${hist.length ? `<ol class="timeline">${hist.map(h => `<li class="k-${esc(h.kind)}"><span class="d">${fmt(h.at)}</span>
      <span>${esc(h.text)}${safeUrl(h.source) ? ` · ${linkOut(h.source)}` : ""}${(k => rowMark(k, k))(`hist|${id}|${h.at}|${h.kind}|${h.text}`)}</span></li>`).join("")}</ol>`
      : emptyLine("עוד אין רשומות בהיסטוריה.")}
  </section>
  ${athleteSiteUpdates(a)}
  <section class="stack">
    <h2>תחרויות קרובות בענף</h2>
    ${comps.length ? `<p class="muted">תחרויות ענף כלליות; קיום תחרות אינו אישור להשתתפות הספורטאי/ת או הנבחרת. הרשימה כאן מוצגת לפני המסננים של לוח התחרויות.</p>` : ""}
    ${allComps.length > comps.length ? `<p class="muted">מוצגות ${comps.length} מתוך ${allComps.length} תחרויות קרובות בענף.</p>` : ""}
    ${comps.map(c => compRow(c, false)).join("") || calEmpty("אין תחרויות קרובות ידועות בענף.", a.sportId)}
    ${comps.length ? `<p><a href="#calendar-${esc(a.sportId)}">ללוח התחרויות בענף</a></p>` : ""}
  </section>
  <section class="panel">
    <h2>שיתוף</h2>
    <div class="share"><input id="shareUrl" readonly value="${esc(link)}" dir="ltr" aria-label="קישור לדף"><button class="btn ghost small" data-copy="shareUrl">העתקה</button></div>
    <p class="foot" id="copyMsg" aria-live="polite"></p>
  </section>
  ${reportBox(`טעות בדף: ${a.name}`, link)}`;
  const sections = [["athleteUpcomingH", "הופעות קרובות"], ["logH", "תוצאות"], ["athleteHistoryH", "היסטוריה"]]
    .filter(([target]) => html.includes(`<h2 id="${target}">`));
  for (const [target] of sections) html = html.replace(`<h2 id="${target}">`, `<h2 id="${target}" tabindex="-1">`);
  const navigation = `<div class="toolbar" role="group" aria-label="מעבר למקטעים בדף הספורטאי">${sections.map(([target, label]) =>
    `<button class="btn ghost small" type="button" id="athleteGo-${target}" data-athlete-section="${target}">${label}</button>`).join("")}</div>`;
  return html.replace('<section class="panel">', navigation + '<section class="panel">');
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
let calendarFollowedOnly = false;
let calendarMonth = "", calendarMonthDraft = "", calendarMonthError = "";
let calendarQuery = "";
let calendarReturnContext = null, calendarReturnRestore = null;
const calendarRouteValid = h => h === "calendar" || (h.startsWith("calendar-") && !!sportById(h.slice(9)));
function calendarHashRoute(hash){
  try { return decodeURIComponent(hash.slice(1)); } catch { return ""; }
}
function calendarReturnClick(e){
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || (e.button != null && e.button !== 0)) return;
  const anchor = e.target.closest?.("a[href]");
  if (!anchor || (anchor.getAttribute?.("target") && anchor.getAttribute("target") !== "_self") || anchor.hasAttribute?.("download")) return;
  const h = currentRoute(), href = anchor.getAttribute?.("href");
  if (anchor.dataset && "calendarReturn" in anchor.dataset) {
    const context = calendarReturnContext;
    if (!context || h !== "c-" + context.id || href !== context.hash || !$("view").contains?.(anchor)
      || !calendarRouteValid(calendarHashRoute(context.hash))) return;
    e.preventDefault?.();
    calendarReturnRestore = context;
    calendarReturnContext = null;
    location.hash = context.hash;
    return;
  }
  if (!calendarRouteValid(h) || !$("calResults").contains?.(anchor) || typeof href !== "string" || !href.startsWith("#c-")) return;
  calendarReturnContext = null;
  let id;
  try { id = decodeURIComponent(href.slice(3)); } catch { return; }
  if (h !== (S.cal.sport ? "calendar-" + S.cal.sport : "calendar")
      || (calendarMonth && !calendarMonthBounds(calendarMonth)) || !calendarRows().some(c => c.id === id)) return;
  calendarReturnContext = {id, hash: location.hash, sport: S.cal.sport, qual: S.cal.qual, past: S.cal.past,
    month: calendarMonth, monthDraft: calendarMonthDraft, monthInvalid: !!calendarMonthError,
    query: calendarQuery, followedOnly: calendarFollowedOnly};
}
document.addEventListener("click", calendarReturnClick);
function calendarMonthBounds(value){
  if (typeof value !== "string" || value.length !== 7 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value.startsWith("0000")) return null;
  const [year, month] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const last = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return {start: value + "-01", end: value + "-" + last};
}
function calendarRows(past = S.cal.past){
  const t = today(), {sport, qual} = S.cal;
  const month = calendarMonthBounds(calendarMonth);
  const query = searchKey(calendarQuery);
  return S.comps.filter(c => (!sport || c.sportId === sport) && (!calendarFollowedOnly || S.followSports.has(c.sportId))
    && (!qual || c.qualifying) && (past || (c.end || c.start) >= t)
    && (!query || searchKey([c.name, c.location].map(str).join(" ")).includes(query))
    && (!month || c.start <= month.end && (c.end || c.start) >= month.start))
    .sort((a, b) => a.start.localeCompare(b.start));
}

function calendarHiddenPastCount(rows = calendarRows()){
  return !rows.length && !S.cal.past && !calendarMonthError ? calendarRows(true).length : 0;
}

function calendarSharePlanText(rows = calendarRows()){
  if (!rows.length || calendarMonthError) return "";
  const {sport, qual, past} = S.cal;
  const scope = [sport ? `ענף: ${waCut(waText(sportName(sport)))}` : "כל הענפים",
    ...(calendarMonth ? [`חודש: ${calendarMonth}`, "מוצגות תחרויות שחופפות לחודש שנבחר; חלקן התחילו קודם."] : []),
    ...(qual ? ["העפלה בלבד"] : []), ...(past ? ["כולל תחרויות שהסתיימו"] : []),
    ...(calendarFollowedOnly ? ["לפי ענפי המעקב שלי"] : []),
    ...(calendarQuery ? [`מסנן חיפוש: ${waCut(waText(calendarQuery))}`] : [])];
  const head = ["לוח תחרויות כללי", ...scope,
    "לוח תחרויות כללי; הרשימה אינה אישור להשתתפות ספורטאים מישראל"];
  const blocks = rows.map(c => [`• ${waText(c.name)}`, `ענף: ${waText(sportName(c.sportId))}`, fmtRange(c.start, c.end),
    ...(str(c.location).trim() ? [waText(c.location)] : []), `${SITE_URL}#c-${encodeURIComponent(c.id)}`].join("\n"));
  const footer = ["", "הקישור שומר את הענף כשנבחר. הוא אינו שומר חודש, חיפוש, ענפי מעקב, בחירת העפלה בלבד או בחירה להציג תחרויות שהסתיימו.",
    `${SITE_URL}#calendar${sport ? "-" + encodeURIComponent(sport) : ""}`];
  let omitted = 0;
  const build = () => [...head, "", blocks.join("\n\n"), ...(omitted ? [`ועוד ${omitted} תחרויות בלוח`] : []), ...footer].join("\n");
  let text = build();
  while (text.length > 3500 && blocks.length) {blocks.pop(); omitted++; text = build();}
  return text;
}

function calendarShareSection(rows){
  const text = calendarSharePlanText(rows);
  return `<section class="panel digest" aria-labelledby="calendarShareH"><h2 id="calendarShareH">לוח התחרויות להעתקה</h2>
    ${text ? `<label for="calendarSharePlan">לוח התחרויות המסונן להעתקה</label><textarea id="calendarSharePlan" readonly rows="8">${esc(text)}</textarea>
      <button class="btn ghost small" type="button" data-copy="calendarSharePlan" data-copy-msg="calendarShareMsg">העתקת לוח התחרויות</button><p class="foot" id="calendarShareMsg" aria-live="polite"></p>`
      : `<p class="muted">${calendarMonthError ? "יש לבחור חודש תקין כדי להעתיק את לוח התחרויות." : "אין תחרויות בסינון הנוכחי להעתקה."}</p>`}
  </section>`;
}

function calendarResults(){
  const {sport} = S.cal, month = calendarMonthBounds(calendarMonth), rows = calendarRows();
  const count = `<p class="muted" id="calCount" role="status">מציגים ${rows.length} מתוך ${S.comps.length} תחרויות</p>`;
  if (calendarFollowedOnly && !S.followSports.size)
    return count + emptyLine("עוד אין ענפים במעקב שלך. אפשר לבחור ענפים כדי להציג את התחרויות שלהם.", "#sports", "לבחירת ענפים למעקב");
  const hiddenPast = calendarHiddenPastCount(rows);
  const months = {};
  rows.forEach(c => (months[c.start.slice(0, 7)] ??= []).push(c));
  const disclosure = month ? `<p class="muted">מוצגות תחרויות שחופפות לחודש שנבחר; חלקן התחילו קודם.</p>` : "";
  return count + disclosure + (rows.length ? Object.keys(months).sort().map(m => `<section class="month">
      <h2>${new Date(m + "-15T12:00:00").toLocaleDateString("he-IL", {month:"long", year:"numeric"})} <span>${months[m].length}<span class="sr"> ${months[m].length === 1 ? "תחרות" : "תחרויות"}</span></span></h2>
      ${months[m].map(c => compRow(c, !sport)).join("")}</section>`).join("")
    : emptyLine("אין תחרויות שמתאימות לסינון. אפשר לבטל את אחת האפשרויות למעלה.")
      + (hiddenPast ? `<p class="muted">${hiddenPast === 1 ? "תחרות אחת שהסתיימה מוסתרת בסינון הזה." : `${hiddenPast} תחרויות שהסתיימו מוסתרות בסינון הזה.`}</p>
        <button class="btn ghost small" type="button" id="calShowPast" data-calendar-show-past>הצגת התחרויות שהסתיימו</button>` : "")) + calendarShareSection(rows);
}

function viewCalendar(sportFilter = ""){
  if (sportFilter && !sportById(sportFilter)) return notFound();
  S.cal.sport = sportFilter;
  const {sport, qual, past} = S.cal;
  const used = [...new Set([...S.comps.map(c => c.sportId), ...(sport ? [sport] : [])])].map(sportById).filter(Boolean).sort((a, b) => heCmp(a.he, b.he));
  const wins = S.sports.filter(s => s.window && isDate(s.window.from)).sort((a, b) => a.window.from.localeCompare(b.window.from));
  return `
  <h1 tabindex="-1">לוח תחרויות</h1>
  <div class="toolbar">
    <label for="cSearch">חיפוש תחרות או מקום</label><input type="search" id="cSearch" value="${esc(calendarQuery)}" aria-describedby="calCount">
    <select id="cSport" aria-label="סינון לפי ענף"><option value="">כל הענפים</option>${used.map(s => `<option value="${esc(s.id)}" ${s.id === sport ? "selected" : ""}>${esc(s.he)}</option>`).join("")}</select>
    <label for="cMonth">חודש התחרויות</label><input type="month" id="cMonth" min="0001-01" max="9999-12" value="${esc(calendarMonthDraft)}" aria-describedby="cMonthError" ${calendarMonthError ? 'aria-invalid="true"' : ""}>
    <p class="error" id="cMonthError" role="alert" ${calendarMonthError ? "" : "hidden"}>${esc(calendarMonthError)}</p>
    <label class="chk"><input type="checkbox" id="cQual" ${qual ? "checked" : ""}> רק תחרויות העפלה</label>
    <label class="chk"><input type="checkbox" id="cPast" ${past ? "checked" : ""}> כולל תחרויות שהסתיימו</label>
    <label class="chk"><input type="checkbox" id="cFollowSports" ${calendarFollowedOnly ? "checked" : ""}> רק ענפים שבמעקב שלי</label>
    <button class="btn ghost small" type="button" id="cReset" data-calendar-reset ${sport || qual || past || calendarFollowedOnly || calendarMonth || calendarMonthError || calendarQuery ? "" : "hidden"}>איפוס הסינון</button>
  </div>
  <div id="calResults" class="cal-results">${calendarResults()}</div>
  <section class="panel">
    <h2>חלונות העפלה</h2>
    <p class="muted">חלונות ההעפלה מוצגים לכל הענפים, ללא סינון.</p>
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
  <p>עדכוני האתר מוצגים כאן. <a href="#results">לכל התוצאות המתועדות</a></p>
  ${typeof viewDigest === "function" ? `<p><a href="#digest">תקציר שבועי לשיתוף</a></p>` : ""}
  <section class="panel">${S.changes.length ? `<ul class="rows">${S.changes.map(changeRow).join("")}</ul>` : calEmpty("עוד אין עדכונים.")}</section>
  <p class="foot">העדכונים נאספים ממקורות רשמיים ומכלי תקשורת. תוצאות ותחרויות עשויות להתווסף גם אחרי בדיקת מקור רשמי בידי הצוות. שינוי שלב (מכסה או בחירה לנבחרת) מתפרסם רק אחרי בדיקה ידנית.</p>`;
}

function viewAbout(){
  return `<h1 tabindex="-1">אודות</h1>
  <section class="panel prose">
    <h2>על האתר</h2>
    <p>אתר עצמאי ולא רשמי שעוקב אחרי ספורטאיות, ספורטאים ונבחרות מישראל בדרך לאולימפיאדת לוס אנג׳לס 2028. לכל ספורטאי/ת ונבחרת יש דף עם השלב בדרך להעפלה, הדירוג או ההישג האחרון, התחרות הבאה וקישור למקור.</p>
    <p>אין לאתר קשר לוועד האולימפי הבין־לאומי, לוועדה המארגנת של משחקי לוס אנג׳לס 2028 או לוועד האולימפי בישראל.</p>
    <h2>ארבעת השלבים</h2>
    <ol>${STAGES.map((x, i) => `<li><b>${x}</b>: ${STAGE_HELP[i]}</li>`).join("")}</ol>
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
    [{verifiedAt: d, updatedAt: earlier}, "הפרטים נבדקו ידנית מול המקור, ולא השתנו מאז."],
    [{verifiedAt: d, updatedAt: later}, "הפרטים נבדקו ידנית, ואחר כך התעדכנו אוטומטית. ייתכן שהעדכון עוד לא נבדק."],
    [{}, "הפרטים נאספו אוטומטית ועוד לא נבדקו ידנית. כדאי לבדוק מול המקור."],
  ];
  const tile = (n, label) => `<div class="adm-tile"><b class="digits">${n}</b><span>${label}</span></div>`;
  return `<section class="panel prose" aria-labelledby="trustH">
    <h2 id="trustH">איך אנחנו בודקים את הנתונים</h2>
    <div class="adm-tiles">
      ${tile(N, "ספורטאים ונבחרות ברשימה")}
      ${tile(V, "נבדקו ידנית מול המקור")}
      ${Q ? tile(Q, "מקצים בתמונת המכסות, כולם נבדקו לפני פרסום") : ""}
    </div>
    <p>${freshness() || "מועד העדכון האחרון לא ידוע."}</p>
    <h3>מאיפה הנתונים</h3>
    <ul>
      <li>דירוגים, תוצאות ושיטות העפלה: האתרים הרשמיים של ההתאחדויות הבין־לאומיות.</li>
      <li>בחירה לנבחרת והודעות: הוועד האולימפי בישראל וכלי תקשורת.</li>
    </ul>
    ${top.length ? `<p class="foot">המקורות הנפוצים באתר: <span dir="ltr">${top.map(esc).join(" · ")}</span>. בכל דף ספורטאי/ת יש קישור למקור.</p>` : ""}
    <p class="foot">„דירוג או הישג” הוא דירוג עולמי רשמי כשיש כזה, ואחרת התוצאה הבולטת האחרונה (מסומנת „מיקום, לא דירוג”).</p>
    <h3>שלוש רמות בדיקה</h3>
    <dl class="facts trust-legend">${legend.map(([a, text]) => `<dt>${trustChip(a)}</dt><dd>${text}</dd>`).join("")}</dl>
    <h3>מה אוטומטי ומה לא</h3>
    <ul>
      <li><b>עדכונים אוטומטיים:</b> דירוגים, תוצאות אחרונות ותחרויות קרובות. תוצאות ותחרויות עשויות להתווסף גם אחרי בדיקת מקור רשמי בידי הצוות.</li>
      <li><b>רק אחרי בדיקה ידנית:</b> שינוי שלב, ספורטאי/ת חדש/ה, הסרה מהרשימה, וכל נתוני המכסות.</li>
    </ul>
    <p>לכל תוצאה מתועדת מופיע המקור שלה. תאריך הבדיקה של פרופיל ספורטאי/ת אינו תאריך הבדיקה של כל תוצאה בפרופיל.</p>
    <p>תחרויות עונה עשויות להופיע גם לפני פתיחת חלון ההעפלה. הופעת תחרות בלוח אינה כשלעצמה אישור להשגת מכסה או להשתתפות ספורטאים מישראל.</p>
    <h3>תיקונים</h3>
    <p>כל דיווח נבדק מול מקור לפני שהוא מתפרסם.${typeof fixLogLive === "function" && fixLogLive() ? ` כל תיקון נרשם ב<a href="#corrections">יומן התיקונים</a>.` : ""} אין לנו גישה למידע שאינו פומבי.</p>
  </section>`;
}

const notFound = () => `<div class="empty"><h1 tabindex="-1">הדף לא נמצא</h1><p>ייתכן שהקישור ישן או שהדף הוסר.</p><p><a href="#home">חזרה לדף הראשי</a></p></div>`;

function freshness(){
  const ts = S.live ? S.lastRun : (S.generatedAt || S.lastRun);
  if (!ts) return "";
  const stale = daysSince(ts) > 1.5;
  const when = new Date(ts).toLocaleString("he-IL", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"});
  return `<span class="fresh ${stale ? "stale" : ""}"><i></i><span>נכון ל־${when}</span></span>`;
}
const daysLeft = () => Math.max(0, Math.ceil((OPENING - Date.now()) / 864e5)).toLocaleString("he-IL");

let lastBanner = "";
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
  const note = `<p class="foot">את/ה רואה את הנתונים העדכניים מהמאגר, לפני הפרסום. הציבור רואה את הפרסום האחרון, שמתעדכן בכל ריצה של העדכון היומי.</p>`;
  if (!pend.length) return `<section class="panel">${note}</section>`;
  return `<section class="panel review"><h2>הצעות לאישורך (${pend.length})</h2>${note}
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

// Results are the game log (#186): kept apart from the cap of 20 with their own cap, as job/athlete_patch.py does.
function historyWith(a, entry){
  const all = [...(Array.isArray(a?.history) ? a.history : []), entry], isRes = h => h?.kind === "result";
  let dropRes = all.filter(isRes).length - RESULTS_MAX, dropOther = all.length - all.filter(isRes).length - HISTORY_MAX;
  return all.filter(h => isRes(h) ? !(dropRes-- > 0) : !(dropOther-- > 0));
}

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

let renderedDay = "", renderedClock = "";
let documentationFamilyActive = false, documentationArrival = null;
function route({preserveFollowingVisit = false, documentationToken = null} = {}){
  const h = currentRoute();
  if (calendarReturnContext && (h !== "c-" + calendarReturnContext.id || !calendarRouteValid(calendarHashRoute(calendarReturnContext.hash)))) calendarReturnContext = null;
  if (documentationToken && documentationToken === documentationArrival &&
      ["following", "following-sports"].includes(h) && typeof beginFollowingDocumentationVisit === "function" && followingDocumentationReady()) {
    documentationArrival = null;
    beginFollowingDocumentationVisit();
  }
  renderedDay = today();
  let html, nav;
  if (S.failed && !S.loaded) html = `<div class="empty" role="alert">${loadFailure(S.failed)}<p><button class="btn small" data-retry>נסו שוב</button></p></div>`, nav = "";
  else if (!S.loaded) html = `<div class="skeleton" aria-busy="true"><span></span><span></span><span></span></div>`, nav = "home";
  else if (h === "home") html = viewHome(), nav = "home";
  else if (h === "sports") html = viewSports(), nav = "sports";
  else if (h.startsWith("sport-")) html = viewSport(h.slice(6)), nav = "sports";
  else if (h.startsWith("a-")) html = viewAthlete(h.slice(2)), nav = "sports";
  else if (h === "calendar") html = viewCalendar(), nav = "calendar";
  else if (h.startsWith("calendar-")) html = viewCalendar(h.slice(9)), nav = "calendar";
  else if (h === "updates") html = viewUpdates(), nav = "updates";
  else if (h === "results" && typeof viewResults === "function") html = viewResults(), nav = "updates";
  else if (h === "about" || h === "about-trust") html = viewAbout(), nav = "about";
  else if ((h === "today" || /^day(-|$)/.test(h)) && typeof viewDay === "function") {
    const d = h === "today" || h === "day" ? today() : h.slice(4);
    html = viewDay(d), nav = d === today() ? "today" : "calendar";
  }
  // Before launch only editors see the log (as a preview); visitors get not-found and no links to it.
  else if (/^corrections(-|$)/.test(h) && typeof viewCorrections === "function" && (S.launchAt || S.isAdmin)) html = viewCorrections(h.slice(12)), nav = "about";
  else if (/^following(-|$)/.test(h) && typeof viewFollowing === "function") {
    const tab = h.slice(10);
    html = preserveFollowingVisit && ["", "sports"].includes(tab) ? followingContent(tab, false) : viewFollowing(tab);
    nav = "following";
  }
  else if (h.startsWith("c-") && typeof viewEvent === "function") html = viewEvent(h.slice(2)), nav = "calendar";
  else if (h === "quotas" && typeof viewQuotas === "function") html = viewQuotas(), nav = "sports";
  else if (h === "digest" && typeof viewDigest === "function") html = viewDigest(), nav = "updates";
  else if (/^admin(-|$)/.test(h) && S.isAdmin && S.live && typeof viewAdmin === "function") html = viewAdmin(h.slice(6)), nav = "admin";
  else html = notFound();
  if (html === notFound()) nav = "";   // sub-views (#sport-nope, #a-nope) return it too
  if (calendarReturnContext && calendarRouteValid(calendarHashRoute(calendarReturnContext.hash)))
    html = `<p class="crumb"><a id="calendarReturn" data-calendar-return href="${esc(calendarReturnContext.hash)}">חזרה ללוח המסונן</a></p>` + html;
  if (typeof followingDecorate === "function") html = followingDecorate(h, html);
  const b = banner();
  $("view").innerHTML = b + html;
  renderedClock = clockStatusSignature(h);
  // The banner is rebuilt on every render; announce it through one persistent status only when its text changes.
  const bt = b.replace(/<[^>]*>/g, "");
  if (bt !== lastBanner) { lastBanner = bt; const st = $("bannerStatus"); if (st) st.textContent = bt; }
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
  const calendarRestore = calendarReturnRestore;
  calendarReturnRestore = null;
  const family = ["following", "following-sports"].includes(next);
  if (family && !documentationFamilyActive) documentationArrival = {};
  if (!family) {
    documentationArrival = null;
    if (typeof endFollowingDocumentationVisit === "function") endFollowingDocumentationVisit();
  }
  documentationFamilyActive = family;
  if (next !== lastRoute && /^calendar(-|$)/.test(next)) S.cal = {sport: "", qual: false, past: false};
  if (calendarRestore && next === calendarHashRoute(calendarRestore.hash) && calendarRouteValid(next)) {
    S.cal = {sport: calendarRestore.sport, qual: calendarRestore.qual, past: calendarRestore.past};
    calendarMonth = calendarRestore.month;
    calendarMonthDraft = calendarRestore.monthDraft;
    calendarMonthError = calendarRestore.monthInvalid || (calendarMonthDraft && !calendarMonthBounds(calendarMonthDraft)) ? "יש לבחור חודש תקין בתבנית YYYY-MM." : "";
    calendarQuery = calendarRestore.query;
    calendarFollowedOnly = calendarRestore.followedOnly;
  }
  if (next !== lastRoute && /^corrections(-|$)/.test(next)) S.fixOpen = new Set();
  if (next !== lastRoute && next === "about-trust") focusTrust = true;
  if (next !== lastRoute) { rowSigs.clear(); changedRows.clear(); }
  const h = route({documentationToken: documentationArrival});
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
function refresh({preserveFollowingVisit = false} = {}){
  const el = document.activeElement, key = focusKey(el), y = window.scrollY;
  const sportArchive = currentRoute().startsWith("sport-") && !!sportById(currentRoute().slice(6));
  const dayGeneral = /^(today|day(?:-\d{4}-\d{2}-\d{2})?)$/.test(currentRoute());
  const athleteFuture = currentRoute().startsWith("a-") && !!athleteById(currentRoute().slice(2));
  const open = [...($("view").querySelectorAll?.("details") || [])]
    .flatMap((d, index) => d.open ? [{index, id: preserveFollowingVisit || (currentRoute() === "home" && HOME_SEARCH_DETAILS.includes(d.id))
      || (sportArchive && d.id === "sportPastCompetitionsOverflow")
      || (dayGeneral && d.id === "dayGeneralCompetitionsOverflow")
      || (athleteFuture && d.id === "athleteFutureSessionsOverflow") ? d.id : ""}] : []);
  let selection = null;
  try {
    if (typeof el?.selectionStart === "number") selection = {start: el.selectionStart, end: el.selectionEnd, direction: el.selectionDirection};
  } catch {}
  route({preserveFollowingVisit});
  const details = [...($("view").querySelectorAll?.("details") || [])];
  open.forEach(item => {
    const detail = item.id ? details.find(d => d.id === item.id) : details[item.index];
    if (detail && (item.id || ((!sportArchive || detail.id !== "sportPastCompetitionsOverflow")
      && (!dayGeneral || detail.id !== "dayGeneralCompetitionsOverflow")
      && (!athleteFuture || detail.id !== "athleteFutureSessionsOverflow")))) detail.open = true;
  });
  const again = !key ? null : key.id ? $(key.id) : (m => m[key.idx] || m[0])([...($("view").querySelectorAll?.(key.sel) || [])]);
  if (again && again !== el) {
    again.focus({preventScroll: true});
    if (selection) try { again.setSelectionRange(selection.start, selection.end, selection.direction); } catch {}
  }
  if (typeof y === "number") scrollTo({top: y, behavior: "auto"});
}

// ---------- events ----------
addEventListener("hashchange", navigate);
document.addEventListener("input", e => {
  if (e.target.id === "q") { S.q = e.target.value; renderResults(); }
  if (e.target.id === "sportsFollowedOnly" && currentRoute() === "sports") {
    sportsFollowedOnly = e.target.checked;
    refresh();
  }
  if (e.target.id === "sportRosterSearch" && currentRoute().startsWith("sport-")) {
    sportRosterQueries.set(currentRoute().slice(6), e.target.value);
    refresh();
  }
  if (e.target.id === "sportRosterStage" && currentRoute().startsWith("sport-")) {
    const id = currentRoute().slice(6);
    if (!["", "0", "1", "2", "3"].includes(e.target.value)) {
      e.target.value = sportRosterStages.get(id) ?? "";
      return;
    }
    sportRosterStages.set(id, e.target.value);
    refresh();
  }
  if (e.target.id === "cSport") { S.cal.sport = e.target.value; history.replaceState(null, "", S.cal.sport ? "#calendar-" + S.cal.sport : "#calendar"); }
  if (e.target.id === "cQual") S.cal.qual = e.target.checked;
  if (e.target.id === "cPast") S.cal.past = e.target.checked;
  if (e.target.id === "cFollowSports") calendarFollowedOnly = e.target.checked;
  if (e.target.id === "cSearch") calendarQuery = e.target.value;
  if (e.target.id === "cMonth") {
    calendarMonthDraft = e.target.value;
    const valid = !e.target.validity?.badInput && (!calendarMonthDraft || calendarMonthBounds(calendarMonthDraft));
    calendarMonthError = valid ? "" : "יש לבחור חודש תקין בתבנית YYYY-MM.";
    if (valid) calendarMonth = calendarMonthDraft;
    $("cMonthError").textContent = calendarMonthError;
    $("cMonthError").hidden = !calendarMonthError;
    if (valid) e.target.removeAttribute("aria-invalid");
    else e.target.setAttribute("aria-invalid", "true");
  }
  if (/^c(Sport|Qual|Past|FollowSports|Month|Search)$/.test(e.target.id) && $("calResults")) {
    $("calResults").innerHTML = calendarResults();
    if ($("cReset")) $("cReset").hidden = !(S.cal.sport || S.cal.qual || S.cal.past || calendarFollowedOnly || calendarMonth || calendarMonthError || calendarQuery);
  }
});
document.addEventListener("click", e => {
  const t = e.target.closest("[data-edit],[data-add],[data-act],[data-verify],[data-follow],[data-copy],[data-retry],[data-calendar-reset],[data-calendar-show-past],[data-sport-roster-reset],[data-home-search],[data-sports-library-reset],[data-athlete-section],[data-sport-section]");
  if (!t) return;
  if ("calendarShowPast" in t.dataset) {
    const route = currentRoute();
    if (!(route === "calendar" || (route.startsWith("calendar-") && sportById(route.slice(9)))) || !calendarHiddenPastCount()) return;
    S.cal.past = true;
    $("cPast").checked = true;
    $("calResults").innerHTML = calendarResults();
    $("cReset").hidden = false;
    return $("cPast").focus({preventScroll: true});
  }
  if ("sportSection" in t.dataset) {
    const route = currentRoute(), target = t.dataset.sportSection;
    if (!route.startsWith("sport-") || !sportById(route.slice(6))
      || !["sportUpcomingH", "sportRecentResultsH", "sportRosterH", "sportCompetitionsH", "sportPastCompetitionsH"].includes(target)) return;
    const heading = $("view").querySelector("#" + target);
    if (!heading) return;
    heading.focus({preventScroll: true});
    return heading.scrollIntoView({block: "center", behavior: "auto"});
  }
  if ("athleteSection" in t.dataset) {
    if (!currentRoute().startsWith("a-") || !["athleteUpcomingH", "logH", "athleteHistoryH"].includes(t.dataset.athleteSection)) return;
    const heading = $("view").querySelector("#" + t.dataset.athleteSection);
    if (!heading) return;
    heading.focus({preventScroll: true});
    return heading.scrollIntoView({block: "center", behavior: "auto"});
  }
  if ("sportsLibraryReset" in t.dataset && currentRoute() === "sports") {
    sportsFollowedOnly = false;
    refresh();
    return $("sportsFollowedOnly")?.focus({preventScroll: true});
  }
  if ("homeSearch" in t.dataset) {
    const input = $("q");
    if (!input) return;
    let selection;
    try {
      if (typeof input.selectionStart === "number") selection = [input.selectionStart, input.selectionEnd, input.selectionDirection];
    } catch {}
    input.focus({preventScroll: true});
    if (selection) try { input.setSelectionRange(...selection); } catch {}
    return input.scrollIntoView({block: "center", behavior: "auto"});
  }
  if ("sportRosterReset" in t.dataset && currentRoute().startsWith("sport-")) {
    sportRosterQueries.delete(currentRoute().slice(6));
    sportRosterStages.delete(currentRoute().slice(6));
    refresh();
    return $("sportRosterSearch")?.focus({preventScroll: true});
  }
  if ("calendarReset" in t.dataset) {
    S.cal = {sport: "", qual: false, past: false};
    calendarFollowedOnly = false;
    calendarMonth = calendarMonthDraft = calendarMonthError = "";
    calendarQuery = "";
    history.replaceState(null, "", "#calendar");
    $("cSport").value = "";
    $("cQual").checked = false; $("cPast").checked = false;
    $("cFollowSports").checked = false;
    $("cSearch").value = "";
    $("cMonth").value = ""; $("cMonth").removeAttribute("aria-invalid");
    $("cMonthError").textContent = ""; $("cMonthError").hidden = true;
    $("cReset").hidden = true;
    $("calResults").innerHTML = calendarResults();
    return $("cSport").focus({preventScroll: true});
  }
  if (t.dataset.edit) return openForm(S.athletes.find(a => a.id === t.dataset.edit));
  if (t.dataset.add) return openForm(null, t.dataset.add);
  if (t.dataset.verify) { t.disabled = true; return markVerified(t.dataset.verify, t); }
  if (t.dataset.act) { t.disabled = true; return decide(t.closest(".prop").dataset.id, t.dataset.act === "approve", t); }
  if (t.dataset.follow) { toggleFollow(t.dataset.follow); route(); return $("view").querySelector("[data-follow]")?.focus(); }
  if ("retry" in t.dataset) { S.failed = false; route(); $("view").focus({preventScroll: true}); return loadPublic(); }
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
function clockStatusSignature(h = currentRoute()){
  if (!S.loaded || typeof sessionState !== "function") return "";
  let sessions, hasToday = false;
  if (h === "home") {
    sessions = daySessions(today()).map(s => [s, today()]);
    hasToday = sessions.length > 0;
  }
  else if (h === "today" || h === "day" || /^day-/.test(h)) {
    const d = h === "today" || h === "day" ? today() : h.slice(4);
    if (!realDate(d)) return "";
    sessions = daySessions(d).map(s => [s, d]);
    hasToday = d === today() && sessions.some(([s]) => !dayFollowingOnly || followsSport(s.sportId) || followedIn(s));
  } else if (h.startsWith("sport-")) {
    const id = h.slice(6);
    if (!sportById(id)) return "";
    return JSON.stringify(sportUpcomingSessions(id).map(s => [s.day, s.startUtc, s.phase, sessionState(s, s.day)]));
  } else if (h.startsWith("a-") && typeof athleteUpcomingSessions === "function") {
    const a = S.athletes.find(a => a.id === h.slice(2));
    if (!a) return "";
    return JSON.stringify(athleteUpcomingSessions(a).map(s => [s.day, s.startUtc, s.phase, athleteStatus(s, s.day, a)]));
  } else if (h.startsWith("c-")) {
    const c = S.comps.find(c => c.id === h.slice(2));
    if (!c) return "";
    const {series, groups} = eventSessions(c);
    sessions = [...groups].flatMap(([d, list]) => list.map(s => [s, series ? s.day : d]));
    hasToday = series ? sessions.some(([, d]) => d === today()) : c.start <= today() && today() <= (c.end || c.start);
  } else return "";
  const ts = checkTime(), stale = !!(hasToday && ts && Date.now() - Date.parse(ts) > STALE_H * 36e5);
  return JSON.stringify([stale, sessions.map(([s, d]) => [sessionState(s, d),
    ...(h.startsWith("c-") ? s.athletes.map(a => athleteStatus(s, d, a)) : [])])]);
}

function refreshClockStatuses(){
  if (document.hidden || !S.loaded) return;
  // Reopening Following marks its feed read; the clock must not count as a visit.
  if (/^following(-|$)/.test(currentRoute()) && typeof refreshFollowingUpcoming === "function") {
    refreshFollowingUpcoming();
    refreshAthleteNextLabels();
    const d = $("days"); if (d) d.textContent = daysLeft();
    return;
  }
  if (today() !== renderedDay && !/^following(-|$)/.test(currentRoute())) return refresh();
  const signature = clockStatusSignature();
  if (signature && signature !== renderedClock) return refresh();
  const d = $("days"); if (d) d.textContent = daysLeft();
}
setInterval(refreshClockStatuses, 60e3);
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
// Optional standings line (docs/design/standings.md §1); an invalid one is dropped, the item kept.
function cutoffOf(c){
  if (!c || typeof c !== "object" || !Number.isInteger(c.rank) || c.rank < 1 || !str(c.list).trim() || !safeUrl(c.url) || !isDate(c.final)) return null;
  return {rank: c.rank, list: str(c.list), url: c.url, final: c.final, opens: isDate(c.opens) ? c.opens : ""};
}
// A team event's own rank on the cutoff's list (standings.md §1: the ranked unit is the national team, not its members).
const teamRankOf = t => t && typeof t === "object" && Number.isInteger(t.num) && t.num >= 1 && isDate(t.asOf) && safeUrl(t.source)
  ? {num: t.num, asOf: t.asOf, source: t.source} : null;
function applyQuotas(){
  const items = Array.isArray(quotaFile?.items) ? quotaFile.items : [];
  S.quotas = items.filter(q => q && typeof q === "object" && sportById(q.sportId) && QUOTA_STATUSES.includes(q.israelStatus)
      && safeUrl(q.source) && quotaCount(q.totalQuotas) && quotaCount(q.maxPerNOC)
      && (q.nextQuotaEvent == null || (typeof q.nextQuotaEvent === "object" && isDate(q.nextQuotaEvent.start))))
    .map(q => ({sportId: q.sportId, event: str(q.event), totalQuotas: q.totalQuotas ?? null, maxPerNOC: q.maxPerNOC ?? null,
      allocation: str(q.allocation), israelStatus: q.israelStatus, israelNote: str(q.israelNote), source: q.source, stakes: stakesOf(q),
      cutoff: cutoffOf(q.cutoff), teamRank: teamRankOf(q.teamRank),
      checkedAt: isDate(q.checkedAt) ? q.checkedAt : "",
      earnedAt: isDate(q.earnedAt) ? q.earnedAt : "",
      nextQuotaEvent: q.nextQuotaEvent ? {name: str(q.nextQuotaEvent.name), start: q.nextQuotaEvent.start,
        ...(isDate(q.nextQuotaEvent.end) && q.nextQuotaEvent.end >= q.nextQuotaEvent.start ? {end: q.nextQuotaEvent.end} : {})} : null}));
  S.quotasUpdatedAt = S.quotas.length ? str(quotaFile.updatedAt) : "";
  S.quotasUnpublished = Number.isInteger(quotaFile?.unpublished) && quotaFile.unpublished >= 0 ? quotaFile.unpublished : null;
}

async function loadQuotas(){
  try {
    const r = await withDeadline(fetch("quotas.json", {cache: "no-cache"}));
    // 404 = not published yet (an empty list); anything else unusable is an error.
    quotaFile = r.status === 404 ? {items: []} : r.ok ? await r.json() : null;
  } catch { quotaFile = null; }
}

// A host that never answers must end in the error view, not an endless skeleton.
const LOAD_TIMEOUT_MS = 15e3;
const withDeadline = p => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("timeout")), LOAD_TIMEOUT_MS))]);
// The export, not some other JSON the host answered with (e.g. {"error": "forbidden"}): applying that would blank the site.
// generatedAt may be empty (no check time is a supported state), but the export always writes it.
const isExport = d => Array.isArray(d?.athletes) && typeof d.generatedAt === "string";
// Why data.json didn't load. "access": 401/403, HTML where JSON should be (a sign-in page) or JSON that isn't the
// export, i.e. the artifact isn't open to this visitor (launch-day.md, sharing); not a temporary fault.
function loadFailure(kind){
  const [h, p] = kind === "access" ? ["האתר לא זמין עבורך כרגע",
      `ייתכן שהאתר עוד לא נפתח לציבור, או שהקישור דורש התחברות לחשבון. אם קיבלתם את הקישור מאיתנו, כתבו לנו: <span dir="ltr">${esc(CONTACT_EMAIL)}</span>`]
    : kind === "timeout" ? ["הטעינה נמשכת יותר מדי", "הנתונים לא הגיעו בזמן. אפשר לנסות שוב בעוד רגע."]
    : ["לא הצלחנו לטעון את הנתונים", "ייתכן שמדובר בתקלה זמנית. אפשר לנסות שוב בעוד רגע."];
  return `<h1 tabindex="-1">${h}</h1><p>${p}</p>`;
}

let publicSnapshot = null;
async function loadPublic(){
  const quotas = loadQuotas();   // in parallel; never delays or fails the data.json render
  const load = (async () => {
    const r = await fetch("data.json", {cache: "no-cache"});
    if (r.status === 401 || r.status === 403) throw new Error("access");
    if (!r.ok) throw new Error(String(r.status));
    let d;
    try { d = await r.json(); } catch { throw new Error("access"); }
    if (!isExport(d)) throw new Error("access");
    return d;
  })();
  try {
    publicSnapshot = await withDeadline(load);
    if (!S.live) { applySnapshot(publicSnapshot); navigate(); }
  } catch (e) {
    if (!S.loaded) { S.failed = ["access", "timeout"].includes(e?.message) ? e.message : "error"; route(); }
    // The deadline only stops the waiting: an answer that still arrives replaces the timeout alert (Gil on #304).
    if (e?.message === "timeout") load.then(d => {
      if (S.loaded || S.live) return;
      publicSnapshot = d; S.failed = false;
      applySnapshot(d); navigate();
    }, () => {});
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
const stableJson = data => JSON.stringify(data, (_, value) => value && typeof value === "object" && !Array.isArray(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
async function checkForUpdate(){
  lastCheck = Date.now();
  if (S.live || !S.loaded) return;
  try {
    const prevQ = quotaFile, prevJson = stableJson(quotaFile);
    const [r] = await Promise.all([fetch("data.json", {cache: "no-cache"}), loadQuotas()]);
    // A failed re-read keeps the quotas already shown; a 404 is an empty list (file removed on purpose), so they go.
    if (quotaFile === null) quotaFile = prevQ;
    const quotasChanged = stableJson(quotaFile) !== prevJson;
    if (quotasChanged) applyQuotas();
    const d = r.ok ? await r.json() : null;
    if (S.live || !isExport(d) || stableJson(d) === stableJson(publicSnapshot)) {
      if (quotasChanged) refresh({preserveFollowingVisit: true});
      return;
    }
    const previousTime = S.generatedAt || S.lastRun, nextTime = str(d.generatedAt) || str(d.lastRun);
    const advanced = nextTime && !isNaN(Date.parse(nextTime))
      && (!previousTime || isNaN(Date.parse(previousTime)) || Date.parse(nextTime) > Date.parse(previousTime));
    const sourceTime = advanced ? nextTime : UNTIMED_CHANGE;
    publicSnapshot = d;
    applySnapshot(d);
    let marked = 0;
    if (/^following(-|$)/.test(currentRoute())) refresh({preserveFollowingVisit: true});
    else {
      diffRender = true; diffSourceTime = sourceTime; newlyChanged = 0;
      try { refresh({preserveFollowingVisit: true}); marked = newlyChanged; }
      finally { diffRender = false; diffSourceTime = undefined; }
    }
    showUpdateNote(marked, sourceTime);
  } catch { /* keep what is on screen; freshness() turns stale after 1.5 days */ }
}
// A small visible note (also the screen-reader announcement), shown only when the export changed; it hides itself.
let noteTimer = 0;
// `marked` counts newly marked rows; this note announces them, so the rows themselves stay quiet.
function showUpdateNote(marked = 0, sourceTime = S.generatedAt || S.lastRun){
  const n = $("updateNote");
  if (!n) return;
  // The export's own time (Israel), not the moment the tab noticed it.
  const ts = sourceTime, ok = ts !== UNTIMED_CHANGE && ts && !isNaN(Date.parse(ts));
  n.textContent = (ok ? `הנתונים עודכנו ב־${ilTime(ts)}` : "התקבל תוכן נתונים מעודכן")
    + (marked ? ` · ${marked === 1 ? "פריט אחד השתנה" : `${marked} פריטים השתנו`} בדף הזה` : "");
  n.hidden = false;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { n.hidden = true; }, 8000);
}
function scheduleRefresh(){
  clearTimeout(refreshTimer);
  if (document.hidden) return;
  refreshTimer = setTimeout(async () => { await checkForUpdate(); scheduleRefresh(); }, Math.max(0, REFRESH_MS - (Date.now() - lastCheck)));
}
document.addEventListener("visibilitychange", () => { refreshClockStatuses(); scheduleRefresh(); });

navigate();
loadPublic();
goLive();
scheduleRefresh();
