// Front-end smoke tests: runs site/app.js (and site/admin.js if present) in a vm with a minimal DOM shim.
// Node built-ins only. Run: node tests/smoke.test.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
const SCRIPTS = ["site/app.js", "site/admin.js", "site/quotas.js", "site/digest.js"].map(p => path.join(ROOT, p)).filter(fs.existsSync);
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/data.json"), "utf8"));

function fakeEl(id){
  return {
    id, innerHTML: "", value: "", textContent: "", hidden: false, disabled: false, checked: false, dataset: {},
    selectionStart: 0, addEventListener(){}, removeEventListener(){}, setAttribute(){}, removeAttribute(){},
    toggleAttribute(){}, focus(){}, blur(){}, showModal(){}, close(){}, select(){}, setSelectionRange(){},
    insertAdjacentHTML(_, html){ this.innerHTML += html; }, querySelector: () => null, querySelectorAll: () => [],
    closest: () => null,
  };
}

// A Date whose "now" is pinned, so today() (Israel time) is deterministic.
function fixedDate(iso){
  const NOW = Date.parse(iso);
  return class extends Date {
    constructor(...a){ a.length ? super(...a) : super(NOW); }
    static now(){ return NOW; }
  };
}

const QUOTAS = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/quotas.json"), "utf8"));

// `data` is the data.json payload; `fetchFails` makes every fetch reject.
// `quotas`: quotas.json payload; undefined → 404, "fail" → that fetch rejects.
// `now` pins the clock (ISO instant); `follows` seeds localStorage.
// Start hidden like their markup in index.html, so tests see what the app un-hides.
const HIDDEN_IN_HTML = ["adminChip", "adminLink", "visitorBtn", "visitorBar"];
// `claude` stands in for window.claude (editor tests); `storage` seeds localStorage.
async function boot({data = FIXTURE, fetchFails = false, quotas, now, follows = [], claude, storage = {}} = {}){
  const els = {}, listeners = {};
  const mem = new Map([["la28.follows", JSON.stringify(follows)], ...Object.entries(storage)]);
  const ctx = {
    console, URL, Intl, Date: now ? fixedDate(now) : Date, Math, JSON, Promise, setTimeout, clearTimeout,
    setInterval: () => 0, clearInterval(){},
    location: {hash: "", reload(){ ctx.reloads = (ctx.reloads || 0) + 1; }},
    history: {replaceState(){}},
    localStorage: {getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k)},
    navigator: {clipboard: {writeText: async () => {}}},
    matchMedia: () => ({matches: false, addEventListener(){}}),
    scrollTo(){}, addEventListener(){}, removeEventListener(){},
    document: {
      getElementById: id => els[id] ??= Object.assign(fakeEl(id), HIDDEN_IN_HTML.includes(id) ? {hidden: true} : {}),
      // Only "#view h1" is needed (focus, route announcement, document.title).
      querySelector: sel => {
        const m = sel === "#view h1" && /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(els.view?.innerHTML || "");
        return m ? {...fakeEl("h1"), textContent: m[1].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&")} : null;
      },
      querySelectorAll: () => [],
      addEventListener: (type, fn) => (listeners[type] ??= []).push(fn), activeElement: null,
    },
    fetch: async url => {
      if (fetchFails) throw new Error("network down");
      let body = data;
      if (url === "quotas.json") {
        if (quotas === "fail") throw new Error("network down");
        if (quotas === undefined) return {ok: false, status: 404, json: async () => { throw new Error("404"); }};
        body = quotas;
      }
      return {ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(body))};
    },
  };
  ctx.window = ctx;
  if (claude) ctx.claude = claude;
  vm.createContext(ctx);
  for (const f of SCRIPTS) vm.runInContext(fs.readFileSync(f, "utf8"), ctx, {filename: f});
  await new Promise(r => setTimeout(r, 20));   // let loadPublic()'s fetch settle
  const run = expr => vm.runInContext(expr, ctx);
  const view = hash => { ctx.location.hash = "#" + hash; run("route()"); return els.view.innerHTML; };
  const fire = (type, target) => (listeners[type] || []).forEach(fn => fn({type, target}));
  return {ctx, els, run, view, fire};
}

const tests = [];
const test = (name, fn) => tests.push({name, fn});

const NOT_FOUND = "הדף לא נמצא";

test("routes render expected content", async () => {
  const {view} = await boot();
  const expect = {
    home: ["הדרך ללוס אנג׳לס 28", "מה התעדכן", "תחרויות קרובות"],
    sports: ["<h1 tabindex=\"-1\">ענפים</h1>", "ג׳ודו"],
    "sport-judo": ["שיטת ההעפלה", "ספורטאים ונבחרות", "רז הרשקו"],
    "a-raz-hershko": ["<h1 tabindex=\"-1\">רז הרשקו</h1>", "היסטוריה", "שיתוף"],
    calendar: ["לוח תחרויות", "חלונות העפלה"],
    "calendar-judo": ["לוח תחרויות", "value=\"judo\" selected"],
    updates: ["<h1 tabindex=\"-1\">מה התעדכן</h1>"],
    about: ["<h1 tabindex=\"-1\">אודות</h1>", "ארבעת השלבים"],
  };
  for (const [h, needles] of Object.entries(expect)) {
    const out = view(h);
    assert.ok(out.length > 200, `${h}: empty output`);
    assert.ok(!out.includes(NOT_FOUND), `${h}: rendered not-found`);
    for (const n of needles) assert.ok(out.includes(n), `${h}: missing ${JSON.stringify(n)}`);
  }
});

test("unknown ids render not-found; malformed hash does not throw", async () => {
  const {view} = await boot();
  for (const h of ["sport-nope", "a-nope", "nope"]) assert.ok(view(h).includes(NOT_FOUND), h);
  assert.doesNotThrow(() => view("%E0"));
});

test("calendar sport filter does not stick after leaving calendar-<sport>", async () => {
  const {view} = await boot();
  view("calendar-judo");
  assert.ok(!view("calendar").includes("value=\"judo\" selected"));
});

test("search finds an athlete by Hebrew name", async () => {
  const {run, els, view} = await boot();
  view("home");
  run(`S.q = "הרשקו"; renderResults()`);
  assert.ok(els.results.innerHTML.includes("רז הרשקו"));
  assert.match(els.qCount.textContent, /נמצאו [1-9]/);
});

test("search by sport English name or id finds that sport's athletes", async () => {
  const {run, els, view} = await boot();
  view("home");
  const judo = FIXTURE.athletes.filter(a => a.sportId === "judo").length;
  for (const q of ["judo", "JUDO", "artistic-gymnastics"]) {
    run(`S.q = ${JSON.stringify(q)}; renderResults()`);
    assert.match(els.qCount.textContent, /נמצאו [1-9]/, q);
  }
  run(`S.q = "judo"; renderResults()`);
  assert.ok(els.qCount.textContent.startsWith(`נמצאו ${judo} `), els.qCount.textContent);
  assert.ok(els.results.innerHTML.includes("רז הרשקו"));
  assert.ok(els.results.innerHTML.includes(`href="#sport-judo"`));
});

test("search says how many of the hits it shows when truncated", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  data.athletes.slice(0, 30).forEach(a => { a.event = "zqx"; });
  const {run, els, view} = await boot({data});
  view("home");
  run(`S.q = "zqx"; renderResults()`);
  assert.ok(els.results.innerHTML.includes("מציג 24 מתוך 30"));
  assert.strictEqual((els.results.innerHTML.match(/<a class="card"/g) || []).length, 24);
  assert.match(els.qCount.textContent, /^נמצאו 30 /);
  data.athletes.slice(24, 30).forEach(a => { a.event = ""; });
  const b = await boot({data});
  b.view("home");
  b.run(`S.q = "zqx"; renderResults()`);
  assert.ok(!b.els.results.innerHTML.includes("מציג"), "no note at exactly 24");
});

