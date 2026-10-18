// Weekly digest (#digest, docs/design/round2.md §2): plain text for WhatsApp. Loaded after app.js; uses its helpers and state.
"use strict";

const DIGEST_MAX = 3500, DIGEST_LINE = 160;
// Data must not toggle WhatsApp formatting or break a bullet over lines.
const waText = s => str(s).replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();
const waCut = s => s.length > DIGEST_LINE ? s.slice(0, DIGEST_LINE - 1) + "…" : s;

// Depends only on `t` and the loaded data in S, so tests can pin the week.
function digestText(t = today()){
  const from = addDays(t, -6);
  const dataTs = str(S.live ? S.lastRun : (S.generatedAt || S.lastRun)).slice(0, 10);
  const day = c => str(c.at).slice(0, 10);
  const changes = S.changes.filter(c => isDate(day(c)) && day(c) >= from && day(c) <= t)
    .sort((a, b) => day(b).localeCompare(day(a)))
    .map(c => waCut(`• ${waText(c.text)}`));
  const competing = S.athletes.filter(a => isDate(a.nextDate) && a.nextDate >= t && a.nextDate <= addDays(t, 6))
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate) || heCmp(a.name, b.name))
    .map(a => waCut(`• ${fmtShort(a.nextDate)} · ${waText(a.name)} (${waText(sportName(a.sportId))})${a.next ? ": " + waText(a.next) : ""}`));
  const quotas = S.quotas.filter(q => q.israelStatus !== "earned" && isDate(q.nextQuotaEvent?.start)
      && q.nextQuotaEvent.start >= t && q.nextQuotaEvent.start <= addDays(t, 13))
    .sort((a, b) => a.nextQuotaEvent.start.localeCompare(b.nextQuotaEvent.start) || heCmp(sportName(a.sportId), sportName(b.sportId)) || heCmp(a.event, b.event))
    .map(q => waCut(`• ${fmtShort(q.nextQuotaEvent.start)} · ${waText(sportName(q.sportId))}, ${waText(q.event)}: ${waText(q.nextQuotaEvent.name)}`)
      + (waText(q.stakes) ? "\n" + waCut(`  מה זה אומר: ${waText(q.stakes)}`) : ""));
  const sections = [["מה התעדכן", changes], ["ישראלים מתחרים השבוע", competing], ["אירועי מכסה בשבועיים הקרובים", quotas]]
    .filter(([, items]) => items.length).map(([title, items]) => ({title, items, cut: 0}));
  const head = [`*הדרך ללוס אנג׳לס 28 · תקציר שבועי*`, `${fmt(from)} – ${fmt(t)}${isDate(dataTs) ? ` · נכון ל־${fmt(dataTs)}` : ""}`,
    ...(isDate(dataTs) && dataTs < addDays(t, -2) ? [`שימו לב: הנתונים לא עודכנו מאז ${fmt(dataTs)}.`] : [])];
  const foot = ["", `לכל הפרטים: ${SITE_URL}`, "אתר לא רשמי. הנתונים ממקורות פומביים, כדאי לבדוק מול המקור."];
  const build = () => [...head,
    ...(sections.length ? sections.flatMap(s => ["", `*${s.title}*`, ...s.items, ...(s.cut ? [`• ועוד ${s.cut} באתר`] : [])])
      : ["", "שבוע שקט: אין עדכונים, תחרויות או אירועי מכסה ידועים."]),
    ...foot].join("\n");
  let text = build();
  while (text.length > DIGEST_MAX) {
    const s = sections.reduce((a, b) => b.items.length > a.items.length ? b : a, {items: []});
    if (!s.items.length) break;
    s.items = s.items.slice(0, -1); s.cut++;
    text = build();
  }
  return text;
}

function viewDigest(){
  const t = today(), text = digestText(t);
  return `<p class="crumb"><a href="#updates">→ עדכונים</a></p>
  <h1 tabindex="-1">תקציר שבועי</h1>
  <p class="muted">טקסט מוכן להדבקה בוואטסאפ או בכל מקום אחר. ${fmt(addDays(t, -6))} – ${fmt(t)}.</p>
  <section class="panel digest" aria-labelledby="dgH">
    <h2 id="dgH" class="sr">טקסט התקציר</h2>
    <textarea id="digestText" readonly rows="16" aria-labelledby="dgH" aria-describedby="dgCount">${esc(text)}</textarea>
    <div class="actions">
      <button class="btn" data-copy="digestText" data-copy-msg="digestMsg">העתקת התקציר</button>
      <span class="foot" id="dgCount">${text.length.toLocaleString("he-IL")} תווים</span>
    </div>
    <p class="foot" id="digestMsg" aria-live="polite"></p>
  </section>`;
}
