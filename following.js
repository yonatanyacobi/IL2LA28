// "Following" (#following, #following-sports; docs/design/daily-and-following.md §2): followed athletes and
// sports, and what changed since the viewer last opened this page. Loaded after app.js; uses its helpers and
// state. Per-viewer only (localStorage via store, which already wraps every access in try/catch).
"use strict";

const FEED_MAX = 20;
// Baseline for "since your last visit to #following". A first visit sets it silently, so nothing is "new".
const savedFollowSeen = store.get("la28.followingSeen", null);
const followSeenAtLoad = typeof savedFollowSeen === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(savedFollowSeen) &&
  isDate(savedFollowSeen.slice(0, 10)) && Number.isFinite(Date.parse(savedFollowSeen)) ? savedFollowSeen : null;
// What the viewer saw of each followed record at that visit, so an updatedAt bump that changes nothing visible
// (a source link, a verification stamp) doesn't count as news.
const SHOWN_FIELDS = ["name", "event", "stage", "rank", "next", "nextDate"];
const shownOf = a => SHOWN_FIELDS.map(k => str(a[k])).join("\u241f");
const savedFollowingShown = store.get("la28.followingShown", {});
const shownAtLoad = Object.fromEntries(savedFollowingShown && typeof savedFollowingShown === "object" && !Array.isArray(savedFollowingShown)
  ? Object.entries(savedFollowingShown).filter(([, value]) => typeof value === "string") : []);
let badgeSince = followSeenAtLoad;
S.followSports = new Set(store.getArray("la28.followSports"));

const DOCUMENTATION_KEY = "la28.documentationBaseline", DOCUMENTATION_MAX = 262144;
let documentationVisit = null;
const followingDocumentationReady = () => S.loaded && !S.live && isExport(publicSnapshot) && typeof documentedResults === "function";
const documentationId = id => typeof id === "string" && id.length > 0 && id.length <= 128 && !/[\x00-\x1f\x7f-\x9f]/.test(id);
function documentationRows(rows, known = null){
  if (!Array.isArray(rows)) return {state: "invalid"};
  if (rows.length > 2000) return {state: "unavailable"};
  const canonical = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length !== 7) return {state: "invalid"};
    const [sport, owners, day, result, source, phase, start] = row;
    if ((typeof result === "string" && result.length > 8192) || (typeof source === "string" && source.length > 2048) ||
        (typeof phase === "string" && phase.length > 512) || (typeof start === "string" && start.length > 40) ||
        (typeof sport === "string" && sport.length > 128) || (Array.isArray(owners) && (owners.length > 128 || owners.some(id => typeof id === "string" && id.length > 128)))) return {state: "unavailable"};
    if (!documentationId(sport) || !Array.isArray(owners) || !owners.length || !owners.every(documentationId) ||
        new Set(owners).size !== owners.length || typeof day !== "string" || !realDate(day) || typeof result !== "string" || !result.length ||
        typeof source !== "string" || typeof phase !== "string" || (start != null && start !== "" && (!isUtc(start) || !realDate(start.slice(0, 10))))) return {state: "invalid"};
    try { if (!/^https:\/\//i.test(source) || new URL(source).protocol !== "https:") return {state: "invalid"}; } catch { return {state: "invalid"}; }
    if (known && (!known.sports.has(sport) || !owners.every(id => known.athletes.has(id)))) return {state: "invalid"};
    canonical.push([sport, [...owners].sort(), day, result, source, phase, start || ""]);
  }
  canonical.sort((a, b) => { const x = JSON.stringify(a), y = JSON.stringify(b); return x < y ? -1 : x > y ? 1 : 0; });
  const text = JSON.stringify({version: 1, rows: canonical});
  return text.length > DOCUMENTATION_MAX ? {state: "unavailable"} : {state: "valid", rows: canonical, text};
}
function readFollowingDocumentation(){
  let raw;
  try { raw = localStorage.getItem(DOCUMENTATION_KEY); } catch { return {state: "unavailable"}; }
  if (raw === null) return {state: "missing"};
  if (typeof raw !== "string" || raw.length > DOCUMENTATION_MAX) return {state: "unavailable"};
  let data;
  try { data = JSON.parse(raw); } catch { return {state: "invalid"}; }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {state: "invalid"};
  if (Object.hasOwn(data, "version") && data.version !== 1) return {state: "unsupported"};
  if (Object.keys(data).length !== 2 || !Object.hasOwn(data, "version") || !Object.hasOwn(data, "rows")) return {state: "invalid"};
  return documentationRows(data.rows);
}
function currentFollowingDocumentation(){
  return documentationRows(documentedResults().map(r => [r.sportId, r.athletes.map(a => a.id), r.day, r.result, r.source, r.phase, r.startUtc]), followingPreferenceIds());
}
function beginFollowingDocumentationVisit(){
  if (!followingDocumentationReady()) return;
  const prior = readFollowingDocumentation(), current = currentFollowingDocumentation();
  // Saving this arrival must never replace the comparison base of the ongoing visit.
  documentationVisit = {prior, unavailable: current.state !== "valid" || ["unavailable", "unsupported"].includes(prior.state), saveFailed: false};
  if (documentationVisit.unavailable || (prior.state === "valid" && prior.text === current.text)) return;
  try {
    localStorage.setItem(DOCUMENTATION_KEY, current.text);
    documentationVisit.saveFailed = localStorage.getItem(DOCUMENTATION_KEY) !== current.text;
  } catch { documentationVisit.saveFailed = true; }
}
function endFollowingDocumentationVisit(){ documentationVisit = null; }
function followingDocumentationNotice(){
  if (!documentationVisit || !followingDocumentationReady()) return "";
  const current = currentFollowingDocumentation(), visit = documentationVisit;
  if (current.state !== "valid") visit.unavailable = true;
  const scope = rows => JSON.stringify(rows.filter(r => S.followSports.has(r[0]) || r[1].some(id => S.follows.has(id))));
  const changed = !visit.unavailable && visit.prior.state === "valid" && scope(visit.prior.rows) !== scope(current.rows);
  return `${changed ? `<p class="muted" id="followingDocumentationChanged" role="status">תיעוד התוצאות במעקב שלי השתנה מאז הביקור הקודם.</p>` : ""}
    ${visit.unavailable ? `<p class="muted" id="followingDocumentationUnavailable">ההשוואה המקומית של תיעוד התוצאות אינה זמינה בביקור הזה.</p>` : ""}
    ${visit.saveFailed ? `<p class="muted" id="followingDocumentationStorage">לא ניתן לשמור את בסיס ההשוואה המקומי לביקור הבא בדפדפן הזה.</p>` : ""}`;
}

