// Front-end smoke tests: runs site/app.js (and site/admin.js if present) in a vm with a minimal DOM shim.
// Node built-ins only. Run: node tests/smoke.test.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
const SCRIPTS = ["site/app.js", "site/admin.js"].map(p => path.join(ROOT, p)).filter(fs.existsSync);
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

// `data` is the fetch payload; `fetchFails` makes fetch reject; `now` pins the clock (ISO instant); `follows` seeds localStorage.
async function boot({data = FIXTURE, fetchFails = false, now, follows = []} = {}){
  const els = {};
  const mem = new Map([["la28.follows", JSON.stringify(follows)]]);
  const ctx = {
    console, URL, Intl, Date: now ? fixedDate(now) : Date, Math, JSON, Promise, setTimeout, clearTimeout,
    setInterval: () => 0, clearInterval(){},
    location: {hash: ""},
    history: {replaceState(){}},
    localStorage: {getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k)},
    navigator: {clipboard: {writeText: async () => {}}},
    matchMedia: () => ({matches: false, addEventListener(){}}),
    scrollTo(){}, addEventListener(){}, removeEventListener(){},
    document: {
      getElementById: id => els[id] ??= fakeEl(id),
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener(){}, activeElement: null,
    },
    fetch: async () => {
      if (fetchFails) throw new Error("network down");
      return {ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(data))};
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of SCRIPTS) vm.runInContext(fs.readFileSync(f, "utf8"), ctx, {filename: f});
  await new Promise(r => setTimeout(r, 20));   // let loadPublic()'s fetch settle
  const run = expr => vm.runInContext(expr, ctx);
  const view = hash => { ctx.location.hash = "#" + hash; run("route()"); return els.view.innerHTML; };
  return {ctx, els, run, view};
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
  assert.ok(view("sport-judo").includes("אין כרגע ספורטאים ישראלים במעקב"));
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
  assert.ok(rows[2].includes("ישראלים במעקב בענף") && !rows[2].includes('href="#a-'), "running comp, nobody listed");
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

test("fetch failure shows the retry view", async () => {
  const {view} = await boot({fetchFails: true});
  assert.ok(view("home").includes("data-retry"));
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