test("search ignores apostrophe/geresh, quote/gershayim, niqqud, spacing and Latin case", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  const a = data.athletes.find(x => x.id === "raz-hershko");
  a.event = `ק"מ אחד`; a.name_en = "Raz Hershko";
  const {run, els, view} = await boot({data});
  view("home");
  const count = q => { run(`S.q = ${JSON.stringify(q)}; renderResults()`); return els.qCount.textContent; };
  const judo = count("ג׳ודו");
  assert.match(judo, /נמצאו [1-9]/);
  for (const q of ["ג'ודו", "ג`ודו", "ג’ודו", "  גּ׳וּדוֹ  "]) assert.strictEqual(count(q), judo, q);
  for (const q of ["ק״מ אחד", "ק\"מ   אחד", "RAZ hershko"]) assert.match(count(q), /נמצאו [1-9]/, q);
});

test("not-found has an h1, is announced and clears the nav", async () => {
  const {ctx, view} = await boot();
  const links = ["home", "sports"].map(nav => ({dataset: {nav}, current: false,
    setAttribute(){ this.current = true; }, removeAttribute(){ this.current = false; }}));
  ctx.document.querySelectorAll = sel => sel === ".links a" ? links : [];
  for (const h of ["nope", "sport-nope", "a-nope"]) {
    view("sports");
    assert.ok(links[1].current);
    assert.ok(view(h).includes(`<h1 tabindex="-1">${NOT_FOUND}</h1>`), h);
    assert.ok(links.every(l => !l.current), `${h}: nav still marked`);
  }
});

test("hostile strings are escaped and unsafe links dropped", async () => {
  const BAD = `<img src=x onerror=alert(1)>`, JS = "javascript:alert(1)";
  const data = JSON.parse(JSON.stringify(FIXTURE));
  const a = data.athletes.find(x => x.id === "raz-hershko");
  Object.assign(a, {name: BAD, name_en: BAD, event: BAD, rank: BAD, next: BAD, notes: BAD + JS, source: JS,
    history: [{at: "2026-01-01", kind: BAD, text: BAD, source: JS}]});
  const c = data.competitions.find(x => x.sportId === "judo");
  Object.assign(c, {name: BAD, location: BAD, notes: BAD, source: JS, start: "2099-01-01", end: "2099-01-02"});
  data.changes.unshift({at: "2026-10-18", text: BAD, athleteId: "raz-hershko"});
  const {view, run, els} = await boot({data});
  const outs = ["home", "sports", "sport-judo", "a-raz-hershko", "calendar", "calendar-judo", "updates"].map(view);
  run(`S.q = "img"; renderResults()`);
  outs.push(els.results.innerHTML);
  for (const out of outs) {
    assert.ok(!/<img/i.test(out), "raw <img in output");
    assert.ok(!/href\s*=\s*["']?\s*javascript:/i.test(out), "javascript: href in output");
  }
  assert.ok(outs[3].includes("&lt;img"), "athlete page should show the escaped name");
});

test("empty data renders empty states", async () => {
  const {view} = await boot({data: {...FIXTURE, athletes: [], competitions: [], changes: []}});
  assert.ok(view("home").includes("אין תחרויות קרובות במאגר"));
  assert.ok(view("home").includes("עוד אין עדכונים"));
  assert.ok(view("sport-judo").includes("אין כרגע ספורטאים או נבחרות מישראל במעקב"));
  assert.ok(view("calendar").includes("אין תחרויות שמתאימות לסינון"));
  assert.ok(view("updates").includes("עוד אין עדכונים"));
  assert.ok(view("sports").length > 0);
});

const STRIP = "ישראלים מתחרים היום";
const stripOf = html => html.split('class="panel today"')[1]?.split("</section>")[0] || "";
const rowsOf = strip => strip.split("<li>").slice(1);
const count = (s, needle) => s.split(needle).length - 1;
const busyOf = html => html.split("ב־14 הימים הקרובים")[1]?.split("</section>")[0] || "";

test("today strip: one row per running competition, athletes listed once", async () => {
  // 21:30 UTC on 19 Oct is already 20 Oct in Israel; gymnastics Worlds run 17–25 Oct.
  const {view, run} = await boot({now: "2026-10-19T21:30:00Z"});
  assert.strictEqual(run("today()"), "2026-10-20");
  const strip = stripOf(view("home"));
  assert.ok(strip.startsWith(' aria-labelledby="todayH"') && strip.includes(`<h2 id="todayH">${STRIP}</h2>`), "heading/aria");
  assert.ok(strip.includes("תוצאות יתעדכנו בעדכון היומי"), "not-live label");
  const rows = rowsOf(strip);
  assert.strictEqual(rows.length, 1);
  assert.ok(rows[0].includes("אליפות העולם בהתעמלות מכשירים 2026") && rows[0].includes("יום 4 מתוך 9"));
  for (const id of ["artem-dolgopyat", "lihie-raz", "yali-shoshani"]) assert.strictEqual(count(strip, `href="#a-${id}"`), 1, id);
  assert.ok(!strip.includes("raz-hershko"), "judo athlete competing on 29 Oct");
});

test("today strip: followed first, solo rows, escaping, 14-day list starts after the strip", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  Object.assign(data.athletes.find(a => a.id === "adva-cohen"), {nextDate: "2026-10-29", next: "<img src=x onerror=alert(1)>"});
  const {view} = await boot({data, now: "2026-10-29T08:00:00Z", follows: ["raz-hershko"]});
  const home = view("home"), rows = rowsOf(stripOf(home));
  assert.strictEqual(rows.length, 3);
  assert.ok(rows[0].includes("גרנד סלאם אבו דאבי") && rows[0].includes('aria-label="במעקב שלך">★</span> <a href="#a-raz-hershko"'), "followed row first, starred");
  assert.ok(rows[1].includes("adva-cohen") && rows[1].includes(">היום<"), "solo row for athlete without a competition");
  assert.ok(!/<img/i.test(rows[1]) && rows[1].includes("&lt;img"), "next must be escaped");
  assert.ok(rows[2].includes("ישראלי/ת אחד/ת במעקב בענף") && !rows[2].includes('href="#a-'), "running comp, nobody listed (singular)");
  assert.ok(!stripOf(home).includes("סדרת גביעי העולם בהתעמלות אמנותית"), "season-long series excluded");
  assert.ok(!busyOf(home).includes("raz-hershko") && !busyOf(home).includes("adva-cohen"), "no repeat in 14-day list");
  const before = await boot({now: "2026-10-26T08:00:00Z"});
  assert.ok(busyOf(before.view("home")).includes("raz-hershko"), "14-day list unchanged without the strip");
});

test("today strip: competitions without listed athletes, capped at 6", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  const sports = [...new Set(data.athletes.map(a => a.sportId))].slice(0, 8);
  sports.forEach((sportId, i) => data.competitions.push({id: `t${i}`, sportId, name: `תחרות ${i}`, location: "מקום", start: "2026-10-26", end: "2026-10-27"}));
  data.athletes.forEach(a => { if (a.nextDate >= "2026-10-26" && a.nextDate <= "2026-10-27") a.nextDate = ""; });
  const {view} = await boot({data, now: "2026-10-26T08:00:00Z"});
  const strip = stripOf(view("home"));
  assert.ok(strip.includes('<h2 id="todayH">היום בענפים שבמעקב</h2>'), "heading when nobody is listed");
  assert.strictEqual(rowsOf(strip).length, 6);
  assert.ok(strip.includes('<a href="#calendar">ועוד 2 בלוח התחרויות</a>'));
  assert.ok(strip.includes("ישראלים במעקב בענף") && !strip.includes('href="#a-'));
});