function toggleFollowSport(id){
  S.followSports.has(id) ? S.followSports.delete(id) : S.followSports.add(id);
  saveFollows("la28.followSports", [...S.followSports]);
}

const followedAthletes = () => S.athletes.filter(a => S.follows.has(a.id) || S.followSports.has(a.sportId));

// Proven session results win same-day result history. Date-only history counts on the visit's Israel day
// only when the athlete record changed after that visit.
// A record that changed without a new history entry (most daily updates, until results land) still gets one
// "הפרטים עודכנו" row, dated by updatedAt.
function allFollowFeed(since){
  if (!since) return [];
  const day = IL_DAY.format(new Date(since));
  const sinceAt = Date.parse(since), now = Date.now();
  const results = (typeof exportedSessions === "function" ? exportedSessions() : []).filter(s => {
    const at = Date.parse(s.resultAt);
    return s.result && at > sinceAt && at <= now;
  });
  const athleteItems = followedAthletes().flatMap(a => {
    const sessionItems = results.filter(s => s.athletes.includes(a)).map(s => ({a, session: true,
      h: {kind: "result", at: s.day, text: s.result, source: s.resultSource}}));
    const resultDays = new Set(sessionItems.map(item => item.h.at));
    const historyItems = (Array.isArray(a.history) ? a.history : [])
      .filter(h => h && typeof h === "object" && !Array.isArray(h) && isDate(h.at)
        && !(h.kind === "result" && resultDays.has(h.at))
        && (h.at > day || (h.at === day && str(a.updatedAt) > since))).map(h => ({a, h}));
    const items = [...sessionItems, ...historyItems];
    const updatedAt = str(a.updatedAt), was = shownAtLoad[a.id];
    const at = Number.isFinite(Date.parse(updatedAt)) ? IL_DAY.format(new Date(updatedAt)) : "";
    const changed = updatedAt > since && isDate(at) && was !== undefined && was !== shownOf(a);
    return items.length || !changed ? items : [{a, h: {at, text: "הפרטים עודכנו"}}];
  });
  const quotas = new Map(), t = today();
  for (const q of S.quotas || []) {
    if (!S.followSports.has(q.sportId) || !safeUrl(q.source)) continue;
    const kind = q.israelStatus === "earned" ? "earned" : "awaiting";
    const waiting = kind === "awaiting" ? awaitingOf(q) : null;
    const at = kind === "earned" ? q.earnedAt : waiting ? addDays(waiting.end, 1) : "";
    if (!isDate(at) || at <= day || at > t) continue;
    const key = JSON.stringify([q.sportId, q.event, kind]);
    if (quotas.has(key) && quotas.get(key).h.at >= at) continue;
    quotas.set(key, {type: "quota", q, h: {at, text: kind === "earned" ? "מכסה הושגה" : "בהמתנה לתוצאות", source: q.source}});
  }
  const name = item => item.type === "quota" ? `${sportName(item.q.sportId)} · ${item.q.event}` : item.a.name;
  return [...athleteItems, ...quotas.values()]
    .sort((x, y) => y.h.at.localeCompare(x.h.at) || heCmp(name(x), name(y)));
}
const followFeed = since => allFollowFeed(since).slice(0, FEED_MAX);

