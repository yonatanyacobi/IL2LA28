// Public corrections log (#corrections, #corrections-<athleteId>; docs/design/corrections-log.md §2).
// Loaded after app.js; uses its helpers and S.corrections (validated, newest first, see correctionsFrom()).
"use strict";

const FIX_BY = {reader: "דיווח של קורא/ת", audit: "בדיקה ידנית", job: "נמצא בעדכון האוטומטי"};
const FIX_STAT_MIN = 5;   // below this, a share "within 48 hours" would mislead
// The newest months are shown whole until this many entries; older months show their heading and a button.
// A month is never split. Keeps the page well under ~150 KB as the log grows.
const FIX_SHOWN = 100;
// Pre-launch source audit (PM decision on #89); fixed history, not entries, so it's not derived from data.
const PRE_LAUNCH_FIXES = 25;
let correctionsQuery = "";

const fixHours = c => {
  const hours = (Date.parse(c.at) - Date.parse(c.reportedAt)) / 36e5;
  return Number.isFinite(hours) && hours >= 0 ? hours : NaN;
};
const fixDate = c => isUtc(c.at) ? ilDate(c.at) : c.at.slice(0, 10);
// No verb: the foot already starts with "תוקן ב־". Slow fixes are shown too; hiding them would defeat the page.
const fixSpeed = c => { const h = fixHours(c); return isNaN(h) ? "" : h < 24 ? "תוך פחות מיום" : h <= 48 ? "תוך יומיים" : `אחרי ${Math.ceil(h / 24)} ימים`; };

function fixValue(field, v){
  if (field === "stage") return STAGES[stageOf({stage: v})];
  if (field === "sportId") return esc(sportName(v));
  if (field === "nextDate" && isDate(v)) return fmt(v);
  return esc(v);
}

function fixTarget(t){
  const live = t.kind === "athlete" ? S.athletes.some(a => a.id === t.id) : sportById(t.id);
  return live ? `<a href="#${t.kind === "athlete" ? "a" : "sport"}-${esc(t.id)}">${esc(t.name)}</a>` : esc(t.name);
}

function fixEntry(c){
  const rows = c.changes.map(x => `<dt>${esc(FIELD_LABELS[x.field] || x.field)}</dt><dd>${
    x.wrong === "" ? `<span class="now-is">נוסף: <ins>${fixValue(x.field, x.right)}</ins></span>`
    : x.right === "" ? `<span class="was">הוסר: <del>${fixValue(x.field, x.wrong)}</del></span>`
    : `<span class="was">היה: <del>${fixValue(x.field, x.wrong)}</del></span><span class="now-is">עכשיו: <ins>${fixValue(x.field, x.right)}</ins></span>`}</dd>`).join("");
  return `<article class="fix">
    <div class="fix-head">${fixTarget(c.target)}<span class="pill by-${c.by}">${FIX_BY[c.by]}</span></div>
    <dl class="fix-diff">${rows}</dl>
    <p class="foot">${[`תוקן ב־${fmt(fixDate(c))}`, fixSpeed(c), linkOut(c.source, host(c.source))].filter(Boolean).join(" · ")}</p>
  </article>`;
}