test("today strip: hidden on a day with no competitions", async () => {
  const {view} = await boot({now: "2026-10-26T08:00:00Z"});
  const home = view("home");
  assert.ok(home.length > 200 && !home.includes("todayH"));
});

test("quotas.json loads into S.quotas and invalid items are dropped", async () => {
  const {run} = await boot({quotas: QUOTAS});
  const statuses = JSON.parse(run(`JSON.stringify(S.quotas.map(q => q.israelStatus))`));
  assert.deepStrictEqual(statuses.sort(), ["earned", "in-contention", "outside", "unknown"]);
  assert.strictEqual(run(`quotasOf("judo").length`), 1);
  assert.strictEqual(run(`quotasOf("swimming")[0].totalQuotas`), null);
  assert.strictEqual(run(`S.quotasUpdatedAt`), "2026-10-18");

  const items = JSON.parse(JSON.stringify(QUOTAS.items.slice(0, 1)));
  const bad = [{sportId: "quidditch"}, {israelStatus: "won"}, {source: "javascript:alert(1)"},
    {nextQuotaEvent: {name: "x", start: "soon"}}, {totalQuotas: "18"}, {maxPerNOC: 1.5}];
  const {run: run2} = await boot({quotas: {updatedAt: "2026-10-18", items: [...items, ...bad.map(b => ({...items[0], ...b})), null, "x"]}});
  assert.strictEqual(run2(`S.quotas.length`), 1);
});

test("missing, failing or malformed quotas.json leaves the site unchanged", async () => {
  const base = (await boot()).view("sport-judo");
  for (const quotas of [undefined, "fail", "not an object", {items: "nope"}, null]) {
    const {run, view} = await boot({quotas});
    assert.strictEqual(run(`S.quotas.length`), 0, JSON.stringify(quotas));
    assert.strictEqual(run(`S.quotasUpdatedAt`), "");
    assert.ok(!run(`S.failed`));
    assert.strictEqual(view("sport-judo"), base);
  }
});

const SPORT_QUOTAS = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/quotas-sport.json"), "utf8"));

test("sport page quota section: order, counts, escaping", async () => {
  const {view} = await boot({quotas: SPORT_QUOTAS});
  const out = view("sport-judo");
  assert.ok(out.includes("מכסות לישראל") && out.includes("4 מקצים"));
  assert.ok(out.indexOf("שיטת ההעפלה") < out.indexOf("מכסות לישראל") && out.indexOf("מכסות לישראל") < out.indexOf("ספורטאים ונבחרות"));
  const order = ["עד 57", "עד 78", "קבוצה מעורבת", "עד 100"].map(e => out.indexOf(e));
  assert.deepStrictEqual([...order].sort((x, y) => x - y), order, "earned → in-contention → outside → unknown");
  for (const l of ["✓ מכסה הושגה", "◐ במרוץ למכסה", "○ מחוץ למכסות כרגע", "? אין מידע עדיין"]) assert.ok(out.includes(l), l);
  assert.ok(out.includes("18 מכסות בעולם · עד מכסה אחת למדינה"));
  assert.ok(out.includes("0 מכסות בעולם · עד 2 מכסות למדינה"), "a real 0 is shown, not dropped");
  assert.ok(out.includes("גרנד סלאם אבו דאבי") && !out.includes("תחרות שעברה"), "past quota event hidden");
  assert.ok(out.includes("ijf.org") && out.includes("נתוני מכסות עודכנו"));
  assert.ok(!/<img/i.test(out) && out.includes("&lt;img"), "israelNote escaped");
  assert.ok(out.includes('aria-label="מכסה הושגה: 1, במרוץ למכסה: 1, מחוץ למכסות כרגע: 1, אין מידע עדיין: 1"'));
});

test("quota stakes: sport page and upcoming #quotas only, escaped, dropped over 140 chars", async () => {
  const LINE = "מה זה אומר:";
  const {view} = await boot({quotas: SPORT_QUOTAS});
  const judo = view("sport-judo");
  assert.ok(judo.includes(`<p class="stakes"><b>${LINE}</b> &lt;script&gt;`) && !/<script/i.test(judo), "shown and escaped");
  const li = judo.split("<li>").find(x => x.includes(LINE));
  assert.ok(li.indexOf("אירוע המכסה הבא") < li.indexOf(LINE) && li.indexOf(LINE) < li.indexOf("<details>"), "placement");
  assert.ok(!judo.includes("שמירה על המקום הראשון"), "no future quota event, no stakes line");
  const all = view("quotas"), upcoming = all.split('id="qNextH"')[1].split("</section>")[0];
  assert.ok(upcoming.includes(`<small class="stakes"><b>${LINE}</b>`), "#quotas upcoming list");
  assert.strictEqual(all.split(LINE).length - 1, 1, "not in the per-status lists");

  const q = JSON.parse(JSON.stringify(SPORT_QUOTAS));
  q.items[0].stakes = "א".repeat(141);
  const long = await boot({quotas: q});
  assert.strictEqual(long.run("S.quotas.length"), q.items.length, "item kept");
  assert.ok(!long.view("sport-judo").includes(LINE), "stakes over 140 chars dropped");
});

test("copy buttons report into data-copy-msg when given", async () => {
  const {els, run, fire} = await boot();
  run(`$("src").value = "abc"`);
  const btn = {dataset: {copy: "src", copyMsg: "outMsg"}};
  fire("click", {closest: () => btn});
  await new Promise(r => setTimeout(r, 0));
  assert.strictEqual(els.outMsg.textContent, "הועתק.");
  assert.strictEqual(els.copyMsg?.textContent || "", "", "default message element untouched");
});

test("quota stakes in the today strip: matched by sport + date, at most 2", async () => {
  // Abu Dhabi Grand Slam runs 29–31 Oct in the fixture; only items whose next quota event falls inside it show.
  const q = JSON.parse(JSON.stringify(SPORT_QUOTAS));
  const judo = q.items.filter(i => i.sportId === "judo");
  judo.forEach((i, n) => Object.assign(i, {stakes: `stake ${n} <b>`, nextQuotaEvent: {name: "שם אחר לגמרי", start: "2026-10-29"}}));
  judo[3].nextQuotaEvent.start = "2026-11-13";
  const strip = stripOf((await boot({quotas: q, now: "2026-10-30T08:00:00Z"})).view("home"));
  const row = rowsOf(strip).find(r => r.includes("גרנד סלאם אבו דאבי"));
  assert.ok(row.includes('<small class="stakes"><b>מה זה אומר:</b> ') && row.includes("stake 0 &lt;b&gt;") && row.includes("stake 1"), "started yesterday still shows");
  assert.ok(!row.includes("stake 3"), "next quota event outside the competition");
  assert.ok(row.includes('ועוד 1 מקצים — <a href="#sport-judo">בדף הענף</a>') && !row.includes("stake 2"), "capped at 2");
  const none = stripOf((await boot({now: "2026-10-30T08:00:00Z"})).view("home"));
  assert.ok(none.length && !none.includes("מה זה אומר"), "no quotas file, no stakes line");
});