// Athletes followed only through their sport have no star, so their feed rows say why they're there.
const viaSport = a => S.follows.has(a.id) ? "" : `<small>ענף במעקב: ${esc(sportName(a.sportId))}</small>`;
const followingFeedMarks = new Map();

function followingFeedRow({type, q, a, h, session}, recordMarks = true){
  const quota = type === "quota";
  const href = quota ? `#sport-${esc(q.sportId)}` : session ? `#day-${esc(h.at)}` : `#a-${esc(a.id)}`;
  const label = quota ? sportName(q.sportId) : a.name;
  const text = quota ? `<bdi>${esc(q.event)}</bdi>: ${esc(h.text)}` : esc(h.text);
  const key = quota ? `feed|quota|${JSON.stringify([q.sportId, q.event, h.at, h.text])}` : `feed|${a.id}|${h.at}|${h.text}`;
  const mark = recordMarks ? rowMark(key, key) : followingFeedMarks.get(key) || "";
  if (recordMarks) followingFeedMarks.set(key, mark);
  return `<li><span class="d">${fmt(h.at)}</span><span class="t"><a href="${href}">${esc(label)}</a><small>${text}${safeUrl(h.source) ? ` · ${linkOut(h.source)}` : ""}</small>${quota ? "" : viaSport(a)}${mark}</span><span></span></li>`;
}

const compLinkOr = c => typeof compLink === "function" ? compLink(c, esc(c.name)) : esc(c.name);

function followingFutureSessions(){
  const through = addDays(today(), 13), ids = new Set(followedAthletes().map(a => a.id)), rows = new Map();
  for (const s of typeof exportedSessions === "function" ? exportedSessions() : []) {
    if (s.day <= through) continue;
    for (const a of s.athletes.filter(a => ids.has(a.id))) {
      if (!["before", "competing"].includes(athleteStatus(s, s.day, a))) continue;
      const k = `up|far|${JSON.stringify([s.comp.id, s.day, a.id, s.phase, s.startUtc || ""])}`;
      if (rows.has(k)) continue;
      const prefix = `followingFuture-${encodeURIComponent(k)}`;
      const html = `<a id="${esc(prefix)}-day" href="#day-${esc(s.day)}">${esc(a.name)}</a><small>${esc(sportName(s.sportId))} · ${compLinkOr(s.comp).replace('<a ', `<a id="${esc(prefix)}-event" `)}${s.phase ? ` · ${esc(s.phase)}` : ""}${safeUrl(s.source) ? ` · ${linkOut(s.source, "מקור לוח ההופעות").replace('<a ', `<a id="${esc(prefix)}-source" `)}` : ""}</small>`;
      rows.set(k, {k, aId: a.id, d: s.day, session: true, startUtc: s.startUtc, chip: "", html});
    }
  }
  return [...rows.values()].sort((x, y) => x.d.localeCompare(y.d) || byStart(x.startUtc, y.startUtc));
}