function viewCorrections(id = ""){
  const all = S.corrections, scoped = id ? all.filter(c => c.target.kind === "athlete" && c.target.id === id) : all;
  if (id && !scoped.length) return notFound();   // a record with no entries has no log page
  const query = searchKey(correctionsQuery);
  const list = query ? scoped.filter(c => searchKey([c.target.name, ...c.changes.flatMap(x =>
    [FIELD_LABELS[x.field] || x.field, x.wrong, x.right])].join(" ")).includes(query)) : scoped;
  const V = S.athletes.filter(a => trustOf(a) === "ok").length;
  const timed = all.filter(c => !isNaN(fixHours(c)));
  const stat = timed.length >= FIX_STAT_MIN ? ` בכל האתר: עד עכשיו, ${timed.filter(c => fixHours(c) <= 48).length} מתוך ${timed.length} התיקונים בוצעו תוך 48 שעות.` : "";
  const name = id && (S.athletes.find(a => a.id === id)?.name || scoped[0].target.name);
  const months = {};
  list.forEach(c => (months[fixDate(c).slice(0, 7)] ??= []).push(c));
  const mail = `<span dir="ltr">${esc(CONTACT_EMAIL)}</span>`;
  let shown = 0;
  const monthName = m => new Date(m + "-15T12:00:00").toLocaleDateString("he-IL", {month: "long", year: "numeric"});
  const body = list.length ? Object.keys(months).sort().reverse().map(m => {
    const n = months[m].length, open = shown < FIX_SHOWN || S.fixOpen.has(m);
    if (shown < FIX_SHOWN) shown += n;
    return `<section class="month" aria-labelledby="m-${m}">
      <h2 id="m-${m}" tabindex="-1">${monthName(m)} <span aria-hidden="true">${n}</span><span class="sr">, ${plural(n, "תיקון אחד", "תיקונים")}</span></h2>
      ${open ? months[m].map(fixEntry).join("")
        : `<p><button class="btn ghost small" data-fix-month="${m}">${n === 1 ? "הצגת התיקון" : `הצגת ${n} התיקונים`} מ${monthName(m)}</button></p>`}</section>`;
  }).join("")
    : query ? `<div class="empty"><p>לא נמצאו תיקונים שמתאימים לחיפוש.</p></div>`
    : `<div class="empty"><p>עוד אין תיקונים מאז ההשקה.</p>
      <p>מצאתם טעות? שלחו קישור ומקור ל־${mail}, והתיקון יופיע כאן.</p></div>`;
  return `${S.launchAt ? "" : `<div class="banner">תצוגה מקדימה לעורכים: היומן יתפרסם לציבור אחרי שייקבע מועד ההשקה.</div>`}
  <p class="crumb"><a href="#about"><span aria-hidden="true">→</span>&nbsp;אודות</a></p>
  <h1 tabindex="-1">יומן התיקונים</h1>
  <p class="muted">כל טעות שתוקנה באתר מאז ההשקה${S.launchAt ? ` ב־${fmt(S.launchAt.slice(0, 10))}` : ""}: מה היה כתוב, מה נכון, ומאיזה מקור.
    בבדיקה מול המקורות לפני ההשקה תיקנו פרטים אצל ${PRE_LAUNCH_FIXES} ספורטאים ונבחרות.${V ? ` נבדקו ידנית מול המקור עד כה: ${V === 1 ? "ספורטאי/ת או נבחרת אחת" : `${V} ספורטאים ונבחרות`}.` : ""}</p>
  <section class="panel" aria-labelledby="howH">
    <h2 id="howH">מטעות לתיקון</h2>
    <ol class="steps" role="list">
      <li><b>מצאתם טעות</b><span>שלחו קישור לדף ומקור לנתון הנכון.</span></li>
      <li><b>בודקים מול המקור</b><span>כל דיווח נבדק ידנית מול המקור, לא אוטומטית.</span></li>
      <li><b>מתקנים ומתעדים</b><span>התיקון עולה לאתר ונרשם כאן.</span></li>
    </ol>
    <p>היעד: תיקון תוך 48 שעות מקבלת דיווח עם מקור.${stat}</p>
    <p><a href="#about-trust">איך אנחנו בודקים</a> · דיווח: ${mail}</p>
  </section>
  ${id ? `<p>מוצגים התיקונים של <b>${esc(name || id)}</b> · <a href="#corrections">לכל התיקונים</a></p>` : ""}
  <div class="toolbar"><label for="fixSearch">חיפוש בתיקונים</label><input type="search" id="fixSearch" value="${esc(correctionsQuery)}" aria-describedby="fixSearchCount">
    <button class="btn ghost small" type="button" id="fixSearchReset" data-fix-search-reset ${correctionsQuery ? "" : "hidden"}>איפוס החיפוש</button></div>
  <p class="muted" id="fixSearchCount" role="status">מציגים ${list.length} מתוך ${scoped.length} תיקונים</p>
  ${body}`;
}

document.addEventListener("input", e => {
  if (e.target?.id !== "fixSearch") return;
  correctionsQuery = e.target.value;
  refresh();
});

// "הצגת … התיקונים": render that month and keep focus on its heading.
document.addEventListener("click", e => {
  const t = e.target.closest("[data-fix-month],[data-fix-search-reset]");
  if (!t) return;
  if ("fixSearchReset" in t.dataset) {
    correctionsQuery = "";
    refresh();
    $("fixSearch")?.focus({preventScroll: true});
    return;
  }
  S.fixOpen.add(t.dataset.fixMonth);
  route();
  $("m-" + t.dataset.fixMonth)?.focus();
});