test("today strip stakes order: followed athletes, then athletes in the row, then file order", async () => {
  const base = QUOTAS.items[0];   // judo, valid
  const item = (event, israelNote) => ({...base, event, israelNote, stakes: `stake ${event}`, israelStatus: "in-contention",
    nextQuotaEvent: {name: "גרנד סלאם", start: "2026-10-29"}});
  const quotas = {updatedAt: "2026-10-29", items: [
    item("63- ק״ג נשים", "כרם פרימו מדורגת 13"),    // not in the row (no nextDate)
    item("78- ק״ג נשים", ""),                        // nobody linked
    item("60- ק״ג גברים", ""),                       // in the row, linked by weight class only
    item("78+ ק״ג נשים", "רז הרשקו מדורגת 1"),      // in the row, linked by name
  ]};
  const shown = async follows => {
    const row = rowsOf(stripOf((await boot({quotas, follows, now: "2026-10-29T08:00:00Z"})).view("home"))).find(r => r.includes("גרנד סלאם אבו דאבי"));
    return [...row.matchAll(/<small class="stakes"><b>מה זה אומר:<\/b> ([^:]+):/g)].map(m => m[1]);
  };
  assert.deepStrictEqual(await shown([]), ["60- ק״ג גברים", "78+ ק״ג נשים"], "athletes listed in the row first, file order among them");
  assert.deepStrictEqual(await shown(["raz-hershko"]), ["78+ ק״ג נשים", "60- ק״ג גברים"], "followed first");
  assert.deepStrictEqual(await shown(["kerem-primo"]), ["63- ק״ג נשים", "60- ק״ג גברים"], "followed even when not listed in the row");
});

test("quota section: all-unknown note; hidden without items", async () => {
  const {view} = await boot({quotas: SPORT_QUOTAS});
  const shooting = view("sport-shooting");
  assert.ok(shooting.includes("מקצה אחד") && shooting.includes("עוד אין מידע על מצב ישראל"));
  assert.ok(!view("sport-surfing").includes("מכסות לישראל"));
});

test("document.title follows the page heading", async () => {
  const {view, ctx} = await boot();
  const SITE = "הדרך ללוס אנג׳לס 28";
  const cases = {home: SITE, sports: `ענפים · ${SITE}`, "a-raz-hershko": `רז הרשקו · ${SITE}`, calendar: `לוח תחרויות · ${SITE}`};
  for (const [h, title] of Object.entries(cases)) { view(h); assert.strictEqual(ctx.document.title, title, h); }
  view("a-nope");
  assert.ok(ctx.document.title.endsWith(SITE));
});

// The published, hand-curated file: the loader must keep every item and every quota page must render.
test("site/quotas.json: all items load and render", async () => {
  const real = JSON.parse(fs.readFileSync(path.join(ROOT, "site/quotas.json"), "utf8"));
  const {run, view} = await boot({quotas: real});
  assert.strictEqual(run("S.quotas.length"), real.items.length, "loader dropped items");
  const all = view("quotas");
  assert.ok(!all.includes(NOT_FOUND) && all.length > 1000);
  for (const sid of new Set(real.items.map(q => q.sportId))) {
    const out = view("sport-" + sid);
    assert.ok(out.includes("מכסות לישראל"), sid);
    assert.strictEqual((out.match(/<li>\s*<div class="q-top">/g) || []).length, real.items.filter(q => q.sportId === sid).length, sid);
  }
});

test("fetch failure shows the retry view", async () => {
  const {view} = await boot({fetchFails: true});
  assert.ok(view("home").includes("data-retry"));
});

test("#admin last-run panel shows the newest run's warnings, escaped", async () => {
  const runs = [
    {id: "2026-10-18", status: "done", started: "2026-10-18T05:00:00Z", ended: "2026-10-18T05:30:00Z", published: true,
      warnings: ["לעדכן quotas.json: גרנד סלאם <img src=x onerror=alert(1)>", "לעדכן quotas.json: אליפות העולם בקליעה"]},
    {id: "2026-10-17", status: "done", started: "2026-10-17T05:00:00Z", published: true, warnings: ["ישנה: לא להציג"]},
  ];
  const {run, view} = await boot({now: "2026-10-18T08:00:00Z"});
  run(`S.isAdmin = true; S.live = true; S.db = {collection: () => ({orderBy: () => ({limit: () => ({
    onSnapshot: ok => ok({docs: ${JSON.stringify(runs)}.map(r => ({id: r.id, data: () => r}))})})})})}`);
  const out = view("admin");
  const box = out.split('id="runWarnings"')[1]?.split("</div>")[0] || "";
  assert.ok(box.includes("(2)") && box.includes("אליפות העולם בקליעה"), "newest run's warnings listed");
  assert.ok(box.includes("&lt;img") && !/<img/i.test(out), "escaped");
  assert.ok(!box.includes("ישנה"), "older run's warnings stay out of the box");
  const runOpen = out.slice(0, out.indexOf("הריצה היומית האחרונה")).split("<section").pop();
  assert.ok(out.includes("יש משימות") && !runOpen.includes("adm-alert"), "reminder, not an alert");

  const quiet = await boot({now: "2026-10-18T08:00:00Z"});
  quiet.run(`S.isAdmin = true; S.live = true; S.db = {collection: () => ({orderBy: () => ({limit: () => ({
    onSnapshot: ok => ok({docs: [{id: "2026-10-18", data: () => ({status: "done", started: "2026-10-18T05:00:00Z", published: true})}]})})})})}`);
  assert.ok(!quiet.view("admin").includes('id="runWarnings"'), "no box without warnings");
});

test("#admin launch readiness: counts link to where each issue is fixed", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  const [a, b, c] = data.athletes;
  a.source = "javascript:alert(1)"; b.nextDate = "2026-10-01"; c.verifiedAt = "2026-10-17T00:00:00Z";
  const {run, view} = await boot({data, quotas: {...QUOTAS, unpublished: 5}, now: "2026-10-18T08:00:00Z"});
  run(`S.isAdmin = true; S.live = true; S.proposals = [{id: "p1", status: "pending"}, {id: "p2", status: "pending"}]`);
  const panel = view("admin").split('id="launch"')[1].split("</section>")[0];
  const num = label => { const before = panel.split(label)[0]; return before.slice(before.lastIndexOf('digits">') + 8).split("<")[0]; };
  assert.strictEqual(num("הצעות ממתינות"), "2");
  assert.strictEqual(num("פריטי מכסות שלא פורסמו"), "5");
  assert.strictEqual(num("בלי אימות ידני"), String(data.athletes.filter(x => !x.verifiedAt).length));
  assert.strictEqual(num("תאריך התחרות הבאה עבר"), String(data.athletes.filter(x => /^\d{4}-\d\d-\d\d$/.test(x.nextDate || "") && x.nextDate < "2026-10-18").length));
  for (const href of ["#home", "#admin-nosource", "#admin-noverified", "#admin-pastnext"]) assert.ok(panel.includes(`href="${href}"`), href);
  const list = view("admin-nosource");
  assert.ok(list.includes(`href="#a-${a.id}"`) && !list.includes(`href="#a-${c.id}"`), "list rows link to the athlete page");
  assert.ok(view("admin-pastnext").includes(`href="#a-${b.id}"`));

  const plain = await boot({quotas: QUOTAS});
  plain.run(`S.isAdmin = true; S.live = true`);
  assert.ok(plain.view("admin").split('id="launch"')[1].includes("לא ידוע"), "no count in quotas.json → unknown, not 0");
});