function followUpcoming(){
  const t = today(), through = addDays(t, 13), followed = followedAthletes();
  const ids = new Set(followed.map(a => a.id));
  const knownSessions = (typeof exportedSessions === "function" ? exportedSessions() : [])
    .filter(s => t <= s.day && s.day <= through && s.athletes.some(a => ids.has(a.id)));
  // Completed known appearances must not return through an older nextDate fallback.
  const represented = new Set(knownSessions.flatMap(s => s.athletes.filter(a => ids.has(a.id)).map(a => `${a.id}|${s.day}`)));
  for (const s of typeof exportedSessions === "function" ? exportedSessions() : []) {
    if (s.day > through) for (const a of s.athletes.filter(a => ids.has(a.id))) represented.add(`${a.id}|${s.day}`);
  }
  const competitions = new Set(knownSessions.map(s => s.comp.id));
  const sessions = knownSessions.filter(s => ["before", "competing"].includes(sessionState(s, s.day)));
  const appearances = sessions.flatMap(s => s.athletes.filter(a => ids.has(a.id)).map(a => ({
    k: `up|s|${s.comp.id}|${s.day}|${a.id}|${s.phase}|${s.startUtc || ""}`, d: s.day, session: true, startUtc: s.startUtc,
    chip: s.day === t ? statusChip(sessionState(s, s.day)) : "",
    html: `<a href="#day-${esc(s.day)}">${esc(a.name)}</a><small>${esc(sportName(s.sportId))} · ${compLinkOr(s.comp)}${s.phase ? ` · ${esc(s.phase)}` : ""}${safeUrl(s.source) ? ` · ${linkOut(s.source)}` : ""}</small>`,
  })));
  const athletes = followed.filter(a => isDate(a.nextDate) && a.nextDate >= t && !represented.has(`${a.id}|${a.nextDate}`))
    .map(a => ({k: `up|a|${a.id}`, d: a.nextDate, chip: a.nextDate === t ? statusChip("competing") : "",
      html: `<a href="#a-${esc(a.id)}">${esc(a.name)}</a><small>${esc(sportName(a.sportId))}${a.next ? ` · ${nextCompFact(a)}` : ""}</small>`}));
  const comps = upcoming().filter(c => S.followSports.has(c.sportId) && !competitions.has(c.id))
    .map(c => ({k: `up|c|${c.id}`, d: c.start, chip: c.start <= t ? `<span class="pill s-live">מתקיימת עכשיו</span>` : "",
      html: `<a href="#sport-${esc(c.sportId)}">${esc(sportName(c.sportId))}</a> · ${compLinkOr(c)}<small>${esc(c.location)}</small>`}));
  return [...appearances, ...athletes, ...comps].sort((x, y) => x.d.localeCompare(y.d) || byStart(x.startUtc, y.startUtc));
}

const FOLLOW_UPCOMING_ROWS = 5;
let renderedFollowingUpcoming = "";
const followingUpcomingMarks = new Map();

function followingUpcomingContent(clockOnly = false){
  const next = followUpcoming(), more = next.slice(FOLLOW_UPCOMING_ROWS), future = followingFutureSessions();
  const row = x => {
      const mark = clockOnly ? followingUpcomingMarks.get(x.k) || "" : rowMark(x.k, x.d + x.html);
      if (!clockOnly) followingUpcomingMarks.set(x.k, mark);
      const time = x.session ? `<br>${isUtc(x.startUtc) ? timeTag(x.startUtc, hhmm(x.startUtc)) : "השעה טרם פורסמה"}` : "";
      return `<li><span class="d">${fmtShortY(x.d)}${time}</span><span class="t">${x.html}${mark}</span><span>${x.chip}</span></li>`;
  };
  return next.length || future.length ? `<section class="panel" aria-labelledby="nextH"><h2 id="nextH">הבא בתור במעקב שלי</h2>
    ${next.length ? `<ul class="rows">${next.slice(0, FOLLOW_UPCOMING_ROWS).map(row).join("")}</ul>` : ""}
    ${more.length ? `<details id="followingUpcomingOverflow"><summary id="followingUpcomingMore">${more.length === 1 ? "עוד פריט אחד במעקב שלי" : `עוד ${more.length} פריטים במעקב שלי`}</summary><ul class="rows">${more.map(row).join("")}</ul></details>` : ""}
    ${future.length ? `<details id="followingFutureSessions"><summary id="followingFutureSessionsMore">הופעות אישיות ידועות מעבר לשבועיים (${future.length})</summary><p class="muted">רק הופעות אישיות שנאספו לספורטאים ולנבחרות במעקב שלך, ישירות או דרך ענף. הכיסוי חלקי; תחרות כללית אינה אישור להשתתפות. המועדים עשויים להשתנות.</p><ul class="rows">${future.map(row).join("")}</ul></details>` : ""}</section>` : "";
}

function refreshFollowingUpcoming(){
  const panel = $("followingUpcoming");
  if (!panel) return;
  const html = followingUpcomingContent(true);
  if (html === renderedFollowingUpcoming) return;
  const active = document.activeElement, key = panel.contains?.(active) ? focusKey(active) : null, y = window.scrollY;
  const open = [...panel.querySelectorAll("details")].filter(d => d.open && d.id).map(d => d.id);
  if (key?.sel) key.idx = Math.max(0, [...panel.querySelectorAll(key.sel)].indexOf(active));
  panel.innerHTML = html;
  renderedFollowingUpcoming = html;
  const details = [...panel.querySelectorAll("details")];
  open.forEach(id => { const detail = details.find(d => d.id === id); if (detail) detail.open = true; });
  if (key) {
    const matches = key.sel ? [...panel.querySelectorAll(key.sel)] : [];
    const again = key.id ? panel.querySelector(attrSel("id", key.id)) : matches[key.idx] || matches[0];
    (again || panel).focus({preventScroll: true});
  }
  if (typeof y === "number") scrollTo({top: y, behavior: "auto"});
}

