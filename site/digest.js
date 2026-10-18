// Weekly digest (#digest, docs/design/round2.md §2): plain text for WhatsApp. Loaded after app.js; uses its helpers and state.
"use strict";

const DIGEST_MAX = 3500, DIGEST_LINE = 160;
// Data must not toggle WhatsApp formatting or break a bullet over lines.
const waText = s => str(s).replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();
const waCut = s => s.length > DIGEST_LINE ? s.slice(0, DIGEST_LINE - 1) + "…" : s;
const names = list => list.map(a => waText(a.name)).sort(heCmp);
// A comma list over as many ≤160-char lines as needed, so no name is cut off.
function waList(prefix, items){
  const lines = [];
  for (const it of items) {
    const cur = lines.at(-1);
    if (cur && (cur + ", " + it).length <= DIGEST_LINE) lines[lines.length - 1] = cur + ", " + it;
    else lines.push(waCut((lines.length ? "  " : prefix) + it));
  }
  return lines;
}
// Per-class stakes repeat a shared lead ("<event>: points, not a direct quota; <athlete detail>"); the digest
// keeps only what all classes share, and the per-class detail stays on the sport page.
function commonStakes(list){
  const all = list.map(q => waText(q.stakes));
  if (all.some(s => !s)) return "";
  if (list.length === 1 || all.every(s => s === all[0])) return all[0];
  const lead = all[0].split(";")[0];
  return all.every(s => s.split(";")[0] === lead) ? lead.trim() : "";
}

// Depends only on `t` and the loaded data in S, so tests can pin the week.
function digestText(t = today()){
  const from = addDays(t, -6);
  const dataTs = str(S.live ? S.lastRun : (S.generatedAt || S.lastRun)).slice(0, 10);
  const day = c => str(c.at).slice(0, 10);
  const changes = S.changes.filter(c => isDate(day(c)) && day(c) >= from && day(c) <= t)
    .sort((a, b) => day(b).localeCompare(day(a)))
    .map(c => waCut(`• ${waText(c.text)}`));
  // Competitions already under way: their athletes' nextDate may be past, so they are listed per competition.
  const end = c => c.end || c.start;
  const running = S.comps.filter(c => c.start <= t && t <= end(c) && dayNo(c.start, end(c)) <= SERIES_DAYS)
    .map(c => ({c, list: S.athletes.filter(a => a.sportId === c.sportId && isDate(a.nextDate) && c.start <= a.nextDate && a.nextDate <= end(c))}))
    .filter(r => r.list.length);
  const inRunning = new Set(running.flatMap(r => r.list.map(a => a.id)));
  const competing = [
    ...running.sort((x, y) => heCmp(sportName(x.c.sportId), sportName(y.c.sportId)))
      .map(({c, list}) => [waCut(`• עד ${fmtShort(end(c))} · ${waText(c.name)} (${waText(sportName(c.sportId))}), מתקיימת עכשיו`), ...waList("  ", names(list))].join("\n")),
    ...S.athletes.filter(a => !inRunning.has(a.id) && isDate(a.nextDate) && a.nextDate >= t && a.nextDate <= addDays(t, 6))
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate) || heCmp(a.name, b.name))
      .map(a => waCut(`• ${fmtShort(a.nextDate)} · ${waText(a.name)} (${waText(sportName(a.sportId))})${a.next ? ": " + waText(a.next) : ""}`)),
  ];
  // One bullet per quota event (e.g. a Grand Slam deciding 7 weight classes), not one per class.
  const byEvent = new Map();
  for (const q of S.quotas) {
    if (q.israelStatus === "earned" || !nxt(q, t) || q.nextQuotaEvent.start > addDays(t, 13)) continue;
    const key = [q.nextQuotaEvent.start, q.sportId, q.nextQuotaEvent.name].join("|");
    byEvent.set(key, [...(byEvent.get(key) || []), q]);
  }
  const quotas = [...byEvent.keys()].sort().map(key => {
    const list = byEvent.get(key).sort((a, b) => heCmp(a.event, b.event)), q = list[0], e = q.nextQuotaEvent, last = quotaEventEnd(q);
    const who = S.athletes.filter(a => a.sportId === q.sportId && isDate(a.nextDate) && e.start <= a.nextDate && a.nextDate <= last);
    const stakes = commonStakes(list);
    return [
      waCut(`• ${fmtShort(e.start)} · ${waText(sportName(q.sportId))}${list.length === 1 ? `, ${waText(q.event)}` : ""}: ${waText(e.name)}`),
      ...(list.length > 1 ? waList("  מקצים: ", list.map(x => waText(x.event))) : []),
      ...(who.length ? waList("  ישראלים: ", names(who)) : []),
      ...(stakes ? [waCut(`  מה זה אומר: ${stakes}`)] : []),
    ].join("\n");
  });
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