test("#admin result night: picks quota events ending today/yesterday, links the runbook, keeps ticks", async () => {
  const SITE_QUOTAS = JSON.parse(fs.readFileSync(path.join(ROOT, "site/quotas.json"), "utf8"));
  const panelOf = html => html.split('id="resultNight"')[1].split("</section>")[0];
  const admin = async (now, quotas = SITE_QUOTAS) => {
    const b = await boot({quotas, now});
    b.run(`S.isAdmin = true; S.live = true`);
    return b;
  };
  // Rotterdam men's team final, 20 Oct 2026: listed on the day and the day after, not before or two days later.
  for (const [now, shown, label] of [["2026-10-20T18:00:00Z", true, "מסתיים היום"], ["2026-10-21T08:00:00Z", true, "הסתיים אתמול"],
      ["2026-10-19T08:00:00Z", false], ["2026-10-22T08:00:00Z", false]]) {
    const panel = panelOf((await admin(now)).view("admin"));
    assert.strictEqual(panel.includes("קבוצתי גברים"), shown, now);
    if (label) assert.ok(panel.includes(label), now);
    assert.ok(panel.includes('href="https://github.com/yonatanyacobi/IL2LA28/blob/main/docs/runbooks/result-night.md"'), "runbook link");
  }
  const b = await admin("2026-10-20T18:00:00Z");
  const panel = panelOf(b.view("admin"));
  assert.ok(!panel.includes("אישי גברים"), "a 2027 event of the same sport stays out");
  assert.ok(panel.includes('href="#sport-artistic-gymnastics"') && panel.includes('href="#a-artem-dolgopyat"') && panel.includes('href="#home"'));
  assert.ok(panel.includes("0/9"));
  const key = JSON.parse(b.run(`JSON.stringify(rnKey(S.quotas.find(q => q.event === "קבוצתי גברים")))`));
  b.fire("change", {checked: true, dataset: {rn: key, step: "0"}});
  b.fire("change", {checked: true, dataset: {rn: key, step: "3"}});
  b.fire("change", {checked: false, dataset: {rn: key, step: "0"}});
  const again = panelOf(b.view("admin"));
  assert.ok(again.includes("1/9") && /data-step="3" checked/.test(again) && !/data-step="0" checked/.test(again), "ticks persist per browser");

  const items = [{...QUOTAS.items[1], event: "<img src=x onerror=alert(1)>", nextQuotaEvent: {name: "<b>x</b>", start: "2026-10-20", end: "2026-10-20"}}];
  const hostile = panelOf((await admin("2026-10-20T18:00:00Z", {updatedAt: "2026-10-18", items})).view("admin"));
  assert.ok(!/<img|<b>x/i.test(hostile) && hostile.includes("&lt;img"), "escaped");
  const quiet = {updatedAt: "2026-10-18", items: [QUOTAS.items[1]]};   // its event is in 2027
  assert.ok(panelOf((await admin("2026-11-30T08:00:00Z", quiet)).view("admin")).includes("אין אירועי מכסה"), "quiet day");
});

test("#admin quota health: stale file, past/soon events, earned without a stage-2 athlete", async () => {
  const base = QUOTAS.items[0];   // judo, valid
  const item = (sportId, event, israelStatus, start) => ({...base, sportId, event, israelStatus,
    nextQuotaEvent: start ? {name: `אירוע ${event}`, start} : null});
  const quotas = {updatedAt: "2026-10-01", items: [
    item("judo", "עבר<b>", "in-contention", "2026-10-17"),
    item("sailing", "בקרוב", "in-contention", "2026-10-21"),
    item("sailing", "רחוק", "in-contention", "2026-10-22"),
    item("athletics", "הושגה-בלי", "earned", null),
    item("judo", "הושגה-עם", "earned", null),
  ]};
  const data = JSON.parse(JSON.stringify(FIXTURE));
  data.athletes.find(a => a.sportId === "judo").stage = 2;
  const {run, view} = await boot({data, quotas, now: "2026-10-18T08:00:00Z"});
  run("S.isAdmin = true; S.live = true");
  const out = view("admin");
  const flag = k => out.split(`data-flag="${k}"`)[1]?.split("</div>")[0] || "";
  const panel = out.split('id="quotaHealth"')[1].split("</section>")[0];
  assert.ok(panel.includes("ישן מ־14 ימים") && out.includes('class="panel adm-alert" id="quotaHealth"'), "17-day-old file flagged");
  assert.ok(flag("past").includes("עבר&lt;b&gt;") && !flag("past").includes("עבר<b>"), "past event listed and escaped");
  assert.ok(flag("past").includes('href="#sport-judo"'));
  assert.ok(flag("soon").includes("בקרוב") && flag("soon").includes("לעדכן אחרי התחרות") && !flag("soon").includes("רחוק"), "soon = within 3 days only");
  assert.ok(flag("earned").includes("הושגה-בלי") && !flag("earned").includes("הושגה-עם"), "earned needs a stage ≥ 2 athlete in the sport");

  const fresh = await boot({quotas: {updatedAt: "2026-10-17", items: [item("sailing", "רחוק", "in-contention", "2026-12-01")]}, now: "2026-10-18T08:00:00Z"});
  fresh.run("S.isAdmin = true; S.live = true");
  const ok = fresh.view("admin").split('id="quotaHealth"')[1].split("</section>")[0];
  assert.ok(ok.includes("תקין") && !ok.includes("data-flag"), "healthy file has no flags");
});

test("multi-day quota events stay current until their last day (sport page, #quotas, #admin)", async () => {
  const base = QUOTAS.items[0];   // judo, valid
  const item = (sportId, event, nextQuotaEvent) => ({...base, sportId, event, israelStatus: "in-contention", stakes: `stakes ${event}`, nextQuotaEvent});
  const quotas = {updatedAt: "2026-10-29", items: [
    item("judo", "גרנד-סלאם", {name: "גרנד סלאם אבו דאבי", start: "2026-10-29"}),            // end from the fixture competition (29–31 Oct)
    item("shooting", "עם-סוף", {name: "אליפות", start: "2026-10-27", end: "2026-11-08"}),   // explicit end
    item("sailing", "עבר", {name: "אירוע שעבר", start: "2026-10-28"}),                      // one day, no competition
  ]};
  const at = async now => { const b = await boot({quotas, now}); b.run("S.isAdmin = true; S.live = true"); return b; };

  const day2 = await at("2026-10-30T08:00:00Z");   // day 2 of Abu Dhabi
  assert.ok(day2.view("sport-judo").includes("מה זה אומר:</b> stakes גרנד-סלאם"), "judo stakes on day 2");
  assert.ok(day2.view("sport-shooting").includes("stakes עם-סוף"), "explicit end");
  assert.ok(!day2.view("sport-sailing").includes("מה זה אומר"), "one-day event already over");
  const upcoming = day2.view("quotas").split('id="qNextH"')[1].split("</section>")[0];
  assert.ok(upcoming.includes("גרנד-סלאם") && upcoming.includes("עם-סוף") && !upcoming.includes("עבר"));
  const past = day2.view("admin").split('data-flag="past"')[1]?.split("</div>")[0] || "";
  assert.ok(past.includes("עבר") && !past.includes("גרנד-סלאם") && !past.includes("עם-סוף"), "running events not flagged as past");

  const after = await at("2026-11-01T08:00:00Z");
  assert.ok(!after.view("sport-judo").includes("מה זה אומר"), "gone after the competition ends");
  assert.ok((after.view("admin").split('data-flag="past"')[1] || "").split("</div>")[0].includes("גרנד-סלאם"));
});