const explicitFollowing = sports => (sports ? S.sports.filter(s => S.followSports.has(s.id)) : S.athletes.filter(a => S.follows.has(a.id)))
  .sort((a, b) => heCmp(sports ? a.he : a.name, sports ? b.he : b.name));
const followingRemoveId = (sports, id) => `followingRemove-${sports ? "sport" : "athlete"}-${id}`;
function followingManagement(sports, items){
  return `<details class="panel" id="followingManage"><summary id="followingManageSummary">ניהול המעקב</summary>
    ${items.length ? `<ul class="rows">${items.map(item => {
      const name = sports ? item.he : item.name;
      return `<li><span class="d"></span><span class="t"><a href="#${sports ? "sport" : "a"}-${esc(item.id)}">${esc(name)}</a></span>
        <span><button class="btn ghost small" type="button" id="${esc(followingRemoveId(sports, item.id))}" data-remove-follow="${esc(item.id)}" data-remove-follow-kind="${sports ? "sport" : "athlete"}" aria-label="הסרה מהמעקב שלי: ${esc(name)}">הסרה מהמעקב שלי</button></span></li>`;
    }).join("")}</ul>` : emptyLine(sports ? "עוד אין ענפים במעקב שלך." : "עוד אין ספורטאים או נבחרות במעקב שלך.", sports ? "#sports" : "#home", sports ? "לבחירת ענפים למעקב" : "לבחירת ספורטאים ונבחרות למעקב")}
  </details>`;
}

const FOLLOWING_CODE_MAX = 20000;
let followingImportDraft = "", followingImportNotice = "", followingImportInvalid = false;
const followingPreferenceIds = () => {
  const data = typeof publicSnapshot !== "undefined" ? publicSnapshot : null;
  const ids = list => new Set((Array.isArray(list) ? list : []).map(x => x?.id).filter(id => typeof id === "string"));
  return {athletes: ids(data?.athletes), sports: ids(data?.sports)};
};
function followingPreferencesCode(){
  const known = followingPreferenceIds();
  return JSON.stringify({version: 1, athletes: [...S.follows].filter(id => known.athletes.has(id)).sort(),
    sports: [...S.followSports].filter(id => known.sports.has(id)).sort()});
}

function parseFollowingPreferences(text){
  if (typeof text !== "string" || text.length > FOLLOWING_CODE_MAX) throw new Error("הקוד חייב להכיל עד 20,000 תווים.");
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("הקוד אינו JSON תקין."); }
  const fields = ["version", "athletes", "sports"], known = followingPreferenceIds();
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length !== fields.length
    || Object.keys(data).some(key => !fields.includes(key)) || data.version !== 1)
    throw new Error("מבנה הקוד או הגרסה אינם נתמכים.");
  for (const key of ["athletes", "sports"]) {
    if (!Array.isArray(data[key]) || data[key].length > known[key].size
      || data[key].some(id => typeof id !== "string" || !known[key].has(id)))
      throw new Error("הקוד מכיל בחירות שאינן מוכרות באתר הזה.");
  }
  return {athletes: [...new Set(data.athletes)], sports: [...new Set(data.sports)]};
}

function followingTransferSection(){
  return `<details class="panel" id="followingTransfer"><summary id="followingTransferSummary">העברת המעקב לדפדפן אחר</summary>
    <p>העברה ידנית באמצעות העתקה והדבקה, ללא סנכרון אוטומטי. הקוד כולל בחירות מעקב בלבד, בלי היסטוריית ביקורים.</p>
    <div class="digest"><label for="followingExport">קוד המעקב להעתקה</label>
      <textarea id="followingExport" readonly dir="ltr" rows="4" spellcheck="false">${esc(followingPreferencesCode())}</textarea>
      <button class="btn ghost small" type="button" data-copy="followingExport" data-copy-msg="followingExportMsg">העתקת הבחירות</button>
      <p class="foot" id="followingExportMsg" aria-live="polite"></p>
      <label for="followingImport">קוד להוספת בחירות מעקב</label>
      <textarea id="followingImport" dir="ltr" rows="4" spellcheck="false" aria-describedby="followingImportMsg"${followingImportInvalid ? ` aria-invalid="true"` : ""}>${esc(followingImportDraft)}</textarea>
      <button class="btn ghost small" type="button" id="followingImportApply" data-import-following>הוספת הבחירות למעקב שלי</button>
      <p class="${followingImportInvalid ? "err" : "foot"}" id="followingImportMsg" role="${followingImportInvalid ? "alert" : "status"}">${esc(followingImportNotice)}</p>
    </div></details>`;
}

function followingImportMessage(text, invalid = false){
  followingImportNotice = text; followingImportInvalid = invalid;
  const msg = $("followingImportMsg"), input = $("followingImport");
  msg.className = invalid ? "err" : "foot";
  msg.setAttribute("role", invalid ? "alert" : "status");
  msg.textContent = text;
  if (invalid) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
}

