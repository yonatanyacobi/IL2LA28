// Public corrections log (#corrections, #corrections-<athleteId>; docs/design/corrections-log.md §2).
// Loaded after app.js; uses its helpers and S.corrections (validated, newest first, see correctionsFrom()).
"use strict";

const FIX_BY = {reader: "דיווח של קורא/ת", audit: "בדיקה ידנית", job: "נמצא בעדכון האוטומטי"};
const FIX_STAT_MIN = 5;   // below this, a share "within 48 hours" would mislead
// Pre-launch source audit (PM decision on #89); fixed history, not entries, so it's not derived from data.
const PRE_LAUNCH_FIXES = 25;

const fixHours = c => isNaN(Date.parse(c.reportedAt)) ? NaN : (Date.parse(c.at) - Date.parse(c.reportedAt)) / 36e5;
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
    <p class="foot">${[`תוקן ב־${fmt(c.at.slice(0, 10))}`, fixSpeed(c), linkOut(c.source, host(c.source))].filter(Boolean).join(" · ")}</p>
  </article>`;
}

function viewCorrections(id = ""){
  const all = S.corrections, list = id ? all.filter(c => c.target.kind === "athlete" && c.target.id === id) : all;
  const V = S.athletes.filter(a => trustOf(a) === "ok").length;
  const timed = all.filter(c => !isNaN(fixHours(c)));
  const stat = timed.length >= FIX_STAT_MIN ? ` עד עכשיו, ${timed.filter(c => fixHours(c) <= 48).length} מתוך ${timed.length} התיקונים בוצעו תוך 48 שעות.` : "";
  const name = id && (S.athletes.find(a => a.id === id)?.name || list[0]?.target.name);
  if (id && !name) return notFound();   // neither a current athlete nor one with entries
  const months = {};
  list.forEach(c => (months[c.at.slice(0, 7)] ??= []).push(c));
  const mail = `<span dir="ltr">${esc(REPORT_EMAIL)}</span>`;
  const body = list.length ? Object.keys(months).sort().reverse().map(m => `<section class="month" aria-labelledby="m-${m}">
      <h2 id="m-${m}">${new Date(m + "-15T12:00:00").toLocaleDateString("he-IL", {month: "long", year: "numeric"})} <span>${months[m].length}<span class="sr"> תיקונים</span></span></h2>
      ${months[m].map(fixEntry).join("")}</section>`).join("")
    : id ? `<div class="empty"><p>אין תיקונים מתועדים לרשומה הזאת.</p><p><a href="#corrections">לכל התיקונים</a></p></div>`
    : `<div class="empty"><p>עוד אין תיקונים מאז ההשקה.</p>
      <p>מצאתם טעות? שלחו קישור ומקור ל־${mail}, והתיקון יופיע כאן.</p></div>`;
  return `${S.launchAt ? "" : `<div class="banner">תצוגה מקדימה לעורכים: היומן יתפרסם לציבור אחרי שייקבע מועד ההשקה.</div>`}
  <p class="crumb"><a href="#about">→ אודות</a></p>
  <h1 tabindex="-1">יומן התיקונים</h1>
  <p class="muted">כל טעות שתוקנה באתר מאז ההשקה${S.launchAt ? ` ב־${fmt(S.launchAt.slice(0, 10))}` : ""}: מה היה כתוב, מה נכון, ומאיזה מקור.
    בבדיקה מול המקורות לפני ההשקה תיקנו ${PRE_LAUNCH_FIXES} רשומות.${V ? ` ${V === 1 ? "רשומה אחת כבר נבדקה" : `${V} רשומות כבר נבדקו`} ידנית מול המקור.` : ""}</p>
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
  ${body}`;
}