test("#quotas renders the fixture grouped by status, with links and the as-of date", async () => {
  const {view} = await boot({quotas: QUOTAS, now: "2026-10-18T08:00:00Z"});
  const out = view("quotas");
  assert.ok(!out.includes(NOT_FOUND) && !out.includes("טוען"), "page should be loaded");
  const pos = ["qH-earned", "qH-in-contention", "qH-outside", "qH-unknown"].map(id => out.indexOf(`id="${id}"`));
  assert.ok(pos.every((p, i) => p > 0 && (i === 0 || p > pos[i - 1])), "status group order: " + pos);
  assert.ok(out.includes("<b>1</b> מכסה הושגה") && out.includes("<b>1</b> אין מידע עדיין"), "summary counts");
  assert.ok(!out.includes("fixture: dropped"), "invalid item must not render");
  for (const sid of ["judo", "sailing", "athletics", "swimming"]) assert.ok(out.includes(`href="#sport-${sid}"`), sid);
  const next = out.slice(out.indexOf("qNextH"), out.indexOf("qH-earned"));
  assert.ok(next.indexOf("fixture: worlds") > 0 && next.indexOf("fixture: worlds") < next.indexOf("fixture: meet"), "upcoming sorted by date");
  assert.ok(out.includes("נכון ל־"), "as-of date");
  const home = view("home"), sports = view("sports");
  assert.ok(home.includes('href="#quotas"') && home.includes("מקצה אחד עם מכסה לישראל"));
  assert.ok(sports.includes('href="#quotas"') && sports.includes("✓ 1 הושגה"));
});

test("home quota line uses singular forms for 1", async () => {
  const [earned, contention] = QUOTAS.items;
  const kpi = async items => {
    const home = (await boot({quotas: {updatedAt: "2026-10-18", items}})).view("home");
    return /<p class="kpi">[^]*?<\/p>/g.exec(home.slice(home.indexOf("<p class=\"kpi\"") + 1))?.[0] || "";
  };
  const one = await kpi([earned, {...contention, sportId: earned.sportId}]);
  assert.ok(one.includes("מקצה אחד עם מכסה לישראל") && one.includes("בענף אחד") && !/ב־1 |>1<\/b> מקצים/.test(one), one);
  const none = await kpi([contention]);
  assert.ok(none.includes("טרם הושגו מכסות לישראל · מקצה אחד במרוץ למכסה בענף אחד"), none);
  const many = await kpi([earned, {...earned, event: "x"}, contention, {...contention, sportId: "athletics"}]);
  assert.ok(many.includes("<b>2</b> מקצים עם מכסה לישראל") && many.includes("ב־3 ענפים"), many);
});

test("quota explanation box: placeholder when allocation is empty, hidden when nothing to show", async () => {
  const base = QUOTAS.items[1];
  const {view} = await boot({quotas: {updatedAt: "2026-10-18", items: [
    {...base, event: "a", allocation: ""}, {...base, event: "b", allocation: "", source: ""}]}});
  const out = view(`sport-${base.sportId}`);
  assert.strictEqual(count(out, "<details>"), 1);
  assert.ok(out.includes("פרטי השיטה טרם נאספו") && out.includes("example.org/sailing"));
});

test("#quotas: upcoming list keeps the next 5 future events and escapes item text", async () => {
  const base = QUOTAS.items[2];
  const items = [1, 2, 3, 4, 5, 6].map(i => ({...base, event: `מקצה ${i}`, nextQuotaEvent: {name: `אירוע ${i}`, start: `2027-0${i}-01`}}));
  items.push({...base, event: "<img src=x onerror=alert(1)>", israelNote: "<b>x</b>", nextQuotaEvent: {name: "אירוע עבר", start: "2026-01-01"}});
  const {view} = await boot({quotas: {updatedAt: "2026-10-18", items}, now: "2026-10-18T08:00:00Z"});
  const out = view("quotas");
  const next = out.slice(out.indexOf("qNextH"), out.indexOf("qH-outside"));
  assert.deepStrictEqual([...next.matchAll(/אירוע (\d|עבר)/g)].map(m => m[1]), ["1", "2", "3", "4", "5"]);
  assert.ok(!/<img|<b>x/i.test(out) && out.includes("&lt;img"), "escaped");
});

test("#quotas: a 404 or empty file reads as not collected yet; a broken file as not loaded", async () => {
  for (const [quotas, text] of [[undefined, "עוד לא נאספו נתוני מכסות"], [{updatedAt: "2026-10-18", items: []}, "עוד לא נאספו נתוני מכסות"],
      ["fail", "לא נטענו"], [{items: "nope"}, "לא נטענו"]]) {
    const {view, run} = await boot({quotas});
    assert.ok(run("S.quotasLoaded") && view("quotas").includes(text), JSON.stringify(quotas));
    assert.ok(!view("home").includes('href="#quotas"') && !run("S.failed"));
  }
});

test("calendar: unknown sport is not-found; arriving at #calendar resets all filters", async () => {
  const {ctx, run, els, fire} = await boot({now: "2026-10-18T08:00:00Z"});
  const go = h => { ctx.location.hash = "#" + h; run("navigate()"); return els.view.innerHTML; };
  assert.ok(go("calendar-nope").includes(NOT_FOUND), "unknown sport");
  assert.strictEqual(run("S.cal.sport"), "", "unknown sport must not stick as a filter");
  assert.ok(go("calendar-judo").includes('value="judo" selected'));
  fire("input", {id: "cQual", checked: true});
  fire("input", {id: "cPast", checked: true});
  run("refresh()");   // a data refresh while on the page keeps the filters
  assert.deepStrictEqual(JSON.parse(run("JSON.stringify(S.cal)")), {sport: "judo", qual: true, past: true});
  go("sports");
  const cal = go("calendar");
  assert.deepStrictEqual(JSON.parse(run("JSON.stringify(S.cal)")), {sport: "", qual: false, past: false});
  assert.ok(!cal.includes(" selected") && !/id="cQual" checked|id="cPast" checked/.test(cal), "controls render unchecked");
});

test("calendar filters update only the results list, so focus and scroll survive", async () => {
  const {view, els, fire, run} = await boot({now: "2026-10-18T08:00:00Z"});
  const page = view("calendar");
  run(`$("calResults").innerHTML = ""`);
  fire("input", {id: "cQual", checked: true});
  assert.strictEqual(els.view.innerHTML, page, "whole view must not re-render");
  assert.ok(els.calResults.innerHTML.includes('class="month"'), "results re-rendered");
  assert.ok(!els.calResults.innerHTML.includes("<h1"), "toolbar/heading stay outside the results");
  fire("input", {id: "cSport", value: "nope-sport"});
  assert.ok(els.calResults.innerHTML.includes("אין תחרויות שמתאימות לסינון"));
});

// ---------- #digest ----------
const REAL_QUOTAS = JSON.parse(fs.readFileSync(path.join(ROOT, "site/quotas.json"), "utf8"));
const DIGEST_NOW = "2026-10-18T09:00:00Z";
const digestOf = async opts => { const b = await boot({now: DIGEST_NOW, quotas: REAL_QUOTAS, ...opts}); return {...b, text: b.run("digestText()")}; };
const boldLines = text => text.split("\n").filter(l => l.includes("*"));