function renderFollowingImport(){
  const route = currentRoute(), view = $("view"), active = document.activeElement, key = focusKey(active), y = window.scrollY;
  const open = [...view.querySelectorAll("details")].filter(d => d.open)
    .map(d => ({id: d.id, summary: d.querySelector?.("summary")?.id}));
  let selection = null;
  try { if (typeof active?.selectionStart === "number") selection = [active.selectionStart, active.selectionEnd, active.selectionDirection]; } catch {}
  // Import changes preferences, never the visit baseline or data-change signatures.
  view.innerHTML = followingDecorate(route, followingContent(route === "following-sports" ? "sports" : "", false));
  for (const item of open) {
    const detail = item.id ? $(item.id) : item.summary ? $(item.summary)?.closest("details") : null;
    if (detail) detail.open = true;
  }
  const again = key?.id ? $(key.id) : key?.sel ? [...view.querySelectorAll(key.sel)][key.idx] : null;
  const target = again || $("followingImportApply");
  target?.focus({preventScroll: true});
  if (selection && again) try { again.setSelectionRange(...selection); } catch {}
  if (typeof y === "number") scrollTo({top: y, behavior: "auto"});
}

function importFollowingPreferences(text){
  if (!["following", "following-sports"].includes(currentRoute())) return;
  let data;
  try { data = parseFollowingPreferences(text); }
  catch (error) { followingImportMessage(`לא ניתן לייבא: ${error.message}`, true); return; }
  const athletes = new Set([...S.follows, ...data.athletes]), sports = new Set([...S.followSports, ...data.sports]);
  const addedAthletes = athletes.size - S.follows.size, addedSports = sports.size - S.followSports.size;
  const matches = (key, choices) => {
    const saved = store.get(key, null);
    return Array.isArray(saved) && saved.length === choices.size && new Set(saved).size === choices.size
      && saved.every(id => choices.has(id));
  };
  const saveAthletes = data.athletes.length > 0 && !matches("la28.follows", athletes);
  const saveSports = data.sports.length > 0 && !matches("la28.followSports", sports);
  if (!addedAthletes && !addedSports && !saveAthletes && !saveSports) {
    followingImportMessage(data.athletes.length || data.sports.length ? "לא נוספו בחירות חדשות; הבחירות כבר במעקב שלך." : "הקוד תקין וללא בחירות. לא נעשה שינוי במעקב.");
    return;
  }
  S.follows = athletes; S.followSports = sports;
  if (saveAthletes) saveFollows("la28.follows", [...athletes]);
  if (saveSports) saveFollows("la28.followSports", [...sports]);
  const saved = (!data.athletes.length || matches("la28.follows", athletes))
    && (!data.sports.length || matches("la28.followSports", sports));
  const existing = data.athletes.length + data.sports.length - addedAthletes - addedSports;
  const summary = addedAthletes || addedSports
    ? `נוספו ${addedAthletes + addedSports} בחירות למעקב שלך (${addedAthletes} ספורטאים ונבחרות, ${addedSports} ענפים); ${existing} כבר היו במעקב שלך.`
    : "לא נוספו בחירות חדשות; נעשה ניסיון שמירה חוזר של הבחירות שכבר במעקב שלך.";
  const success = addedAthletes || addedSports ? "הבחירות החדשות נשמרו בדפדפן הזה." : "הבחירות שבמעקב שלך נשמרו בדפדפן הזה.";
  followingImportMessage(`${summary} ${saved ? success : "הבחירות פעילות כעת בזיכרון. ייתכן שרק חלק נשמרו; רענון או סגירת הדף עלולים לאבד בחירות."}`);
  renderFollowingImport();
}

function viewFollowing(tab = ""){
  if (tab && tab !== "sports") return notFound();
  // Opening the page is the "visit": the badge clears, and the feed keeps showing what was new on arrival.
  badgeSince = new Date().toISOString();
  store.set("la28.followingSeen", badgeSince);
  store.set("la28.followingShown", Object.fromEntries(followedAthletes().map(a => [a.id, shownOf(a)])));
  return followingContent(tab);
}

function followingDocumentedResults(){
  return documentedResults().filter(r => S.followSports.has(r.sportId) || r.athletes.some(a => S.follows.has(a.id)));
}

