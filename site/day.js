// Daily view: #today and #day-YYYY-MM-DD (docs/design/daily-and-following.md §1, phase 1; copy: Shira on #130).
// Loaded after app.js and uses its helpers. Built from competitions + nextDate only: there are no session times
// or live results, so the page says when the data is from and never "live".
"use strict";

const DAY_STRIP = 7;          // chips on each side of the selected date
const DAY_LOOKAHEAD = 120;    // how far the empty state searches for the next day with Israelis

// Same rule as the home strip's todayRows(), for any date: one row per competition running that day in a tracked
// sport, with the athletes whose nextDate falls inside it; athletes due that day with no such competition get
// their own row. TODO: fold into todayRows(t) once app.js can take that change.
function dayRows(t){
  const end = c => c.end || c.start;
  const running = S.comps.filter(c => c.start <= t && t <= end(c) && dayNo(c.start, end(c)) <= SERIES_DAYS && athletesOf(c.sportId).length);
  const rows = new Map(running.map(c => [c, {comp: c, sportId: c.sportId, athletes: []}]));
  for (const a of S.athletes) {
    if (!isDate(a.nextDate)) continue;
    const mine = running.filter(c => c.sportId === a.sportId);
    const c = mine.find(c => c.start <= a.nextDate && a.nextDate <= end(c)) || (a.nextDate === t ? mine[0] : null);
    if (c) rows.get(c).athletes.push(a);
    else if (a.nextDate === t) rows.set(a, {comp: null, sportId: a.sportId, athletes: [a]});
  }
  const fav = r => r.athletes.some(a => S.follows.has(a.id)) ? 0 : 1;
  return [...rows.values()].sort((x, y) => fav(x) - fav(y) || heCmp(sportName(x.sportId), sportName(y.sportId))
    || heCmp(x.comp?.name || x.athletes[0].name, y.comp?.name || y.athletes[0].name));
}
const hasIsraelis = t => dayRows(t).some(r => r.athletes.length);