test("#digest: page, entry points and the week's text", async () => {
  const {view, text} = await digestOf();
  const page = view("digest");
  assert.ok(page.includes('<h1 tabindex="-1">תקציר שבועי</h1>') && page.includes("<textarea id=\"digestText\" readonly"));
  assert.ok(page.includes('data-copy="digestText" data-copy-msg="digestMsg"'));
  assert.ok(view("home").includes('href="#digest"') && view("updates").includes('href="#digest"'), "entry points");
  const lines = text.split("\n");
  assert.strictEqual(lines[0], "*הדרך ללוס אנג׳לס 28 · תקציר שבועי*");
  assert.deepStrictEqual(boldLines(text).slice(1), ["*תוצאות השבוע*", "*מה התעדכן*", "*ישראלים מתחרים השבוע*", "*אירועי מכסה בשבועיים הקרובים*"]);
  assert.ok(text.includes("מתן רודיטי פרש"), "this week's change");
  const competing = text.split("*ישראלים מתחרים השבוע*")[1].split("\n\n")[0];
  assert.match(competing, /• 18 באוק׳ · .+ \(אתלטיקה\): מרתון אמסטרדם/, "athlete competing this week");
  assert.ok(!competing.includes("רז הרשקו"), "29 Oct is outside the 7-day window");
  assert.ok(text.includes("גרנד סלאם אבו דאבי"), "quota event inside 14 days");
  assert.ok(lines.at(-2).startsWith("לכל הפרטים: https://claude.ai/artifact/") && lines.at(-1).startsWith("אתר לא רשמי"));
  assert.ok(page.includes(text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")), "textarea holds the text");
});

const digestSection = (text, title) => (text.split(`*${title}*\n`)[1] || "").split("\n\n")[0];

test("#digest: this week's results group ended competitions with their changes", async () => {
  const empty = digestSection((await digestOf()).text, "תוצאות השבוע");
  assert.strictEqual(empty, "לא הסתיימו השבוע תחרויות בענפים שבמעקב.");

  const data = JSON.parse(JSON.stringify(FIXTURE));
  data.changes.unshift(
    {at: "2026-10-25", text: "התעמלות מכשירים: נבחרת הגברים סיימה שישית באליפות העולם."},
    {at: "2026-10-24", text: "ארטיום דולגופיאט זכה בכסף בקרקע.", athleteId: "artem-dolgopyat"},
    {at: "2026-10-25", text: "ג׳ודו: עדכון שאינו קשור לתחרות שהסתיימה."});
  const {text} = await digestOf({data, now: "2026-10-26T09:00:00Z"});
  const results = digestSection(text, "תוצאות השבוע");
  const gym = results.split("\n• ").find(b => b.includes("אליפות העולם בהתעמלות מכשירים 2026"));
  assert.ok(gym && gym.includes("25 באוק׳") && !gym.includes("הסתיימה"), results);
  assert.ok(gym.includes("  – התעמלות מכשירים: נבחרת הגברים סיימה שישית") && gym.includes("  – ארטיום דולגופיאט זכה בכסף"), gym);
  const changes = digestSection(text, "מה התעדכן");
  assert.ok(!changes.includes("סיימה שישית") && !changes.includes("זכה בכסף"), "no repeat under מה התעדכן");
  assert.ok(changes.includes("ג׳ודו: עדכון שאינו קשור"), "other sports' changes stay put");

  // Sunday 1 Nov: last Sunday's finals (Rotterdam, ended 25 Oct) and their change still count.
  const sunday = digestSection((await digestOf({data, now: "2026-11-01T09:00:00Z"})).text, "תוצאות השבוע");
  assert.ok(sunday.includes("אליפות העולם בהתעמלות מכשירים 2026") && sunday.includes("סיימה שישית"), sunday);
  assert.ok(sunday.includes("זכה בכסף"), "a change from the competition's first week is still attached");
  const judo = digestSection((await digestOf({now: "2026-11-01T09:00:00Z"})).text, "תוצאות השבוע");
  assert.ok(judo.includes("גרנד סלאם אבו דאבי (ג׳ודו)\n") && judo.includes("  ישראלים: ") && judo.includes("התוצאות עוד לא עודכנו באתר."), judo);
});

test("#digest: athletes in a competition under way are listed under it", async () => {
  // 20 Oct: day 4 of the gymnastics Worlds; the gymnasts' nextDate (18–19 Oct) has passed.
  const {text} = await digestOf({now: "2026-10-20T09:00:00Z"});
  const competing = digestSection(text, "ישראלים מתחרים השבוע");
  const bullets = competing.split("\n• ");
  const gym = bullets.find(b => b.includes("אליפות העולם בהתעמלות מכשירים 2026"));
  assert.ok(gym && gym.includes("עד 25 באוק׳") && gym.includes("מתקיימת עכשיו"), competing);
  for (const n of ["ארטיום דולגופיאט", "ליהיא רז", "יהלי שושני"]) assert.strictEqual(count(competing, n), 1, n);
  assert.ok(competing.includes("שחר שגיב"), "upcoming athletes still listed");
});

test("#digest: one bullet per quota event, classes and athletes under it", async () => {
  const {text} = await digestOf({now: "2026-10-29T09:00:00Z"});
  const quotas = digestSection(text, "אירועי מכסה בשבועיים הקרובים");
  const judo = quotas.split("\n• ").filter(b => b.includes("גרנד סלאם אבו דאבי"));
  assert.strictEqual(judo.length, 1, quotas);
  assert.match(judo[0], /ג׳ודו: גרנד סלאם אבו דאבי\n  מקצים: .*78\+ ק״ג נשים/);
  assert.match(judo[0], /\n  ישראלים: .*רז הרשקו/);
  assert.strictEqual(count(judo[0], "מה זה אומר"), 1, "shared stakes lead once");
  assert.ok(!judo[0].includes("הרשקו (1)"), "per-class detail stays on the sport page");
  assert.ok(quotas.split("\n").every(l => l.length <= 160));
});

test("#digest: ≤3500 chars with 60 long changes, no data asterisks, bullets cut at 160", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  data.changes = Array.from({length: 60}, (_, i) => ({at: "2026-10-17", text: `*עדכון* _${i}_ ~x~ ` + "מילה ".repeat(60)}));
  const {text} = await digestOf({data});
  assert.ok(text.length <= 3500, String(text.length));
  assert.match(text, /• ועוד \d+ באתר/);
  assert.strictEqual(boldLines(text).length, 5, "only the header and section headings are bold");
  assert.ok(!/[_~]/.test(text));
  assert.ok(text.split("\n").filter(l => l.startsWith("• ") || l.startsWith("  ")).every(l => l.length <= 160));
  assert.ok(text.endsWith("כדאי לבדוק מול המקור."), "footer never trimmed");
});

test("#digest: quiet week and stale data", async () => {
  const data = {...FIXTURE, generatedAt: "2026-10-01T09:00:00Z", changes: [], athletes: FIXTURE.athletes.map(a => ({...a, nextDate: ""}))};
  const {text} = await digestOf({data, quotas: undefined});
  assert.ok(text.includes("שבוע שקט: אין עדכונים, תחרויות או אירועי מכסה ידועים."));
  assert.ok(text.includes("שימו לב: הנתונים לא עודכנו מאז"));
  assert.strictEqual(boldLines(text).length, 1);
});

test("#digest: copy succeeds, and a refused clipboard selects the textarea", async () => {
  for (const refuse of [false, "reject", "missing"]) {
    const {ctx, view, fire, text} = await digestOf();
    view("digest");
    const els = {digestText: ctx.document.getElementById("digestText"), digestMsg: ctx.document.getElementById("digestMsg")};
    let copied = null, selected = false;
    ctx.navigator.clipboard = refuse === "missing" ? undefined
      : {writeText: async s => { if (refuse) throw new Error("denied"); copied = s; }};
    Object.assign(els.digestText, {value: text, select(){ selected = true; }});
    const btn = {dataset: {copy: "digestText", copyMsg: "digestMsg"}};
    fire("click", {closest: () => btn});
    await new Promise(r => setTimeout(r, 0));
    if (refuse) {
      assert.ok(selected && els.digestMsg.textContent.includes("אפשר להעתיק ידנית"), String(refuse));
    } else {
      assert.strictEqual(copied, text);
      assert.strictEqual(els.digestMsg.textContent, "הועתק.");
    }
  }
});

// Date matrix on the real snapshot + published quotas: the strip, #quotas and the sport page must show the
// event that is on, keep a multi-day quota event current until its last day, and drop its stakes after.
// tests/test_quota_due.py checks the job's warnings on the same dates.
const SITE_QUOTAS = JSON.parse(fs.readFileSync(path.join(ROOT, "site/quotas.json"), "utf8"));
// Last day of each quota event, as the page derives it (own end, else the containing competition, else start).
const EVENT_END = {
  "אליפות העולם רוטרדם – גמר קבוצתי גברים": "2026-10-20",
  "גביע העולם בטריאתלון, טונגיונג": "2026-10-24",
  "גרנד סלאם אבו דאבי": "2026-10-31",
  "אליפות העולם": "2026-11-08",   // weightlifting worlds
};
const upcomingOf = html => html.split('id="qNextH"')[1]?.split("</section>")[0] || "";
const DATE_MATRIX = {
  "2026-10-20": {strip: ["אליפות העולם בהתעמלות מכשירים 2026", "יום 4 מתוך 9"], notStrip: ["גרנד סלאם"],
    upcoming: ["אליפות העולם רוטרדם – גמר קבוצתי גברים"]},
  "2026-10-24": {strip: ["יום 8 מתוך 9", "שחר שגיב"], upcoming: ["גביע העולם בטריאתלון, טונגיונג"],
    notUpcoming: ["רוטרדם"]},
  "2026-10-27": {strip: ["#sport-weightlifting", "יום 1 מתוך 13", "class=\"stakes\""], notStrip: ["התעמלות מכשירים"],
    upcoming: ["אליפות העולם"], notUpcoming: ["טונגיונג", "רוטרדם"]},
  "2026-10-30": {strip: ["גרנד סלאם אבו דאבי", "יום 2 מתוך 3", "ועוד 5 מקצים"], upcoming: ["גרנד סלאם אבו דאבי"],
    judoStakes: true},
  "2026-11-01": {strip: ["אליפות העולם בקליעה", "#sport-shooting"], notStrip: ["גרנד סלאם"],
    upcoming: ["אליפות העולם בקליעה"], notUpcoming: ["גרנד סלאם"], judoStakes: false},
};

test("date matrix: strip, #quotas and sport page follow the event calendar; no stale stakes", async () => {
  const withStakes = SITE_QUOTAS.items.filter(q => q.stakes && q.nextQuotaEvent);
  assert.ok(withStakes.length >= 8, "published quotas should carry stakes");
  for (const [t, exp] of Object.entries(DATE_MATRIX)) {
    const {view, run} = await boot({quotas: SITE_QUOTAS, now: `${t}T08:00:00Z`});
    assert.strictEqual(run("today()"), t);
    const home = view("home"), strip = stripOf(home), quotas = view("quotas"), up = upcomingOf(quotas), judo = view("sport-judo");
    for (const s of exp.strip || []) assert.ok(strip.includes(s), `${t}: strip lacks ${s}`);
    for (const s of exp.notStrip || []) assert.ok(!strip.includes(s), `${t}: strip shows ${s}`);
    for (const s of exp.upcoming || []) assert.ok(up.includes(s), `${t}: #quotas upcoming lacks ${s}`);
    for (const s of exp.notUpcoming || []) assert.ok(!up.includes(s), `${t}: #quotas upcoming shows ${s}`);
    if ("judoStakes" in exp) {
      const s = run(`esc(${JSON.stringify(withStakes.find(q => q.sportId === "judo").stakes)})`);
      assert.strictEqual(judo.includes(s), exp.judoStakes, `${t}: judo stakes on #sport-judo`);
      assert.strictEqual(up.includes(s), exp.judoStakes, `${t}: judo stakes on #quotas`);
    }
    for (const q of withStakes) {
      const end = EVENT_END[q.nextQuotaEvent.name];
      if (!end || end >= t) continue;
      const pages = {home, quotas, [`sport-${q.sportId}`]: view(`sport-${q.sportId}`)};
      for (const [page, html] of Object.entries(pages))
        assert.ok(!html.includes(run(`esc(${JSON.stringify(q.stakes)})`)), `${t}: stale stakes on ${page}: ${q.event}`);
    }
  }
});

// An editor session: canEdit() is true and the DB serves the fixture, plus one pending proposal.
function fakeEditor(data = FIXTURE){
  const calls = [];
  const snap = docs => ({docs: docs.map(d => ({id: d.id, data: () => d}))});
  const rows = {athletes: data.athletes, competitions: data.competitions, sports: data.sports};
  const coll = name => ({
    onSnapshot: ok => ok(snap(rows[name] || [])),
    where: () => ({onSnapshot: ok => ok(snap(name === "proposals"
      ? [{id: "p1", kind: "update", target: data.athletes[0].id, patch: {rank: "1"}, status: "pending", summary: "בדיקה"}] : []))}),
    orderBy: () => ({limit: () => ({onSnapshot: ok => ok(snap([]))})}),
  });
  const db = {collection: coll, doc: () => ({onSnapshot: ok => ok({exists: false})})};
  return {calls, use: async name => { calls.push(name); return name === "user" ? {canEdit: async () => true, id: async () => "u1"} : db; }};
}

test("view as visitor: editors get a toggle; visitor mode runs on data.json with no editor features", async () => {
  const hid = (b, id) => b.run(`$("${id}").hidden`);
  const ed = fakeEditor();
  const e = await boot({claude: ed});
  assert.ok(e.run("S.live && S.isAdmin"), "editor mode is live");
  e.view("home");
  assert.ok(!hid(e, "visitorBtn") && !hid(e, "adminChip") && !hid(e, "adminLink") && hid(e, "visitorBar"));
  assert.ok(e.view("home").includes("את/ה רואה נתונים חיים"), "review queue for editors");
  e.run("setVisitorView(true)");
  assert.strictEqual(e.run(`localStorage.getItem("la28.viewAsVisitor")`), "true");
  assert.strictEqual(e.ctx.reloads, 1);

  const vc = fakeEditor();
  const v = await boot({claude: vc, storage: {"la28.viewAsVisitor": "true"}});
  assert.ok(!vc.calls.includes("db"), "the DB is never opened");
  assert.ok(v.run("!S.live && !S.isAdmin && S.db === null && S.loaded"), "public snapshot only");
  const home = v.view("home");
  assert.ok(!hid(v, "visitorBar") && hid(v, "adminLink") && hid(v, "adminChip") && hid(v, "visitorBtn"),
    "bar shown; chip, toggle and בקרה hidden");
  assert.ok(!home.includes("את/ה רואה נתונים חיים") && !home.includes("data-edit") && !home.includes("data-add"));
  assert.ok(!v.view("sport-judo").includes("data-add") && !v.view("a-raz-hershko").includes("data-edit"));
  assert.ok(v.view("admin").includes(NOT_FOUND), "#admin is not-found, as for visitors");
  v.run("setVisitorView(false)");
  assert.strictEqual(v.run(`localStorage.getItem("la28.viewAsVisitor")`), "false");
  assert.strictEqual(v.ctx.reloads, 1);

  const pub = await boot({storage: {"la28.viewAsVisitor": "true"}});   // a real visitor with a leftover flag
  assert.ok(hid(pub, "visitorBar") && hid(pub, "visitorBtn"), "no bar or toggle for non-editors");
});

(async () => {
  let failed = 0;
  for (const {name, fn} of tests) {
    try { await fn(); console.log(`ok   ${name}`); }
    catch (e) { failed++; console.log(`FAIL ${name}\n     ${e && e.stack || e}`); }
  }
  console.log(`${tests.length - failed}/${tests.length} passed (scripts: ${SCRIPTS.map(f => path.relative(ROOT, f)).join(", ")})`);
  process.exit(failed ? 1 : 0);
})();