function followingResultsShareText(rows = followingDocumentedResults()){
  if (!rows.length) return "";
  const plain = value => str(value).replace(/\s+/g, " ").trim();
  const canonical = (type, id) => {
    try { return `${SITE_URL}#${type}-${encodeURIComponent(id)}`; } catch { return ""; }
  };
  const blocks = rows.map(r => [`• ${fmt(r.day)} · ${plain(sportName(r.sportId))}`,
    `${r.athletes.length > 1 ? "תוצאה משותפת: " : ""}${r.athletes.map(a => plain(a.name)).join(" · ")}`,
    [plain(r.phase), plain(r.result)].filter(Boolean).join(": "), `מקור: ${r.source}`,
    ...(r.comp ? [plain(r.comp.name), canonical("c", r.comp.id)]
      : [...r.athletes.map(a => canonical("a", a.id)), canonical("day", r.day)])].filter(Boolean).join("\n"));
  const head = ["תוצאות מתועדות במעקב שלי",
    "תיעוד היסטורי חלקי שפורסם באתר; אינו רשימת חדשות או כלל ההישגים."];
  const foot = ["הקישור מציג את כלל התוצאות באתר; העדפות המעקב שלי אינן מועברות לנמען.", `${SITE_URL}#results`];
  let keep = blocks.length;
  const build = () => [...head, "", ...blocks.slice(0, keep),
    ...(keep < blocks.length ? [`${blocks.length - keep === 1 ? "הושמטה שורת תוצאה אחת" : `הושמטו ${blocks.length - keep} שורות תוצאה`} מהטקסט; התוצאות זמינות באתר.`] : []),
    "", ...foot].join("\n");
  let text = build();
  while (text.length > 3500 && keep) { keep--; text = build(); }
  return text;
}

function followingDocumentedResultsSection(){
  if (!S.follows.size && !S.followSports.size) return "";
  const rows = followingDocumentedResults(), more = rows.slice(5), text = followingResultsShareText(rows);
  return `<section class="panel" aria-labelledby="followingResultsH"><h2 id="followingResultsH">תוצאות מתועדות אחרונות במעקב שלי</h2>
    <p class="muted">מידע היסטורי שתועד באתר, בנפרד מעדכונים מאז הביקור הקודם.</p>
    ${rows.length ? `<ul class="rows">${rows.slice(0, 5).map(documentedResultRow).join("")}</ul>
      ${more.length ? `<details id="followingResultsOverflow"><summary id="followingResultsMore">${more.length === 1 ? "עוד תוצאה אחת במעקב שלי" : `עוד ${more.length} תוצאות במעקב שלי`}</summary><ul class="rows">${more.map(documentedResultRow).join("")}</ul></details>` : ""}`
      : `<p class="muted">לא תועדו תוצאות במעקב שלי. <a href="#sports">לענפים ולרשומות באתר</a></p>`}
    ${text ? `<div class="digest"><label for="followingResultsCopyText">תוצאות מתועדות במעקב שלי להעתקה</label>
      <textarea id="followingResultsCopyText" readonly rows="8" aria-describedby="followingResultsCopyHelp">${esc(text)}</textarea>
      <p class="foot" id="followingResultsCopyHelp">אפשר לבחור את הטקסט ולהעתיק ידנית. העדפות המעקב אינן מועברות לנמען.</p>
      <button class="btn ghost small" type="button" data-copy="followingResultsCopyText" data-copy-msg="followingResultsCopyMsg">העתקת תוצאות המעקב</button>
      <p class="foot" id="followingResultsCopyMsg" aria-live="polite"></p></div>` : ""}
  </section>`;
}