const asDate = d => new Date(d + "T12:00:00");
const dayTitle = d => `${asDate(d).toLocaleDateString("he-IL", {weekday: "short"})}, ${fmt(d)}`;            // "יום ה׳, 29 באוק׳ 2026"
const chipText = d => `${asDate(d).toLocaleDateString("he-IL", {weekday: "narrow"})} ${asDate(d).getDate()}`;  // "ה׳ 30"
const chipName = d => asDate(d).toLocaleDateString("he-IL", {weekday: "long", day: "numeric", month: "long"}); // "יום חמישי, 30 באוקטובר"
// Israel time, like today(): the stamps must not shift with the viewer's time zone.
const hhmm = iso => new Date(iso).toLocaleTimeString("he-IL", {hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem"});
const ilDate = iso => new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Jerusalem"}).format(new Date(iso));

// Per athlete: the result recorded for that day; else where they stand relative to their own competition day.
function dayAthlete(a, d){
  const t = today();
  const star = S.follows.has(a.id) ? `<span class="star-on" aria-label="במעקב שלך">★</span> ` : "";
  const res = (Array.isArray(a.history) ? a.history : []).find(h => h.kind === "result" && h.at === d);
  const upd = str(a.updatedAt), updOk = !isNaN(Date.parse(upd));
  const stamp = !updOk ? "" : ` · עודכן ב־${ilDate(upd) === t ? hhmm(upd) : `${fmtShort(ilDate(upd))}, ${hhmm(upd)}`}`;
  const nd = isDate(a.nextDate) ? a.nextDate : "";
  const line = res ? `<span class="day-res">תוצאה: ${esc(res.text)}${stamp}${safeUrl(res.source) ? ` · ${linkOut(res.source)}` : ""}</span>`
    : !nd ? ""
    : nd < t ? `<span class="day-wait"><span aria-hidden="true">◷</span> בהמתנה לתוצאה</span>`
    : nd === t ? `<span class="day-now">מתחרה היום</span>`
    : `<span class="day-before">${nd === addDays(t, 1) ? "מתחרה מחר" : `מתחרה ב־${fmt(nd)}`}</span>`;
  return `<li>${star}<a href="#a-${esc(a.id)}">${esc(a.name)}</a>${a.event ? ` · <bdi>${esc(a.event)}</bdi>` : ""}${line ? `<br>${line}` : ""}</li>`;
}

function dayRow({comp: c, sportId, athletes}, d){
  const list = `<ul class="day-ath">${athletes.sort((a, b) => heCmp(a.name, b.name)).map(a => dayAthlete(a, d)).join("")}</ul>`;
  if (!c) return `<section class="panel day-comp"><h2><a href="#sport-${esc(sportId)}">${esc(sportName(sportId))}</a>${athletes[0].next ? ` · ${esc(athletes[0].next)}` : ""}</h2>${list}</section>`;
  const total = dayNo(c.start, c.end || c.start), n = dayNo(c.start, d), now = d === today();
  const inComp = s => isDate(s) && c.start <= s && s <= (c.end || c.start);
  const stakes = quotasOf(sportId).filter(q => q.stakes && inComp(q.nextQuotaEvent?.start) && nxt(q, d)).slice(0, STAKES_MAX);
  const tracked = athletesOf(sportId).length;
  const sub = [now ? "מתקיימת עכשיו" : "", total > 1 ? `יום ${n} מתוך ${total}` : ""].filter(Boolean).join(" · ");
  return `<section class="panel day-comp">
    <h2><a href="#sport-${esc(sportId)}">${esc(sportName(sportId))}</a> · ${esc(c.name)}</h2>
    ${sub ? `<p class="${now ? "now" : "muted"}">${sub}</p>` : ""}
    ${athletes.length ? list : `<p class="muted">${tracked === 1 ? "ספורטאי/ת או נבחרת אחת במעקב בענף" : `${tracked} ספורטאים ונבחרות במעקב בענף`}</p>`}
    ${stakes.map(q => `<p class="stakes"><b>מה זה אומר:</b> <bdi>${esc(q.event)}</bdi>: ${esc(q.stakes)}</p>`).join("")}
    <p class="foot">${[esc(c.location), linkOut(c.source)].filter(Boolean).join(" · ")}</p>
  </section>`;
}

function viewDay(d){
  if (!isDate(d) || isNaN(asDate(d))) return notFound();
  const t = today(), prev = addDays(d, -1), next = addDays(d, 1), isToday = d === t;
  const chips = Array.from({length: DAY_STRIP * 2 + 1}, (_, i) => addDays(d, i - DAY_STRIP));
  const rows = dayRows(d);
  let after = "";
  if (!rows.length) for (let i = 1; i <= DAY_LOOKAHEAD && !after; i++) if (hasIsraelis(addDays(d, i))) after = addDays(d, i);
  const ts = S.live ? S.lastRun : (S.generatedAt || S.lastRun), tsOk = ts && !isNaN(Date.parse(ts));
  return `<nav class="day-nav" aria-label="מעבר בין ימים">
      <a href="#day-${prev}">→ ${isToday ? "אתמול" : "היום הקודם"}</a><a href="#day-${next}">${isToday ? "מחר" : "היום הבא"} ←</a></nav>
  <h1 tabindex="-1">${dayTitle(d)}</h1>
  <ul class="day-strip">${chips.map(x => { const has = hasIsraelis(x); return `<li><a href="#day-${x}" aria-label="${chipName(x)}${has ? " · יש תחרויות של ישראלים" : ""}"${x === d ? ` aria-current="date"` : ""}>${chipText(x)}${has ? `<span class="dot" aria-hidden="true"></span>` : ""}</a></li>`; }).join("")}</ul>
  ${rows.length ? rows.map(r => dayRow(r, d)).join("")
    : `<div class="empty"><p>אין תחרויות ידועות של ספורטאים ונבחרות מישראל ביום הזה.</p>${after ? `<p><a href="#day-${after}">לתחרות הבאה: ${fmt(after)}</a></p>` : ""}</div>`}
  ${tsOk ? `<p class="foot">נכון ל־${fmt(ilDate(ts))}, ${hhmm(ts)}</p>` : ""}`;
}
