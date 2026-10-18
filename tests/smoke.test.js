// Front-end smoke tests: runs site/app.js (and site/admin.js if present) in a vm with a minimal DOM shim.
// Node built-ins only. Run: node tests/smoke.test.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
const SCRIPTS = ["site/app.js", "site/admin.js", "site/quotas.js"].map(p => path.join(ROOT, p)).filter(fs.existsSync);
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
// `now` pins the clock (ISO instant).
async function boot({data = FIXTURE, fetchFails = false, quotas, now} = {}){
  const els = {};
  const mem = new Map();
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
const stripOf = html => html.split('class="panel today-strip"')[1]?.split("</section>")[0] || "";

test("today strip: mid-way through a multi-day competition", async () => {
  // 21:30 UTC on 19 Oct is already 20 Oct in Israel; gymnastics Worlds run 17–25 Oct.
  const {view, run} = await boot({now: "2026-10-19T21:30:00Z"});
  assert.strictEqual(run("today()"), "2026-10-20");
  const strip = stripOf(view("home"));
  assert.ok(strip.includes(STRIP) && strip.includes("תוצאות יתעדכנו בעדכון היומי"), "strip/label missing");
  assert.ok(strip.includes('href="#a-artem-dolgopyat"'), "athlete whose nextDate is inside the competition");
  assert.ok(strip.includes("אליפות העולם בהתעמלות מכשירים 2026"), "competition name");
  assert.ok(!strip.includes("raz-hershko"), "judo athlete competing on 29 Oct");
});

test("today strip: nextDate == today, ordered by sport", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  Object.assign(data.athletes.find(a => a.id === "adva-cohen"), {nextDate: "2026-10-29", next: "מרוץ בדיקה", event: "<img src=x onerror=alert(1)>"});
  const {view} = await boot({data, now: "2026-10-29T08:00:00Z"});
  const strip = stripOf(view("home"));
  assert.ok(strip.includes("גרנד סלאם אבו דאבי") && strip.includes("מרוץ בדיקה"));
  assert.ok(strip.indexOf("adva-cohen") < strip.indexOf("raz-hershko"), "אתלטיקה sorts before ג׳ודו");
  assert.ok(!/<img/i.test(strip) && strip.includes("&lt;img"), "event must be escaped");
});

test("today strip: hidden on a day with no competitions", async () => {
  const {view} = await boot({now: "2026-10-27T08:00:00Z"});
  const home = view("home");
  assert.ok(home.length > 200 && !home.includes(STRIP));
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

test("fetch failure shows the retry view", async () => {
  const {view} = await boot({fetchFails: true});
  assert.ok(view("home").includes("data-retry"));
});

// The quotas.json loader is a separate story; these tests set S.quotas directly.
const QUOTAS = [
  {sportId: "judo", event: "עד 57 ק״ג", israelStatus: "earned", israelNote: "<img src=x onerror=alert(1)>", nextQuotaEvent: null, source: "javascript:alert(1)"},
  {sportId: "judo", event: "עד 78 ק״ג", israelStatus: "in-contention", nextQuotaEvent: {name: "אירוע עבר", start: "2000-01-01"}},
  ...[1, 2, 3, 4, 5, 6].map(i => ({sportId: "judo", event: `מקצה ${i}`, israelStatus: "outside", nextQuotaEvent: {name: `אירוע ${i}`, start: `2099-0${i}-01`}})),
  {sportId: "judo", event: "סטטוס זר", israelStatus: "bogus", nextQuotaEvent: null},
];

test("#quotas groups by status, lists the next 5 future events and escapes", async () => {
  const {run, view} = await boot();
  assert.ok(view("quotas").includes("טוען נתוני מכסות"), "not-loaded state");
  assert.ok(!view("home").includes("href=\"#quotas\""), "no quota link without items");
  run(`S.quotas = ${JSON.stringify(QUOTAS)}; S.quotasLoaded = true; S.quotasAt = "2026-10-18"`);
  const out = view("quotas");
  assert.ok(!out.includes(NOT_FOUND));
  const pos = ["qH-earned", "qH-in-contention", "qH-outside", "qH-unknown"].map(id => out.indexOf(`id="${id}"`));
  assert.ok(pos.every((p, i) => p > 0 && (i === 0 || p > pos[i - 1])), "status group order: " + pos);
  assert.ok(out.includes("<b>1</b> מכסה הושגה") && out.includes("<b>1</b> אין מידע עדיין"), "summary counts (bogus → unknown)");
  const upcoming = out.slice(out.indexOf("qNextH"), out.indexOf("qH-earned"));
  assert.deepStrictEqual([...upcoming.matchAll(/אירוע (\d|עבר)/g)].map(m => m[1]), ["1", "2", "3", "4", "5"]);
  assert.ok(!/<img/i.test(out) && out.includes("&lt;img"), "israelNote escaped");
  assert.ok(out.includes('href="#sport-judo"'));
  assert.ok(view("home").includes("href=\"#quotas\"") && view("home").includes("מקצים עם מכסה לישראל"));
  const sports = view("sports");
  assert.ok(sports.includes("href=\"#quotas\"") && sports.includes("✓ 1 הושגה") && sports.includes("◐ 1 במרוץ"));
  run(`S.quotasFailed = true`);
  assert.ok(view("quotas").includes("לא נטענו") && !view("home").includes("data-retry"));
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