function followingContent(tab = "", recordMarks = true){
  const athletes = explicitFollowing(false), sports = explicitFollowing(true);
  const management = followingManagement(!!tab, tab ? sports : athletes);
  const head = `<h1 tabindex="-1">במעקב שלי</h1>${followingDocumentationNotice()}
  <nav class="chips" aria-label="סוג המעקב">
    <a href="#following" ${tab ? "" : `aria-current="page"`}>ספורטאים ונבחרות (${athletes.length})</a>
    <a href="#following-sports" ${tab ? `aria-current="page"` : ""}>ענפים (${sports.length})</a></nav>`;
  const foot = `<p class="foot">המעקב נשמר רק בדפדפן הזה, בלי חשבון.</p>`;
  const todayLink = typeof viewDay === "function" ? `<a href="#today">היום</a>` : "היום";
  // Replaces `foot`, whose limit line it already says.
  const empty = `<div class="empty">
    <p><b>מה מקבלים:</b> תג עם מספר השינויים מאז הביקור הקודם, רשימת עדכונים, ומי שבמעקב שלך מופיעים ראשונים בדף ${todayLink}.</p>
    <p><b>איך:</b> לחצו על ☆ בדף של ספורטאי/ת, נבחרת או ענף.</p>
    <p><b>שימו לב:</b> המעקב נשמר רק בדפדפן הזה, בלי חשבון.</p></div>`;
  const emptyTab = tab ? `<div class="empty"><p>עוד אין ענפים במעקב. לחצו על ☆ בדף של ענף כדי לעקוב.</p></div>`
    : `<div class="empty"><p>עוד אין ספורטאים או נבחרות במעקב. לחצו על ☆ בדף של ספורטאי/ת או נבחרת כדי לעקוב.</p></div>`;
  if (!athletes.length && !sports.length) {
    const t = today(), seen = new Set(), picks = [];
    for (const g of closestGroups(todayRows(), t)) for (const {as} of g.items) for (const a of as) if (!seen.has(a.id) && picks.length < 3) { seen.add(a.id); picks.push(a); }
    return `${head}${management}${followingTransferSection()}${empty}
    ${picks.length ? `<section class="panel"><h2>הצעות למעקב</h2><div class="cards">${picks.map(athleteCard).join("")}</div></section>` : ""}`;
  }
  const feed = allFollowFeed(followSeenAtLoad), moreFeed = feed.slice(FEED_MAX);
  if (recordMarks) { followingUpcomingMarks.clear(); followingFeedMarks.clear(); }
  renderedFollowingUpcoming = followingUpcomingContent(!recordMarks);
  return `${head}${management}${followingTransferSection()}
  <section class="panel" aria-labelledby="feedH">
    <h2 id="feedH">מאז הביקור הקודם (${feed.length})</h2>
    ${feed.length ? `<ul class="rows">${feed.slice(0, FEED_MAX).map(item => followingFeedRow(item, recordMarks)).join("")}</ul>
      ${moreFeed.length ? `<details><summary id="followingFeedMore">${moreFeed.length === 1 ? "עוד עדכון אחד" : `עוד ${moreFeed.length} עדכונים`}</summary><ul class="rows">${moreFeed.map(item => followingFeedRow(item, recordMarks)).join("")}</ul></details>` : ""}`
      : `<p class="muted">${followSeenAtLoad ? "אין עדכונים חדשים מאז הביקור הקודם." : "עדכונים על מי שבמעקב שלך יופיעו כאן מהביקור הבא."}</p>`}
  </section>
  <div id="followingUpcoming" tabindex="-1">${renderedFollowingUpcoming}</div>
  ${followingDocumentedResultsSection()}
  ${tab ? (sports.length ? `<ul class="sports">${sports.map(s => { const ws = winStatus(s.window); return `<li><a class="sport" href="#sport-${esc(s.id)}">
      <span class="top"><h2>${esc(s.he)}</h2>${ws ? `<span class="pill ${ws[0]}">חלון העפלה ${ws[1]}</span>` : ""}</span>${stageBar(athletesOf(s.id), true).html}
      ${quotaCardSummary(s.id)}<span class="meta">${athletesOf(s.id).length} ברשימה</span></a></li>`; }).join("")}</ul>`
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
  const n = allFollowFeed(badgeSince).length, badge = $("followBadge"), sr = $("followBadgeSr");
  if (badge) { badge.hidden = !n; badge.textContent = n > 9 ? "9+" : String(n); }
  if (sr) sr.textContent = !n ? "" : n === 1 ? ", עדכון חדש אחד" : `, ${n} עדכונים חדשים`;
  return html;
}

document.addEventListener("input", e => {
  if (e.target?.id === "followingImport" && ["following", "following-sports"].includes(currentRoute())) followingImportDraft = e.target.value;
});
document.addEventListener("click", e => {
  if (!e.target.closest?.("[data-import-following]") || !["following", "following-sports"].includes(currentRoute())) return;
  followingImportDraft = $("followingImport").value;
  importFollowingPreferences(followingImportDraft);
});

document.addEventListener("click", e => {
  const remove = e.target.closest?.("[data-remove-follow]");
  if (remove && "removeFollow" in remove.dataset) {
    const route = currentRoute(), sports = remove.dataset.removeFollowKind === "sport";
    if (route !== (sports ? "following-sports" : "following") || !["sport", "athlete"].includes(remove.dataset.removeFollowKind)) return;
    const items = explicitFollowing(sports), index = items.findIndex(item => item.id === remove.dataset.removeFollow);
    if (index < 0) return;
    const next = items[index + 1] || items[index - 1], open = $("followingManage")?.open;
    if (sports) toggleFollowSport(items[index].id);
    else toggleFollow(items[index].id);
    refresh({preserveFollowingVisit: true});
    if (open) $("followingManage").open = true;
    $(next ? followingRemoveId(sports, next.id) : "followingManageSummary")?.focus({preventScroll: true});
    return;
  }
  const t = e.target.closest?.("[data-follow-sport]");
  if (!t) return;
  toggleFollowSport(t.dataset.followSport);
  route();
  $("view").querySelector("[data-follow-sport]")?.focus();
});
