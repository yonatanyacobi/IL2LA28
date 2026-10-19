// Front-end smoke tests: runs site/app.js (and site/admin.js if present) in a vm with a minimal DOM shim.
// Node built-ins only. Run: node tests/smoke.test.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
// The page's own script order (as tests/bench.js), so a new site/*.js can't be left out; a missing file throws.
const SCRIPTS = [...fs.readFileSync(path.join(ROOT, "site/index.html"), "utf8").matchAll(/<script src="([\w.-]+\.js)">/g)]
  .map(m => path.join(ROOT, "site", m[1]));
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/data.json"), "utf8"));
// The fixture is a real export and gets refreshed (tests/README.md). A test that needs a precondition the real data
// may lose (no ranks, a given nextDate…) sets it on its own copy instead of relying on the snapshot.
const clone = (data = FIXTURE) => JSON.parse(JSON.stringify(data));
const withoutRanks = (data = clone()) => {
  for (const a of data.athletes) for (const k of ["rankNum", "rankList", "rankAsOf", "olympicRankNum", "olympicRankList", "olympicRankAsOf"]) delete a[k];
  return data;
};
const setAthlete = (data, id, fields) => { Object.assign(data.athletes.find(a => a.id === id), fields); return data; };
// site/quotas.json as published on 18.10. Date and scenario tests use this frozen copy, so a real result
// (e.g. Rotterdam on 20.10) changing the live file can't break them. Only the "loads and renders" test reads the live file.
const QUOTAS_SNAPSHOT = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/site-quotas-2026-10-18.json"), "utf8"));

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
const HIDDEN_IN_HTML = ["adminChip", "adminLink", "visitorBtn", "visitorBar", "visitorChip", "visitorMsg", "updateNote"];
// `claude` stands in for window.claude (editor tests); `storage` seeds localStorage; `fetchImpl` replaces fetch.
async function boot({data = FIXTURE, fetchFails = false, quotas, now, follows = [], claude, storage = {}, fetchImpl} = {}){
  const els = {}, listeners = {};
  const mem = new Map([["la28.follows", JSON.stringify(follows)], ...Object.entries(storage)]);
  const ctx = {
    console, URL, Intl, Date: now ? fixedDate(now) : Date, Math, JSON, Promise, clearTimeout,
    // Long timers (the 10-minute auto-refresh) mustn't keep Node alive after the tests.
    setTimeout: (f, ms, ...a) => { const t = setTimeout(f, ms, ...a); if (ms > 1000) t.unref(); return t; },
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
    fetch: fetchImpl || (async url => {
      if (fetchFails) throw new Error("network down");
      let body = data;
      if (url === "quotas.json") {
        if (quotas === "fail") throw new Error("network down");
        if (quotas === undefined) return {ok: false, status: 404, json: async () => { throw new Error("404"); }};
        body = quotas;
      }
      return {ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(body))};
    }),
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
// Pill symbols are wrapped in aria-hidden spans; tests that read pill text see "✓ מכסה הושגה".
const unhide = html => html.replace(/<span aria-hidden="true">([^<]*)<\/span>/g, "$1");

test("routes render expected content", async () => {
  const {view} = await boot();
  const expect = {
    home: ["הדרך ללוס אנג׳לס 28", "מה התעדכן", "התקדמות בהעפלה"],
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
  assert.strictEqual(els.qCount.textContent, "נמצאו ספורטאי/ת או נבחרת אחת ו־0 ענפים", "singular for one hit");
});

test("search by sport English name or id finds that sport's athletes", async () => {
  const {run, els, view} = await boot();
  view("home");
  const judo = FIXTURE.athletes.filter(a => a.sportId === "judo").length;
  for (const q of ["judo", "JUDO", "artistic-gymnastics"]) {
    run(`S.q = ${JSON.stringify(q)}; renderResults()`);
    assert.match(els.qCount.textContent, /נמצאו (?:[1-9]|ספורטאי\/ת או נבחרת אחת )/, q);
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
  assert.match(judo, /נמצאו (?:[1-9]|ספורטאי\/ת או נבחרת אחת )/);
  for (const q of ["ג'ודו", "ג`ודו", "ג’ודו", "  גּ׳וּדוֹ  "]) assert.strictEqual(count(q), judo, q);
  for (const q of ["ק״מ אחד", "ק\"מ   אחד", "RAZ hershko"]) assert.match(count(q), /נמצאו (?:[1-9]|ספורטאי\/ת או נבחרת אחת )/, q);
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

// The full-site publish map (publishing.md step 5) and SCRIPTS must name every script index.html loads, or a new
// file (e.g. sessions.js) is tested but never published, or published but never tested.
test("every <script src> in index.html is in SCRIPTS and in the publish map", () => {
  const html = fs.readFileSync(path.join(ROOT, "site/index.html"), "utf8");
  const runbook = fs.readFileSync(path.join(ROOT, "docs/runbooks/publishing.md"), "utf8");
  const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.ok(srcs.length >= 8, "index.html scripts found");
  for (const f of srcs) {
    assert.ok(SCRIPTS.includes(path.join(ROOT, "site", f)), `${f}: not in SCRIPTS`);
    assert.ok(runbook.includes(`"${f}": "site/${f}"`), `${f}: not in the publishing.md files map`);
  }
});

test("empty data renders empty states", async () => {
  const {view} = await boot({data: {...FIXTURE, athletes: [], competitions: [], changes: []}});
  assert.ok(view("home").includes("אין תחרויות ידועות של ספורטאים או נבחרות מישראל בשבוע הקרוב."));
  assert.ok(view("home").includes("עוד אין עדכונים"));
  assert.ok(view("sport-judo").includes("אין כרגע ספורטאים או נבחרות מישראל ברשימה"));
  assert.ok(view("calendar").includes("אין תחרויות שמתאימות לסינון"));
  assert.ok(view("updates").includes("עוד אין עדכונים"));
  assert.ok(view("sports").length > 0);
});

// UX S5 / components §9: a section's empty line is <p class="muted"> with what is known plus one way on (none on
// athlete history); "במאגר" appears nowhere in site/.
test("empty states (S5): p.muted lines, each table row's way on, no \"במאגר\"", async () => {
  const fs = require("fs");
  for (const f of fs.readdirSync(path.join(ROOT, "site")).filter(f => /\.(js|html)$/.test(f)))
    assert.ok(!fs.readFileSync(path.join(ROOT, "site", f), "utf8").includes("במאגר"), `במאגר in site/${f}`);
  const {view} = await boot({data: {...FIXTURE, athletes: [], competitions: [], changes: []}, now: "2026-10-19T09:00:00Z"});
  const judo = view("sport-judo"), home = view("home");
  assert.ok(judo.includes('<p class="muted">אין תחרויות קרובות ידועות בענף. <a href="#calendar-judo">לוח התחרויות</a></p>'), "sport row");
  assert.ok(home.includes('<p class="muted">אין תחרויות ידועות של ספורטאים או נבחרות מישראל בשבוע הקרוב. <a href="#calendar">ללוח התחרויות</a></p>'), "home week row (S4)");
  for (const out of [judo, home, view("updates"), view("calendar")])
    assert.ok(!out.includes('class="empty"'), "a section's empty state is a p.muted line, not div.empty");
  // With data: athlete "תחרויות קרובות" links to the sport's calendar and history has no link.
  const far = JSON.parse(JSON.stringify(FIXTURE));
  far.athletes.forEach(a => { a.nextDate = ""; a.history = []; });
  far.athletes[0].nextDate = "2026-12-20";
  far.competitions = far.competitions.filter(c => c.sportId !== far.athletes[0].sportId);
  far.sessions = [];
  const b = await boot({data: far, now: "2026-10-19T09:00:00Z"});
  const a0 = far.athletes[0], page = b.view(`a-${a0.id}`);
  assert.ok(page.includes(`<p class="muted">אין תחרויות קרובות ידועות בענף. <a href="#calendar-${a0.sportId}">לוח התחרויות</a></p>`), "athlete row");
  assert.ok(page.includes('<p class="muted">עוד אין אירועים מתועדים.</p>'), "athlete history: no way on");
  // Israelis only today: the week says "after today" instead of "no competitions" (S4), linking the calendar when
  // no later day is known.
  far.athletes[0].nextDate = "2026-10-19";
  const h = (await boot({data: far, now: "2026-10-19T09:00:00Z"})).view("home");
  assert.ok(h.includes('<p class="muted">אחרי היום אין עוד תחרויות ידועות של ספורטאים או נבחרות מישראל בשבוע הקרוב. <a href="#calendar">ללוח התחרויות</a></p>'),
    "today only: no false 'no competitions'");
});
const rowsOf = strip => strip.split("<li>").slice(1);
const count = (s, needle) => s.split(needle).length - 1;

test("F2/F4: one sentence per stage on the athlete page, About and the home legend; no \"סשן\" in visible copy", async () => {
  const {view, run} = await boot();
  const help = JSON.parse(run("JSON.stringify(STAGE_HELP)"));
  assert.strictEqual(help.length, 4);
  const a = JSON.parse(run("JSON.stringify(S.athletes[0])")), s = Number(run(`stageOf(S.athletes[0])`));
  assert.ok(view(`a-${a.id}`).includes(`<p class="muted stage-help">${help[s]} <a href="#about">מה אומרים השלבים?</a></p>`), "athlete page: the current stage's sentence");
  const about = view("about");
  help.forEach((h, i) => assert.ok(about.includes(`: ${h}</li>`), `About lists stage ${i} from STAGE_HELP`));
  assert.ok(view("home").includes('<p class="foot"><a href="#about">מה אומרים השלבים?</a></p>'), "home legend link");
  for (const f of fs.readdirSync(path.join(ROOT, "site")).filter(n => n.endsWith(".js"))) {
    const bad = fs.readFileSync(path.join(ROOT, "site", f), "utf8").split("\n").filter(l => /סשן|סשנ/.test(l) && !/^\s*\/\//.test(l));
    assert.deepStrictEqual(bad, [], f);
  }
});

test("S1: \"במעקב\" is only the viewer's own follow; stage 0 and the site's list have their own words", async () => {
  const {view} = await boot();
  assert.ok(view("about").includes("<b>לפני חלון ההעפלה</b>"), "stage 0 name");
  assert.ok(/<b>\d+<\/b> ספורטאים ונבחרות ברשימה/.test(view("home")), "home KPI: ברשימה");
  // Every remaining "במעקב" in the site code is personal-follow copy.
  const files = fs.readdirSync(path.join(ROOT, "site")).filter(n => n.endsWith(".js"));
  assert.ok(files.includes("home.js") && files.includes("app.js"), "scans the new home code too");
  for (const f of files) {
    const bad = fs.readFileSync(path.join(ROOT, "site", f), "utf8").split("\n")
      .filter(l => /במעקב/.test(l) && !/במעקב (שלך|שלי)|עוד אין (ענפים|ספורטאים או נבחרות) במעקב|שבמעקב שלך|ענפים במעקב:|ענף במעקב:/.test(l));
    assert.deepStrictEqual(bad, [], f);
  }
});

test("home KPI uses the singular for one athlete; the hero line for one verified record (F3)", async () => {
  const one = {...FIXTURE.athletes[0], verifiedAt: "2026-10-01", updatedAt: "2026-09-01"};
  const home = (await boot({data: {...FIXTURE, athletes: [one]}, now: "2026-10-18T15:00:00Z"})).view("home");
  const kpi = home.match(/<p class="kpi">.*?<\/p>/)[0];
  assert.ok(kpi.includes("ספורטאי/ת או נבחרת אחת ברשימה") && !kpi.includes("ספורטאים ונבחרות") && !kpi.includes("ידנית"), kpi);
  assert.ok(home.split('<section class="hero">')[1].split("</section>")[0].includes("1 מתוך 1 נבדק/ה ידנית"), "singular in the hero");
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
  for (const l of ["✓ מכסה הושגה", "◐ במרוץ למכסה", "○ מחוץ למכסות כרגע", "? אין מידע עדיין"]) assert.ok(unhide(out).includes(l), l);
  assert.ok(out.includes('<span class="pill q-earned"><span aria-hidden="true">✓</span> מכסה הושגה</span>'), "symbol hidden from screen readers");
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

test("quota earned: home panel for the last 14 days, nothing without earnedAt", async () => {
  const base = QUOTAS.items[0];   // judo, valid
  const item = (event, extra) => ({...base, event, israelNote: `הערה <b>${event}</b>`, stakes: `stake ${event}`,
    nextQuotaEvent: {name: "גרנד סלאם", start: "2026-10-29"}, ...extra});
  const quotas = {updatedAt: "2026-10-30", items: [
    item("52- ק״ג נשים", {israelStatus: "earned", earnedAt: "2026-10-29", nextQuotaEvent: null}),   // cleared once earned: matched by earnedAt
    item("57- ק״ג נשים", {israelStatus: "earned", earnedAt: "2026-10-01"}),   // 29 days ago: not new
    item("63- ק״ג נשים", {israelStatus: "earned"}),                              // no earnedAt
    item("78+ ק״ג נשים", {israelStatus: "earned", earnedAt: "bad"}),             // invalid → treated as missing
    item("60- ק״ג גברים", {israelStatus: "in-contention"}),
  ]};
  const {view} = await boot({quotas, now: "2026-10-30T08:00:00Z"});
  const home = view("home");
  const won = home.split('class="panel won"')[1]?.split("</section>")[0] || "";
  assert.ok(won.startsWith(' aria-labelledby="wonH"') && won.includes('<h2 id="wonH">מכסה חדשה לישראל</h2>'), won);
  assert.strictEqual(count(won, "<li>"), 1);
  assert.ok(won.includes("52- ק״ג נשים") && won.includes('href="#sport-judo"') && won.includes("pill q-earned"));
  assert.ok(!/<b>52/.test(won) && won.includes("&lt;b&gt;52"), "note escaped");
  assert.ok(home.indexOf('class="panel won"') < home.indexOf('id="todayH"'), "earned yesterday: above the today hub (PM on #171)");

  const two = {updatedAt: "2026-10-30", items: [quotas.items[0], {...quotas.items[0], event: "x", earnedAt: "2026-10-20"}]};
  assert.ok((await boot({quotas: two, now: "2026-10-30T08:00:00Z"})).view("home").includes('<h2 id="wonH">מכסות חדשות לישראל</h2>'));
  const none = await boot({quotas: {updatedAt: "2026-10-30", items: quotas.items.slice(1)}, now: "2026-10-30T08:00:00Z"});
  assert.ok(!none.view("home").includes("wonH"), "hidden when nothing new");
});

test("awaiting results after a quota event (round3 §1): sport page, #quotas, home KPI", async () => {
  const base = QUOTAS.items[0];   // valid item
  const item = (event, israelStatus, nextQuotaEvent) => ({...base, sportId: "artistic-gymnastics", event, israelStatus, stakes: `stake ${event}`, nextQuotaEvent});
  const quotas = updatedAt => ({updatedAt, items: [
    item("קבוצתי<b>", "in-contention", {name: "גמר קבוצתי<i>", start: "2026-10-20", end: "2026-10-20"}),   // inside the 17–25 Oct Worlds
    item("אישי", "in-contention", {name: "אליפות העולם 2027", start: "2027-09-28"}),
    item("הושגה", "earned", {name: "גמר קבוצתי<i>", start: "2026-10-20", end: "2026-10-20"}),             // earned never waits
  ]});
  const AW = '<span aria-hidden="true">◷</span> בהמתנה לתוצאות';
  const PILL = `<span class="pill q-awaiting">${AW}</span>`;
  const LINE = "גמר קבוצתי&lt;i&gt; (";
  const at = async (now, updatedAt = "2026-10-18") => {
    const {view} = await boot({quotas: quotas(updatedAt), now});
    const home = view("home");
    return {home, sport: view("sport-artistic-gymnastics"), all: view("quotas")};
  };

  const day = await at("2026-10-20T08:00:00Z");
  assert.ok(!day.sport.includes(PILL) && !day.all.includes("qWaitH"), "event day: stakes, no awaiting");

  const next = await at("2026-10-21T08:00:00Z");
  const row = next.sport.split("<li>").find(x => x.includes("קבוצתי&lt;b&gt;"));
  assert.ok(row.includes(`<span class="actions"><span class="pill q-in-contention"><span aria-hidden="true">◐</span> במרוץ למכסה</span>${PILL}</span>`), "status pill + awaiting pill");
  assert.ok(row.includes(`<p class="q-meta">${LINE}`) && row.includes("). עדכון המכסות יפורסם אחרי ההודעה הרשמית.") && !row.includes("stake קבוצתי"), "line replaces stale stakes");
  const order = ["הושגה", "קבוצתי&lt;b&gt;", "אישי"].map(e => next.sport.indexOf(`<b><bdi>${e}</bdi></b>`));
  assert.deepStrictEqual([...order].sort((x, y) => x - y), order, "earned, then awaiting, then the rest");
  assert.ok(!next.sport.split("<li>").find(x => x.includes("<b><bdi>הושגה</bdi></b>")).includes(PILL), "earned never awaits");
  const panel = next.all.split('id="qWaitH"')[1]?.split("</section>")[0] || "";
  assert.ok(panel.includes("גמר קבוצתי&lt;i&gt;") && panel.includes("קבוצתי&lt;b&gt;") && !panel.includes("הושגה") && !/<[bi]>/.test(panel.replace(/<\/?b>/g, "")), "#quotas panel, escaped");
  assert.ok(next.all.indexOf('id="qWaitH"') < next.all.indexOf('id="qNextH"'), "panel above upcoming");
  assert.ok(next.home.includes(" · מקצה אחד בהמתנה לתוצאות"), "home KPI names what it counts");

  const updated = await at("2026-10-21T08:00:00Z", "2026-10-21T06:00:00Z");
  for (const page of Object.values(updated)) assert.ok(!page.includes("בהמתנה לתוצאות") && !page.includes("stake קבוצתי"), "curated after the event: no awaiting");
  const late = await at("2026-11-05T08:00:00Z");
  assert.ok(!late.sport.includes(PILL) && !late.all.includes("qWaitH"), "after 14 days the awaiting state ends");
});

test("sport page earned rows (round3 §2): earned date, stage note once when no stage-2 athlete", async () => {
  const NOTE = "המכסה הושגה למדינה. שלב הספורטאים והנבחרות יתעדכן אחרי בדיקה ידנית.";
  // earnedAt is set on S.quotas directly: the loader passes it through only once dev/omer/earned-banner lands.
  const withDate = b => { b.run(`S.quotas.find(q => q.israelStatus === "earned").earnedAt = "2026-10-15"`); return b; };
  const {view} = withDate(await boot({quotas: SPORT_QUOTAS}));
  const judo = view("sport-judo");
  const row = judo.split("<li>").find(x => x.includes("מכסה הושגה</span>"));
  assert.ok(row.includes('<p class="q-meta">הושגה ב־'), "earned row shows its date");
  assert.strictEqual(judo.split(NOTE).length - 1, 1, "stage note once");
  assert.ok(judo.indexOf(NOTE) < judo.indexOf('<ul class="qlist">'), "under the bar");
  assert.strictEqual(judo.split("הושגה ב־").length - 1, 1, "only the earned row");
  assert.ok(!view("sport-shooting").includes(NOTE), "no earned item, no note");

  const data = JSON.parse(JSON.stringify(FIXTURE));
  data.athletes.find(a => a.sportId === "judo").stage = 2;
  assert.ok(!withDate(await boot({data, quotas: SPORT_QUOTAS})).view("sport-judo").includes(NOTE), "a stage-2 athlete: no note");
  assert.ok(!(await boot({quotas: SPORT_QUOTAS})).view("sport-judo").includes("הושגה ב־"), "no earnedAt, no date line");
  const two = JSON.parse(JSON.stringify(SPORT_QUOTAS));
  two.items[0].israelStatus = "earned";
  assert.ok((await boot({quotas: two})).view("sport-judo").includes("<p class=\"foot\">המכסות הושגו למדינה."), "plural");
});

test("athlete page quota line (round3 §3): per status, awaiting, max 3, no line without a match", async () => {
  const factsOf = html => unhide(html.split(/<dt>מכס(?:ה|ות)<\/dt>/)[1]?.split("</dd>")[0] || "");
  const {view, run} = await boot({quotas: SPORT_QUOTAS});
  run(`S.quotas.find(q => q.israelStatus === "earned").earnedAt = "2026-10-15"`);
  const lanir = factsOf(view("a-inbar-lanir"));   // "עד 78 ק״ג (נשים)": linked by weight class
  assert.ok(lanir.includes("◐ במרוץ למכסה") && lanir.includes("אירוע המכסה הבא: גרנד סלאם אבו דאבי"), "in contention + next event");
  assert.ok(lanir.includes('<span class="stakes"><b>מה זה אומר:</b> &lt;script&gt;') && !/<script/i.test(lanir), "stakes, escaped");
  assert.ok(lanir.includes('<a href="#sport-judo">לכל המכסות בענף</a>'));
  const shemesh = factsOf(view("a-inbal-shemesh"));
  assert.ok(shemesh.includes("✓ מכסה הושגה") && shemesh.includes("המכסה שייכת למדינה, לא לספורטאי/ת. היא הושגה ב־"), "earned line");
  assert.ok(!/<dt>מכס(?:ה|ות)<\/dt>/.test(view("a-yonatan-elbaz")), "no matching item, no line");

  const base = QUOTAS.items[0];
  const item = (event, israelStatus, nextQuotaEvent = null) => ({...base, sportId: "judo", event, israelStatus, israelNote: "רז הרשקו", stakes: "stake", nextQuotaEvent});
  const quotas = {updatedAt: "2026-10-18", items: [item("א", "outside"), item("ב", "unknown"),
    item("ג", "in-contention", {name: "גמר<i>", start: "2026-10-20", end: "2026-10-20"}), item("ד", "unknown")]};
  const raz = factsOf((await boot({quotas, now: "2026-10-21T08:00:00Z"})).view("a-raz-hershko"));
  assert.strictEqual((raz.match(/class="pill q-(?!awaiting)/g) || []).length, 3, "max 3 items");
  assert.ok((await boot({quotas, now: "2026-10-21T08:00:00Z"})).view("a-raz-hershko").includes("<dt>מכסות</dt>"), "plural label for 2+ items");
  assert.ok(raz.indexOf("◐") < raz.indexOf("○") && raz.indexOf("○") < raz.indexOf("? אין"), "status order");
  assert.ok(raz.includes("q-awaiting") && raz.includes("גמר&lt;i&gt; (") && !raz.includes("stake"), "awaiting replaces next event and stakes");
  assert.ok(raz.includes("לפי המצב הנוכחי, ישראל מחוץ למקומות המכסה.") && raz.includes("עוד אין מידע על מצב ישראל במקצה הזה."));
});

test("earned items show no pre-event stakes (QA-2, #105): sport page and #quotas", async () => {
  const q = JSON.parse(JSON.stringify(SPORT_QUOTAS));
  const ev = {name: "גרנד סלאם", start: "2099-10-29"};
  Object.assign(q.items.find(i => i.israelStatus === "earned"), {stakes: "stake earned", nextQuotaEvent: ev});
  Object.assign(q.items.find(i => i.israelStatus === "in-contention"), {stakes: "stake running", nextQuotaEvent: ev});
  const {view} = await boot({quotas: q});
  for (const out of [view("sport-judo"), view("quotas")]) {
    assert.ok(!out.includes("stake earned"), "earned: no stakes");
    assert.ok(out.includes("stake running"), "in contention: stakes still shown");
  }
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

// Corrections log (docs/design/corrections-log.md §6). Export filtering is tested on the data side.
const SRC = "https://www.ijf.org/wrl";
const fix = (o, changes) => ({id: o.id || "x", at: o.at, reportedAt: o.reportedAt || "", by: o.by || "reader", source: o.source ?? SRC,
  target: o.target || {kind: "athlete", id: "raz-hershko", name: "רז הרשקו"}, changes});
const CORRECTIONS = [
  fix({at: "2026-10-24T09:10:00Z", reportedAt: "2026-10-23T18:40:00Z"}, [{field: "rank", wrong: "2 בעולם", right: "1 <img src=x onerror=alert(1)>"}]),
  fix({at: "2026-10-25T08:00:00Z", reportedAt: "2026-10-23T08:00:00Z", by: "audit", target: {kind: "athlete", id: "inbar-lanir", name: "ענבר לניר"}},
    [{field: "notes", wrong: "", right: "נוסף כאן"}]),
  fix({at: "2026-11-02T10:00:00Z", reportedAt: "2026-10-28T10:00:00Z", by: "job", target: {kind: "athlete", id: "gone-athlete", name: "שם ישן"}},
    [{field: "notes", wrong: "הוסר מכאן", right: ""}]),
  fix({at: "2026-11-01T10:00:00Z"}, [{field: "stage", wrong: 1, right: 2}]),
  fix({at: "2026-10-30T10:00:00Z", by: "audit", target: {kind: "sport", id: "judo", name: "ג׳ודו"}}, [{field: "sportId", wrong: "athletics", right: "judo"}]),
  fix({at: "2026-10-26T10:00:00Z", source: "", target: {kind: "athlete", id: "raz-hershko", name: "בלי מקור"}}, [{field: "rank", wrong: "a", right: "b"}]),
  fix({at: "2026-10-26T10:00:00Z", by: "editor", target: {kind: "athlete", id: "raz-hershko", name: "מקור לא מוכר"}}, [{field: "rank", wrong: "a", right: "b"}]),
];
const LAUNCH = "2026-10-22T09:00:00Z";
const bootFixes = async (corrections = CORRECTIONS) => boot({data: {...JSON.parse(JSON.stringify(FIXTURE)), corrections, launchAt: LAUNCH}});
const entriesOf = html => html.split('<article class="fix">').slice(1);

test("#corrections: newest months whole up to 100 entries, older months behind a button, reset on navigation", async () => {
  // 5 months × 30 entries: Nov–Aug are shown (90 after Sep, so Aug comes in whole, 120), July is collapsed.
  const many = ["2026-11", "2026-10", "2026-09", "2026-08", "2026-07"].flatMap((m, k) => Array.from({length: 30}, (_, i) =>
    fix({id: `m${k}-${i}`, at: `${m}-${String(1 + (i % 28)).padStart(2, "0")}T10:00:00Z`}, [{field: "rank", wrong: "a", right: "b"}])));
  const data = {...JSON.parse(JSON.stringify(FIXTURE)), corrections: many, launchAt: "2026-07-01T00:00:00Z"};
  const {view, run, ctx} = await boot({data, now: "2026-11-20T08:00:00Z"});
  const out = view("corrections");
  assert.strictEqual(entriesOf(out).length, 120, "Nov, Oct, Sep, Aug whole: the month that crosses 100 is never split");
  const jul = out.split('id="m-2026-07"')[1];
  assert.ok(jul.includes('data-fix-month="2026-07">הצגת 30 התיקונים מיולי 2026</button>') && !jul.includes('class="fix"'), "July collapsed, with its count");
  assert.ok(out.includes('<h2 id="m-2026-07" tabindex="-1">'), "the heading takes focus after expanding");
  run(`S.fixOpen.add("2026-07"); route()`);
  assert.strictEqual(entriesOf(ctx.document.getElementById("view").innerHTML).length, 150, "expanded in place");
  const go = h => { ctx.location.hash = "#" + h; run("navigate()"); return ctx.document.getElementById("view").innerHTML; };
  go("corrections"); run(`S.fixOpen.add("2026-07"); route()`); go("home");
  assert.strictEqual(entriesOf(go("corrections")).length, 120, "navigating away and back resets the expanded months");
  assert.strictEqual(entriesOf(view("corrections-raz-hershko")).length, 120, "#corrections-<id> uses the same rule");
});

test("#corrections: months newest first, diffs, labels, speed, escaping, invalid entries dropped", async () => {
  const {view} = await bootFixes();
  const out = view("corrections");
  assert.ok(out.includes('<h1 tabindex="-1">יומן התיקונים</h1>') && out.includes('<h2 id="howH">מטעות לתיקון</h2>'));
  assert.ok(out.indexOf("נובמבר 2026") < out.indexOf("אוקטובר 2026"), "newest month first");
  const fixes = entriesOf(out);
  assert.strictEqual(fixes.length, 5, "no source and unknown 'by' are dropped");
  assert.ok(!out.includes("בלי מקור") && !out.includes("מקור לא מוכר"));
  assert.ok(!/<img/i.test(out) && out.includes("1 &lt;img"), "values escaped");
  const raz = fixes.find(f => f.includes("1 &lt;img"));
  assert.ok(raz.includes('<a href="#a-raz-hershko">רז הרשקו</a>') && raz.includes("דיווח של קורא/ת") && raz.includes("<dt>דירוג או הישג</dt>"));
  assert.ok(raz.includes("היה: <del>2 בעולם</del>") && raz.includes("עכשיו: <ins>") && raz.includes("תוך פחות מיום") && raz.includes("ijf.org"));
  assert.ok(out.includes("נוסף: <ins>נוסף כאן</ins>") && out.includes("הוסר: <del>הוסר מכאן</del>"), "empty wrong/right");
  assert.ok(fixes.find(f => f.includes("נוסף כאן")).includes("תוך יומיים") && fixes.find(f => f.includes("הוסר מכאן")).includes("אחרי 5 ימים"), "speed thresholds");
  const gone = fixes.find(f => f.includes("שם ישן"));
  assert.ok(!gone.includes("<a href=\"#a-gone-athlete\"") && gone.includes("נמצא בעדכון האוטומטי"), "archived target: name without link");
  assert.ok(out.includes("היה: <del>בחלון ההעפלה</del>") && out.includes("עכשיו: <ins>מכסה הושגה</ins>"), "stage shown by name");
  assert.ok(out.includes("היה: <del>אתלטיקה</del>") && out.includes('<a href="#sport-judo">ג׳ודו</a>'), "sportId shown by name, sport target linked");
  assert.ok(!fixes.join("").includes("@"), "no email in any entry");
  assert.ok(!out.includes("בוצעו תוך 48 שעות"), "stat hidden below 5 timed entries");
  // #112 review: audit label, month count read out, check link, date values formatted, intro count.
  assert.ok(out.includes('<span class="pill by-audit">בדיקה ידנית</span>'));
  assert.ok(out.includes('<span class="sr"> תיקונים</span>') && out.includes('<a href="#about-trust">איך אנחנו בודקים</a>'));
  assert.ok(out.includes("בבדיקה מול המקורות לפני ההשקה תיקנו פרטים אצל 25 ספורטאים ונבחרות."));
  const dated = (await bootFixes([fix({at: "2026-10-24T09:10:00Z"}, [{field: "nextDate", wrong: "2026-10-29", right: "2026-10-30"}])])).view("corrections");
  assert.ok(dated.includes("<del>29 באוק׳ 2026</del>") && !dated.includes("2026-10-29"), "nextDate through fmt()");
  const data = clone();
  for (const a of data.athletes) delete a.verifiedAt;   // exactly the two verified below
  for (const id of ["raz-hershko", "inbar-lanir"]) Object.assign(data.athletes.find(a => a.id === id), {verifiedAt: "2026-10-20T10:00:00Z", updatedAt: "2026-10-19T10:00:00Z"});
  const counted = (await boot({data: {...data, corrections: CORRECTIONS, launchAt: LAUNCH}})).view("corrections");
  assert.ok(counted.includes(" נבדקו ידנית מול המקור עד כה: 2 ספורטאים ונבחרות."), "computed manual-check count");
});

test("#corrections: 48-hour stat from 5 timed entries", async () => {
  const timed = [0, 1, 2, 3, 4].map(i => fix({at: `2026-10-2${4 + i}T10:00:00Z`, reportedAt: `2026-10-2${i ? 1 : 3}T10:00:00Z`}, [{field: "rank", wrong: "a", right: "b"}]));
  const out = (await bootFixes(timed)).view("corrections");
  assert.ok(out.includes("עד עכשיו, 1 מתוך 5 התיקונים בוצעו תוך 48 שעות."), out.split("היעד:")[1]?.slice(0, 120));
});

test("#corrections-<id>: one record's entries; no entries or unknown id -> not found", async () => {
  const {view} = await bootFixes();
  const raz = view("corrections-raz-hershko");
  assert.strictEqual(entriesOf(raz).length, 2);
  assert.ok(raz.includes("מוצגים התיקונים של <b>רז הרשקו</b>") && raz.includes('<a href="#corrections">לכל התיקונים</a>') && !raz.includes("ענבר לניר"));
  assert.ok(view("corrections-yonatan-elbaz").includes(NOT_FOUND), "athlete without entries");
  assert.ok(view("corrections-nope").includes(NOT_FOUND), "unknown id");
  assert.ok(entriesOf(view("corrections-gone-athlete")).length === 1, "archived athlete with entries still has a log");
});

test("#corrections empty state (launch day) and entry points", async () => {
  const empty = (await bootFixes([])).view("corrections");
  assert.ok(empty.includes("מטעות לתיקון") && empty.includes("עוד אין תיקונים מאז ההשקה.") && !empty.includes('class="month"'));
  const {view, els, run} = await bootFixes();
  const raz = view("a-raz-hershko"), lanir = view("a-inbar-lanir");
  assert.ok(raz.includes('<dt>תיקונים</dt><dd><a href="#corrections-raz-hershko">2 תיקונים</a></dd>'));
  assert.ok(lanir.includes('<a href="#corrections-inbar-lanir">תיקון אחד</a>'));
  assert.ok(!view("a-yonatan-elbaz").includes("<dt>תיקונים</dt>"), "no entries, no fact");
  for (const page of [raz, view("about")]) assert.ok(page.includes('ב<a href="#corrections">יומן התיקונים</a>, והיעד הוא תוך 48 שעות.'), "report box line");
  assert.ok(!view("updates").includes("2 בעולם"), "#updates stays news only");
  assert.ok(els.fixLink.innerHTML.includes('href="#corrections"'), "footer link once live");
  assert.ok(empty.includes(`<span dir="ltr">${run("CONTACT_EMAIL")}</span>`) && !empty.includes("{REPORT_EMAIL}"), "one contact address");
});

test("corrections before launchAt are not shown, even if an export includes them", async () => {
  const early = fix({at: "2026-10-21T08:00:00Z", target: {kind: "athlete", id: "raz-hershko", name: "רז הרשקו"}}, [{field: "rank", wrong: "לפני", right: "ההשקה"}]);
  const {view} = await bootFixes([early, ...CORRECTIONS]);
  assert.ok(!view("corrections").includes("ההשקה</ins>") && entriesOf(view("corrections")).length === 5);
  const {run, view: preview} = await boot({data: {...JSON.parse(JSON.stringify(FIXTURE)), corrections: [early], launchAt: null}});
  run("S.isAdmin = true");
  assert.strictEqual(entriesOf(preview("corrections")).length, 1, "editors' preview before launch shows everything");
});

test("corrections log before launch (launchAt null): not found for visitors, no links; preview for editors", async () => {
  const {view, run, els} = await boot({data: {...JSON.parse(JSON.stringify(FIXTURE)), corrections: CORRECTIONS, launchAt: null}});
  for (const h of ["corrections", "corrections-raz-hershko"]) assert.ok(view(h).includes(NOT_FOUND), h);
  for (const h of ["home", "about", "a-raz-hershko", "a-inbar-lanir", "updates"]) assert.ok(!view(h).includes('href="#corrections'), h);
  assert.strictEqual(els.fixLink.innerHTML, "", "no footer link");
  run("S.isAdmin = true");
  const preview = view("corrections");
  assert.ok(preview.includes("תצוגה מקדימה לעורכים: היומן יתפרסם לציבור אחרי שייקבע מועד ההשקה.") && preview.includes("יומן התיקונים"));
  assert.ok(!preview.includes("מאז ההשקה ב־"), "no launch date yet");
  assert.ok(!view("a-raz-hershko").includes("<dt>תיקונים</dt>"), "entry points stay hidden for editors too");
});

// docs/product/spec-rank-tiebreak.md: IJF ranks from the real items' notes, as of mid-October.
const JUDO_RANKS = {"raz-hershko": 1, "izhak-ashpiz": 5, "timna-nelson-levy": 6, "gefen-primo": 11, "kerem-primo": 13,
  "yuli-alma-mishiner": 13, "inbar-lanir": 22, "yonatan-elbaz": 26, "inbal-shemesh": 35};
const rankedData = asOf => {
  const data = withoutRanks();   // only the ranks set here
  for (const a of data.athletes) if (a.id in JUDO_RANKS) Object.assign(a, {rankNum: JUDO_RANKS[a.id], rankList: "IJF World Ranking List", rankAsOf: asOf});
  return data;
};

test("rank tie-break: every real judo quota item resolves to its athlete", async () => {
  const {run} = await boot({quotas: REAL_QUOTAS});
  const resolved = JSON.parse(run(`JSON.stringify(quotasOf("judo").map(q => [q.event, quotaAthletes(q).map(a => a.id).sort()]))`));
  const want = {"60- ק״ג גברים": ["izhak-ashpiz"], "73- ק״ג גברים": ["ohad-moritz", "yonatan-elbaz"], "52- ק״ג נשים": ["gefen-primo"],
    "57- ק״ג נשים": ["inbal-shemesh", "timna-nelson-levy"], "63- ק״ג נשים": ["kerem-primo"], "78- ק״ג נשים": ["inbar-lanir"],
    "78+ ק״ג נשים": ["raz-hershko", "yuli-alma-mishiner"]};
  assert.deepStrictEqual(Object.fromEntries(resolved), want);
});

test("rank tie-break: digest lists ranked athletes first within a quota event", async () => {
  const b = await boot({data: rankedData("2026-10-15"), now: DIGEST_NOW, quotas: REAL_QUOTAS});
  const line = b.run("digestText()").split("\n").find(l => l.startsWith("  ישראלים: ") && l.includes("רז הרשקו")) || "";
  assert.ok(line.indexOf("רז הרשקו") < line.indexOf("יצחק אשפיז") && line.indexOf("יצחק אשפיז") < line.indexOf("גפן פרימו"), line);
});

test("edit dialog: rank number needs its list and date", async () => {
  const {run, els} = await boot({data: withoutRanks()});   // Raz starts with no list or date
  run(`var __w = []; S.db = {collection: () => ({doc: () => ({update: async p => { __w.push(p); }})})}; openForm(S.athletes.find(a => a.id === "raz-hershko"))`);
  els.fRankNum.value = "1";
  await run("saveForm({preventDefault(){}})");
  assert.ok(!els.frmErr.hidden && els.frmErr.textContent.includes("שם הרשימה ותאריך"), "rejected without list/date");
  els.fRankList.value = "IJF World Ranking List"; els.fRankAsOf.value = "2026-10-15";
  await run("saveForm({preventDefault(){}})");
  const saved = JSON.parse(run("JSON.stringify(__w)"));
  assert.strictEqual(saved.length, 1);
  assert.deepStrictEqual([saved[0].rankNum, saved[0].rankList, saved[0].rankAsOf], [1, "IJF World Ranking List", "2026-10-15"]);
});

test("two-day quota event inside a longer competition (Doha 3–4.11 in the 1–14.11 Worlds): stakes, then awaiting", async () => {
  const base = QUOTAS.items[0];   // valid item
  const quotas = {updatedAt: "2026-10-30", items: [{...base, sportId: "shooting", event: "רובה אוויר", israelStatus: "in-contention",
    stakes: "stake doha", nextQuotaEvent: {name: "גמר דוחא", start: "2026-11-03", end: "2026-11-04"}}]};
  const at = async day => {
    const {view} = await boot({quotas, now: `${day}T08:00:00Z`});
    return {sport: view("sport-shooting"), all: view("quotas")};
  };
  for (const day of ["2026-11-03", "2026-11-04"]) {
    const d = await at(day);
    assert.ok(d.sport.includes("stake doha") && !d.sport.includes("q-awaiting"), `${day}: sport page stakes`);
    assert.ok(d.all.split('id="qNextH"')[1]?.includes("גמר דוחא"), `${day}: still upcoming on #quotas`);
  }
  const after = await at("2026-11-05");
  assert.ok(after.sport.includes("q-awaiting") && after.sport.includes("גמר דוחא (3 בנוב׳ – 4 בנוב׳ 2026). עדכון המכסות יפורסם") && !after.sport.includes("stake doha"), "5.11: sport page awaiting");
  assert.ok(after.all.includes('id="qWaitH"') && !(after.all.split('id="qNextH"')[1] || "").includes("גמר דוחא"), "5.11: #quotas awaiting panel");
});

// Following (#following; docs/design/daily-and-following.md §2, copy from Shira on #130).
const withHistory = (id, entries) => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  const a = data.athletes.find(x => x.id === id);
  a.history = entries;   // replaced, so counts don't depend on the snapshot's own history
  return data;
};

test("following a sport persists across reloads and shows on #following-sports", async () => {
  const b = await boot();
  const off = b.view("sport-judo");
  assert.ok(off.includes('data-follow-sport="judo" aria-pressed="false"><span aria-hidden="true">☆</span> מעקב אחרי הענף<span class="sr"> ג׳ודו</span></button>'), "label in name");
  b.fire("click", {closest: () => ({dataset: {followSport: "judo"}})});
  assert.strictEqual(b.ctx.localStorage.getItem("la28.followSports"), '["judo"]');
  assert.ok(b.view("sport-judo").includes('aria-pressed="true"><span aria-hidden="true">★</span> הענף<span class="sr"> ג׳ודו</span> במעקב שלך</button>'));
  const again = await boot({storage: {"la28.followSports": '["judo"]'}});
  const tab = again.view("following-sports");
  assert.ok(tab.includes("ענפים (1)") && tab.includes('<a class="sport" href="#sport-judo">') && tab.includes('aria-current="page">ענפים (1)'));
  assert.ok(again.view("following").includes("ספורטאים ונבחרות (0)"));
});

test("#following feed and nav badge: counts changes since the last visit, clears on visit, caps at 9+", async () => {
  const data = setAthlete(withHistory("raz-hershko", [{at: "2026-10-15", kind: "rank", text: "דירוג <img src=x onerror=alert(1)>"}, {at: "2026-10-01", kind: "rank", text: "ישן"}]),
    "raz-hershko", {nextDate: "2026-10-29"});
  const b = await boot({data, follows: ["raz-hershko"], now: "2026-10-18T20:00:00Z", storage: {"la28.followingSeen": '"2026-10-10T00:00:00Z"'}});
  b.view("home");
  assert.ok(!b.els.followBadge.hidden && b.els.followBadge.textContent === "1" && b.els.followBadgeSr.textContent === ", עדכון חדש אחד", "badge before the visit");
  const page = b.view("following");
  assert.ok(page.includes('<h2 id="feedH">מאז הביקור הקודם (1)</h2>') && page.includes("דירוג &lt;img") && !/<img/i.test(page) && !page.includes("ישן"));
  assert.ok(page.includes('<h2 id="nextH">הבא בתור במעקב שלי</h2>') && page.includes("29 באוק׳"), "next up: her 29.10 competition");
  assert.ok(page.includes("המעקב נשמר רק בדפדפן הזה, בלי חשבון."));
  assert.ok(b.els.followBadge.hidden && b.els.followBadgeSr.textContent === "", "badge clears on visit");
  assert.ok(b.view("following").includes("מאז הביקור הקודם (1)"), "the feed keeps what was new on arrival");
  assert.ok(JSON.parse(b.ctx.localStorage.getItem("la28.followingSeen")) > "2026-10-10", "visit stored");

  const many = withHistory("raz-hershko", Array.from({length: 12}, (_, i) => ({at: `2026-10-${11 + (i % 6)}`, kind: "note", text: `עדכון ${i}`})));
  const c = await boot({data: many, follows: ["raz-hershko"], now: "2026-10-18T08:00:00Z", storage: {"la28.followingSeen": '"2026-10-10T00:00:00Z"'}});
  c.view("home");
  assert.ok(c.els.followBadge.textContent === "9+" && c.els.followBadgeSr.textContent === ", 12 עדכונים חדשים");
});

test("#following: first visit, empty state with suggestions, sport followers see that sport's athletes, unknown tab", async () => {
  const first = await boot({follows: ["raz-hershko"], now: "2026-10-18T08:00:00Z"});
  first.view("home");
  assert.ok(first.els.followBadge.hidden, "no baseline yet: no badge");
  assert.ok(first.view("following").includes("עדכונים על מי שבמעקב שלך יופיעו כאן מהביקור הבא."));
  const none = (await boot({now: "2026-10-28T08:00:00Z"})).view("following");
  assert.ok(none.includes("<b>איך:</b> לחצו על ☆ בדף של ספורטאי/ת, נבחרת או ענף."));
  assert.ok(!none.includes("<h3>הצעות למעקב</h3>") || none.includes('class="card"'), "suggestions are athlete cards");
  const data = withHistory("raz-hershko", [{at: "2026-10-15", kind: "result", text: "ארד"}]);
  const sport = await boot({data, now: "2026-10-18T08:00:00Z", storage: {"la28.followSports": '["judo"]', "la28.followingSeen": '"2026-10-10T00:00:00Z"'}});
  assert.ok(sport.view("following").includes("ארד"), "a followed sport's athletes feed in");
  assert.ok(sport.view("following-nope").includes(NOT_FOUND));
});

test("#following S2: a followed sport alone shows on home, and the badge counts exactly the labelled feed rows", async () => {
  const judo = FIXTURE.sports.find(s => s.id === "judo").he;
  // Last visit after the snapshot's own 18.10 updates, so only the two entries below are new.
  const seen = {"la28.followSports": '["judo"]', "la28.followingSeen": '"2026-10-18T20:00:00Z"'};
  const data = setAthlete(withHistory("raz-hershko", [{at: "2026-10-19", kind: "result", text: "ארד"}]),
    "gefen-primo", {history: [{at: "2026-10-19", kind: "rank", text: "דירוג חדש"}]});
  const b = await boot({data, now: "2026-10-19T08:00:00Z", storage: seen});
  const home = b.view("home");
  const panel = home.split("<h2>במעקב שלי</h2>")[1]?.split("</section>")[0] ?? "";
  assert.ok(panel.includes(`<div class="chips" role="group" aria-labelledby="mineSportsL"><span class="chips-lbl" id="mineSportsL">ענפים במעקב:</span><a href="#sport-judo">${judo}</a></div>`), "labelled sport chip on home");
  assert.ok(!panel.includes('class="cards"') && !home.includes("טיפ: לחצו על ☆"), "no athlete cards, no tip");
  const badge = Number(b.els.followBadge.textContent);
  assert.ok(!b.els.followBadge.hidden && badge === 2, "badge before the visit");
  const feed = b.view("following").split('<h2 id="feedH">')[1].split("</section>")[0];
  const rows = feed.split("<li>").slice(1);
  assert.strictEqual(rows.length, badge, "badge = visible feed rows");
  assert.ok(rows.every(r => r.includes(`<small>ענף במעקב: ${judo}</small>`)), "every row says it comes from the sport");
  assert.ok(!feed.includes("star-on"), "no star for sport-only follows");
  const direct = await boot({data, follows: ["raz-hershko"], now: "2026-10-19T08:00:00Z", storage: seen});
  const razRow = direct.view("following").split("<li>").find(r => r.includes("ארד"));
  assert.ok(razRow && !razRow.includes("ענף במעקב"), "a direct follow isn't labelled by sport");
  const tip = (await boot({storage: {"la28.seen": '"2026-10-10T00:00:00Z"'}})).view("home");
  assert.ok(tip.includes("טיפ: לחצו על ☆ בדף של ספורטאי/ת, נבחרת או ענף כדי לעקוב"), "tip names sports");
});

test("F5: the empty #following explains what, how and the limit; the home tip is for returning visitors, after the updates", async () => {
  const none = (await boot({now: "2026-10-28T08:00:00Z"})).view("following");
  const box = none.split('<div class="empty">')[1].split("</div>")[0];
  assert.strictEqual((box.match(/<p>/g) || []).length, 3, box);
  assert.ok(box.includes("<b>מה מקבלים:</b> תג עם מספר השינויים מאז הביקור הקודם") && box.includes('<a href="#today">היום</a>'), "what");
  assert.ok(box.includes("<b>איך:</b> לחצו על ☆ בדף של ספורטאי/ת, נבחרת או ענף."), "how");
  assert.ok(box.includes("<b>שימו לב:</b> המעקב נשמר רק בדפדפן הזה, בלי חשבון."), "limit");
  assert.ok(!none.includes('<p class="foot">המעקב נשמר'), "the foot line isn't repeated");
  const TIP = "טיפ: לחצו על ☆";
  assert.ok(!(await boot({})).view("home").includes(TIP), "first-time home load: no tip");
  const back = (await boot({storage: {"la28.seen": '"2026-10-10T00:00:00Z"'}})).view("home");
  assert.ok(back.indexOf(TIP) > back.indexOf("<h2>מה התעדכן</h2>") && back.indexOf("<h2>מה התעדכן</h2>") > 0, "returning: tip after the updates");
  const following = (await boot({follows: ["raz-hershko"], storage: {"la28.seen": '"2026-10-10T00:00:00Z"'}})).view("home");
  assert.ok(!following.includes(TIP), "no tip once something is followed");
});

test("#following review fixes (#138): per-tab empty states, updatedAt fallback row, sport cards, home link", async () => {
  const athletesOnly = await boot({follows: ["raz-hershko"], now: "2026-10-18T20:00:00Z"});
  const sportsTab = athletesOnly.view("following-sports");
  assert.ok(sportsTab.includes("עוד אין ענפים במעקב. לחצו על ☆ בדף של ענף כדי לעקוב.") && !sportsTab.includes("<b>איך:</b>"));
  assert.ok(athletesOnly.view("home").includes('<h2>במעקב שלי</h2><a href="#following">לדף המעקב</a>'), "home link");
  const sportsOnly = await boot({storage: {"la28.followSports": '["judo"]'}, quotas: SPORT_QUOTAS});
  const athTab = sportsOnly.view("following");
  assert.ok(athTab.includes("עוד אין ספורטאים או נבחרות במעקב. לחצו על ☆ בדף של ספורטאי/ת או נבחרת כדי לעקוב."));
  assert.ok(sportsOnly.view("following-sports").includes('class="qsum"'), "sports tab cards carry the quota summary");
  const none = (await boot({now: "2026-10-28T08:00:00Z"})).view("following");
  assert.ok(!none.includes("<h3>הצעות למעקב</h3>"), "suggestions heading is an h2");
  // History has only the snapshot's own entries before the last visit; the record itself changed after it.
  const data = withHistory("raz-hershko", [{at: "2026-10-01", kind: "start", text: "נכנסה למעקב"}]);
  // At the last visit she showed a different rank; a record whose shown fields didn't change gets no row.
  const raz = data.athletes.find(a => a.id === "raz-hershko");
  const shown = r => JSON.stringify({"raz-hershko": ["name", "event", "stage", "rank", "next", "nextDate"].map(k => k === "rank" ? r : String(raz[k] ?? "")).join("\u241f")});
  const quiet = await boot({data, follows: ["raz-hershko"], now: "2026-10-18T20:00:00Z", storage: {"la28.followingSeen": '"2026-10-12T00:00:00Z"', "la28.followingShown": shown(String(raz.rank ?? ""))}});
  quiet.view("home");
  assert.ok(quiet.els.followBadge.hidden && quiet.view("following").includes("(0)"), "updatedAt bump without a visible change: no row, no badge");
  const b = await boot({data, follows: ["raz-hershko"], now: "2026-10-18T20:00:00Z", storage: {"la28.followingSeen": '"2026-10-12T00:00:00Z"', "la28.followingShown": shown("2 בעולם")}});
  b.view("home");
  assert.strictEqual(b.els.followBadge.textContent, "1", "fallback row counts");
  const page = b.view("following");
  assert.ok(page.includes('<a href="#a-raz-hershko">רז הרשקו</a><small>הפרטים עודכנו</small>') && page.includes("18 באוק׳ 2026"), "dated by updatedAt");
});

test("followed first: sports page and chances panel put followed sports and athletes first", async () => {
  const firstSport = html => html.split('<ul class="sports">')[1]?.match(/href="#sport-([^"]+)"/)?.[1];
  const plain = await boot({now: "2026-10-29T08:00:00Z", quotas: REAL_QUOTAS});
  const base = firstSport(plain.view("sports"));
  const other = plain.run(`JSON.stringify(S.sports.filter(s => athletesOf(s.id).length).map(s => s.id))`);
  const target = JSON.parse(other).find(id => id !== base);
  const followed = await boot({now: "2026-10-29T08:00:00Z", quotas: REAL_QUOTAS, storage: {"la28.followSports": JSON.stringify([target])}});
  assert.strictEqual(firstSport(followed.view("sports")), target, "followed sport first on #sports");

  const closest = async storage => {
    const home = (await boot({now: "2026-10-18T08:00:00Z", quotas: REAL_QUOTAS, storage})).view("home");
    return rowsOf(home.split('class="rows closest"')[1]?.split("</ul>")[0] || "").map(r => r.match(/href="#sport-([^"]+)"/)?.[1]);
  };
  const order = await closest({});
  assert.ok(order.length > 1 && order[0] !== "judo" && order.includes("judo"), `fixture premise: ${order}`);
  assert.strictEqual((await closest({"la28.followSports": '["judo"]'}))[0], "judo", "followed sport first in the chances panel");
  assert.strictEqual((await closest({"la28.follows": '["raz-hershko"]'}))[0], "judo", "followed athlete's group first");
  const home = (await boot({now: "2026-10-18T08:00:00Z", quotas: REAL_QUOTAS})).view("home");
  assert.ok(home.includes("מקצים שבהם ישראל במרוץ למכסה. מה שבמעקב שלך מופיע ראשון, והשאר לפי מועד אירוע המכסה הבא."), "foot copy");
});

test("QA F1/F2: blocked storage says the follow wasn't saved; footer has its own \"אודות\" link", async () => {
  const MSG = "לא הצלחנו לשמור את המעקב: הדפדפן חוסם שמירת נתונים באתר הזה. השינוי יישאר רק עד שתסגרו או תרעננו את הדף.";
  const ok = await boot();
  ok.view("sport-judo");
  ok.fire("click", {closest: () => ({dataset: {followSport: "judo"}})});
  assert.ok(ok.els.visitorMsg?.hidden !== false && !ok.els.visitorMsgText?.textContent, "storage works: no message");

  const b = await boot();
  b.ctx.localStorage.setItem = () => { throw new Error("blocked"); };
  b.view("sport-judo");
  b.fire("click", {closest: () => ({dataset: {followSport: "judo"}})});
  assert.ok(b.els.visitorMsg.hidden === false && b.els.visitorMsgText.textContent.startsWith(MSG), "sport follow");
  assert.ok(b.view("sport-judo").includes('aria-pressed="true"'), "the follow still holds for this page");
  b.els.visitorMsg.hidden = true; b.els.visitorMsgText.textContent = "";
  b.run(`toggleFollow("raz-hershko")`);
  assert.ok(b.els.visitorMsg.hidden === false && b.els.visitorMsgText.textContent.startsWith(MSG), "athlete follow");

  const html = fs.readFileSync(path.join(ROOT, "site/index.html"), "utf8");
  const foot = html.split('<footer class="site-foot">')[1].split("</footer>")[0];
  assert.ok(foot.includes('<a class="foot-link" href="#about">אודות ואיך הנתונים נאספים</a>') && foot.split('href="#about"').length === 2, "one About link in the footer");
  assert.ok(!html.split("<footer")[0].includes('href="#about"'), "About is not in the nav");
  assert.ok(/\.site-foot \.foot-link\{[^}]*min-height:44px/.test(fs.readFileSync(path.join(ROOT, "site/styles.css"), "utf8")), "44px target");
});

// Competition page (docs/design/event-page.md §6). Rendered through viewEvent() until the router line lands (#152).
const AD = "judo-gs-abu-dhabi-2026", DOHA = "issf-wch-doha-2026";
const eventAt = async (id, now, opts = {}) => {
  const b = await boot({now, quotas: REAL_QUOTAS, ...opts});
  return {b, out: b.run(`viewEvent(${JSON.stringify(id)})`)};
};

// Abu Dhabi as the fallback cases need it: five entrants, all on 29.10, no sessions (so two empty days collapse).
const AD_FIVE = ["gefen-primo", "izhak-ashpiz", "raz-hershko", "timna-nelson-levy", "yonatan-elbaz"];
const adFallback = () => {
  const data = clone();
  data.sessions = [];
  for (const a of data.athletes) if (a.sportId === "judo" && a.nextDate >= "2026-10-29" && a.nextDate <= "2026-10-31") a.nextDate = "";
  for (const id of AD_FIVE) setAthlete(data, id, {nextDate: "2026-10-29"});
  return data;
};

test("#c- Abu Dhabi (fallback data): header, 3 days, athletes once each, quota items, unknown id", async () => {
  const {b, out} = await eventAt(AD, "2026-10-29T08:00:00Z", {data: adFallback()});
  assert.ok(out.includes('<h1 tabindex="-1">גרנד סלאם אבו דאבי</h1>') && out.includes('<a href="#sport-judo"><span aria-hidden="true">→</span>&nbsp;ג׳ודו</a>'));
  assert.ok(out.includes("מתקיימת עכשיו · יום 1 מתוך 3") && out.includes('<span class="pill open">העפלה</span>'));
  assert.strictEqual(out.split('class="sess-day"').length - 1, 1, "only the day with sessions");
  assert.ok(out.includes("ב־2 ימים נוספים בתחרות לא ידועות הופעות של ישראלים."), "empty days collapsed into one line");
  assert.ok(out.includes('<a class="hlink" href="#day-2026-10-29" aria-current="date">'), "today's group marked");
  const sched = out.split('id="evSchedH"')[1].split("</section>")[0];
  for (const id of ["gefen-primo", "izhak-ashpiz", "raz-hershko", "timna-nelson-levy", "yonatan-elbaz"])
    assert.strictEqual(sched.split(`href="#a-${id}"`).length - 1, 1, `${id} once in the schedule`);
  assert.ok(out.includes('<h2 id="evAthH">הישראלים בתחרות (5)</h2>') && out.includes("5 ספורטאים ונבחרות"), "athletes panel and kpi");
  assert.ok(/<p class="foot"><a href="https:\/\/[^"]+" target="_blank" rel="noopener">לוח הזמנים: <bdi>[^<]+<\/bdi>/.test(out), "schedule source, host in <bdi>");
  const stakes = out.split('id="evStakesH"')[1]?.split("</section>")[0] || "";
  assert.ok(stakes.includes("<bdi>78+ ק״ג נשים</bdi>") && stakes.includes('<a href="#sport-judo">לכל המכסות בענף</a>'), "judo quota items");
  assert.ok(out.includes(`value="https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT#c-${AD}"`) && out.includes('data-copy-msg="evShareMsg"'), "share box");
  assert.ok(b.run(`viewEvent("nope")`).includes(NOT_FOUND));
  assert.ok(b.view(`c-${AD}`).includes("גרנד סלאם אבו דאבי") && b.view("c-nope").includes(NOT_FOUND), "#c- route and unknown id");
});

test("#c- status by date, escaped results, earned items, series, Doha with no known Israelis and with a session", async () => {
  assert.ok((await eventAt(AD, "2026-10-20T08:00:00Z")).out.includes('<span class="pill s-before">מתחילה ב־29 באוק׳ 2026</span>'), "before");
  assert.ok((await eventAt(AD, "2026-11-05T08:00:00Z")).out.includes("הסתיימה · בהמתנה לתוצאות"), "after, awaiting");
  const data = JSON.parse(JSON.stringify(FIXTURE));
  // Her own day (the 31.10 session since the 19.10 export): the session takes the history result for that day.
  data.athletes.find(a => a.id === "raz-hershko").history = [{at: "2026-10-31", kind: "result", text: "<b>ארד</b>", source: "https://www.ijf.org/r"}];
  const res = (await eventAt(AD, "2026-11-01T08:00:00Z", {data})).out;
  assert.ok(res.includes("&lt;b&gt;ארד&lt;/b&gt;") && !res.includes("<b>ארד</b>"), "result escaped");
  assert.ok(res.includes("תוצאות: 1"), "kpi counts the result, label first");
  const athPanel = res.split('id="evAthH"')[1].split("</section>")[0];
  assert.ok(!athPanel.includes("ארד"), "no unsourced result line in the athletes panel");

  const q = JSON.parse(JSON.stringify(REAL_QUOTAS));
  const won = q.items.find(i => i.sportId === "judo" && i.nextQuotaEvent?.start === "2026-10-29");
  Object.assign(won, {israelStatus: "earned", stakes: "stake earned"});
  const earned = (await eventAt(AD, "2026-10-29T08:00:00Z", {quotas: q})).out.split('id="evStakesH"')[1].split("</section>")[0];
  assert.ok(earned.includes("pill q-earned") && !earned.includes("<b>מכסה הושגה</b>") && !earned.includes("stake earned"), "earned: the pill only, no stakes");

  const series = JSON.parse(JSON.stringify(FIXTURE));
  series.competitions.push({id: "long-series", sportId: "judo", name: "סדרה ארוכה", location: "", start: "2026-09-01", end: "2027-03-01", notes: "", source: "", qualifying: false});
  const longOut = (await eventAt("long-series", "2026-10-29T08:00:00Z", {data: series})).out;
  assert.ok(longOut.includes('<span class="pill ended">סדרה עונתית</span>') && longOut.includes('<span class="pill s-live">מתקיימת עכשיו</span>') && !longOut.includes("מתוך"), "series: no day X of Y");
  // Gil P2-1: a shared session; only Timna has a result.
  const shared = JSON.parse(JSON.stringify(FIXTURE));
  shared.sessions = [{competitionId: AD, date: "2026-10-29", athleteIds: ["timna-nelson-levy", "inbal-shemesh"], phase: "57- ק״ג"}];
  shared.athletes.find(a => a.id === "timna-nelson-levy").history = [{at: "2026-10-29", kind: "result", text: "ארד", source: "https://www.ijf.org/r"}];
  const sh = (await eventAt(AD, "2026-10-30T08:00:00Z", {data: shared})).out;
  assert.ok(sh.includes("תוצאות: 1") && !sh.includes("תוצאות: 2"), "results counted per athlete");
  const inbal = sh.split('id="evAthH"')[1].split("</section>")[0].split("<li>").find(x => x.includes('href="#a-inbal-shemesh"')) || "";
  assert.ok(inbal.includes("pill s-wait") && !inbal.includes("ארד"), "Inbal: her own chip, not Timna's result");

  // Doha with no known Israelis: one tracked shooter, no session, no nextDate inside it.
  const noIsraelis = setAthlete(clone(), "sergey-richter", {nextDate: ""});
  noIsraelis.sessions = [];
  noIsraelis.athletes = noIsraelis.athletes.filter(a => a.sportId !== "shooting" || a.id === "sergey-richter");
  const doha = (await eventAt(DOHA, "2026-11-02T08:00:00Z", {data: noIsraelis})).out;
  assert.ok(doha.includes("לא ידוע על ספורטאים או נבחרות מישראל בתחרות הזו.") && doha.includes("ספורטאי/ת או נבחרת אחת ברשימה בענף</a>") && !doha.includes('id="evAthH"'), "never claims they compete");
  assert.ok(doha.includes('id="evStakesH"') && doha.includes("ההופעות של הישראלים יפורסמו לפי לוח הזמנים הרשמי."), "Doha stakes, no sessions yet");
  const dohaItems = doha.split('id="evStakesH"')[1].split("</section>")[0].split("<li>").slice(1);
  for (const li of dohaItems) assert.ok(li.includes("q-in-contention") || !li.includes("מה זה אומר"), "stakes only for in-contention items");
  const withSess = {...JSON.parse(JSON.stringify(FIXTURE)), sessions: [{competitionId: DOHA, date: "2026-11-03", startUtc: "2026-11-03T06:30:00Z",
    athleteIds: ["sergey-richter"], phase: "מוקדמות רובה אוויר"}]};
  const s = (await eventAt(DOHA, "2026-11-02T08:00:00Z", {data: withSess})).out;
  assert.strictEqual(s.split('class="sess-day"').length - 1, 1, "Doha: only the day with a session");
  assert.ok(s.includes("ב־13 ימים נוספים בתחרות לא ידועות הופעות של ישראלים."), "13 empty days in one line");
  assert.ok(s.includes("08:30") && s.includes('href="#a-sergey-richter"') && s.includes("לפני התחרות"), "timed session (Israel time)");
});

// Athlete game log (#178; docs/design/athlete-game-log.md §5).
const GL_AD = "judo-gs-abu-dhabi-2026", GL_SRC = "https://www.ijf.org/r";
const glBase = () => JSON.parse(JSON.stringify(FIXTURE));
const glPanel = html => html.split('id="logH"')[1]?.split("</section>")[0] || "";
const glRows = html => glPanel(html).split("<li>").slice(1);
const glSess = (date, startUtc, phase, result, ids = ["raz-hershko"]) => ({competitionId: GL_AD, date, startUtc, athleteIds: ids, phase,
  result, resultSource: GL_SRC, resultAt: `${date}T18:00:00Z`});

test("game log: rows per competition, newest row first, entries oldest first, links, one shared source", async () => {
  const data = glBase();
  data.sessions = [glSess("2026-10-29", "2026-10-29T12:00:00Z", "גמר", "ארד"), glSess("2026-10-29", "2026-10-29T06:00:00Z", "מוקדמות", "עלתה")];
  data.athletes.find(a => a.id === "raz-hershko").history = [
    {at: "2026-02-06", kind: "result", text: "זהב", source: "https://www.ijf.org/p"},
    {at: "2026-01-02", kind: "start", text: "נכנסה למעקב"}];
  const out = (await boot({data, now: "2026-11-01T08:00:00Z"})).view("a-raz-hershko");
  const rows = glRows(out);
  assert.strictEqual(rows.length, 2, "2 rows");
  assert.ok(rows[0].includes(`<a href="#c-${GL_AD}">גרנד סלאם אבו דאבי</a>`), "newest row first, linked to #c-");
  assert.ok(rows[0].indexOf("מוקדמות") < rows[0].indexOf("גמר"), "entries oldest first");
  assert.strictEqual(rows[0].split("מקור: ijf.org").length - 1, 1, "a shared source is shown once");
  assert.ok(rows[0].includes('<time datetime="2026-10-29">29 באוק׳</time>'), "date without the current year");
  assert.ok(glPanel(out).includes("3 תוצאות בתחרות אחת") && glPanel(out).includes("כל תוצאה מופיעה עם המקור שלה · מתעדכן פעם ביום"),
    "a row with no known competition isn't counted as a competition (Gil P3)");
  // Gil P3: a range within one month names the month once.
  const range = glBase();
  range.sessions = [glSess("2026-10-29", null, "מוקדמות", "עלתה"), glSess("2026-10-31", null, "גמר", "ארד")];
  const r = glRows((await boot({data: range, now: "2026-11-01T08:00:00Z"})).view("a-raz-hershko"))[0];
  assert.ok(r.includes('<time datetime="2026-10-29">29</time>–<time datetime="2026-10-31">31 באוק׳</time>'), "29–31 באוק׳");
  const loose = glBase();
  loose.athletes.find(a => a.id === "raz-hershko").history = [{at: "2026-02-06", kind: "result", text: "זהב", source: GL_SRC}];
  const lp = glPanel((await boot({data: loose, now: "2026-11-01T08:00:00Z"})).view("a-raz-hershko"));
  assert.ok(lp.includes('<p class="kpi muted">תוצאה אחת</p>'), "no known competition: no competition count");
  const hist = out.split("<h2>היסטוריה</h2>")[1].split("</section>")[0];
  assert.ok(!hist.includes("זהב") && hist.includes("נכנסה למעקב"), "results leave the history timeline");
});

test("game log: dedupe, team vs merged text, dropped sources, no competition, escaping, empty", async () => {
  const data = glBase();
  data.sessions = [glSess("2026-10-29", null, "57- ק״ג", "ארד (מהסשן)"),
    glSess("2026-10-30", null, "קבוצתי", "ניצחון קבוצתי", ["raz-hershko", "yuli-alma-mishiner"])];
  data.athletes.find(a => a.id === "raz-hershko").history = [
    {at: "2026-10-29", kind: "result", text: "ארד (מההיסטוריה)", source: GL_SRC},
    {at: "2026-09-12", kind: "result", text: "<b>מקום 7</b>", source: "https://www.ijf.org/z"},
    {at: "2026-09-01", kind: "result", text: "בלי מקור", source: "http://x.example"}];
  data.athletes.find(a => a.id === "timna-nelson-levy").history = [{at: "2026-10-29", kind: "result", text: "כסף", source: GL_SRC}];
  data.athletes.find(a => a.id === "inbal-shemesh").nextDate = "2026-10-29";
  const b = await boot({data, now: "2026-11-01T08:00:00Z"});
  const raz = glPanel(b.view("a-raz-hershko"));
  assert.ok(raz.includes("ארד (מהסשן)") && !raz.includes("ארד (מההיסטוריה)"), "same day: once, the session wins");
  assert.ok(raz.includes("ניצחון קבוצתי") && glPanel(b.view("a-yuli-alma-mishiner")).includes("ניצחון קבוצתי"), "a team result is each member's");
  assert.ok(!raz.includes("בלי מקור"), "a history result without an https source isn't in the log");
  const razHist = b.view("a-raz-hershko").split("<h2>היסטוריה</h2>")[1].split("</section>")[0];
  assert.ok(razHist.includes("בלי מקור") && !razHist.includes("מקום 7"), "...it stays in the timeline; logged results leave it");
  assert.ok(raz.includes('<span class="muted">תחרות שאינה ברשימה</span>') && raz.includes("&lt;b&gt;מקום 7&lt;/b&gt;") && !raz.includes("<b>מקום 7"), "no competition; escaped");
  const inbal = glPanel(b.view("a-inbal-shemesh"));
  assert.ok(!inbal.includes("כסף") && inbal.includes("עוד לא תועדו תוצאות של ענבל שמש בתחרויות."), "a teammate's result never shows; empty state");
  for (const h of ["a-raz-hershko", "a-inbal-shemesh"]) assert.ok(!/חי\b|בזמן אמת/.test(glPanel(b.view(h))));
});

test("game log: a same-day history result dedupes only against her session in the same competition; no cap", async () => {
  const data = glBase();
  // Her session on 3.11 is at Doha; no judo competition runs that day, so her history result is a different one.
  data.sessions = [{competitionId: DOHA, date: "2026-11-03", startUtc: null, athleteIds: ["raz-hershko"], phase: "", result: "מהסשן",
    resultSource: GL_SRC, resultAt: "2026-11-03T18:00:00Z"}];
  data.athletes.find(a => a.id === "raz-hershko").history = [{at: "2026-11-03", kind: "result", text: "מההיסטוריה", source: GL_SRC},
    ...Array.from({length: 60}, (_, i) => ({at: `2025-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + Math.floor(i / 12)).padStart(2, "0")}`,
      kind: "result", text: `ישן ${i}`, source: GL_SRC}))];
  const {run} = await boot({data, now: "2026-11-05T08:00:00Z"});
  const log = run(`gameLog(athleteById("raz-hershko")).map(r => r.result)`);
  assert.ok(log.includes("מהסשן") && log.includes("מההיסטוריה"), "different competitions: both kept");
  assert.strictEqual(log.length, 62, "60 history results plus 2: nothing cut");
});

test("game log: two results added to one row by an auto-refresh show one change mark (Gil on #268)", async () => {
  const b = await boot({now: "2026-11-01T08:00:00Z"});
  const {ctx, run, els} = b;
  const next = glBase();
  next.generatedAt = "2099-01-01T00:00:00Z";
  next.sessions = [glSess("2026-10-29", "2026-10-29T06:00:00Z", "מוקדמות", "עלתה"), glSess("2026-10-29", "2026-10-29T12:00:00Z", "גמר", "ארד")];
  ctx.location.hash = "#a-raz-hershko"; run("navigate()");
  ctx.fetch = async () => ({ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(next))});
  await run("checkForUpdate()");
  const rows = glRows(els.view.innerHTML);
  assert.ok(rows[0].includes("עלתה") && rows[0].includes("ארד"), "both results in one row");
  assert.strictEqual(rows[0].split("השתנה ב־").length - 1, 1, "one mark per row");
  assert.ok(rows[0].lastIndexOf("השתנה ב־") > rows[0].indexOf("ארד"), "on the row's last line");
});

test("game log: 12 rows show 10 and a details with the rest's result count", async () => {
  const data = glBase();
  data.athletes.find(a => a.id === "raz-hershko").history = Array.from({length: 12}, (_, i) =>
    ({at: `2025-${String(i + 1).padStart(2, "0")}-15`, kind: "result", text: `תוצאה ${i}`, source: GL_SRC}));
  const panel = glPanel((await boot({data, now: "2026-11-01T08:00:00Z"})).view("a-raz-hershko"));
  const [visible, hidden] = panel.split("<details>");
  assert.strictEqual(visible.split("<li>").length - 1, 10, "10 rows visible");
  assert.ok(hidden.includes("<summary>הצגת עוד 2 תוצאות</summary>") && hidden.split("<li>").length - 1 === 2, "2 rows in details");
  assert.ok(visible.includes('<time datetime="2025-12-15">15 בדצמ׳ 2025</time>'), "the year when it isn't this year");
});

test("lookup indexes follow data replacement; athletesOf/quotasOf return copies", async () => {
  const {run} = await boot({quotas: QUOTAS});
  assert.strictEqual(run(`athleteById("raz-hershko").name`), "רז הרשקו");
  const n = run(`athletesOf("judo").length`);
  run(`athletesOf("judo").length = 0; quotasOf("judo").length = 0`);
  assert.strictEqual(run(`athletesOf("judo").length`), n, "a caller sorting or truncating its copy can't touch the index");
  assert.ok(run(`quotasOf("judo").length`) > 0);
  // A live snapshot replaces the arrays: the next lookup sees the new data.
  run(`S.athletes = S.athletes.map(a => a.id === "raz-hershko" ? {...a, sportId: "sailing", name: "שונה"} : a)`);
  assert.strictEqual(run(`athleteById("raz-hershko").name`), "שונה");
  assert.strictEqual(run(`athletesOf("judo").length`), n - 1);
  assert.ok(run(`athletesOf("sailing").some(a => a.id === "raz-hershko")`));
  run(`S.sports = S.sports.map(s => s.id === "judo" ? {...s, he: "ג׳ודו חדש"} : s)`);
  assert.strictEqual(run(`sportName("judo")`), "ג׳ודו חדש");
  run(`S.comps = []`);
  assert.strictEqual(run(`compOn("judo", "2026-10-29")`), null, "competition index follows S.comps");
});

test("entry points link to #c-<id>: calendar rows, home today, #day heading, athlete's next competition", async () => {
  const AD_LINK = '<a href="#c-judo-gs-abu-dhabi-2026">גרנד סלאם אבו דאבי</a>';
  const {view} = await boot({now: "2026-10-29T08:00:00Z"});
  const cal = view("calendar");
  assert.ok(cal.includes(`<a href="#sport-judo">ג׳ודו</a> · ${AD_LINK}`), "calendar: sport link kept, name links to the page");
  assert.ok(todayOf(view("home")).includes(AD_LINK), "home today hub (replaced the strip, #176)");
  assert.ok(view("day-2026-10-29").includes('<h3><a href="#c-judo-gs-abu-dhabi-2026" class="hlink">גרנד סלאם אבו דאבי</a>'), "#day heading, hlink");
  const q = (await boot({now: "2026-10-20T08:00:00Z", quotas: REAL_QUOTAS})).view("quotas").split('id="qNextH"')[1].split("</section>")[0];
  assert.ok(q.includes('<a href="#c-judo-gs-abu-dhabi-2026">'), "#quotas upcoming quota event links to its competition");
  const raz = view("a-raz-hershko").split("<dt>התחרות הבאה</dt>")[1].split("</dd>")[0];
  assert.ok(raz.startsWith(`<dd>${AD_LINK}`) && raz.split("גרנד סלאם").length === 2, "athlete: same text as the competition: one link, no repeat");
  const differ = JSON.parse(JSON.stringify(FIXTURE));
  differ.athletes.find(a => a.id === "raz-hershko").next = "GS <Abu Dhabi>";
  const d = (await boot({data: differ, now: "2026-10-29T08:00:00Z"})).view("a-raz-hershko").split("<dt>התחרות הבאה</dt>")[1].split("</dd>")[0];
  assert.ok(d.startsWith(`<dd>GS &lt;Abu Dhabi&gt; · ${AD_LINK}`), "text names something else: her text plain, the competition's name is the link");
  // Her text names the competition (with more words): her text is the link, the name isn't repeated.
  const longer = JSON.parse(JSON.stringify(FIXTURE));
  longer.athletes.find(a => a.id === "raz-hershko").next = "גרנד סלאם אבו דאבי (מעל 78)";
  const l = (await boot({data: longer, now: "2026-10-29T08:00:00Z"})).view("a-raz-hershko").split("<dt>התחרות הבאה</dt>")[1].split("</dd>")[0];
  assert.ok(l.startsWith('<dd><a href="#c-judo-gs-abu-dhabi-2026">גרנד סלאם אבו דאבי (מעל 78)</a>') && l.split("גרנד סלאם").length === 2, "matching text is the link");
  const data = JSON.parse(JSON.stringify(FIXTURE));
  Object.assign(data.athletes.find(a => a.id === "raz-hershko"), {next: "אימון", nextDate: "2026-09-01"});
  const none = (await boot({data, now: "2026-08-01T08:00:00Z"})).view("a-raz-hershko").split("<dt>התחרות הבאה</dt>")[1].split("</dd>")[0];
  assert.ok(!none.includes('href="#c-'), "no matching competition: no link");
});

test("#c-: arrival scrolls today's day into view once; the athletes panel points results to the schedule", async () => {
  const b = await boot({now: "2026-10-29T08:00:00Z"});
  b.run(`var __scrolls = []; document.querySelector = sel => sel.includes('aria-current="date"')
    ? {closest: () => ({scrollIntoView: o => __scrolls.push(o)})} : null`);
  const tick = () => new Promise(r => setTimeout(r, 5));
  b.view("c-judo-gs-abu-dhabi-2026"); await tick();
  assert.strictEqual(b.run("__scrolls.length"), 1, "arrival scrolls");
  b.view("c-judo-gs-abu-dhabi-2026"); await tick();
  assert.strictEqual(b.run("__scrolls.length"), 1, "a re-render of the same page does not");
  b.view("home"); b.view("c-judo-gs-abu-dhabi-2026"); await tick();
  assert.strictEqual(b.run("__scrolls.length"), 2, "coming back scrolls again");
  assert.strictEqual(b.run("__scrolls[0].block"), "start");
  b.ctx.scrollY = 300;
  b.view("home"); b.view("c-judo-gs-abu-dhabi-2026"); await tick();
  assert.strictEqual(b.run("__scrolls.length"), 2, "no scroll when the reader already scrolled");
  const css = fs.readFileSync(path.join(ROOT, "site/styles.css"), "utf8");
  assert.ok(/\.sess-day\{scroll-margin-top:64px\}/.test(css) && /max-width:640px\)\{\.sess-day\{scroll-margin-top:110px\}/.test(css), "clears the sticky nav");

  // Pinned: her day here is 31.10 (her exported session since the 19.10 fixture), with a result on that day.
  const data = JSON.parse(JSON.stringify(FIXTURE));
  Object.assign(data.athletes.find(a => a.id === "raz-hershko"), {nextDate: "2026-10-31",
    history: [{at: "2026-10-31", kind: "result", text: "ארד", source: "https://www.ijf.org/r"}]});
  const out = (await boot({data, now: "2026-11-01T08:00:00Z"})).run(`viewEvent("judo-gs-abu-dhabi-2026")`);
  const raz = out.split('id="evAthH"')[1].split("</section>")[0].split("<li>").find(x => x.includes('href="#a-raz-hershko"')) || "";
  assert.ok(raz.includes('<span class="muted">תוצאה בלוח הזמנים</span>') && !raz.includes("ארד"), "Gil nit: result points to the schedule");
});

test("UX v45: #c- athletes as compact rows with the chip inside; \"מתחרה היום\"; #following next-up chips", async () => {
  // Pinned: Raz competes on 31.10 (her exported session); the count is computed from the data (#234): athletes in
  // that day's sessions, plus judoka whose nextDate falls on it and who have no session in the competition.
  const DAY = "2026-10-31";
  const data = JSON.parse(JSON.stringify(FIXTURE));
  data.athletes.find(a => a.id === "raz-hershko").nextDate = DAY;
  const adSess = data.sessions.filter(x => x.competitionId === "judo-gs-abu-dhabi-2026");
  const inSess = new Set(adSess.flatMap(x => x.athleteIds)), onDay = new Set(adSess.filter(x => x.date === DAY).flatMap(x => x.athleteIds));
  data.athletes.filter(a => a.sportId === "judo" && a.nextDate === DAY && !inSess.has(a.id)).forEach(a => onDay.add(a.id));
  const competing = onDay.size;
  const {run} = await boot({data, now: DAY + "T08:00:00Z"});
  const out = run(`viewEvent("judo-gs-abu-dhabi-2026")`);
  const panel = out.split('id="evAthH"')[1].split("</section>")[0];
  assert.ok(panel.includes('<ul class="rows"><li><span class="d"></span>') && !panel.includes('class="card"'), "athleteRow(), not cards");
  const raz = panel.split("<li>").find(x => x.includes('href="#a-raz-hershko"'));
  assert.ok(raz.includes("<small><bdi>") && raz.includes('<span><span class="pill s-live">מתחרה היום</span></span></li>'), "name, event, chip in the row");
  assert.ok(out.includes(` · מתחרה היום: ${competing}`) && !out.includes("מתחרים היום"), "label-first count of those competing today (Shira)");
  const f = await boot({data, now: DAY + "T08:00:00Z", follows: ["raz-hershko"], storage: {"la28.followSports": '["judo"]'}});
  const next = f.view("following").split('id="nextH"')[1].split("</section>")[0];
  const razRow = next.split("<li>").find(x => x.includes('href="#a-raz-hershko"'));
  assert.ok(razRow.includes('<span class="d">') && razRow.includes("מתחרה היום"), "today's athlete: date column and chip");
  const doha = await boot({now: "2026-11-02T08:00:00Z", storage: {"la28.followSports": '["shooting"]'}});
  const dohaRow = doha.view("following").split('id="nextH"')[1].split("</section>")[0].split("<li>").find(x => x.includes("#c-issf-wch-doha-2026"));
  assert.ok(dohaRow && dohaRow.includes('<span class="pill s-live">מתקיימת עכשיו</span>'), "running competition: linked, s-live pill (Shira)");
});

test("components §6: athleteRow() and athleteCard() with a status inside", async () => {
  const {run} = await boot({follows: ["raz-hershko"]});
  const row = run(`athleteRow(S.athletes.find(a => a.id === "raz-hershko"), "<span>ST</span>")`);
  assert.ok(row.startsWith('<li><span class="d"></span><span class="t"><span class="star-on" aria-hidden="true">★</span><span class="sr">במעקב שלך, </span> <a href="#a-raz-hershko">'), "STAR for a followed athlete");
  assert.ok(row.endsWith("<span><span>ST</span></span></li>") && row.includes("<small><bdi>"), "event, then the status cell");
  const card = run(`athleteCard(S.athletes.find(a => a.id === "raz-hershko"), "<span>ST</span>")`);
  assert.ok(/<span class="ln"><span>ST<\/span><\/span>\s*<\/a>$/.test(card), "status is the card's last line");
});

test("#today (today-route.md): same page as today's #day with \"היום, \"; other dates unchanged; moves at midnight", async () => {
  const {view} = await boot({now: "2026-10-29T08:00:00Z"});
  const t = view("today");
  assert.ok(t.includes('<h1 tabindex="-1">היום, ') && t === view("day-2026-10-29") && t === view("day"), "#today = #day = #day-<today>");
  const y = view("day-2026-10-28");
  assert.ok(!y.includes("היום, ") && y.includes('<a href="#today">היום</a>'), "another date: no prefix, a link back to today");
  // 23:59 and 00:01 Israel time (UTC+2 after 25.10).
  const late = (await boot({now: "2026-10-29T21:59:00Z"})).view("today"), early = (await boot({now: "2026-10-29T22:01:00Z"})).view("today");
  assert.ok(late.includes("29 באוק׳") && early.includes("30 באוק׳"), "#today follows Israel's date");
  assert.ok((await boot({now: "2026-10-29T22:01:00Z"})).view("day-2026-10-29").includes("29 באוק׳"), "#day-<date> stays on its date");
});

// UX S3: on home and #following, every competition mention that compOn() resolves links to #c-<id>.
test("S3: every resolvable competition on home and #following renders as a[href^=\"#c-\"]", async () => {
  for (const now of ["2026-10-18T08:00:00Z", "2026-10-26T08:00:00Z"]) {
    const follows = FIXTURE.athletes.filter(a => a.nextDate).slice(0, 6).map(a => a.id);
    const b = await boot({now, quotas: SITE_QUOTAS, follows, storage: {"la28.followSports": '["judo","sailing"]', "la28.followingSeen": '"2026-10-01T00:00:00Z"'}});
    const home = b.view("home"), following = b.view("following");
    const ids = expr => JSON.parse(b.run(`JSON.stringify([...new Set((${expr}).filter(Boolean).map(c => c.id))])`));
    // The "השבוע" rows (at most WEEK_COMPS competitions each), the closest-chances groups, and #following's next-up
    // rows (athletes and followed sports).
    const homeIds = ids(`Array.from({length: WEEK_DAYS}, (_, i) => addDays(today(), i + 1))
      .flatMap(d => [...new Map(daySessions(d).sort(sessionOrder).map(s => [s.comp ? s.comp.id : s.sportId, s.comp])).values()].slice(0, WEEK_COMPS))
      .concat(closestGroups(todayRows(), today()).map(g => compOn(g.sportId, g.start)))`);
    // The rows #following actually shows: a competition row, or an athlete row whose nextDate falls in one.
    const followIds = ids(`followUpcoming().map(x => x.k.startsWith("up|c|") ? S.comps.find(c => c.id === x.k.slice(5))
      : (a => a.next && compOn(a.sportId, a.nextDate))(S.athletes.find(a => a.id === x.k.slice(5))))`);
    assert.ok(homeIds.length && followIds.length, `${now}: the check has something to check`);
    for (const id of homeIds) assert.ok(home.includes(`href="#c-${id}"`), `${now}: home links ${id}`);
    const nextUp = following.split('id="nextH"')[1]?.split("</section>")[0] || "";
    for (const id of followIds) assert.ok(nextUp.includes(`href="#c-${id}"`), `${now}: #following links ${id}`);
  }
});

test("fetch failure shows the retry view", async () => {
  const {view} = await boot({fetchFails: true});
  const out = view("home");
  assert.ok(out.includes("data-retry"));
  assert.ok(out.includes('role="alert"') && out.includes("<h1 tabindex=\"-1\">לא הצלחנו לטעון את הנתונים</h1>"), "announced, with a heading");
});

// Gil's launch blocker: a visitor the artifact isn't open to, or a host that never answers, gets a clear message.
test("data.json not available: access, timeout and error each end in a Hebrew message with a retry, never the skeleton", async () => {
  const h1 = out => (out.match(/<h1 tabindex="-1">([^<]*)<\/h1>/) || [])[1];
  for (const [label, impl] of [
    ["403", async () => ({ok: false, status: 403, json: async () => ({})})],
    ["401", async () => ({ok: false, status: 401, json: async () => ({})})],
    ["a sign-in page where JSON should be", async () => ({ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token <"); }})],
    ["JSON that isn't the export", async () => ({ok: true, status: 200, json: async () => ({error: "forbidden"})})],
  ]) {
    const out = (await boot({fetchImpl: impl})).view("home");
    assert.strictEqual(h1(out), "האתר לא זמין עבורך כרגע", label);
    assert.ok(!out.includes("תקלה זמנית"), `${label}: not worded as a temporary fault`);
    assert.ok(out.includes('role="alert"') && out.includes("data-retry") && out.includes('<span dir="ltr">il2la28.site@gmail.com</span>')
      && !out.includes("skeleton"), `${label}: alert, retry, contact address`);
  }
  assert.strictEqual(h1((await boot({fetchImpl: async () => ({ok: false, status: 500, json: async () => ({})})})).view("home")), "לא הצלחנו לטעון את הנתונים");
  // A host that never answers: the skeleton until the deadline, then the timeout message. The deadline is made instant
  // for the retry, so the test doesn't wait 15 s.
  const hang = await boot({fetchImpl: () => new Promise(() => {})});
  assert.ok(hang.view("home").includes('class="skeleton"'), "still loading before the deadline");
  const ms = hang.run("LOAD_TIMEOUT_MS"), real = hang.ctx.setTimeout;
  hang.ctx.setTimeout = (f, t, ...a) => t === ms ? real(f, 0, ...a) : real(f, t, ...a);
  hang.run("S.failed = false; loadPublic()");
  await new Promise(r => setTimeout(r, 20));
  assert.strictEqual(h1(hang.view("home")), "הטעינה נמשכת יותר מדי");
  // A late answer still renders the site in place of the timeout alert, without a retry (Gil on #304).
  let answer;
  const late = await boot({fetchImpl: async url => url === "data.json" ? new Promise(r => { answer = r; })
    : ({ok: false, status: 404, json: async () => { throw new Error("404"); }})});
  const ms2 = late.run("LOAD_TIMEOUT_MS"), real2 = late.ctx.setTimeout;
  late.ctx.setTimeout = (f, t, ...a) => t === ms2 ? real2(f, 0, ...a) : real2(f, t, ...a);
  late.run("S.failed = false; loadPublic()");
  await new Promise(r => setTimeout(r, 20));
  assert.strictEqual(h1(late.view("home")), "הטעינה נמשכת יותר מדי", "the alert first");
  answer({ok: true, status: 200, json: async () => clone()});
  await new Promise(r => setTimeout(r, 20));
  const after = late.view("home");
  assert.ok(after.includes('id="todayH"') && !after.includes('role="alert"') && late.run("S.failed") === false, "then the site, with no retry");
  // Quotas that never answer don't hold the page: it renders and quota panels end in their error state.
  const slowQ = await boot({fetchImpl: async url => url === "quotas.json" ? new Promise(() => {}) : ({ok: true, status: 200, json: async () => clone()})});
  assert.ok(slowQ.view("home").includes('id="todayH"'), "the page renders without quotas.json");
});

// Omer on #301: per-athlete "מה התעדכן" lines next to the same athlete's logged result (digest-2026-10-25.md scenario).
test("digest: a change line repeating a logged result is skipped, with or without athleteId", async () => {
  const build = withIds => {
    const d = clone(), A = id => d.athletes.find(a => a.id === id);
    const res = (id, at, text) => { A(id).history = [...(A(id).history || []), {at, kind: "result", text, source: "https://www.gymnastics.sport/r"}]; };
    res("shachar-sagiv", "2026-10-24", "מקום 12 בגביע העולם בטריאתלון טונגיונג (ספרינט, 24 באוק׳ 2026)");
    res("artem-dolgopyat", "2026-10-24", "מקום 2 בגמר הקרקע");
    const ch = (at, text, athleteId) => ({at, text, ...(withIds && athleteId ? {athleteId} : {})});
    d.changes = [ch("2026-10-25", "טריאתלון: שחר שגיב סיים במקום 12 בגביע העולם בטונגיונג", "shachar-sagiv"),
      ch("2026-10-24", "התעמלות מכשירים: ארטיום דולגופיאט זכה בכסף בגמר הקרקע באליפות העולם", "artem-dolgopyat"),
      ch("2026-10-20", "התעמלות מכשירים: נבחרת הגברים סיימה במקום 20 במוקדמות ולא עלתה לגמר הקבוצתי"),
      ch("2026-10-21", "התעמלות מכשירים: ארטיום דולגופיאט עלה לגמר הקרקע", "artem-dolgopyat"), ...d.changes];
    return d;
  };
  for (const withIds of [true, false]) {
    const b = await boot({data: build(withIds)}), label = withIds ? "with athleteId" : "without athleteId";
    const results = t => b.run(`digestText("${t}")`).split("*תוצאות השבוע*")[1].split("*ישראלים")[0];
    const r25 = results("2026-10-25");
    assert.strictEqual(count(r25, "שחר שגיב: מקום 12"), 1, `25.10 ${label}: Sagiv's result`);
    assert.ok(!r25.includes("שחר שגיב סיים במקום 12"), `25.10 ${label}: his change line (the morning after) is skipped`);
    const r1 = results("2026-11-01");
    assert.ok(r1.includes("ארטיום דולגופיאט: מקום 2 בגמר הקרקע") && !r1.includes("זכה בכסף בגמר הקרקע"), `1.11 ${label}: the same-day line is skipped`);
    assert.ok(r1.includes("נבחרת הגברים סיימה במקום 20"), `1.11 ${label}: a team line stays`);
    // Without athleteId, a line naming him on another day isn't his result; with it, any line about him goes (as before).
    assert.strictEqual(r1.includes("ארטיום דולגופיאט עלה לגמר הקרקע"), !withIds, `1.11 ${label}: the qualification line`);
  }
});

test("auto-refresh ignores JSON that isn't the export: the site stays as it was", async () => {
  const {ctx, run, view} = await boot({now: "2026-10-29T08:00:00Z"});
  const before = view("home");
  for (const body of [{error: "forbidden"}, {athletes: []}, {generatedAt: "2099-01-01T00:00:00Z"}]) {
    ctx.fetch = async url => ({ok: true, status: 200, json: async () => url === "quotas.json" ? {items: []} : body});
    await run("checkForUpdate()");
    assert.strictEqual(run("S.athletes.length"), FIXTURE.athletes.length, JSON.stringify(body));
  }
  assert.ok(view("home").includes('id="todayH"') && before.length > 0);
});

test("no db or user capability: an editor's failed setup leaves the public site, never a skeleton", async () => {
  const fails = {use: async () => { throw new Error("capability not granted"); }};
  const noDb = {use: async cap => cap === "user" ? {canEdit: async () => true, id: async () => "u1"} : (() => { throw new Error("no db"); })()};
  for (const claude of [fails, noDb, {}]) {
    const b = await boot({claude});
    const out = b.view("home");
    assert.ok(out.includes('id="todayH"') && !out.includes("skeleton") && b.run("S.isAdmin") === false && b.run("S.live") === false);
  }
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

test("#admin last-run panel: changes and checked sources from run_log.py, escaped and https only", async () => {
  const sources = [{source: "https://www.ijf.org/wrl", checkedAt: "2026-10-19T04:20:00Z", sportId: "judo"},
    {source: "javascript:alert(1)", checkedAt: "2026-10-19T04:21:00Z"},
    ...Array.from({length: 9}, (_, i) => ({source: `https://example.org/s${i}`, checkedAt: "2026-10-19T04:22:00Z"}))];
  const runs = [{id: "2026-10-19", status: "done", started: "2026-10-19T04:13:05Z", ended: "2026-10-19T04:41:00Z",
    published: true, changes: ["ג׳ודו: רז הרשקו <b>ראשונה</b>"], sources}, {id: "2026-10-18", status: "done",
    started: "2026-10-18T04:13:00Z", published: true, changes: ["א", "ב"]}];
  const {run, view} = await boot({now: "2026-10-19T08:00:00Z"});
  run(`S.isAdmin = true; S.live = true; S.db = {collection: () => ({orderBy: () => ({limit: () => ({
    onSnapshot: ok => ok({docs: ${JSON.stringify(runs)}.map(r => ({id: r.id, data: () => r}))})})})})}`);
  const out = view("admin");
  const ch = out.split('id="runChanges"')[1].split("</dd>")[0], src = out.split('id="runSources"')[1].split("</dd>")[0];
  assert.ok(ch.includes("&lt;b&gt;ראשונה") && !ch.includes("<b>"), "changes escaped");
  assert.ok(src.includes('href="https://www.ijf.org/wrl"') && src.includes("ג׳ודו"), "source link + sport");
  assert.ok(!src.includes("javascript:"), "non-https source dropped");
  assert.strictEqual((src.match(/<a /g) || []).length, 8, "at most 8 listed");
  assert.ok(src.includes("ועוד 2"), "the rest counted");
  assert.ok(out.includes("<th scope=\"col\">שינויים</th>") && /<td>2<\/td><\/tr>/.test(out), "changes column in the table");

  const old = await boot({now: "2026-10-19T08:00:00Z"});
  old.run(`S.isAdmin = true; S.live = true; S.db = {collection: () => ({orderBy: () => ({limit: () => ({
    onSnapshot: ok => ok({docs: [{id: "2026-10-19", data: () => ({status: "done", started: "2026-10-19T04:13:00Z", published: true})}]})})})})}`);
  const o = old.view("admin");
  assert.ok(o.split('id="runChanges"')[1].startsWith(">אין") && o.split('id="runSources"')[1].startsWith(">לא תועדו"),
    "runs written before run_log.py still render");
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
  assert.strictEqual(num("בלי בדיקה ידנית"), String(data.athletes.filter(x => !x.verifiedAt).length));
  assert.strictEqual(num("תאריך התחרות הבאה עבר"), String(data.athletes.filter(x => /^\d{4}-\d\d-\d\d$/.test(x.nextDate || "") && x.nextDate < "2026-10-18").length));
  for (const href of ["#home", "#admin-nosource", "#admin-noverified", "#admin-pastnext"]) assert.ok(panel.includes(`href="${href}"`), href);
  const list = view("admin-nosource");
  assert.ok(list.includes(`href="#a-${a.id}"`) && !list.includes(`href="#a-${c.id}"`), "list rows link to the athlete page");
  assert.ok(view("admin-pastnext").includes(`href="#a-${b.id}"`));

  const plain = await boot({quotas: QUOTAS});
  plain.run(`S.isAdmin = true; S.live = true`);
  assert.ok(plain.view("admin").split('id="launch"')[1].includes("לא ידוע"), "no count in quotas.json → unknown, not 0");
});

// Sprint 7 item 3 (readiness-2210.md §1–§3 on one screen): each row's number and its link.
test("#admin readiness: verified X/N, starts without a session, M3 per result night (incl. > 24 h), last 2 runs", async () => {
  const data = clone();
  const AG = "ag-worlds-2026", sess = (date, startUtc, id, extra = {}) => ({competitionId: AG, date, startUtc, athleteIds: [id], phase: "שלב", ...extra});
  const ok = (resultAt) => ({result: "מקום 8", resultSource: "https://www.gymnastics.sport/r", resultAt});
  data.sessions = [
    sess("2026-10-19", "2026-10-19T14:00:00Z", "yali-shoshani", ok("2026-10-20T19:30:00Z")),   // end 17:00Z → 26.5 h: late
    sess("2026-10-19", "2026-10-19T19:10:00Z", "lihie-raz"),                                    // no result, 34 h since its end
    sess("2026-10-20", null, "roni-shamay", ok("2026-10-20T22:00:00Z")),                         // untimed: end of day (21:00Z) → 1 h
    sess("2026-10-24", "2026-10-24T09:00:00Z", "artem-dolgopyat"),                               // his start has a session
  ];
  const NOW = "2026-10-21T08:00:00Z", t = "2026-10-21", end = "2026-11-04";
  const runs = docs => `S.isAdmin = true; S.live = true; S.db = {collection: () => ({orderBy: () => ({limit: () => ({
    onSnapshot: ok => ok({docs: ${JSON.stringify(docs)}.map(d => ({id: d.id, data: () => d}))})})})})}`;
  const b = await boot({data, quotas: QUOTAS, now: NOW});
  b.run(runs([{id: "2026-10-21", status: "done", started: "2026-10-21T04:13:00Z", published: true, errors: []},
    {id: "2026-10-20", status: "failed", started: "2026-10-20T04:13:00Z", published: false, errors: ["export refused: athletes shrank"]}]));
  b.view("admin");   // subscribes to runs
  const panel = b.view("admin").split('id="launch"')[1].split("</section>")[0];
  const part = (from, to) => panel.split(from)[1].split(to)[0];
  const rowsOf = html => html.split("<li>").slice(1);
  const num = row => row.split('digits')[1].split(">")[1].split("<")[0];

  // §1: verified X/N, with the rest's list; starts in the next 14 days without a session.
  const cov = rowsOf(part('id="readyData"', 'id="readyNights"'));
  const V = JSON.parse(b.run(`JSON.stringify(S.athletes.filter(a => trustOf(a) === "ok").length)`)), N = data.athletes.length;
  assert.strictEqual(num(cov[0]), `${V}/${N}`, "verified X/N");
  assert.ok(cov[0].includes(`${Math.floor(100 * V / N)}%`) && cov[0].includes('href="#admin-unverified"'));
  const withSession = new Set(data.sessions.map(x => `${x.athleteIds[0]}|${x.date}`));
  const missing = data.athletes.filter(a => a.nextDate >= t && a.nextDate <= end && !withSession.has(`${a.id}|${a.nextDate}`));
  assert.strictEqual(num(cov[1]), String(missing.length), "starts without a session");
  assert.ok(cov[1].includes('href="#admin-nosession"'));
  const list = b.view("admin-nosession");
  assert.ok(missing.every(a => list.includes(`href="#a-${a.id}"`)) && !list.includes('href="#a-artem-dolgopyat"'), "the list, minus starts with a session");

  // §2: one row per night, newest first; 19.10 is over 24 h both ways (a late result and a missing one).
  const nights = rowsOf(part('id="readyNights"', 'id="readyRuns"'));
  assert.strictEqual(nights.length, 2);
  assert.ok(nights[0].includes('href="#day-2026-10-20"') && num(nights[0]) === "1 ש׳" && nights[0].includes("1 מתוך 1 תוצאות באתר")
    && nights[0].includes('<span class="pill open">עד 24 שעות</span>'), "20.10: within 24 h (untimed ends at the end of the day)");
  assert.ok(nights[1].includes('href="#day-2026-10-19"') && num(nights[1]) === "27 ש׳" && nights[1].includes("1 מתוך 2 תוצאות באתר")
    && nights[1].includes("1 עדיין בלי תוצאה, 1 מהן יותר מ־24 שעות") && nights[1].includes('<span class="pill bad">מעל 24 שעות</span>'), "19.10: > 24 h");

  // §3: the last 2 runs, each with published and errors, linking the runs log.
  const runRows = rowsOf(panel.split('id="readyRuns"')[1]).slice(1);   // [0] is the 26 h health row (its own test)
  assert.ok(runRows[0].includes("ריצה 21 באוק׳ 2026: פורסמה") && runRows[0].includes("אין שגיאות") && num(runRows[0]) === "0");
  assert.ok(runRows[1].includes("לא פורסמה") && runRows[1].includes("שגיאה אחת") && num(runRows[1]) === "1");
  assert.ok(runRows.every(r => r.includes('href="#admin-runs"')) && b.view("admin-runs").includes("<h1 tabindex=\"-1\">יומן הריצות היומיות</h1>"));
  assert.ok(panel.includes("נושאים פתוחים"));

  // No runs recorded (runs/ empty): one open row says so.
  const none = await boot({data, quotas: QUOTAS, now: NOW});
  none.run(runs([]));
  none.view("admin");
  assert.ok(none.view("admin").split('id="readyRuns"')[1].includes("אין ריצות יומיות מתועדות"));
});

// Sprint 8 item 11: no run published in 26 h → a red row with the last run and "Run now", counted in readiness.
test("#admin daily-task health: fresh, stale and empty run logs", async () => {
  const at = async (docs) => {
    const b = await boot({quotas: QUOTAS, now: "2026-10-21T08:00:00Z"});
    b.run(`S.isAdmin = true; S.live = true; S.db = {collection: () => ({orderBy: () => ({limit: () => ({
      onSnapshot: ok => ok({docs: ${JSON.stringify(docs)}.map(d => ({id: d.id, data: () => d}))})})})})}`);
    b.view("admin");
    const panel = b.view("admin").split('id="launch"')[1].split("</section>")[0];
    return {row: panel.split('id="readyRuns"')[1].split("<li>")[1], panel};
  };
  const run = (id, started, published, extra = {}) => ({id, status: published ? "done" : "failed", started, ended: started.replace("04:13", "04:40"), published, ...extra});
  const fresh = await at([run("2026-10-21", "2026-10-21T04:13:00Z", true), run("2026-10-20", "2026-10-20T04:13:00Z", true)]);
  assert.ok(fresh.row.includes("פרסום אחרון של הריצה היומית") && fresh.row.includes("3 ש׳") && !fresh.row.includes("adm-bad") && !fresh.row.includes("Run now"), "fresh: no red row");
  // Stale: today's run failed, the last publish was 27 h ago.
  const stale = await at([run("2026-10-21", "2026-10-21T04:13:00Z", false), run("2026-10-20", "2026-10-20T04:13:00Z", true)]);
  assert.ok(stale.row.includes("לא פורסמה ריצה יומית ב־26 השעות האחרונות") && stale.row.includes("adm-bad") && stale.row.includes("27 ש׳")
    && stale.row.includes("הריצה האחרונה:") && stale.row.includes("נכשלה") && stale.row.includes("(Run now)") && stale.row.includes('<span class="pill bad">'), "stale: red, last run, the fix");
  const empty = await at([]);
  assert.ok(empty.row.includes("לא פורסמה ריצה יומית") && empty.row.includes("אין ריצות מתועדות") && empty.row.includes("(Run now)"), "empty: red row");
  const opens = p => Number((p.match(/(\d+) נושאים פתוחים/) || [])[1] || (p.includes("נושא פתוח אחד") ? 1 : 0));
  assert.strictEqual(opens(stale.panel), opens(fresh.panel) + 2, "readiness counts the red row (plus the failed run's own row)");
});

test("#admin result night: picks quota events ending today/yesterday, links the runbook, keeps ticks", async () => {
  const SITE_QUOTAS = QUOTAS_SNAPSHOT;
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
  assert.ok(panel.includes("0 מתוך 9 שלבים"));
  const key = JSON.parse(b.run(`JSON.stringify(rnKey(S.quotas.find(q => q.event === "קבוצתי גברים")))`));
  b.fire("change", {checked: true, dataset: {rn: key, step: "0"}});
  b.fire("change", {checked: true, dataset: {rn: key, step: "3"}});
  b.fire("change", {checked: false, dataset: {rn: key, step: "0"}});
  const again = panelOf(b.view("admin"));
  assert.ok(again.includes("1 מתוך 9 שלבים") && /data-step="3" checked/.test(again) && !/data-step="0" checked/.test(again), "ticks persist per browser");

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
  assert.ok(panel.includes("ישן מ־14 יום") && out.includes('class="panel adm-alert" id="quotaHealth"'), "17-day-old file flagged");
  assert.ok(flag("awaiting").includes("עבר&lt;b&gt;") && !flag("awaiting").includes("עבר<b>"), "ended event listed and escaped");
  assert.ok(flag("awaiting").includes('href="#sport-judo"') && flag("awaiting").includes("אתמול"));
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
  const quotas = {updatedAt: "2026-10-20", items: [
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
  const past = day2.view("admin").split('data-flag="awaiting"')[1]?.split("</div>")[0] || "";
  assert.ok(past.includes("עבר") && !past.includes("גרנד-סלאם") && !past.includes("עם-סוף"), "running events not flagged as past");

  const after = await at("2026-11-01T08:00:00Z");
  assert.ok(!after.view("sport-judo").includes("מה זה אומר"), "gone after the competition ends");
  assert.ok((after.view("admin").split('data-flag="awaiting"')[1] || "").split("</div>")[0].includes("גרנד-סלאם"));
});

test("#admin re-check flags: awaiting within 14 days, overdue after, none once re-checked", async () => {
  // Abu Dhabi Grand Slam ends 31 Oct (fixture competition); the item was last checked before it.
  const item = checkedAt => ({...QUOTAS.items[0], event: "60- ק״ג", israelStatus: "in-contention",
    nextQuotaEvent: {name: "גרנד סלאם אבו דאבי", start: "2026-10-29"}, ...(checkedAt ? {checkedAt} : {})});
  const at = async (now, checkedAt, updatedAt = "2026-10-25") => {
    const b = await boot({quotas: {updatedAt, items: [item(checkedAt)]}, now});
    b.run("S.isAdmin = true; S.live = true");
    const out = b.view("admin");
    const flag = k => out.split(`data-flag="${k}"`)[1]?.split("</div>")[0] || "";
    return {out, flag, panelOpen: out.slice(0, out.indexOf('id="quotaHealth"')).split("<section").pop()};
  };
  const tileOf = out => out.split("אירועי מכסה שלא נבדקו מחדש")[0].split("<a ").pop();

  const a = await at("2026-11-03T08:00:00Z", "2026-10-25");
  assert.ok(a.flag("awaiting").includes("60- ק״ג") && !a.out.includes('data-flag="overdue"'), "awaiting");
  assert.ok(a.flag("awaiting").includes("לפני 3 ימים") && a.flag("awaiting").includes("בדיקה ידנית אחרונה") && a.flag("awaiting").includes("q-in-contention"));
  assert.ok(a.flag("awaiting").includes("build_quotas.py"), "fix hint");
  assert.ok(!a.panelOpen.includes("adm-alert"), "awaiting alone is a reminder");
  assert.ok(/digits">1</.test(tileOf(a.out)) && !tileOf(a.out).includes("hot"), "tile counts it, not hot");

  const o = await at("2026-11-15T08:00:00Z", "2026-10-25", "2026-11-10");   // 15 days after 31 Oct; fresh file, stale item
  assert.ok(o.flag("overdue").includes("60- ק״ג") && !o.out.includes('data-flag="awaiting"'), "overdue");
  assert.ok(o.panelOpen.includes("adm-alert") && tileOf(o.out).includes("hot"));

  const c = await at("2026-11-15T08:00:00Z", "2026-11-02");   // re-checked after the event
  assert.ok(!c.out.includes('data-flag="overdue"') && !c.out.includes('data-flag="awaiting"'), "re-checked items are not flagged");
  const pub = await boot({quotas: {updatedAt: "2026-10-25", items: [item("2026-11-02")]}, now: "2026-11-03T08:00:00Z"});
  assert.strictEqual(pub.run(`awaitingOf(S.quotas[0])`), null, "public 'awaiting results' uses the item's checkedAt, not the older file date");
  const old = await boot({quotas: {updatedAt: "2026-10-25", items: [item()]}, now: "2026-11-03T08:00:00Z"});
  assert.ok(old.run(`awaitingOf(S.quotas[0])`), "without checkedAt it falls back to the file date");
  const f = await at("2026-11-03T08:00:00Z");                  // no checkedAt: falls back to the file date (25 Oct)
  assert.ok(f.flag("awaiting").includes("60- ק״ג"));
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
  assert.ok(sports.includes('href="#quotas"') && unhide(sports).includes("✓ 1 הושגה"));
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
  assert.match(cal, /<h2>[^<]+ <span>\d+<span class="sr"> תחרו(?:ת|יות)<\/span><\/span><\/h2>/, "month count is labelled for screen readers");
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
const REAL_QUOTAS = QUOTAS_SNAPSHOT;
const DIGEST_NOW = "2026-10-18T09:00:00Z";
const digestOf = async opts => { const b = await boot({now: DIGEST_NOW, quotas: REAL_QUOTAS, ...opts}); return {...b, text: b.run("digestText()")}; };
const boldLines = text => text.split("\n").filter(l => l.includes("*"));

test("#digest: page, entry points and the week's text", async () => {
  // Someone competing in the digest week on a day with no listed competition (those are grouped per event).
  const data = setAthlete(clone(), "maru-teferi", {nextDate: "2026-10-21", next: "מרוץ כביש"});
  const {view, text} = await digestOf({data});
  const page = view("digest");
  assert.ok(page.includes('<h1 tabindex="-1">תקציר שבועי</h1>') && page.includes("<textarea id=\"digestText\" readonly"));
  assert.ok(page.includes('data-copy="digestText" data-copy-msg="digestMsg"'));
  assert.ok(view("home").includes('href="#digest"') && view("updates").includes('href="#digest"'), "entry points");
  const lines = text.split("\n");
  assert.strictEqual(lines[0], "*הדרך ללוס אנג׳לס 28 · תקציר שבועי*");
  assert.deepStrictEqual(boldLines(text).slice(1), ["*תוצאות השבוע*", "*מה התעדכן*", "*ישראלים מתחרים השבוע*", "*אירועי מכסה בשבועיים הקרובים*"]);
  assert.ok(text.includes("מתן רודיטי פרש"), "this week's change");
  const competing = text.split("*ישראלים מתחרים השבוע*")[1].split("\n\n")[0];
  assert.match(competing, /• 21 באוק׳ · .+ \(אתלטיקה\): מרוץ כביש/, competing);
  assert.ok(!competing.includes("רז הרשקו"), "29 Oct is outside the 7-day window");
  assert.ok(text.includes("גרנד סלאם אבו דאבי"), "quota event inside 14 days");
  assert.ok(lines.at(-2).startsWith("לכל הפרטים: https://claude.ai/artifact/") && lines.at(-1).startsWith("אתר לא רשמי"));
  assert.ok(page.includes(text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")), "textarea holds the text");
});

const digestSection = (text, title) => (text.split(`*${title}*\n`)[1] || "").split("\n\n")[0];

test("#digest: results logged in athlete history count, even after nextDate moved on", async () => {
  // Results-assist (tri_results.py) writes history, not meta/status changes, and the athlete's next event moves on.
  const data = JSON.parse(JSON.stringify(FIXTURE));
  data.competitions.push({id: "tri-tongyeong-2026", sportId: "triathlon", name: "גביע העולם בטריאתלון טונגיונג",
    location: "טונגיונג", start: "2026-10-24", end: "2026-10-24", qualifying: true});
  Object.assign(data.athletes.find(a => a.id === "shachar-sagiv"), {nextDate: "2026-11-13", history: [
    {at: "2026-10-24", kind: "result", text: "מקום 7 בגביע העולם בטריאתלון טונגיונג (ספרינט, 2026-10-24)"},
    {at: "2026-09-01", kind: "result", text: "תוצאה ישנה"}]});
  data.changes.unshift({at: "2026-10-24", text: "טריאתלון: שחר שגיב במקום 7 בטונגיונג.", athleteId: "shachar-sagiv"});
  const {text} = await digestOf({data, now: "2026-10-25T09:00:00Z"});
  const results = digestSection(text, "תוצאות השבוע");
  const tri = results.split("\n• ").find(b => b.includes("טונגיונג"));
  assert.ok(tri && tri.includes("  ישראלים: שחר שגיב") && tri.includes("  – שחר שגיב: מקום 7 בגביע העולם"), results);
  assert.ok(!tri.includes("תוצאה ישנה") && !tri.includes("התוצאות עוד לא עודכנו"), tri);
  assert.ok(!tri.includes("במקום 7 בטונגיונג") && !text.includes("במקום 7 בטונגיונג"), "an editor's change about a logged result isn't repeated anywhere");
});

test("#digest: this week's results group ended competitions with their changes", async () => {
  const empty = digestSection((await digestOf()).text, "תוצאות השבוע");
  assert.strictEqual(empty, "לא הסתיימו השבוע תחרויות בענפים שברשימה.");

  const data = JSON.parse(JSON.stringify(FIXTURE));
  // Since the 19.10 fixture Artem has logged qualification results, and a logged athlete's own change is dropped
  // (tested separately). Clear them here so this case still covers an athlete change grouped under the competition.
  const artem = data.athletes.find(a => a.id === "artem-dolgopyat");
  artem.history = (artem.history || []).filter(h => h.kind !== "result");
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

test("#digest: a competition under way lists only athletes still to compete (nextDate ≥ today)", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  const g = id => data.athletes.find(a => a.id === id);
  g("artem-dolgopyat").nextDate = "2026-10-24";   // floor final
  g("yali-shoshani").nextDate = "2026-10-25";     // a day-2 final
  g("lihie-raz").nextDate = "2026-10-19";         // done after qualification
  const gymOf = async now => digestSection((await digestOf({data, now})).text, "ישראלים מתחרים השבוע")
    .split("\n• ").find(b => b.includes("אליפות העולם בהתעמלות מכשירים 2026")) || "";
  // 20 Oct, day 4 of the Worlds: Raz is done; Dolgopyat and Shoshani still compete.
  const d20 = await gymOf("2026-10-20T09:00:00Z");
  assert.ok(d20.includes("עד 25 באוק׳") && d20.includes("(התעמלות מכשירים), בעיצומה"), d20);
  assert.ok(d20.includes("ארטיום דולגופיאט") && d20.includes("יהלי שושני") && !d20.includes("ליהיא רז"), d20);
  // 25 Oct, last day: only Shoshani; Dolgopyat's final was yesterday.
  const d25 = await gymOf("2026-10-25T09:00:00Z");
  assert.ok(d25.includes("יהלי שושני") && !d25.includes("ארטיום דולגופיאט") && d25.includes("יום אחרון"), d25);
  // Nobody left: no Rotterdam line at all.
  g("yali-shoshani").nextDate = "2026-10-24";
  assert.strictEqual(await gymOf("2026-10-25T09:00:00Z"), "", "no one still to compete: no line");
});

test("#digest: no relative time for running competitions (one-day: date only; last day: יום אחרון)", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  data.competitions.push({id: "fra-marathon", sportId: "athletics", name: "מרתון פרנקפורט", location: "פרנקפורט", start: "2026-10-25", end: "2026-10-25", source: "https://example.org/f"});
  const runner = data.athletes.find(a => a.sportId === "athletics");
  runner.nextDate = "2026-10-25";
  const gym = data.athletes.find(a => a.sportId === "artistic-gymnastics");
  gym.nextDate = "2026-10-25";
  const competing = digestSection((await digestOf({data, now: "2026-10-25T09:00:00Z"})).text, "ישראלים מתחרים השבוע");
  assert.ok(competing.includes("• 25 באוק׳ · מרתון פרנקפורט (אתלטיקה)\n"), competing);
  assert.ok(competing.includes("• עד 25 באוק׳ · אליפות העולם בהתעמלות מכשירים 2026 (התעמלות מכשירים), יום אחרון"), competing);
  assert.ok(!/מתקיימת עכשיו|מסתיימת היום|, היום/.test(competing), competing);
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
const SITE_QUOTAS = QUOTAS_SNAPSHOT;
// Last day of each quota event, as the page derives it (own end, else the containing competition, else start).
const EVENT_END = {
  "אליפות העולם רוטרדם – גמר קבוצתי גברים": "2026-10-20",
  "גביע העולם בטריאתלון, טונגיונג": "2026-10-24",
  "גרנד סלאם אבו דאבי": "2026-10-31",
  "אליפות העולם": "2026-11-08",   // weightlifting worlds
};
const upcomingOf = html => html.split('id="qNextH"')[1]?.split("</section>")[0] || "";
const DATE_MATRIX = {
  "2026-10-20": {upcoming: ["אליפות העולם רוטרדם – גמר קבוצתי גברים"]},
  "2026-10-24": {upcoming: ["גביע העולם בטריאתלון, טונגיונג"],
    notUpcoming: ["רוטרדם"]},
  "2026-10-27": {upcoming: ["אליפות העולם"], notUpcoming: ["טונגיונג", "רוטרדם"]},
  "2026-10-30": {upcoming: ["גרנד סלאם אבו דאבי"],
    judoStakes: true},
  "2026-11-01": {upcoming: ["אליפות העולם בקליעה"], notUpcoming: ["גרנד סלאם"], judoStakes: false},
};

test("date matrix: #quotas and sport page follow the event calendar; no stale stakes", async () => {
  const withStakes = SITE_QUOTAS.items.filter(q => q.stakes && q.nextQuotaEvent);
  assert.ok(withStakes.length >= 8, "published quotas should carry stakes");
  for (const [t, exp] of Object.entries(DATE_MATRIX)) {
    const {view, run} = await boot({quotas: SITE_QUOTAS, now: `${t}T08:00:00Z`});
    assert.strictEqual(run("today()"), t);
    const home = view("home"), quotas = view("quotas"), up = upcomingOf(quotas), judo = view("sport-judo");
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

// round3.md §6: verification status for visitors.
test("verification: card badge only when checked, three athlete-page states, #about-trust, KPI", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  const [ok, stale, auto, prevYear, bare] = data.athletes;
  Object.assign(ok, {verifiedAt: "2026-10-10T09:00:00Z", updatedAt: "2026-10-01T00:00:00Z", source: "https://www.ijf.org/x"});
  Object.assign(stale, {verifiedAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-12T00:00:00Z"});
  Object.assign(prevYear, {verifiedAt: "2025-12-30T00:00:00Z", updatedAt: "2025-12-01T00:00:00Z"});
  Object.assign(bare, {source: ""});
  for (const a of [auto, bare]) delete a.verifiedAt;
  const {view, run, els} = await boot({data, now: "2026-10-18T08:00:00Z"});
  const card = a => { const html = run(`athleteCard(S.athletes.find(x => x.id === ${JSON.stringify(a.id)}))`); return html; };
  assert.ok(card(ok).includes("נבדק 10 באוק׳") && card(ok).includes('class="trust ok"'));
  const badge = a => card(a).split('class="trust ok">')[1]?.split("</span></span>")[0] || "";
  assert.ok(badge(ok) && !badge(ok).includes("2026"), "same-year badge has no year");
  assert.ok(badge(prevYear).includes("2025"), "previous-year badge shows the year");
  for (const a of [stale, auto]) assert.ok(!card(a).includes('class="trust'), `${a.id}: no chip on the card`);

  const facts = id => view(`a-${id}`).split("<dt>בדיקה</dt>")[1].split("</dd>")[0];
  const lines = {[ok.id]: "הפרטים הושוו ידנית למקור (ijf.org) ולא השתנו מאז.", [stale.id]: "הם ייכללו בבדיקה הבאה.",
    [auto.id]: "והבדיקה הידנית נעשית בהדרגה."};
  for (const [id, line] of Object.entries(lines)) {
    const f = facts(id);
    assert.ok(f.includes(line) && f.includes('href="#about-trust"'), id);
    assert.ok(!/איסוף אוטומטי|לא אמין|חשוד|שגוי/.test(view(`a-${id}`)), id);
  }
  assert.ok(facts(stale.id).includes("trust stale") && facts(auto.id).includes("טרם נבדק ידנית"));
  assert.ok(facts(auto.id).includes("בקישור למקור") && !facts(bare.id).includes("בקישור למקור"), "source hint only with a source");
  assert.ok(facts(ok.id).includes('<span aria-hidden="true">✓</span>'));

  const about = view("about-trust");
  assert.ok(about.includes("<h1 tabindex=\"-1\">אודות</h1>") && !about.includes(NOT_FOUND));
  assert.strictEqual(els.view.innerHTML, about);

  const hero = h => h.split('<section class="hero">')[1].split("</section>")[0];
  assert.ok(/ \d+ מתוך \d+ נבדקו ידנית · <a href="#about-trust">איך אנחנו בודקים<\/a>/.test(hero(view("home"))), "F3: in the hero line");
  const none = JSON.parse(JSON.stringify(FIXTURE));
  none.athletes.forEach(a => delete a.verifiedAt);
  const noneHome = (await boot({data: none, now: "2026-10-18T15:00:00Z"})).view("home");
  assert.ok(!noneHome.includes("נבדקו") && hero(noneHome).includes("ממקורות רשמיים · <a href=\"#about-trust\">איך אנחנו בודקים</a>"), "V = 0: no verified count");
});

// round3.md §5: "ההזדמנויות הקרובות למכסה" panel and the hero "הבא בתור" line.
const closeOf = html => html.split('id="closeH"')[1]?.split("</section>")[0] || "";
const nextUpOf = html => html.match(/<p class="next-up">[\s\S]*?<\/p>/)?.[0] || "";
const liOf = html => [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1]);

test("closest panel + next-up on 18.10: running day, triathlon first, judo grouped, no team final", async () => {
  const {view} = await boot({quotas: SITE_QUOTAS, now: "2026-10-18T08:00:00Z"});
  const home = view("home");
  assert.ok(!nextUpOf(home), "competitions running: next-up hidden");
  const rows = liOf(closeOf(home));
  assert.strictEqual(rows.length, 5);
  assert.ok(rows[0].includes("#sport-triathlon") && rows[0].includes("בעוד 6 ימים"), "row 1 = triathlon");
  assert.ok(rows[0].includes('class="stakes"'), "single-item group keeps its stakes line");
  assert.ok(!closeOf(home).includes("קבוצתי גברים"), "team final runs today: on #day and #c-, not here");
  const judo = rows.find(r => r.includes("#sport-judo"));
  assert.strictEqual((judo.match(/<bdi>/g) || []).length, 3);
  assert.ok(judo.includes("ועוד 4 מקצים") && !judo.includes('class="stakes"'), "judo: 3 items + more, no stakes");
  assert.ok(judo.includes('href="#a-'), "matched athletes linked");
  assert.deepStrictEqual(rows.map(r => r.match(/#sport-([\w-]+)/)[1]), ["triathlon", "judo", "lacrosse", "surfing", "sailing"]);
  assert.ok(closeOf(home).includes('href="#quotas"'));
});

test("next-up on 26.10 skips weightlifting (no entrants) and names judo", async () => {
  const {view} = await boot({quotas: SITE_QUOTAS, now: "2026-10-26T08:00:00Z"});
  const line = nextUpOf(view("home"));
  const entrants = FIXTURE.athletes.filter(a => a.sportId === "judo" && a.nextDate >= "2026-10-29" && a.nextDate <= "2026-10-31").length;
  assert.ok(line.includes("#sport-judo") && line.includes(`${entrants} ספורטאים ונבחרות`) && line.includes("pill open"), line);
  assert.ok(!line.includes("weightlifting"));
});

test("next-up fallback with no entrants never says מתחרים; quotas error hides the panel", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  data.athletes.forEach(a => { a.nextDate = ""; });
  const {view} = await boot({data, quotas: SITE_QUOTAS, now: "2026-10-26T08:00:00Z"});
  const line = nextUpOf(view("home"));
  assert.ok(/ברשימה בענף/.test(line) && !line.includes("מתחרים"), line);

  const failed = await boot({quotas: "fail", now: "2026-10-26T08:00:00Z"});
  const home = failed.view("home");
  assert.ok(home.length > 200 && !home.includes('id="closeH"') && nextUpOf(home), "page renders without the panel");
});

test("closest panel and next-up escape names", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  const judoComp = data.competitions.find(x => x.sportId === "judo" && x.start === "2026-10-29");
  judoComp.name = "<img src=x onerror=alert(1)>";
  const items = [{...QUOTAS.items[0], sportId: "sailing", event: "<b>ev</b>", israelStatus: "in-contention",
    nextQuotaEvent: {name: "<i>q</i>", start: "2026-12-01"}}];
  const {view} = await boot({data, quotas: {updatedAt: "2026-10-25", items}, now: "2026-10-26T08:00:00Z"});
  const home = view("home");
  assert.ok(!/<img|<b>ev|<i>q/i.test(home) && closeOf(home).includes("&lt;b&gt;ev") && nextUpOf(home).includes("&lt;img"));
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
  assert.ok(!hid(e, "visitorBtn") && !hid(e, "adminChip") && !hid(e, "adminLink") && hid(e, "visitorBar") && hid(e, "visitorChip"));
  assert.ok(e.view("home").includes("את/ה רואה את הנתונים העדכניים מהמאגר"), "review queue for editors");
  e.run("setVisitorView(true)");
  assert.strictEqual(e.run(`localStorage.getItem("la28.viewAsVisitor")`), "true");
  assert.strictEqual(e.ctx.reloads, 1);

  const vc = fakeEditor();
  const v = await boot({claude: vc, storage: {"la28.viewAsVisitor": "true"}});
  assert.ok(!vc.calls.includes("db"), "the DB is never opened");
  assert.ok(v.run("!S.live && !S.isAdmin && S.db === null && S.loaded"), "public snapshot only");
  const home = v.view("home");
  assert.ok(!hid(v, "visitorBar") && !hid(v, "visitorChip") && hid(v, "adminLink") && hid(v, "adminChip") && hid(v, "visitorBtn"),
    "bar shown; chip, toggle and בקרה hidden");
  assert.ok(!home.includes("את/ה רואה את הנתונים העדכניים מהמאגר") && !home.includes("data-edit") && !home.includes("data-add"));
  assert.ok(!v.view("sport-judo").includes("data-add") && !v.view("a-raz-hershko").includes("data-edit"));
  assert.ok(v.view("admin").includes(NOT_FOUND), "#admin is not-found, as for visitors");
  v.run("setVisitorView(false)");
  assert.strictEqual(v.run(`localStorage.getItem("la28.viewAsVisitor")`), "false");
  assert.strictEqual(v.ctx.reloads, 1);

  const pub = await boot({storage: {"la28.viewAsVisitor": "true"}});   // a real visitor with a leftover flag
  assert.ok(hid(pub, "visitorBar") && hid(pub, "visitorBtn"), "no bar or toggle for non-editors");
});

test("#about trust block: computed counts, top sources, real chips, #trustH anchor", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  data.athletes.forEach(a => delete a.verifiedAt);
  Object.assign(data.athletes[0], {verifiedAt: "2026-10-17T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z"});
  Object.assign(data.athletes[1], {verifiedAt: "2026-10-17T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z"});
  data.athletes[2].source = "https://evil.example/<img src=x>";
  const {view, run} = await boot({data, quotas: SITE_QUOTAS, now: "2026-10-18T08:00:00Z"});
  for (const h of ["about", "about-trust"]) {
    const out = view(h);
    const block = out.split('aria-labelledby="trustH"')[1].split("</section>")[0];
    assert.ok(block.includes('<h2 id="trustH">'), h);
    const nums = [...block.matchAll(/digits">(\d+)</g)].map(m => +m[1]);
    assert.deepStrictEqual(nums, [data.athletes.length, 2, SITE_QUOTAS.items.length], "N, V, Q from the data");
    assert.ok(block.includes("trust ok") && block.includes("trust stale") && block.includes("trust auto"), "three real chips");
    assert.ok(block.includes("המקורות הנפוצים באתר") && !/<img/i.test(block), "top sources, escaped");
    assert.ok(!out.includes("<h2>איך הנתונים נאספים</h2>") && !out.includes("<h2>עדכניות</h2>"), "old sections replaced");
  }
  const noQ = await boot({data, quotas: "fail"});
  assert.strictEqual([...noQ.view("about").split('aria-labelledby="trustH"')[1].split("</section>")[0].matchAll(/digits">/g)].length, 2, "Q = 0: tile omitted");
});

test("#admin re-check ages use Hebrew counts: יומיים, ימים up to 10, יום from 11", async () => {
  const item = {...QUOTAS.items[0], event: "x", israelStatus: "in-contention", checkedAt: "2026-10-01",
    nextQuotaEvent: {name: "אירוע", start: "2026-10-05", end: "2026-10-05"}};
  for (const [now, text] of [["2026-10-07", "לפני יומיים"], ["2026-10-15", "לפני 10 ימים"], ["2026-10-26", "לפני 21 יום"]]) {
    const b = await boot({quotas: {updatedAt: "2026-10-01", items: [item]}, now: `${now}T08:00:00Z`});
    b.run("S.isAdmin = true; S.live = true");
    assert.ok(b.view("admin").split('id="quotaHealth"')[1].includes(text), `${now}: ${text}`);
  }
});

test("visitor bar markup: inside the sticky nav, not a live region; short toggle keeps its full name", async () => {
  const html = fs.readFileSync(path.join(ROOT, "site/index.html"), "utf8");
  const nav = html.split('<nav class="nav"')[1].split("</nav>")[0];
  const bar = nav.match(/<div class="visitor-bar"[^>]*>/)?.[0] || "";
  assert.ok(bar.includes('id="visitorBar"') && !/\brole=/.test(bar), "bar inside <nav>, no role");
  assert.ok(nav.includes('id="visitorChip"'));
  // WCAG 2.5.3: the accessible name contains the visible label, both the desktop and the phone form.
  const btn = nav.match(/<button[^>]*id="visitorBtn"[^>]*>([\s\S]*?)<\/button>/);
  const name = btn[0].match(/aria-label="([^"]*)"/)[1], visible = btn[1].replace(/<[^>]+>/g, "");
  assert.ok(name.includes(visible) && name.includes("כגולש/ת"), `${name} vs ${visible}`);
});

test("view-as-visitor toggle with blocked storage shows a message instead of reloading", async () => {
  const e = await boot({claude: fakeEditor()});
  e.run(`localStorage.setItem = () => { throw new Error("blocked"); }; localStorage.getItem = () => { throw new Error("blocked"); }`);
  e.run("setVisitorView(true)");
  assert.ok(!e.ctx.reloads, "no reload");
  assert.ok(!e.run(`$("visitorMsg").hidden`) && e.run(`$("visitorMsgText").textContent`).includes("חוסם שמירה מקומית"));
  assert.ok(fs.readFileSync(path.join(ROOT, "site/index.html"), "utf8").includes('id="visitorMsgClose"'), "message has a close button");
  const ok = await boot({claude: fakeEditor()});
  ok.run("setVisitorView(true)");
  assert.ok(ok.ctx.reloads === 1 && ok.run(`$("visitorMsg").hidden`), "normal storage: reload, no message");
});

test("home order (#176): hero, today, results, follows, then search; chances panel caps at 3 rows on phones", async () => {
  // A follow marks the follows slot: first-time visitors get no tip there (F5).
  const {view} = await boot({quotas: SITE_QUOTAS, now: "2026-10-18T08:00:00Z", follows: ["raz-hershko"]});
  const home = view("home");
  const q = home.indexOf('id="q"');
  const at = ["</section>", 'id="todayH"', 'id="homeResH"', "<h2>במעקב שלי</h2>"].map(x => home.indexOf(x));
  assert.ok(home.indexOf("<h2") === home.indexOf('<h2 id="todayH"'), "היום is the first h2 (home-today.md §6)");
  const css = fs.readFileSync(path.join(ROOT, "site/styles.css"), "utf8");
  assert.ok(/@media \(max-width:640px\)\{[^\n]*\.hero-sub\{display:none\}/.test(css) && home.includes('<p class="muted hero-sub">'), "compact hero on phones");
  assert.ok(at.every((x, i) => x > (at[i - 1] ?? -1)) && at[3] < q && q < home.indexOf('id="closeH"'), "order: " + at);
  const panel = home.split('id="closeH"')[1].split("</section>")[0];
  assert.ok(panel.includes('class="rows closest"') && panel.includes('<span class="sm-only"> (עוד 2)</span>'), "5 groups → (עוד 2)");
  const few = {updatedAt: "2026-10-18", items: [{...QUOTAS.items[0], sportId: "sailing", event: "x", israelStatus: "in-contention",
    nextQuotaEvent: {name: "אירוע", start: "2026-12-01"}}]};
  const one = (await boot({quotas: few, now: "2026-10-18T08:00:00Z"})).view("home").split('id="closeH"')[1].split("</section>")[0];
  assert.ok(!one.includes("sm-only"), "≤ 3 groups: no suffix");
});
// The home's panel order, as docs/product/ownership.md lists it. Change that file (and the spec) to reorder.
test("home panel order: hero, today, recent results, השבוע, following, search, chances, KPI, מה התעדכן", async () => {
  const {view} = await boot({quotas: SITE_QUOTAS, now: "2026-10-18T08:00:00Z", follows: ["raz-hershko"]});
  const home = view("home");
  const marks = [['<section class="hero">', "hero"], ['id="todayH"', "היום"], ['id="homeResH"', "תוצאות אחרונות"],
    ['id="weekH"', "השבוע"], ["<h2>במעקב שלי</h2>", "במעקב שלי"], ['id="q"', "search"], ['id="closeH"', "chances"],
    ['aria-label="התקדמות בהעפלה"', "KPI"], ["<h2>מה התעדכן</h2>", "מה התעדכן"]];
  const at = marks.map(([m, name]) => { const i = home.indexOf(m); assert.ok(i >= 0, `missing: ${name}`); return [i, name]; });
  assert.deepStrictEqual(at.slice().sort((x, y) => x[0] - y[0]).map(([, n]) => n), marks.map(([, n]) => n));
  // With a quota earned this week the won panel leads (PM on #171); the rest keeps its order.
  const q = JSON.parse(JSON.stringify(SITE_QUOTAS));
  Object.assign(q.items.find(i => i.sportId === "judo"), {israelStatus: "earned", earnedAt: "2026-10-17"});
  const won = (await boot({quotas: q, now: "2026-10-18T08:00:00Z", follows: ["raz-hershko"]})).view("home");
  const order = ['<section class="hero">', 'class="panel won"', 'id="todayH"', 'id="homeResH"', 'id="weekH"'].map(m => won.indexOf(m));
  assert.ok(order.every((x, i) => x >= 0 && x > (order[i - 1] ?? -1)), "won first: " + order);
});

// Editor form "תיקון טעות" fieldset (corrections-log.md §1.1): one athlete update + one corrections doc.
async function bootEditor({failCorrection = 0} = {}){
  const b = await boot({now: "2026-10-24T09:10:00Z"});
  const writes = [];
  b.ctx.__writes = writes;
  b.ctx.__fail = failCorrection;
  b.run(`S.isAdmin = true; S.uid = "u-editor"; S.db = {collection: name => ({doc: id => ({
    update: async p => { __writes.push({name, id, op: "update", p}); },
    set: async p => { if (name === "corrections" && __fail-- > 0) throw new Error("x"); __writes.push({name, id, op: "set", p}); },
    get: async () => ({exists: false}),
  })})};`);
  b.run(`openForm(S.athletes.find(a => a.id === "raz-hershko"))`);
  const set = (id, v) => { b.els[id].value = v; };
  const save = async () => { await b.run(`saveForm({preventDefault(){}})`); };
  return {...b, writes, set, save};
}

test("historyWith: results capped apart (60) from the other kinds (20), order kept", async () => {
  const {run} = await boot();
  const res = n => Array.from({length: n}, (_, i) => ({at: "2025-01-01", kind: "result", text: `r${i}`}));
  const oth = n => Array.from({length: n}, (_, i) => ({at: "2026-01-01", kind: "rank", text: `o${i}`}));
  const hw = (hist, entry) => JSON.parse(run(`JSON.stringify(historyWith(${JSON.stringify({history: hist})}, ${JSON.stringify(entry)}))`));
  // 20 others + 5 results, then a stage entry: the oldest other goes, never a result.
  const mixed = [...res(2), ...oth(20), ...res(3)];
  let h = hw(mixed, {at: "2026-10-24", kind: "stage", text: "s"});
  assert.strictEqual(h.filter(x => x.kind === "result").length, 5);
  assert.deepStrictEqual(h.filter(x => x.kind !== "result").map(x => x.text), [...oth(20).slice(1).map(x => x.text), "s"]);
  assert.deepStrictEqual(h.slice(0, 2).map(x => x.text), ["r0", "r1"], "order kept");
  // A new result with 20 others already there: nothing else is dropped.
  h = hw(mixed, {at: "2026-10-24", kind: "result", text: "new"});
  assert.strictEqual(h.length, 26);
  // 60 results + one more: the oldest result goes.
  h = hw(res(60), {at: "2026-10-24", kind: "result", text: "new"});
  assert.deepStrictEqual([h.length, h[0].text, h[59].text], [60, "r1", "new"]);
  assert.strictEqual(hw(undefined, {kind: "start", text: "x"}).length, 1, "no history yet");
});

test("editor correction: record + log entry in the export's shape, no reporter identity", async () => {
  const e = await bootEditor();
  assert.ok(!e.els.fixSet.hidden, "fieldset shown when editing a published record");
  e.set("fRank", "1 בעולם (IJF, 21.10.2026)"); e.set("fStageIn", "2");
  e.els.fIsFix.checked = true; e.set("fFixBy", "reader"); e.set("fFixAt", "2026-10-23");
  e.set("fFixSrc", "https://www.ijf.org/wrl");
  await e.save();
  assert.deepStrictEqual(e.writes.map(w => `${w.name}:${w.op}`), ["athletes:update", "corrections:set"]);
  const [upd, log] = e.writes.map(w => JSON.parse(JSON.stringify(w.p)));   // plain objects, not the vm realm's
  const last = upd.history[upd.history.length - 1];
  assert.deepStrictEqual([last.kind, last.text, last.source], ["correction", "תוקן: דירוג או הישג, שלב", "https://www.ijf.org/wrl"]);
  assert.strictEqual(upd.history.filter(h => h.kind === "stage").length, 1, "stage history still written");
  assert.deepStrictEqual(Object.keys(log).sort(), ["at", "by", "changes", "createdBy", "id", "reportedAt", "source", "target"]);
  assert.strictEqual(log.at, "2026-10-24T09:10:00.000Z");
  assert.strictEqual(log.reportedAt, "2026-10-23T00:00:00Z");
  assert.deepStrictEqual(log.target, {kind: "athlete", id: "raz-hershko", name: "רז הרשקו"});
  assert.deepStrictEqual(log.changes.map(c => c.field), ["rank", "stage"]);
  assert.strictEqual(log.changes[1].right, "2");
  assert.ok(log.id.startsWith("raz-hershko-202610240910-") && e.writes[1].id === log.id);
  assert.ok(!JSON.stringify(log).includes("@"));
});

test("editor correction: refused without source, with only a source change, or a future report date", async () => {
  for (const [setup, msg] of [
    [e => { e.set("fRank", "x"); e.set("fFixSrc", "http://ijf.org"); }, "מקור שמתחיל ב־https://"],
    [e => { e.set("fSource", "https://new.example/x"); e.set("fFixSrc", "https://ijf.org/x"); }, "לפחות שדה אחד"],
    [e => { e.set("fRank", "x"); e.set("fFixSrc", "https://ijf.org/x"); e.set("fFixAt", "2026-10-25"); }, "עתידי"],
  ]) {
    const e = await bootEditor();
    e.els.fIsFix.checked = true;
    setup(e);
    await e.save();
    assert.strictEqual(e.writes.length, 0, msg);
    assert.ok(e.els.frmErr.textContent.includes(msg), e.els.frmErr.textContent);
  }
});

test("editor correction: a failed log write is retried by the next save, without re-saving the record", async () => {
  const e = await bootEditor({failCorrection: 1});
  e.set("fRank", "1 בעולם"); e.els.fIsFix.checked = true; e.set("fFixSrc", "https://ijf.org/x");
  await e.save();
  assert.deepStrictEqual(e.writes.map(w => w.name), ["athletes"]);
  assert.ok(e.els.frmErr.textContent.includes("לא נרשם ביומן"));
  await e.save();
  assert.deepStrictEqual(e.writes.map(w => w.name), ["athletes", "corrections"]);
});

test("editor: unticked fieldset writes no correction; new athletes don't get the fieldset", async () => {
  const e = await bootEditor();
  e.set("fRank", "1 בעולם");
  await e.save();
  assert.deepStrictEqual(e.writes.map(w => w.name), ["athletes"]);
  assert.ok(!e.writes[0].p.history.some(h => h.kind === "correction"));
  e.run(`openForm(null, "judo")`);
  assert.ok(e.els.fixSet.hidden);
});

test("approving an empty patch only closes the proposal; a real patch still stamps updatedAt", async () => {
  const {run} = await boot();
  const id = FIXTURE.athletes[0].id;
  run(`globalThis.writes = [];
    const doc = (col, d) => ({update: async v => writes.push({col, d, op: "update", v}), set: async v => writes.push({col, d, op: "set", v}),
      get: async () => ({exists: true})});
    S.db = {collection: col => ({doc: d => doc(col, d)}), doc: path => doc(path, "")};
    S.uid = "u1";
    S.proposals = [{id: "e1", kind: "update", target: ${JSON.stringify(id)}, patch: {}, summary: "בדיקה ריקה", status: "pending"},
                   {id: "r1", kind: "update", target: ${JSON.stringify(id)}, patch: {rank: "3 בעולם"}, status: "pending"}];`);
  const btn = `({disabled: true, closest: () => ({insertAdjacentHTML(){}})})`;
  await run(`decide("e1", true, ${btn})`);
  let w = JSON.parse(run("JSON.stringify(writes)"));
  assert.deepStrictEqual(w.map(x => x.col), ["proposals"], "empty patch: no athlete or meta/status write");
  assert.strictEqual(w[0].v.status, "approved");
  run("writes.length = 0");
  await run(`decide("r1", true, ${btn})`);
  w = JSON.parse(run("JSON.stringify(writes)"));
  const upd = w.find(x => x.col === "athletes");
  assert.ok(upd && upd.v.rank === "3 בעולם" && upd.v.updatedAt, "non-empty patch still writes updatedAt");
});

// Auto-refresh: re-read data.json, re-render only on change, keep focus and scroll, pause while hidden.
test("auto-refresh: re-renders on a new export, keeps focus/scroll, skips unchanged, live and hidden", async () => {
  const b = await boot({quotas: QUOTAS});
  const {ctx, run, els} = b;
  let calls = [], next = FIXTURE;
  ctx.fetch = async url => { calls.push(url); const body = url === "quotas.json" ? QUOTAS : next;
    return {ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(body))}; };
  b.view("home");

  await run("checkForUpdate()");
  assert.deepStrictEqual(calls.sort(), ["data.json", "quotas.json"]);
  assert.ok(run(`$("updateNote").hidden`), "unchanged export: no update note");

  next = {...FIXTURE, generatedAt: "2099-01-01T00:00:00Z", athletes: FIXTURE.athletes.slice(1)};
  run(`$("q")`); const q = els.q; let focused = 0, sel = null, scrolled = null;
  q.focus = () => { focused++; }; q.setSelectionRange = (a) => { sel = a; };
  ctx.document.activeElement = {id: "q", selectionStart: 3};
  ctx.scrollY = 640; ctx.scrollTo = o => { scrolled = o.top; };
  await run("checkForUpdate()");
  assert.strictEqual(run("S.generatedAt"), "2099-01-01T00:00:00Z");
  assert.strictEqual(run("S.athletes.length"), FIXTURE.athletes.length - 1);
  // generatedAt 2099-01-01T00:00Z is 02:00 in Israel (winter time).
  assert.ok(!run(`$("updateNote").hidden`) && run(`$("updateNote").textContent`) === "הנתונים עודכנו ב־02:00", "visible note with the export's Israel time");
  assert.ok(focused === 1 && sel === 3 && scrolled === 640, "focus, caret and scroll kept");
  assert.ok(els.view.innerHTML.includes("נכון ל־"), "freshness says נכון ל־");

  calls = [];
  run("S.live = true");
  await run("checkForUpdate()");
  assert.deepStrictEqual(calls, [], "editors on live data don't poll");
  run("S.live = false");

  ctx.document.hidden = true;
  run("lastCheck = 0; scheduleRefresh()");
  await new Promise(r => setTimeout(r, 20));
  assert.deepStrictEqual(calls, [], "hidden tab: no check");
  ctx.document.hidden = false;
  run("scheduleRefresh()");   // overdue (lastCheck = 0): runs at once when the tab is visible again
  await new Promise(r => setTimeout(r, 20));
  assert.ok(calls.includes("data.json"), "visible again: checks immediately");
});

// "השתנה ב־HH:MM" (docs/design/changed-rows.md): only rows changed by an auto-refresh, until the next navigation.
test("changed rows: marked after auto-refresh on #a- and #day, one announcement, cleared on navigation", async () => {
  const b = await boot({quotas: QUOTAS, now: "2026-10-19T08:00:00Z"});
  const {ctx, run, els} = b;
  let next = FIXTURE;
  ctx.fetch = async url => ({ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(url === "quotas.json" ? QUOTAS : next))});
  const go = h => { ctx.location.hash = "#" + h; run("navigate()"); return els.view.innerHTML; };
  const marks = () => (els.view.innerHTML.match(/השתנה ב־<time datetime="[^"]+">\d\d:\d\d<\/time>/g) || []).length;
  const exportWith = (gen, edit) => { const d = JSON.parse(JSON.stringify(FIXTURE)); d.generatedAt = gen; edit(d); return d; };
  const ath = (d, id) => d.athletes.find(a => a.id === id);

  go("a-yali-shoshani");
  assert.strictEqual(marks(), 0);
  // rank changes and a history entry is added; nothing else about her changes.
  next = exportWith("2099-01-01T00:00:00Z", d => { const a = ath(d, "yali-shoshani");
    a.rank = "מקום 5 במקבילים"; a.history = [...(a.history || []), {at: "2026-10-19", kind: "result", text: "מקום 5 במקבילים", source: "https://example.org/r.pdf"}]; });
  await run("checkForUpdate()");
  assert.strictEqual(marks(), 2, "rank and the new history row");
  assert.strictEqual(run(`$("updateNote").textContent`), "הנתונים עודכנו ב־02:00 · 2 פריטים השתנו בדף הזה", "one announcement with the count");
  assert.ok(els.view.innerHTML.includes(`השתנה ב־<time datetime="2099-01-01T00:00:00Z">02:00</time>`), "the export's Israel time");
  assert.ok(els.view.innerHTML.includes(`מקום 5 במקבילים<span class="pill chg"><span class="sr"> · </span>השתנה ב־`), "sr separator: the rank and the mark aren't read as one word");

  // A later export that doesn't touch her keeps the marks and announces no new rows.
  next = exportWith("2099-01-02T00:00:00Z", d => { const a = ath(d, "yali-shoshani");
    a.rank = "מקום 5 במקבילים"; a.history = [...(a.history || []), {at: "2026-10-19", kind: "result", text: "מקום 5 במקבילים", source: "https://example.org/r.pdf"}]; });
  await run("checkForUpdate()");
  assert.strictEqual(marks(), 2, "marks stay until navigation");
  assert.strictEqual(run(`$("updateNote").textContent`), "הנתונים עודכנו ב־02:00");

  // Re-renders that aren't an auto-refresh (e.g. the minute tick) mark nothing new.
  run("refresh()");
  assert.strictEqual(marks(), 2);
  go("home"); go("a-yali-shoshani");
  assert.strictEqual(marks(), 0, "navigation clears the marks");

  // #day: only the session row whose result changed is marked.
  next = FIXTURE;
  await run("checkForUpdate()");   // back to the fixture (a new generatedAt): a fresh baseline after navigating
  go("day-2026-10-19");
  const rows = (els.view.innerHTML.match(/<li><span class="d">/g) || []).length;
  assert.ok(rows >= 2, "the day has several rows");
  next = exportWith("2099-01-03T00:00:00Z", d => { const a = ath(d, "yali-shoshani");
    a.history = [...(a.history || []), {at: "2026-10-19", kind: "result", text: "מקום 5 במקבילים", source: "https://example.org/r.pdf"}]; });
  await run("checkForUpdate()");
  assert.strictEqual(marks(), 1, "only Shoshani's row");
  assert.ok(/יהלי שושני[\s\S]*?<\/time><\/span><\/span>/.test(els.view.innerHTML), "the mark is inside her row");
  // The pill must not take space in the row, or marking it would move text under the cursor.
  const css = fs.readFileSync(path.join(ROOT, "site/styles.css"), "utf8");
  assert.ok(/\.pill\.chg\{[^}]*position:absolute/.test(css) && /\.rows li,\.facts dd\{position:relative\}/.test(css), "pill is out of the flow");
});

// The 25.10 morning (docs/qa/live-qa-2510.md §5–§6), automated: the tab is open on home through the 24.10 result night.
const SAGIV_RESULT = {at: "2026-10-24", kind: "result", text: "מקום 12", source: "https://triathlon.org/events/2026-world-triathlon-cup-tongyeong"};
const exportAt = (gen, edit = () => {}) => { const d = JSON.parse(JSON.stringify(FIXTURE)); d.generatedAt = gen; d.lastRun = gen; edit(d); return d; };
async function openTab(now, data = FIXTURE){
  const b = await boot({data, quotas: QUOTAS_SNAPSHOT, now});
  let next = data;
  b.ctx.fetch = async url => ({ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(url === "quotas.json" ? QUOTAS_SNAPSHOT : next))});
  b.ctx.location.hash = "#home"; b.run("navigate()");
  return {...b, publish: async d => { next = d; await b.run("checkForUpdate()"); return b.els.view.innerHTML; }};
}
const panelOf = (html, id) => html.includes(`id="${id}"`) ? html.split(`id="${id}"`)[1].split("</section>")[0] : "";
const chgMarks = html => (html.match(/class="pill chg"/g) || []).length;

test("25.10 morning: a result landing by auto-refresh leaves 'אתמול', shows under recent results with one mark", async () => {
  // Israel is on winter time (UTC+2) from 25.10: 04:30Z is 06:30, and the 05:00Z export reads 07:00.
  const b = await openTab("2026-10-25T04:30:00Z");
  const before = b.els.view.innerHTML;
  assert.ok(/אתמול[\s\S]*?3 הופעות ממתינות לתוצאה/.test(panelOf(before, "weekH")), "precondition: 3 awaited on 24.10");
  assert.strictEqual(chgMarks(before), 0);

  const html = await b.publish(exportAt("2026-10-25T05:00:00Z", d => {
    const a = d.athletes.find(x => x.id === "shachar-sagiv"); a.history = [...(a.history || []), SAGIV_RESULT]; }));
  const week = panelOf(html, "weekH"), res = panelOf(html, "homeResH");
  assert.ok(/2 הופעות ממתינות לתוצאה/.test(week), "the awaited count drops to 2");
  assert.ok(res.includes("שחר שגיב") && res.includes("מקום 12") && res.includes("triathlon.org"), "the result with its source");
  assert.strictEqual(chgMarks(res), 1, "the new result row is marked");
  assert.strictEqual(chgMarks(week), 0, "week rows carry no marks (no per-session state there)");
  assert.strictEqual(chgMarks(html), 1, "nothing else on the page is marked");
  assert.strictEqual(b.run(`$("updateNote").textContent`), "הנתונים עודכנו ב־07:00 · פריט אחד השתנה בדף הזה");

  // The floor final lands too: nothing is awaited, so the "אתמול" row goes.
  const all = await b.publish(exportAt("2026-10-25T09:00:00Z", d => {
    for (const [id, text] of [["shachar-sagiv", "מקום 12"], ["artem-dolgopyat", "מקום 4 בגמר הקרקע"], ["noam-berkovich", "מקום 7 בגמר הקרקע"]]) {
      const a = d.athletes.find(x => x.id === id); a.history = [...(a.history || []), {...SAGIV_RESULT, text, source: "https://www.gymnastics.sport/r.pdf"}]; } }));
  assert.ok(!panelOf(all, "weekH").includes("אתמול"), "no awaited session left: no 'אתמול' row");
  assert.strictEqual(chgMarks(panelOf(all, "homeResH")), 3, "Sagiv's mark stays until navigation; both floor results are new");
  b.ctx.location.hash = "#today"; b.run("navigate()"); b.ctx.location.hash = "#home"; b.run("navigate()");
  assert.strictEqual(chgMarks(b.els.view.innerHTML), 0, "navigation clears the marks");
});

test("stale line turns fresh after an auto-refresh on an event day (home and #day)", async () => {
  // 29.10, 12:00 in Israel (winter time): judo sessions today, export from 18.10.
  const b = await openTab("2026-10-29T10:00:00Z");
  assert.ok(b.els.view.innerHTML.includes('class="fresh stale"') && b.els.view.innerHTML.includes("הנתונים לא עודכנו מאז"), "precondition: stale");
  const html = await b.publish(exportAt("2026-10-29T09:30:00Z"));
  assert.ok(!html.includes('class="fresh stale"') && /<p class="fresh">[\s\S]*?נכון ל־<time datetime="2026-10-29T09:30:00.000Z">11:30<\/time>/.test(html), "fresh, with the export's Israel time");
  b.ctx.location.hash = "#day-2026-10-29"; b.run("navigate()");
  assert.ok(!b.els.view.innerHTML.includes('class="fresh stale"'), "#day agrees");
});

// #today / #day-<date> (site/day.js; daily-and-following.md §1, UX review on #140).
test("#day a11y: h1 before the prev/next links in the DOM; the result is inline, not a <p> inside a <span>", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  const sagiv = data.athletes.find(a => a.id === "shachar-sagiv");
  sagiv.history = [...(sagiv.history || []), {at: "2026-10-24", kind: "result", text: "מקום 12", source: "https://triathlon.org/x"}];
  const out = (await boot({data, now: "2026-10-26T08:00:00Z"})).view("day-2026-10-24");
  const nav = out.split('<div class="day-nav">')[1].split("</div>")[0];
  assert.ok(nav.indexOf("<h1") < nav.indexOf('class="day-prev"') && nav.indexOf('class="day-prev"') < nav.indexOf('href="#day-2026-10-25"'), nav);
  assert.ok(out.includes('<span class="res"><b>תוצאה:</b> מקום 12') && !out.includes('<p class="res"'));
});

test("#day renders the fixture on 24.10, 29.10 and 3.11 with Israelis' sessions only", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  // A past day keeps its athletes through history results even after nextDate has moved on.
  const sagiv = data.athletes.find(a => a.id === "shachar-sagiv");
  sagiv.nextDate = "2026-12-01";
  sagiv.history = [...(sagiv.history || []), {at: "2026-10-24", kind: "result", text: "מקום 12", source: "https://triathlon.org/x"}];
  const {view} = await boot({data, quotas: SITE_QUOTAS, now: "2026-10-26T08:00:00Z"});
  const d24 = view("day-2026-10-24"), d29 = view("day-2026-10-29"), d03 = view("day-2026-11-03");
  for (const [h, out] of [["24", d24], ["29", d29], ["03", d03]]) {
    assert.ok(!out.includes(NOT_FOUND) && out.includes('<h1 tabindex="-1">'), h);
    assert.ok(out.includes('<span aria-hidden="true">→</span>&nbsp;היום הקודם') && out.includes('<span aria-hidden="true">←</span>') && out.includes("היום הבא<span class=\"sr\">") && out.includes('<a href="#today">היום</a>'), `${h}: prev/next + today link`);
    assert.strictEqual((out.split('aria-label="בחירת יום"')[1].split("</nav>")[0].match(/href="#day-/g) || []).length, 7, `${h}: 7 chips`);
    assert.strictEqual((out.match(/aria-current="date"/g) || []).length, 1, `${h}: one selected chip`);
    assert.ok(/<p class="fresh"><i><\/i><span>נכון ל־<time datetime="[^"]+">[^<]*\d\d:\d\d<\/time> · מתעדכן פעם ביום/.test(out), `${h}: data note with cadence`);
    noLiveClaims(out, h);
  }
  assert.ok(d24.includes('href="#a-shachar-sagiv"') && d24.includes("<b>תוצאה:</b> מקום 12") && !d24.includes("עודכן ב־"), "24.10: result from history, no stamp");
  assert.ok(d29.includes('<h3><a href="#c-judo-gs-abu-dhabi-2026" class="hlink">גרנד סלאם אבו דאבי</a>') && d29.includes("pill s-before") && d29.includes('id="ds-judo"'), "29.10: sport h2, comp h3, before chips");
  assert.ok(!d29.includes("#sport-weightlifting"), "no competitions without Israelis' sessions");
  assert.ok(d29.includes('aria-current="date">ה׳ 29<span class="sr"> · יום חמישי, 29 באוקטובר · יש תחרויות של ישראלים</span>'), "chip: visible text in the name + current");
  const strip = d29.split('aria-label="בחירת יום"')[1].split("</nav>")[0];
  assert.ok(!/<a [^>]*aria-label=/.test(strip), "no aria-label overriding the visible chip text");
  assert.ok(d29.includes('<span aria-hidden="true">→</span>&nbsp;היום הקודם<span class="sr">, יום רביעי, 28 באוקטובר</span>'), "prev: arrow hidden, sr date");
  // The weightlifting Worlds run on 3.11 with no Israeli entrant; the Doha shooting Worlds have the Israelis' sessions.
  assert.ok(!d03.includes("#sport-weightlifting"), "3.11: running competitions without Israelis are left out");
  assert.ok(d03.includes("#sport-shooting") && d03.includes('href="#a-sergey-richter"'), "3.11: Doha sessions from the fixture");
});

test("#day: today's states, a result on another day, #day alone, impossible dates, empty day, escaping", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  // The nextDate/history fallback: without the fixture's real Abu Dhabi sessions (since 19.10).
  data.sessions = data.sessions.filter(x => x.competitionId !== "judo-gs-abu-dhabi-2026");
  const raz = data.athletes.find(a => a.id === "raz-hershko"), gefen = data.athletes.find(a => a.id === "gefen-primo");
  raz.history = [...(raz.history || []), {at: "2026-10-29", kind: "result", text: "<b>ארד</b>", source: "https://www.ijf.org/r"}];
  raz.nextDate = "2026-10-29";
  gefen.nextDate = "2026-10-30";
  const follows = ["gefen-primo"];
  const {view, run} = await boot({data, quotas: SITE_QUOTAS, now: "2026-10-30T08:00:00Z", follows});
  const t = view("today");
  assert.ok(t.includes('<span class="star-on" aria-hidden="true">★</span><span class="sr">במעקב שלך, </span> <a href="#a-gefen-primo"'), "★ pattern");
  assert.strictEqual(t, view("day-2026-10-30")); assert.strictEqual(t, view("day"), "#day alone = today");
  assert.ok(t.includes('<span aria-hidden="true">→</span>&nbsp;אתמול') && t.includes("מחר<span class=\"sr\">") && !t.includes('<a href="#today">היום</a>'));
  assert.ok(t.includes("מתקיימת עכשיו · יום 2 מתוך 3") && t.includes("pill s-live"), "today: live header and chip");
  assert.ok(!t.includes('href="#a-raz-hershko"'), "a result on 29.10 isn't shown as awaiting on 30.10");
  const y = view("day-2026-10-29");
  assert.ok(y.includes("<b>תוצאה:</b> &lt;b&gt;ארד&lt;/b&gt;") && !y.includes("<b>ארד"), "result escaped");
  for (const bad of ["day-2026-02-30", "day-2026-13-45", "day-nope", "day-<img>"]) assert.ok(view(bad).includes(NOT_FOUND), bad);
  assert.ok(view("home").includes('<h2 id="todayH"><a class="hlink" href="#today">היום, '), "home h2 → #today, a.hlink");
  const quiet = run(`(() => { for (let d = "2026-11-15"; d < "2027-06-01"; d = addDays(d, 1)) if (!daySessions(d).length) return d; })()`);
  const empty = view("day-" + quiet);
  assert.ok(empty.includes("אין תחרויות ידועות של ספורטאים ונבחרות מישראל ביום הזה.") && /href="#day-\d{4}-\d\d-\d\d">לתחרות הבאה: /.test(empty));
});

// #day on data.json.sessions (docs/design/sessions-contract.md); the fallback stays for empty sessions.
const SESS = (over = {}) => ({id: "issf-wch-doha-2026-20261103-arm-q1", competitionId: "issf-wch-doha-2026", date: "2026-11-03",
  startUtc: "2026-11-03T06:15:00Z", athleteIds: ["sergey-richter"], phase: "רובה אוויר 10 מ׳ גברים – מוקדמות, מקצה 1",
  source: "https://www.issf-sports.org/x", result: "", resultSource: "", resultAt: "", ...over});
const withSessions = list => ({...JSON.parse(JSON.stringify(FIXTURE)), sessions: list});

test("#day from sessions: time, status by clock, result stamp, untimed, Israel day key, defense in depth", async () => {
  const rowOf = html => html.split('<ul class="rows sess">')[1]?.split("</ul>")[0] || "";
  // Only the sessions under test on 3.11: the shooters' own nextDate there would add fallback rows to the list.
  const noFallback = sessions => setAthlete(setAthlete(withSessions(sessions), "olga-tashtchiev", {nextDate: ""}), "sergey-richter", {nextDate: ""});
  const at = async (now, sessions) => (await boot({data: noFallback(sessions), quotas: SITE_QUOTAS, now})).view("day-2026-11-03");
  // 06:15Z is 08:15 in Israel (UTC+2 after 25.10).
  const before = rowOf(await at("2026-11-03T05:00:00Z", [SESS()]));
  assert.ok(before.includes('<span class="d"><time datetime="2026-11-03T06:15:00.000Z">08:15</time></span>') && before.includes("pill s-before") && before.includes("<bdi>רובה אוויר 10 מ׳ גברים"), "before");
  assert.ok(rowOf(await at("2026-11-03T07:00:00Z", [SESS()])).includes("pill s-live"), "inside the 3h window");
  assert.ok(rowOf(await at("2026-11-03T09:30:00Z", [SESS()])).includes("pill s-wait"), "after the window");
  const done = rowOf(await at("2026-11-03T12:00:00Z", [SESS({result: "<b>מקום 12</b>", resultSource: "https://www.issf-sports.org/r", resultAt: "2026-11-03T08:40:00Z"})]));
  assert.ok(done.includes('<b>תוצאה:</b> &lt;b&gt;מקום 12&lt;/b&gt; · עודכן ב־<time datetime="2026-11-03T08:40:00.000Z">10:40</time>') && !done.includes("pill s-"), "result with its own time, escaped");
  const unproven = rowOf(await at("2026-11-03T12:00:00Z", [SESS({result: "מקום 12", resultSource: "http://x", resultAt: "2026-11-03T08:40:00Z"})]));
  assert.ok(!unproven.includes("תוצאה:") && unproven.includes("pill s-wait"), "a result without proof isn't shown");
  // components.md §1: an all-untimed group says "תאריך בלבד" once, in its heading; in a mixed group the untimed row says it.
  const allUntimed = await at("2026-11-02T08:00:00Z", [SESS({startUtc: null})]);   // the day before
  assert.ok(allUntimed.includes('<span class="muted"> · תאריך בלבד</span>') && rowOf(allUntimed).includes('<span class="d"></span>')
    && rowOf(allUntimed).includes("pill s-before"), "all untimed: heading form, no time");
  const mixed = rowOf(await at("2026-11-02T08:00:00Z", [SESS(), SESS({id: "x-olga", athleteIds: ["olga-tashtchiev"], startUtc: null, phase: "אקדח"})]));
  assert.ok(mixed.includes("08:15") && mixed.includes('<span class="d">תאריך בלבד</span>'), "mixed: the untimed row says תאריך בלבד");
  // components.md §1: no promise of an unannounced time, in any output or source.
  for (const f of fs.readdirSync(path.join(__dirname, "../site")).filter(f => f.endsWith(".js")))
    assert.ok(!fs.readFileSync(path.join(__dirname, "../site", f), "utf8").includes("השעה תפורסם"), f);
  // Day key is the Israel date of startUtc: 23:30Z on 2.11 is 01:30 on 3.11 in Israel.
  const late = await at("2026-11-01T08:00:00Z", [SESS({date: "2026-11-02", startUtc: "2026-11-02T23:30:00Z"})]);
  assert.ok(rowOf(late).includes("01:30"), "Israel day key");
  const junk = await at("2026-11-01T08:00:00Z", [SESS({competitionId: "nope"}), SESS({id: "x2", athleteIds: ["nobody"]})]);
  assert.ok(!junk.includes('<ul class="rows sess">'), "unknown competition / athletes dropped");
});

// Near-live labels (docs/design/near-live.md §8, copy per #156). A session at 09:30 Israel time on 3.11 (UTC+2):
// its window ends at 12:30.
// Whole words only: "חי" must not flag שחייה, אחים or מחיר (#156 item 6). Checked on visible text, not class names.
const LIVE_BANS = [/(^|[\s,.·:])חי($|[\s,.·:])/, /בזמן אמת/, /לפני \d+ דקות/, /\blive\b/i];
const visibleText = html => html.replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/g, " ");
function noLiveClaims(html, label = ""){
  const text = visibleText(html);
  for (const re of LIVE_BANS) assert.ok(!re.test(text), `${label}: matches ${re}`);
}
const NL_SESS = (over = {}) => SESS({startUtc: "2026-11-03T07:30:00Z", source: "https://www.issf-sports.org/schedule", ...over});
const nlRow = async (now, over = {}, data = {}) => {
  const out = (await boot({data: {...withSessions([NL_SESS(over)]), ...data}, quotas: SITE_QUOTAS, now})).view("day-2026-11-03");
  return out.split('<ul class="rows sess">')[1].split("</ul>")[0];
};
const detailOf = row => row.split('<span class="res">')[1]?.split("</span>")[0] || "";

test("near-live: the banned-word check is whole-word and leaves allowed copy alone (#156 item 6)", () => {
  for (const ok of ["שחייה", "אחים", "מחיר", "מתקיימת עכשיו", "מתחרה היום", "נתונים חיים"]) assert.doesNotThrow(() => noLiveClaims(ok), ok);
  for (const bad of ["שידור חי", "חי · עכשיו", "תוצאות בזמן אמת", "עודכן לפני 5 דקות", "Live"]) assert.throws(() => noLiveClaims(bad), bad);
});

test("near-live: awaiting fresh, checked (per-session checkedAt only) and long", async () => {
  const fresh = await nlRow("2026-11-03T11:00:00Z", {checkedAt: "2026-11-03T06:00:00Z"});   // 13:00, checked 08:00
  assert.ok(fresh.includes("pill s-wait") && detailOf(fresh) === "נבדוק שוב בעדכון היומי הבא", "fresh: " + detailOf(fresh));
  const checked = await nlRow("2026-11-03T12:00:00Z", {checkedAt: "2026-11-03T11:00:00Z"});   // 14:00, checked 13:00
  assert.strictEqual(detailOf(checked), 'נבדק לאחרונה ב־<time datetime="2026-11-03T11:00:00.000Z">13:00</time> · התוצאה עוד לא נמצאה במקור הרשמי');
  // A run after the window is no proof this session was looked up (#156 HIGH): without checkedAt it stays "fresh".
  const runOnly = await nlRow("2026-11-03T12:00:00Z", {}, {generatedAt: "2026-11-03T11:00:00Z", lastRun: "2026-11-03T11:00:00Z"});
  assert.ok(!runOnly.includes("נבדק לאחרונה") && runOnly.includes("נבדוק שוב בעדכון היומי הבא"), "run time alone: fresh wording");
  const long = await nlRow("2026-11-06T10:00:00Z", {checkedAt: "2026-11-05T11:00:00Z"});
  assert.ok(detailOf(long).startsWith('התוצאה עוד לא נמצאה · <a href="https://www.issf-sports.org/schedule" target="_blank" rel="noopener">לוח התחרות הרשמי'), "long: " + detailOf(long));
  assert.ok(!detailOf(long).includes("<time") && !long.includes("נבדק"), "long: no time");
  for (const r of [fresh, checked, runOnly, long]) noLiveClaims(r, "awaiting");
});

test("source hosts: a long host is cut to its registrable domain (3 labels under .co.il), in every source link", async () => {
  const {run} = await boot();
  const h = u => run(`host(${JSON.stringify(u)})`);
  assert.strictEqual(h("https://78884ca60822a34fb0e6-082b8fd5551e97bc65e327988b444396.ssl.cf3.rackcdn.com/x.pdf"), "rackcdn.com");
  assert.strictEqual(h("https://sports.walla.co.il/item/1"), "walla.co.il", "not co.il");
  assert.strictEqual(h("https://www.sport5.co.il/x"), "sport5.co.il");
  assert.strictEqual(h("https://results.fie.org/x"), "results.fie.org", "short hosts stay as they are");
  assert.strictEqual(h("https://ifsc.results.info/x"), "ifsc.results.info", "17 characters: the subdomain is the brand");
  assert.strictEqual(h("https://www.ijf.org/x"), "ijf.org");
  assert.strictEqual(h("https://live.olympic-committee.org.il/x"), "olympic-committee.org.il");
  // The game log and the other linkOut() labels use the same helper as hostLink().
  assert.ok(run(`linkOut("https://sports.walla.co.il/r", "מקור: " + host("https://sports.walla.co.il/r"))`).includes(">מקור: walla.co.il<"));
  assert.ok(run(`hostLink("https://a1b2.ssl.cf3.rackcdn.com/x.pdf", "לוח הזמנים")`).includes("לוח הזמנים: <bdi>rackcdn.com</bdi>"));
});

test("near-live: result stamp today and on another day, source host in <bdi>, every time in <time datetime>", async () => {
  const res = {result: "מקום 12", resultSource: "https://www.issf-sports.org/r", resultAt: "2026-11-03T08:40:00Z"};
  const today = await nlRow("2026-11-03T12:00:00Z", res);
  assert.ok(today.includes('עודכן ב־<time datetime="2026-11-03T08:40:00.000Z">10:40</time>'), "today: HH:MM");
  assert.ok(today.includes('rel="noopener">מקור: <bdi>issf-sports.org</bdi><span class="sr"> (נפתח בחלון חדש)</span></a>'), "source label");
  const later = await nlRow("2026-11-04T12:00:00Z", res);
  assert.ok(/עודכן ב־<time datetime="2026-11-03T08:40:00.000Z">3 בנוב׳, 10:40<\/time>/.test(later), "another day: {d}, HH:MM");
  const page = (await boot({data: withSessions([NL_SESS(res)]), quotas: SITE_QUOTAS, now: "2026-11-04T12:00:00Z"})).view("day-2026-11-03");
  const outside = page.replace(/<time datetime="[^"]+">[^<]*<\/time>/g, "");
  assert.ok(!/\d\d?:\d\d/.test(visibleText(outside)), "a time outside <time>");
  noLiveClaims(page, "result page");
});

test("near-live: page line is stale only on a day with sessions today and an old check", async () => {
  const old = {generatedAt: "2026-11-02T09:00:00Z", lastRun: "2026-11-02T09:00:00Z"};   // 27h before 12:00Z on 3.11
  const stale = (await boot({data: {...withSessions([NL_SESS()]), ...old}, quotas: SITE_QUOTAS, now: "2026-11-03T12:00:00Z"})).view("day-2026-11-03");
  assert.ok(stale.includes('<p class="fresh stale"><i></i><span>הנתונים לא עודכנו מאז <time datetime="2026-11-02T09:00:00.000Z">2 בנוב׳, 11:00</time> · ייתכן שיש תוצאות שעוד לא מופיעות כאן</span></p>'), "stale line");
  const b = await boot({data: {...withSessions([]), ...old, athletes: FIXTURE.athletes.map(a => ({...a, nextDate: "2027-01-01"}))}, quotas: SITE_QUOTAS, now: "2026-11-03T12:00:00Z"});
  const empty = b.view("day-2026-11-03");
  assert.ok(empty.includes('<div class="empty">') && empty.includes('<p class="fresh"><i></i><span>נכון ל־') && !empty.includes("stale"), "no sessions: never stale");
  const fresh = (await boot({data: {...withSessions([NL_SESS()]), generatedAt: "2026-11-03T05:00:00Z"}, quotas: SITE_QUOTAS, now: "2026-11-03T12:00:00Z"})).view("day-2026-11-03");
  assert.ok(fresh.includes('<p class="fresh"><i></i><span>נכון ל־<time datetime="2026-11-03T05:00:00.000Z">07:00</time> · מתעדכן פעם ביום</span></p>'), "fresh today: HH:MM");
});

test("near-live: #c- and #day render the same row; #c- line under the h1, schedule source, label-first counts", async () => {
  const data = withSessions([NL_SESS({checkedAt: "2026-11-03T11:00:00Z"})]);
  const b = await boot({data, quotas: SITE_QUOTAS, now: "2026-11-03T12:00:00Z"});
  const li = html => html.split('<ul class="rows sess">')[1].split("</ul>")[0];
  const c = b.run(`viewEvent("issf-wch-doha-2026")`);
  assert.strictEqual(li(c), li(b.view("day-2026-11-03")), "same row on both pages");
  const head = c.split('<div class="event-head"')[1].split("</div>")[0];
  assert.ok(head.indexOf("</h1>") < head.indexOf('<p class="fresh'), "fresh line under the h1");
  assert.ok(c.includes('rel="noopener">לוח הזמנים: <bdi>issf-sports.org</bdi>'), "schedule source from the session");
  assert.ok(c.includes("בהמתנה לתוצאה: 1") && !c.includes("אחד/ת"), "awaiting count, label first");
  noLiveClaims(c, "#c-");
  const ad = (await eventAt(AD, "2026-11-05T08:00:00Z", {data: adFallback()})).out;   // the five pinned entrants
  assert.ok(ad.includes("<p class=\"kpi\">5 ספורטאים ונבחרות · בהמתנה לתוצאה: 5</p>"), "kpi line");
});

test("session rows at phone width: names get the full width, not the 70px time column (Gil P2 on #182)", () => {
  const css = fs.readFileSync(path.join(ROOT, "site/styles.css"), "utf8");
  const base = css.indexOf(".rows.sess li{grid-template-columns:70px 1fr auto}");
  const phone = [...css.matchAll(/@media \(max-width:640px\)\{([^{}]*\{[^}]*\})*\}/g)]
    .find(m => m[0].includes(".rows.sess li{grid-template-columns:1fr auto}"));
  assert.ok(base > 0 && phone && phone.index > base, "phone rule after the base rule, same specificity");
});

test("#day merges sessions with the fallback per athlete (lead review on #151, MEDIUM)", async () => {
  // Richter has a session on 3.11; Abu Dhabi judo athletes (29.10) have none and keep their nextDate rows.
  const b = await boot({data: withSessions([SESS()]), quotas: SITE_QUOTAS, now: "2026-10-26T08:00:00Z"});
  const j = b.view("day-2026-10-29");
  assert.ok(j.includes('id="ds-judo"') && j.includes('href="#a-gefen-primo"') && (j.includes('<span class="d">תאריך בלבד</span>') || j.includes('<span class="muted"> · תאריך בלבד</span>')), "athletes without a session stay");
  const sh = b.view("day-2026-11-03");
  assert.strictEqual((sh.match(/href="#a-sergey-richter"/g) || []).length, 1, "an athlete with a session isn't repeated from the fallback");
  assert.ok(sh.includes('<span class="d"><time datetime="2026-11-03T06:15:00.000Z">08:15</time></span>'));
});

test("#day: a session without its own result shows the athlete's history result for that day (lead review on #151, HIGH)", async () => {
  const data = withSessions([SESS()]);
  data.athletes.find(a => a.id === "sergey-richter").history.push({at: "2026-11-03", kind: "result", text: "מקום 30 <i>במוקדמות</i>", source: "https://www.issf-sports.org/r"});
  const out = (await boot({data, quotas: SITE_QUOTAS, now: "2026-11-03T12:00:00Z"})).view("day-2026-11-03");
  const row = out.split('<ul class="rows sess">')[1].split("</ul>")[0];
  assert.ok(row.includes("<b>תוצאה:</b> מקום 30 &lt;i&gt;במוקדמות&lt;/i&gt;") && !row.includes("בהמתנה לתוצאה"), "history result fills the session");
  assert.ok(!row.includes("עודכן ב־") && row.includes('href="https://www.issf-sports.org/r"'), "date-only result: no stamp, its source linked");
  const other = withSessions([SESS()]);
  other.athletes.find(a => a.id === "sergey-richter").history.push({at: "2026-11-02", kind: "result", text: "יום אחר", source: "https://x.org"});
  assert.ok(!(await boot({data: other, quotas: SITE_QUOTAS, now: "2026-11-03T12:00:00Z"})).view("day-2026-11-03").includes("יום אחר"), "only the same day");
});

test("#day (Gil D4, D6, D8): 'תאריך בלבד', no stakes for earned items, followed sports first", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  // 29.10: judo (Abu Dhabi) and a weightlifter moved onto the same day, so two sports are listed.
  const lifter = data.athletes.find(a => a.sportId === "weightlifting");
  lifter.nextDate = "2026-10-29";
  const q = JSON.parse(JSON.stringify(SITE_QUOTAS));
  const judo = q.items.filter(i => i.sportId === "judo" && i.stakes && i.nextQuotaEvent?.start === "2026-10-29");
  judo.forEach(i => { i.israelStatus = "earned"; i.earnedAt = "2026-10-29"; });
  const b = await boot({data, quotas: q, now: "2026-10-26T08:00:00Z", storage: {"la28.followSports": JSON.stringify(["weightlifting"])}});
  const out = b.view("day-2026-10-29");
  assert.ok(out.includes('<span class="muted"> · תאריך בלבד</span></h3>'), "D4: an all-untimed group says תאריך בלבד once, in its heading");
  assert.ok(!/<span class="d">תאריך בלבד<\/span>[\s\S]*<span class="d">תאריך בלבד<\/span>/.test(out.split('id="ds-judo"')[1].split("</section>")[0]), "D4: not repeated on every judo row");
  const judoBlock = out.split('id="ds-judo"')[1].split("</section>")[0];
  assert.ok(judo.length && !judo.some(i => judoBlock.includes(i.stakes.slice(0, 20))), "D6: earned items don't show pre-event stakes");
  assert.ok(out.indexOf('id="ds-weightlifting"') < out.indexOf('id="ds-judo"'), "D8: followed sport first");
  assert.ok(out.split('id="ds-weightlifting"')[1].split("</h2>")[0].includes("במעקב שלך"), "D8: followed sport marked");
});

test("#day: a result day with no known competition isn't titled with the athlete's later 'next' (Gil, v52 regression)", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  const lifter = data.athletes.find(a => a.sportId === "weightlifting");
  lifter.next = "תחרות עתידית"; lifter.nextDate = "2026-12-01";
  lifter.history = [...(lifter.history || []), {at: "2026-09-15", kind: "result", text: "מקום 4", source: "https://example.org/r"}];
  const b = await boot({data, quotas: SITE_QUOTAS, now: "2026-10-20T08:00:00Z"});
  assert.strictEqual(b.run('compOn("weightlifting", "2026-09-15")'), null, "precondition: no competition that day");
  const block = b.view("day-2026-09-15").split('id="ds-weightlifting"')[1].split("</section>")[0];
  assert.ok(block.includes("מקום 4"), "the result row is listed");
  assert.ok(!block.includes("תחרות עתידית"), "not titled with the later competition");
  assert.ok(block.includes(`<h3>${b.run('sportName("weightlifting")')}<`), "falls back to the sport name");
});

test("#following tabs: the current tab has a visible style, not only aria-current", async () => {
  const css = fs.readFileSync(path.join(ROOT, "site/styles.css"), "utf8");
  assert.ok(/\.chips a\[aria-current="page"\]\{[^}]*background:var\(--/.test(css));
});

test("#day sessions sort by time with untimed last (Gil P1 on #151)", async () => {
  const data = withSessions([
    SESS({id: "a", startUtc: null, athleteIds: ["sergey-richter"], phase: "ללא שעה"}),
    SESS({id: "b", startUtc: "2026-11-03T08:00:00Z", phase: "שנייה"}),
    SESS({id: "c", startUtc: "2026-11-03T06:00:00Z", phase: "ראשונה"}),
  ]);
  const out = (await boot({data, quotas: SITE_QUOTAS, now: "2026-11-01T08:00:00Z"})).view("day-2026-11-03");
  const order = ["ראשונה", "שנייה", "ללא שעה"].map(t => out.indexOf(t));
  assert.ok(order.every(i => i > 0) && order[0] < order[1] && order[1] < order[2], "08:00, 10:00, then untimed: " + order);
});

test("#day: an athlete with a session later in the competition isn't listed on their nextDate too (Gil P1 on #151)", async () => {
  // Hershko's nextDate is day 1 of Abu Dhabi (29.10); her session is on day 3 (31.10).
  const data = withSessions([SESS({id: "j1", competitionId: "judo-gs-abu-dhabi-2026", date: "2026-10-31", startUtc: "2026-10-31T07:00:00Z",
    athleteIds: ["raz-hershko"], phase: "מעל 78 ק״ג"})]);
  const b = await boot({data, quotas: SITE_QUOTAS, now: "2026-10-26T08:00:00Z"});
  assert.ok(!b.view("day-2026-10-29").includes('href="#a-raz-hershko"'), "not on her nextDate");
  assert.ok(b.view("day-2026-10-29").includes('href="#a-izhak-ashpiz"'), "others without a session keep their nextDate row");
  assert.strictEqual((b.view("day-2026-10-31").match(/href="#a-raz-hershko"/g) || []).length, 1, "once, on the session day");
});

test("refresh keeps focus without an id (href, data-follow), reopens <details>, polls every 5 minutes (Gil on #152)", async () => {
  const {ctx, run, els} = await boot();
  assert.strictEqual(run("REFRESH_MS"), 5 * 60e3);
  run(`$("view")`);
  // A tiny stand-in for the rendered #view: elements found by attribute selector, plus <details>.
  const mk = attrs => ({attrs, focused: 0, open: false, getAttribute: k => k in attrs ? attrs[k] : null, focus(){ this.focused++; }});
  let nodes = [];
  const render = () => { nodes = [mk({href: "#a-x"}), mk({href: "#day-2026-10-29"}), mk({href: "#day-2026-10-29"}), mk({"data-follow": "raz-hershko"})];
    details = [mk({}), mk({})]; };
  let details = [];
  render();
  els.view.querySelectorAll = sel => sel === "details" ? details
    : nodes.filter(n => Object.entries(n.attrs).some(([k, v]) => sel === `[${k}="${v}"]`));
  const realRoute = run("route");
  ctx.route = () => { render(); return realRoute(); };
  const check = (old, pick, label) => {
    ctx.document.activeElement = old;
    run("refresh()");
    assert.strictEqual(pick().focused, 1, label);
  };
  check(nodes[2], () => nodes[2], "second of two equal hrefs (a #day chip)");
  check(nodes[3], () => nodes[3], "☆ button by data-follow");
  details[1].open = true;
  ctx.document.activeElement = null;
  run("refresh()");
  assert.ok(details[1].open && !details[0].open, "open <details> reopened by index");
});

// Home "today" hub (#176, docs/design/home-today.md §6).
// Abu Dhabi as planned before the fixture refresh: the five judoka of day 1 on 29.10, nobody else on 3.11.
// A nextDate-fallback scenario: five judoka on 29.10, none with a session (the fixture's real Abu Dhabi sessions,
// since 19.10, are dropped so the scenario doesn't move with refreshes).
const judoOn29 = () => { const d = JSON.parse(JSON.stringify(FIXTURE));
  d.sessions = (d.sessions || []).filter(x => x.competitionId !== "judo-gs-abu-dhabi-2026");
  for (const a of d.athletes) if (["gefen-primo", "izhak-ashpiz", "raz-hershko", "timna-nelson-levy", "yonatan-elbaz"].includes(a.id)) a.nextDate = "2026-10-29";
  return d; };
const todayOf = html => html.split('aria-labelledby="todayH"')[1]?.split("</section>")[0] || "";
const resultsOf = html => html.split('aria-labelledby="homeResH"')[1]?.split("</section>")[0] || "";

test("home today: 8 sessions show 6, followed first, each row links its #c-, the more link counts the hidden", async () => {
  const list = Array.from({length: 8}, (_, i) => SESS({id: `s${i}`, startUtc: `2026-11-03T0${i + 1}:00:00Z`, phase: `מקצה ${i}`}));
  list[7].athleteIds = ["raz-hershko"];
  const only = l => { const d = withSessions(l); d.athletes.forEach(a => { a.nextDate = ""; }); return d; };   // sessions only
  const b = await boot({data: only(list), quotas: SITE_QUOTAS, now: "2026-11-03T00:30:00Z", follows: ["raz-hershko"]});
  const sec = todayOf(b.view("home"));
  const rows = sec.split('<ul class="rows sess">')[1].split("</ul>")[0].split("<li>").slice(1);
  assert.strictEqual(rows.length, 6);
  assert.ok(rows[0].includes('href="#a-raz-hershko"') && rows[0].includes("במעקב שלך"), "followed first");
  for (const r of rows) assert.ok(r.includes('<small><a href="#c-issf-wch-doha-2026">אליפות העולם בקליעה</a></small>') && !r.includes("#sport-"), r);
  assert.ok(sec.includes('<a href="#today">ועוד 2 הופעות היום</a>') && sec.includes('<h2 id="todayH"><a class="hlink" href="#today">היום, יום ג׳, 3 בנוב׳</a></h2>'));
  const seven = await boot({data: only(list.slice(1)), quotas: SITE_QUOTAS, now: "2026-11-03T00:30:00Z"});
  assert.ok(todayOf(seven.view("home")).includes(">ועוד הופעה אחת היום</a>"), "one more");
});

test("home today: Abu Dhabi on 29.10, an empty day with הבא בתור, running competitions without a session", async () => {
  const ad = todayOf((await boot({data: judoOn29(), quotas: SITE_QUOTAS, now: "2026-10-29T08:00:00Z"})).view("home"));
  assert.ok(ad.includes('<a href="#c-judo-gs-abu-dhabi-2026">גרנד סלאם אבו דאבי</a>') && ad.includes("pill s-live") && !ad.includes("לכל התחרויות היום"));
  // components §1: no time in the group → empty .d, "תאריך בלבד" once on the heading.
  const dates = ad.split("<li>").slice(1).map(li => /<span class="d">([^<]*)<\/span>/.exec(li)?.[1]);
  // Five set by judoOn29 plus Matan Kokolayev (new on 19.10, nextDate 29.10): six, the home cap.
  assert.ok(dates.length === 6 && dates.every(d => d === ""), "empty .d: " + dates);
  assert.ok(/<h2 id="todayH"><a class="hlink" href="#today">[^<]+<\/a><span class="muted"> · תאריך בלבד<\/span><\/h2>/.test(ad), "on the heading, once");
  const empty = todayOf((await boot({data: judoOn29(), quotas: SITE_QUOTAS, now: "2026-10-26T08:00:00Z"})).view("home"));
  const nextRows = empty.split('<h3>הבא בתור: יום ה׳, 29 באוק׳<span class="muted"> · תאריך בלבד</span></h3>')[1]?.split("</ul>")[0] || "";
  assert.ok(empty.includes('<p class="muted">אין היום הופעות ידועות של ספורטאים או נבחרות מישראל.</p>')
    && (nextRows.match(/<li>/g) || []).length === 3 && nextRows.includes("pill s-before")
    && empty.includes('<p><a href="#day-2026-10-29">לכל ההופעות ב־29 באוק׳</a></p>'), "empty day: the next day's first 3 rows (PM on #171)");
  // Ben Nanadze's nextDate is 5.11 (trampoline Worlds, since the 19.10 fixture); clear it so 5.11 has no Israeli rows.
  const doha = todayOf((await boot({data: setAthlete(withSessions([SESS()]), "ben-nanadze", {nextDate: ""}), quotas: SITE_QUOTAS, now: "2026-11-05T08:00:00Z"})).view("home"));
  assert.ok(/<p class="foot">עוד היום, בלי הופעה ידועה של ישראלים: .*<a href="#c-issf-wch-doha-2026">אליפות העולם בקליעה<\/a>/.test(doha), doha);
  assert.ok(!doha.split("<h3>")[0].includes('<ul class="rows sess">'), "no rows for today");
});

test("home today: at most 2 'על הכף היום' lines, one per running competition, followed item first; won panel placement (PM on #171)", async () => {
  const stakes = html => html.match(/<p class="stakes"><b>על הכף היום · [\s\S]*?<\/p>/g) || [];
  const plain = stakes(todayOf((await boot({quotas: SITE_QUOTAS, now: "2026-10-29T08:00:00Z"})).view("home")));
  assert.ok(plain.length >= 1 && plain.length <= 2, plain.join("\n"));
  assert.strictEqual(plain.filter(l => l.includes("ק״ג")).length, 1, "one line per competition");
  assert.ok(/^<p class="stakes"><b>על הכף היום · <bdi>[^<]+<\/bdi>:<\/b> [^:]/.test(plain[0]) && !plain[0].includes("#c-"), "event, one colon (UX QA)");
  const followed = stakes(todayOf((await boot({quotas: SITE_QUOTAS, now: "2026-10-29T08:00:00Z", follows: ["raz-hershko"]})).view("home")));
  assert.ok(followed[0].includes("<bdi>78+ ק״ג נשים</bdi>"), followed[0]);
  const q = JSON.parse(JSON.stringify(SITE_QUOTAS));
  for (const i of q.items.filter(i => i.sportId === "judo")) Object.assign(i, {israelStatus: "earned", earnedAt: "2026-10-29"});
  const won = (await boot({quotas: q, now: "2026-10-29T08:00:00Z"})).view("home");
  assert.ok(!stakes(won).some(l => l.includes("ק״ג")), "earned: no stakes");
  assert.ok(won.indexOf('class="panel won"') < won.indexOf('id="todayH"'), "earned today: won above היום");
  const older = (await boot({quotas: q, now: "2026-11-07T08:00:00Z"})).view("home");   // 9 days later: still in the 14-day panel
  assert.ok(older.includes('class="panel won"') && older.indexOf('class="panel won"') > older.indexOf('id="homeResH"'), "older than 7 days: below");
});

test("home on phones with a new quota: one line above היום, the panel after the results (PM on #171, Gil P2)", async () => {
  const q = JSON.parse(JSON.stringify(SITE_QUOTAS));
  const judo = q.items.filter(i => i.sportId === "judo");
  Object.assign(judo[0], {israelStatus: "earned", earnedAt: "2026-10-27"});
  const one = (await boot({quotas: q, now: "2026-10-29T08:00:00Z"})).view("home");
  assert.ok(new RegExp(`<p class="won-compact"><a href="#sport-judo">✓ מכסה חדשה לישראל: ג׳ודו · <bdi>${judo[0].event}</bdi> \\(27 באוק׳\\)</a></p>`).test(one), one.slice(0, 3000));
  assert.ok(one.indexOf("won-compact") < one.indexOf('<div class="home-top">') && one.indexOf('class="panel won"') < one.indexOf('id="todayH"'), "desktop DOM order: panel on top");
  Object.assign(judo[1], {israelStatus: "earned", earnedAt: "2026-10-28"});
  const two = (await boot({quotas: q, now: "2026-10-29T08:00:00Z"})).view("home");
  assert.ok(two.includes('<p class="won-compact"><a href="#quotas">✓ 2 מכסות חדשות לישראל ב־7 הימים האחרונים</a></p>'));
  assert.ok(!(await boot({quotas: SITE_QUOTAS, now: "2026-10-29T08:00:00Z"})).view("home").includes("won-compact"), "nothing new: no line");
  const css = fs.readFileSync(path.join(ROOT, "site/styles.css"), "utf8");
  assert.ok(/\.won-compact\{display:none/.test(css) && /@media \(max-width:640px\)\{\.won-compact\{display:block\}\.home-top > \.won\{order:1\}\}/.test(css), "phone-only line, panel after the results");
});

test("home results: 48 h window, date-only history, no source dropped, session and history once", async () => {
  const at = h => new Date(Date.parse("2026-11-05T10:00:00Z") - h * 36e5).toISOString().replace(".000", "");
  const res = (id, h, over = {}) => SESS({id, date: "2026-11-03", result: `תוצאה ${id}`, resultSource: "https://www.issf-sports.org/r", resultAt: at(h), ...over});
  const data = withSessions([res("in", 47), res("out", 49, {athleteIds: ["raz-hershko"]})]);
  const richter = data.athletes.find(a => a.id === "sergey-richter"), gefen = data.athletes.find(a => a.id === "gefen-primo");
  richter.history.push({at: "2026-11-03", kind: "result", text: "כפול", source: "https://x.org"});   // same athlete + day as "in"
  gefen.history.push({at: "2026-11-04", kind: "result", text: "אתמול", source: "https://www.ijf.org/r"},
    {at: "2026-11-05", kind: "result", text: "בלי מקור"});
  const sec = resultsOf((await boot({data, quotas: SITE_QUOTAS, now: "2026-11-05T10:00:00Z"})).view("home"));
  assert.ok(sec.includes("תוצאה in") && !sec.includes("תוצאה out"), "47 h in, 49 h out");
  assert.ok(sec.includes('<time datetime="2026-11-03T11:00:00.000Z">3 בנוב׳, 13:00</time>') && sec.includes('<a href="#c-issf-wch-doha-2026">'));
  assert.ok(sec.includes('<h3>יום ד׳, 4 בנוב׳<span class="muted"> · תאריך בלבד</span></h3>') && sec.includes("<b>תוצאה:</b> אתמול · ")
    && !sec.split("<h3>יום ד׳, 4 בנוב׳")[1].split("<h3>")[0].includes("עודכן"), "history: a date-only group, no stamp");
  assert.ok(sec.includes('<h3>יום ג׳, 3 בנוב׳</h3>') && sec.includes('<span class="d"><time datetime="2026-11-03T06:15:00.000Z">08:15</time></span>'), "session rows: shared sessionRow, by day");
  assert.ok(!sec.includes("בלי מקור") && !sec.includes("כפול"), "no source, no row; the session wins");
  assert.ok(sec.includes('rel="noopener">מקור: <bdi>issf-sports.org</bdi>') && !sec.includes("pill") && !sec.includes("✓"), "source, no chip");
  assert.ok(sec.indexOf("אתמול") < sec.indexOf("תוצאה in"), "newest first");
  const empty = resultsOf((await boot({quotas: SITE_QUOTAS, now: "2026-10-26T08:00:00Z"})).view("home"));
  assert.ok(empty.includes("אין תוצאות חדשות ב־48 השעות האחרונות.") && empty.includes('<p class="foot">ב־48 השעות האחרונות · מתעדכן פעם ביום · <a href="#updates">לכל העדכונים באתר</a></p>'));
  // 7 results: 5 rows, the other 2 in <details>; the #updates link stays in the foot.
  const seven = withSessions(Array.from({length: 7}, (_, i) => res(`r${i}`, i + 1, {date: "2026-11-04", athleteIds: [["sergey-richter", "raz-hershko", "gefen-primo", "izhak-ashpiz", "timna-nelson-levy", "yonatan-elbaz", "inbal-shemesh"][i]]})));
  const many = resultsOf((await boot({data: seven, quotas: SITE_QUOTAS, now: "2026-11-05T10:00:00Z"})).view("home"));
  const [top, more] = many.split("<details>");
  assert.strictEqual((top.match(/<li>/g) || []).length, 5);
  assert.ok(more.startsWith("<summary>ועוד 2 תוצאות ב־48 השעות האחרונות</summary>") && (more.match(/<li>/g) || []).length === 2, more.slice(0, 200));
  assert.ok(!more.split("</summary>")[0].includes("#updates") && many.includes('· <a href="#updates">לכל העדכונים באתר</a></p>'));
});

test("home: fresh line in the hero, no live wording for editors either", async () => {
  const b = await boot({data: judoOn29(), quotas: SITE_QUOTAS, now: "2026-10-29T08:00:00Z"});
  const home = b.view("home");
  const hero = home.split('<section class="hero">')[1].split("</section>")[0];
  assert.ok(/<p class="fresh( stale)?"><i><\/i><span>/.test(hero) && hero.includes("<time datetime="), "freshLine in the hero");
  noLiveClaims(home, "home");
  b.run("S.live = true; S.lastRun = '2026-10-29T07:00:00Z'");
  const live = b.view("home");
  noLiveClaims(live, "home, S.live");
  assert.ok(!live.includes("עדכון אוטומטי אחרון"), "editor freshness says נכון ל־ too");
});

// UX S4 (sprint6-ux-specs.md): one "השבוע" panel, one row per day with Israelis, tomorrow to today+7.
const weekOf = html => html.split('aria-labelledby="weekH"')[1]?.split("</section>")[0] ?? null;
const weekDays = week => [...week.matchAll(/<span class="d"><a href="#day-([\d-]+)">/g)].map(m => m[1]);
const nextUpDay = html => (html.match(/<a href="#day-([\d-]+)">לכל ההופעות ב־/) || [])[1] || "";

test("S4 week: normal week, \"הבא בתור\" day left out, followed names, quota pill, foot; the old lists are gone", async () => {
  const home = (await boot({quotas: SITE_QUOTAS, follows: ["raz-hershko"], now: "2026-10-28T08:00:00Z"})).view("home");
  const week = weekOf(home);
  assert.strictEqual(nextUpDay(home), "2026-10-29", "precondition: 29.10 is \"הבא בתור\"");
  assert.deepStrictEqual(weekDays(week), ["2026-10-30", "2026-10-31", "2026-11-02", "2026-11-03", "2026-11-04"], "no day twice; every .d links #day-");
  const rows = week.split("<li>").slice(1), r31 = rows[1];
  assert.ok(r31.includes('<a href="#c-judo-gs-abu-dhabi-2026">גרנד סלאם אבו דאבי</a>') && r31.includes('<a href="#a-raz-hershko">רז הרשקו</a> · ועוד 2 ספורטאים ונבחרות')
    && r31.includes("★"), "followed name first, then the rest's count");
  assert.ok(rows[0].includes("<small>3 ספורטאים ונבחרות</small>") && rows[2].includes("<small>ספורטאי/ת או נבחרת אחת</small>"), "counts");
  assert.ok(rows[0].includes("◐</span> אירוע מכסה") && !rows[3].includes("אירוע מכסה"), "quota pill only on a quota-event day of that day's sports");
  assert.ok(week.includes('<p class="foot"><a href="#calendar">ללוח התחרויות</a></p>'), "foot");
  for (const gone of ["ישראלים בפעולה ב־14 הימים", "<h2>תחרויות קרובות</h2>", 'class="grid2"']) assert.ok(!home.includes(gone), gone);
  assert.ok(home.indexOf('id="homeResH"') < home.indexOf('id="weekH"'), "right after homeNow()");
  // 22.10: 24.10 is "הבא בתור", so the week has 25.10 (the Frankfurt marathon, in the fixture since 19.10) and 29.10.
  const h22 = (await boot({quotas: SITE_QUOTAS, now: "2026-10-22T08:00:00Z"})).view("home");
  assert.strictEqual(nextUpDay(h22), "2026-10-24");
  assert.deepStrictEqual(weekDays(weekOf(h22)), ["2026-10-25", "2026-10-29"]);
});

// Sprint 8: "חדש" since the viewer's last visit on #c- and the week panel, as on athlete cards.
test("since last visit: #c- rows and week-panel days mark athletes updated after la28.seen", async () => {
  const data = clone();
  data.athletes.find(a => a.id === "raz-hershko").updatedAt = "2026-10-27T09:00:00Z";
  const seen = {"la28.seen": JSON.stringify("2026-10-26T00:00:00Z")};
  const stale = data.athletes.filter(a => a.id !== "raz-hershko" && String(a.updatedAt || "") > "2026-10-26T00:00:00Z");
  stale.forEach(a => { a.updatedAt = "2026-10-20T00:00:00Z"; });   // precondition: only Raz changed since the visit
  const b = await boot({data, storage: seen, now: "2026-10-28T08:00:00Z"});
  const ev = b.view("c-judo-gs-abu-dhabi-2026").split('id="evAthH"')[1].split("</section>")[0];
  const rowOf = (html, id) => html.split("<li>").find(r => r.includes(`href="#a-${id}"`)) || "";
  assert.ok(rowOf(ev, "raz-hershko").includes('<span class="new">חדש</span>'), "#c-: Raz marked");
  assert.ok(!rowOf(ev, "gefen-primo").includes('class="new"'), "#c-: an unchanged athlete isn't");
  const week = b.view("home").split('aria-labelledby="weekH"')[1].split("</section>")[0];
  const day = d => week.split("<li>").find(r => r.includes(`href="#day-${d}"`)) || "";
  assert.ok(day("2026-10-31").includes('<span class="new">חדש</span>') && !day("2026-10-30").includes('class="new"'), "week: only Raz's day");
  // A first visit has no baseline, so nothing is marked; storage that throws behaves the same.
  const first = await boot({data, now: "2026-10-28T08:00:00Z"});
  assert.ok(!first.view("c-judo-gs-abu-dhabi-2026").includes('class="new"') && !first.view("home").split('aria-labelledby="weekH"')[1].includes('class="new"'));
  const blocked = await boot({data, now: "2026-10-28T08:00:00Z"});
  blocked.ctx.localStorage.getItem = () => { throw new Error("SecurityError"); };
  assert.strictEqual(blocked.run(`store.get("la28.seen", null)`), null, "store.get survives blocked storage");
});

test("S4 week: today only, empty week (hidden or calendar line), result night and its end", async () => {
  const on = async now => (await boot({quotas: SITE_QUOTAS, now})).view("home");
  const todayOnly = weekOf(await on("2026-11-17T08:00:00Z"));
  assert.ok(todayOnly.includes('<p class="muted">אחרי היום אין עוד תחרויות ידועות של ספורטאים או נבחרות מישראל בשבוע הקרוב. <a href="#day-2026-11-27">ליום התחרויות הבא: 27 בנוב׳ 2026</a></p>')
    && todayOnly.includes('href="#calendar"'), "today only: next day after the week, and the calendar foot");
  assert.strictEqual(weekOf(await on("2026-11-21T08:00:00Z")), null, "the week's only day is \"הבא בתור\": hidden");
  const empty = weekOf(await on("2026-11-19T08:00:00Z"));
  assert.ok(empty.includes('<p class="muted">אין תחרויות ידועות של ספורטאים או נבחרות מישראל בשבוע הקרוב. <a href="#calendar">ללוח התחרויות</a></p>')
    && !empty.includes('class="foot"') && !empty.includes("<li>"), "\"הבא בתור\" after the week: the calendar line, no second calendar link");
  // Result night: 19.10's sessions on 20.10 at 08:00 with no result.
  const night = weekOf(await on("2026-10-20T05:00:00Z")), first = night.split("<li>")[1];
  assert.ok(first.startsWith('<span class="d"><a href="#day-2026-10-19">אתמול</a></span>') && first.includes("2 הופעות ממתינות לתוצאה")
    && first.includes('<span class="pill s-wait"><span aria-hidden="true">◷</span> בהמתנה לתוצאה</span>'), "the אתמול row first");
  const landed = clone();
  for (const s of landed.sessions.filter(s => s.date === "2026-10-19")) Object.assign(s, {result: "מקום 30", resultSource: "https://www.gymnastics.sport/r", resultAt: "2026-10-19T23:00:00Z"});
  for (const a of landed.athletes.filter(a => a.nextDate === "2026-10-19")) a.nextDate = "";
  const after = weekOf((await boot({data: landed, quotas: SITE_QUOTAS, now: "2026-10-20T05:00:00Z"})).view("home")) || "";
  assert.ok(!after.includes("אתמול"), "every result landed: the row goes");
  assert.ok(!(weekOf(await on("2026-10-22T08:00:00Z")) || "").includes("אתמול"), "past 48 h (awaitLong) the row goes");
});

// Standings vs. the quota line (#179, docs/design/standings.md §7). Judo 60 kg, cutoff 17 on the Olympic list.
const OLY = "IJF Olympic Ranking List";
const CUT = {rank: 17, list: OLY, url: "https://www.ijf.org/wrl_olympic", final: "2028-06-15", opens: "2026-06-15"};
const standingsAt = async ({ranks = {}, cutoff = CUT, now = "2026-10-18T08:00:00Z", follows = []} = {}) => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  const ashpiz = data.athletes.find(a => a.id === "izhak-ashpiz");
  for (const [id, name] of [["j-second", "ג׳ודוקא שני"], ["j-third", "ג׳ודוקא שלישי"]])
    data.athletes.push({...JSON.parse(JSON.stringify(ashpiz)), id, name, name_en: "", history: []});
  // No rank unless a test gives one (the refreshed fixture has Ashpiz's world rank, which the clones would copy).
  for (const a of data.athletes.filter(a => ["izhak-ashpiz", "j-second", "j-third"].includes(a.id)))
    Object.assign(a, {rankNum: null, rankList: "", rankAsOf: "", olympicRankNum: null, olympicRankList: "", olympicRankAsOf: ""});
  for (const [id, r] of Object.entries(ranks)) Object.assign(data.athletes.find(a => a.id === id), r);
  const q = JSON.parse(JSON.stringify(SITE_QUOTAS));
  if (cutoff) q.items.find(i => i.sportId === "judo" && i.event === "60- ק״ג גברים").cutoff = cutoff;
  const b = await boot({data, quotas: q, now, follows});
  const page = b.view("sport-judo");
  return {b, page, block: page.split('aria-labelledby="standH"')[1]?.split("</section>")[0] || ""};
};
const rank = (n, asOf = "2026-10-03", list = OLY) => ({rankNum: n, rankList: list, rankAsOf: asOf});
const NEVER = /עולה|בפנים|הבטיח|מכסה בדרך|מעפיל|בטוח|כמעט/;

test("standings: judo 60 kg — 5, the line, 41; unranked listed; links; sr status; no verdict words", async () => {
  const {block, page} = await standingsAt({ranks: {"izhak-ashpiz": rank(5), "j-second": rank(41)}, follows: ["izhak-ashpiz"]});
  assert.ok(page.indexOf('id="standH"') > page.indexOf("שיטת ההעפלה") && page.indexOf('id="standH"') < page.indexOf("תחרויות קרובות בענף"), "position");
  assert.ok(block.includes("<h3><bdi>60- ק״ג גברים</bdi></h3>") && (block.match(/<h3>/g) || []).length === 1, "only items with a cutoff");
  assert.ok(block.includes('<bdi><a href="https://www.ijf.org/wrl_olympic" target="_blank" rel="noopener">IJF Olympic Ranking List<span class="sr"> (נפתח בחלון חדש)</span></a></bdi> · '), "list → cutoff.url, in <bdi> (Shira)");
  assert.ok(block.includes('rel="noopener">שיטת ההעפלה<span class="sr">') && block.includes('href="https://www.ausjudo.com.au/'), "system → q.source");
  const ol = block.split('<ol class="rows standings">')[1].split("</ol>")[0];
  const order = ['<span class="d">5</span>', 'class="cutline"', '<span class="d">41</span>'].map(x => ol.indexOf(x));
  assert.ok(order[0] >= 0 && order[0] < order[1] && order[1] < order[2], "5, line, 41: " + order);
  assert.ok(ol.includes('<li class="cutline" aria-hidden="true">קו המכסה: מקום 17</li>'));
  assert.ok(ol.includes('<span class="sr">, מעל קו המכסה</span>') && ol.includes('<span class="sr">, מתחת לקו המכסה</span>'));
  assert.ok(ol.includes("במעקב שלך") && ol.includes("3 באוק׳ 2026"), "★ and rankAsOf");
  assert.ok(block.includes('ללא דירוג: <a href="#a-j-third">ג׳ודוקא שלישי</a>'), "Gil: unranked listed");
  assert.ok(block.includes("הקו הוא מקום ברשימה, לא תחזית.") && block.includes("הדירוג הסופי נקבע ב־15 ביוני 2028."), "caveat");
  assert.ok(!NEVER.test(visibleText(block)), "no verdict words");
});

test("standings: the line is last when all are above, first when all are below", async () => {
  const ol = async ranks => (await standingsAt({ranks})).block.split('<ol class="rows standings">')[1].split("</ol>")[0];
  const above = await ol({"izhak-ashpiz": rank(5), "j-second": rank(9), "j-third": rank(17)});
  assert.ok(above.lastIndexOf("<li") === above.indexOf('<li class="cutline"'), "last");
  const below = await ol({"izhak-ashpiz": rank(18), "j-second": rank(40)});
  assert.ok(below.indexOf("<li") === below.indexOf('<li class="cutline"') && !below.includes("מעל קו המכסה"), "first");
});

test("standings: a 75-day-old rank keeps its place with a neutral pill; another list is never placed against the line", async () => {
  const {block} = await standingsAt({ranks: {"izhak-ashpiz": rank(5, "2026-08-04"), "j-second": rank(3, "2026-10-03", "IJF World Ranking List")}});
  const ol = block.split('<ol class="rows standings">')[1].split("</ol>")[0];
  assert.ok(ol.includes('<span class="pill ended">דירוג מ־4 באוג׳ 2026</span>') && !ol.includes("s-wait"), "stale flagged, not hidden");
  assert.ok(!ol.includes("j-second") && block.includes('בדירוג אחר: <a href="#a-j-second">ג׳ודוקא שני</a>, מקום 3 ב־<bdi>IJF World Ranking List</bdi>'), "other list");
});

test("standings: period not open, no cutoff, an invalid cutoff; athlete page fact", async () => {
  const early = await standingsAt({ranks: {"izhak-ashpiz": rank(5)}, cutoff: {...CUT, opens: "2026-11-01"}});
  assert.ok(early.block.includes("<p class=\"muted\">תקופת הדירוג להעפלה נפתחת ב־1 בנוב׳ 2026.</p>") && !early.block.includes("<ol"), "not open");
  assert.ok(!(await standingsAt({cutoff: null})).page.includes("standH"), "no cutoff, no block");
  assert.ok(!(await standingsAt({cutoff: {...CUT, url: "http://x"}})).page.includes("standH"), "invalid cutoff dropped");
  const {b} = await standingsAt({ranks: {"izhak-ashpiz": rank(5), "j-second": rank(3, "2026-10-03", "IJF World Ranking List")}});
  const fact = b.view("a-izhak-ashpiz").split("<dt>מול קו המכסה</dt>")[1]?.split("</dd>")[0] || "";
  assert.ok(fact.includes('<a href="#sport-judo">מקום 5 · הקו: מקום 17</a> · <bdi>IJF Olympic Ranking List</bdi>, 3 באוק׳ 2026'), fact);
  assert.ok(!b.view("a-j-second").includes("מול קו המכסה"), "no fact when the lists differ");
});

test("standings: Olympic rank first, world rank as fallback; athlete page shows both (PM on #218)", async () => {
  const oly = (n, asOf = "2026-10-18") => ({olympicRankNum: n, olympicRankList: OLY, olympicRankAsOf: asOf});
  const {block, b} = await standingsAt({ranks: {
    "izhak-ashpiz": {...rank(13, "2026-10-12", "IJF World Ranking List"), ...oly(2)},   // world 13, Olympic 2
    "j-second": rank(20)}});                                                          // only a "world" field, on the cutoff's list
  const ol = block.split('<ol class="rows standings">')[1].split("</ol>")[0];
  assert.ok(ol.indexOf('<span class="d">2</span>') < ol.indexOf("cutline") && ol.indexOf("cutline") < ol.indexOf('<span class="d">20</span>'), ol);
  assert.ok(!ol.includes('<span class="d">13</span>') && !block.includes("בדירוג אחר"), "the world rank isn't placed when an Olympic one is");
  const page = b.view("a-izhak-ashpiz");
  assert.ok(page.includes("<dt>דירוג ההעפלה האולימפי</dt><dd>מקום 2 (<bdi>IJF Olympic Ranking List</bdi>, נכון ל־18 באוק׳ 2026)</dd>"), "Olympic line");
  assert.ok(page.includes('<a href="#sport-judo">מקום 2 · הקו: מקום 17</a>'), "standing uses the Olympic rank");
});

test("standings UX QA: caveat once per panel, no cut line without placed athletes, no row date beside a stale pill, phone grid", async () => {
  const {page, block} = await standingsAt({ranks: {"izhak-ashpiz": rank(5, "2026-08-04")}});
  assert.strictEqual(page.split("הקו הוא מקום ברשימה, לא תחזית.").length - 1, 1, "caveat once");
  assert.ok(block.includes('<p class="foot">הדירוג הסופי נקבע ב־15 ביוני 2028.</p>'), "per block: the final date only");
  assert.ok(block.includes('<span class="pill ended">דירוג מ־4 באוג׳ 2026</span>') && !block.includes("</a> · 4 באוג׳"), "stale: date in the pill only");
  assert.ok(page.indexOf('id="standH"') > page.indexOf("שיטת ההעפלה") && page.indexOf('id="standH"') < page.indexOf('id="qH"'), "right after שיטת ההעפלה");
  const empty = (await standingsAt({ranks: {"izhak-ashpiz": rank(3, "2026-10-03", "IJF World Ranking List")}})).block;
  assert.ok(!empty.includes("cutline") && !empty.includes("<ol") && empty.includes("בדירוג אחר: "), "nobody on the list: no line");
  const css = fs.readFileSync(path.join(ROOT, "site/styles.css"), "utf8");
  assert.ok(/@media \(max-width:640px\)\{\.rows\.standings li\{grid-template-columns:3\.5ch 1fr auto\}/.test(css), "rank stays beside the name on phones");
});

// sprint-7.md: stakes only where Israel competes (an Israeli in the sport has a session or nextDate in the event).
test("stakes only where Israel competes: Rotterdam men's team final hidden, Abu Dhabi 29.10 shown", async () => {
  const TEAM = "גמר קבוצתי ב־20 באוק׳ 2026", NOTE = "לא ידוע על ספורטאי/ת מישראל בשלב הזה";
  // 20.10: Israel isn't in the men's team final (no session or nextDate that day).
  const r = await boot({quotas: SITE_QUOTAS, now: "2026-10-20T09:00:00Z"});
  const home = r.view("home");
  assert.ok(!home.includes("על הכף היום · <bdi>קבוצתי גברים</bdi>") && !home.includes(TEAM), "home: no team-final stakes");
  assert.ok(!r.view("day-2026-10-20").includes(TEAM), "#day: no team-final stakes");
  const ev = r.view("c-ag-worlds-2026").split('id="evStakesH"')[1].split("</section>")[0];
  assert.ok(ev.includes(`<p class="muted">${NOTE}</p>`) && !ev.includes(TEAM), "#c-: the note instead of the stakes");
  assert.ok(!r.view("digest").includes(TEAM), "digest: no team-final stakes");
  // Shown again once an Israeli has a session in it.
  const inFinal = clone();
  inFinal.sessions = [...inFinal.sessions, {competitionId: "ag-worlds-2026", date: "2026-10-20", startUtc: "2026-10-20T14:00:00Z",
    athleteIds: ["artem-dolgopyat"], phase: "גמר קבוצתי"}];
  const withSession = await boot({data: inFinal, quotas: SITE_QUOTAS, now: "2026-10-20T09:00:00Z"});
  assert.ok(withSession.view("home").includes(TEAM) && withSession.view("c-ag-worlds-2026").split('id="evStakesH"')[1].includes(TEAM),
    "with an Israeli session the stakes return");
  // 29.10, Abu Dhabi day 1: Israeli judoka have nextDate inside the event.
  const a = await boot({quotas: SITE_QUOTAS, now: "2026-10-29T08:00:00Z"});
  assert.ok(a.view("home").includes("על הכף היום · <bdi>"), "home: the Grand Slam stakes");
  assert.ok(a.view("day-2026-10-29").includes('<p class="stakes"><b>מה זה אומר:</b>'), "#day: stakes");
  const ad = a.view("c-judo-gs-abu-dhabi-2026").split('id="evStakesH"')[1].split("</section>")[0];
  const li = ev => ad.split("<li>").find(x => x.includes(`<bdi>${ev}</bdi>`)) || "";
  assert.ok(li("60- ק״ג גברים").includes("<b>מה זה אומר:</b>") && !li("60- ק״ג גברים").includes(NOTE), "#c-: Ashpiz's weight, stakes");
});

// Item level first: a weight whose own athletes have no start in the event shows no stakes, even when other
// Israelis in the sport compete that day; an item that names nobody falls back to the sport (the team final above).
test("stakes check is item-level: a judo weight with no Israeli entered stays quiet on an Abu Dhabi day", async () => {
  const data = JSON.parse(JSON.stringify(FIXTURE));
  const kerem = data.athletes.find(a => a.id === "kerem-primo");
  Object.assign(kerem, {nextDate: ""});   // 63- ק״ג: Kerem Primo, no start known in Abu Dhabi
  const a = await boot({data, quotas: SITE_QUOTAS, now: "2026-10-29T08:00:00Z"});
  const ev = a.view("c-judo-gs-abu-dhabi-2026").split('id="evStakesH"')[1].split("</section>")[0];
  const li = e => ev.split("<li>").find(x => x.includes(`<bdi>${e}</bdi>`)) || "";
  assert.ok(li("63- ק״ג נשים").includes('<p class="muted">לא ידוע על ספורטאי/ת מישראל בשלב הזה</p>') && !li("63- ק״ג נשים").includes("<b>מה זה אומר:</b>"), "63-: no stakes, the cautious note");
  assert.ok(li("60- ק״ג גברים").includes("<b>מה זה אומר:</b>"), "60- (Ashpiz, 29.10): stakes");
  const stakes63 = SITE_QUOTAS.items.find(i => i.sportId === "judo" && i.event === "63- ק״ג נשים").stakes;
  for (const page of ["home", "day-2026-10-29", "digest"]) assert.ok(!a.view(page).includes(a.run(`esc(${JSON.stringify(stakes63)})`)), `${page}: no 63- stakes`);
  // Her start becomes known (a nextDate inside the event): the stakes are back.
  kerem.nextDate = "2026-10-30";
  const b = await boot({data, quotas: SITE_QUOTAS, now: "2026-10-29T08:00:00Z"});
  const ev2 = b.view("c-judo-gs-abu-dhabi-2026").split('id="evStakesH"')[1].split("</section>")[0];
  assert.ok((ev2.split("<li>").find(x => x.includes("<bdi>63- ק״ג נשים</bdi>")) || "").includes("<b>מה זה אומר:</b>"), "63-: back with her start");
});

test("home today lists only athletes competing today, not the rest of a running competition (Gil P3)", async () => {
  // 30.10, day 2 of Abu Dhabi: the judo athletes' nextDate is 29.10, so none of them competes today.
  // The fixture's Abu Dhabi: nextDate 29.10 (Primo, Ashpiz, Nelson Levy), 30.10 (Elbaz, Goshen), 31.10 (Hershko, Simin).
  const sec = todayOf((await boot({quotas: SITE_QUOTAS, now: "2026-10-30T08:00:00Z"})).view("home"));
  const ids = id => FIXTURE.athletes.filter(a => a.sportId === "judo" && a.nextDate === id).map(a => a.id);
  assert.ok(ids("2026-10-30").length && ids("2026-10-30").every(id => sec.includes(`href="#a-${id}"`)), "today's are listed");
  for (const id of [...ids("2026-10-29"), ...ids("2026-10-31")]) assert.ok(!sec.split("<h3>")[0].includes(`href="#a-${id}"`), id);
});

test("#digest: a 'מתקיימת עכשיו' note from before an event isn't printed under its results (Gil P3)", async () => {
  const {text} = await digestOf({now: "2026-10-26T09:00:00Z"});
  const gym = digestSection(text, "תוצאות השבוע").split("\n• ").find(b => b.includes("התעמלות מכשירים")) || "";
  // Only that status phrase: a result that happens to say "עכשיו" stays (Gil, blocking on #237).
  const data = JSON.parse(JSON.stringify(FIXTURE));
  data.changes.unshift({at: "2026-10-24", text: "התעמלות מכשירים: ליהיא רז עכשיו במקום 12 בדירוג.", athleteId: "lihie-raz"});
  const kept = digestSection((await digestOf({data, now: "2026-10-26T09:00:00Z"})).text, "תוצאות השבוע");
  assert.ok(kept.includes("ליהיא רז עכשיו במקום 12 בדירוג"), kept);
  assert.ok(gym && !gym.includes("עכשיו"), gym);
  assert.ok(!digestSection(text, "מה התעדכן").includes("ברוטרדם מתקיימת עכשיו"), "not moved to the changes section either");
});

// #sports took ~500 ms and an empty day ~140 ms here before the perf fixes; every route is now under 20 ms.
// The budget is loose so a slow machine doesn't flake, but a superlinear loop still blows through it.
test("render budget: every route under 50 ms at 3x today's data", async () => {
  const bench = require("./bench.js");
  const data = bench.dataAt(3), b = await bench.boot(data, data.athletes.slice(0, 10).map(a => a.id));
  // bench.dataAt adds standings ranks and corrections, so #sport-judo, the game log and #corrections have content.
  const html = r => (b.ctx.location.hash = "#" + r, b.run("route()"), b.els.view.innerHTML);
  assert.ok(html("sport-judo").includes('id="standH"') && html("a-raz-hershko").includes('id="logH"') && html("corrections").includes('class="fix"'),
    "the heavy sections render");
  const slow = [...bench.ALL_ROUTES, "admin"]
    .map(r => { if (r === "admin") b.run("S.isAdmin = true; S.live = true"); return [r, bench.timeRoute(b, r, 5)]; }).filter(([, ms]) => ms > 50);
  assert.deepStrictEqual(slow.map(([r, ms]) => `#${r} ${ms.toFixed(0)} ms`), []);
});

test("first-visitor audit F1/F3: hero tag links to #about, the line names the sources and the hand checks, phones show both", async () => {
  const b = await boot({quotas: SITE_QUOTAS, now: "2026-10-18T15:00:00Z"});
  const home = b.view("home"), hero = home.split('<section class="hero">')[1].split("</section>")[0];
  assert.ok(hero.includes('<div class="hero-title"><h1 tabindex="-1">הדרך ללוס אנג׳לס 28</h1><a class="tag" href="#about">מעקב לא רשמי · מה זה?</a></div>'), "F1");
  const verified = Number(b.run(`S.athletes.filter(a => trustOf(a) !== "auto").length`)), n = FIXTURE.athletes.length;
  assert.ok(hero.includes(`<p class="fresh"><i></i><span>נכון ל־<time datetime="`) && hero.includes(`</time> · ממקורות רשמיים · ${verified} מתוך ${n} נבדקו ידנית · <a href="#about-trust">איך אנחנו בודקים</a></span></p>`), "F3");
  assert.ok(!home.match(/<p class="kpi">.*?<\/p>/)[0].includes("ידנית"), "F3: the KPI drops the count");
  // Phones hide only .hero-sub (home-today §1); the tag and the line sit outside it.
  const sub = hero.split('<p class="muted hero-sub">')[1].split("</p>")[0];
  assert.ok(!sub.includes("#about") && !sub.includes("fresh"), "not inside the hidden subtitle");
  const stale = (await boot({data: {...FIXTURE, generatedAt: "2026-10-27T05:00:00Z", lastRun: "2026-10-27T05:00:00Z"}, quotas: SITE_QUOTAS, now: "2026-10-29T08:00:00Z"})).view("home");
  const staleHero = stale.split('<section class="hero">')[1].split("</section>")[0];
  assert.ok(new RegExp(`<p class="fresh stale"><i></i><span>הנתונים לא עודכנו מאז <time[^>]+>[^<]+</time> · ייתכן שיש תוצאות שעוד לא מופיעות כאן · ממקורות רשמיים · \\d+ מתוך ${n} נבדקו ידנית · <a href="#about-trust">איך אנחנו בודקים</a></span></p>`).test(staleHero), "stale: warning first, the checks stay (Noa)");
  const noTs = (await boot({data: {...FIXTURE, generatedAt: "", lastRun: ""}, quotas: SITE_QUOTAS, now: "2026-10-18T15:00:00Z"})).view("home");
  assert.ok(noTs.split('<section class="hero">')[1].split("</section>")[0].includes(`<p class="fresh"><i></i><span>ממקורות רשמיים · ${verified} מתוך ${n} נבדקו ידנית · <a href="#about-trust">איך אנחנו בודקים</a></span></p>`), "no check time: the checks stay");
});

// Pairs from the published data of 18.10: [free text, official name, the text names the competition].
test("sameName: a city, year, parenthetical or dash style doesn't make a second link name (Gil, 14-day rows)", async () => {
  const {run} = await boot();
  const pairs = [
    ["אליפות העולם בהתעמלות מכשירים, רוטרדם", "אליפות העולם בהתעמלות מכשירים 2026", true],
    ["אליפות העולם בהתעמלות מכשירים, רוטרדם – מוקדמות נשים (קרב־רב)", "אליפות העולם בהתעמלות מכשירים 2026", true],
    ["גביע העולם בטריאתלון, טונגיונג", "גביע העולם בטריאתלון טונגיונג", true],
    ["אליפות העולם בשייט – מקצי זוגות, גדיניה", "אליפות העולם בשייט - מקצי זוגות (49er/FX, 470, נאקרה)", true],
    ["טורנירי טרום-מוקדמות אולימפיים FIBA", "טורנירי טרום־מוקדמות אולימפיים FIBA – אירופה (גברים)", true],
    ["גרנד סלאם אבו דאבי", "גרנד סלאם אבו דאבי", true],
    // The official name adds what the text lacks (gender, discipline, sport): it stays as the link beside the text.
    ["אליפות אירופה בלקרוס סיקסס – סאלו, ספרד", "אליפות אירופה בלקרוס סיקסס – נשים", false],
    ["אליפות העולם באקווטיקה בודפשט", "אליפות העולם באקווטיקה 2027 – מים פתוחים", false],
    ["אליפות העולם רוטרדם – גמר קבוצתי גברים", "אליפות העולם בהתעמלות מכשירים 2026", false],
    ["2026", "אליפות העולם 2026", false],
  ];
  for (const [x, y, want] of pairs) assert.strictEqual(run(`sameName(${JSON.stringify(x)}, ${JSON.stringify(y)})`), want, `${x} || ${y}`);
});

// tests/probe.js: every route on 7 dates, visitor and with follows; ~1 s on the fixture.
test("route probe: no throw, not-found, junk, banned copy, duplicate id, dangling aria or non-https link", async () => {
  const {probe} = require("./probe.js");
  const {renders, findings} = await probe({data: FIXTURE, quotas: QUOTAS_SNAPSHOT});
  assert.ok(renders > 1000, `only ${renders} renders`);
  assert.deepStrictEqual(findings, []);
});

test("route probe: each check fires", () => {
  const {check} = require("./probe.js");
  const found = html => { const out = []; check(html, "x", w => out.push(w)); return out; };
  const bad = {
    junk: "<p>undefined</p>", attr: '<a href="#a-null">x</a>', banned: "<span>השעה תפורסם</span>",
    dup: '<h2 id="a"></h2><p id="a"></p>', aria: '<section aria-labelledby="nope"></section>', http: '<a href="http://x.org">x</a>',
  };
  for (const [k, html] of Object.entries(bad)) assert.strictEqual(found(html).length, 1, `${k}: ${found(html)}`);
  assert.deepStrictEqual(found('<h2 id="h">ok</h2><section aria-labelledby="h"><a href="https://x.org">x</a> <a href="#home">y</a></section>'), []);
});

test("standings copy (Gil on #266): no LA28 in public text; a rank without a date gets no invented pill text", async () => {
  const {block, b} = await standingsAt({ranks: {"izhak-ashpiz": {olympicRankNum: 2, olympicRankList: OLY, olympicRankAsOf: "2026-10-12"},
    "j-second": {olympicRankNum: 20, olympicRankList: OLY, olympicRankAsOf: ""}}});
  const row = block.split("<li>").find(li => li.includes('href="#a-j-second"')) || "";
  assert.ok(row && !row.includes("pill") && !block.includes("תאריך לא ידוע"), row);
  const page = b.view("a-izhak-ashpiz");
  assert.ok(!/LA28/.test(visibleText(block + page)) && page.includes("<dt>דירוג ההעפלה האולימפי</dt>"), "copy-rules: no LA28; Shira's short label");
});

test("standings (Noa on #266): the athlete page flags a stale rank like the sport page; a future date is never fresh", async () => {
  const {b, block} = await standingsAt({ranks: {"izhak-ashpiz": {olympicRankNum: 2, olympicRankList: OLY, olympicRankAsOf: "2026-08-04"},
    "j-second": {olympicRankNum: 20, olympicRankList: OLY, olympicRankAsOf: "2026-11-30"}}});
  const page = b.view("a-izhak-ashpiz");
  const facts = page.split("<dt>דירוג ההעפלה האולימפי</dt>")[1].split("</dl>")[0];
  assert.ok(facts.includes('מקום 2 (<bdi>IJF Olympic Ranking List</bdi> <span class="pill ended">דירוג מ־4 באוג׳ 2026</span>)') && !facts.includes("נכון ל־4 באוג׳"), facts);
  assert.ok(facts.includes('<bdi>IJF Olympic Ranking List</bdi> <span class="pill ended">דירוג מ־4 באוג׳ 2026</span></dd>'), "the standing fact too");
  const future = block.split("<li>").find(li => li.includes('href="#a-j-second"')) || "";
  assert.ok(future.includes('<span class="pill ended">דירוג מ־30 בנוב׳ 2026</span>'), "future date flagged: " + future);
});

// Fencing (#179, sprint 7 item 4): the individual line on FIE's AOR (an Olympic list) and the team line on the
// team ranking, where the ranked unit is the national team (standings.md §1). Period opens 1.4.2027.
const FENCING_Q = () => {
  const q = JSON.parse(fs.readFileSync(path.join(ROOT, "site/quotas.json"), "utf8"));
  assert.strictEqual(q.items.filter(i => i.sportId === "fencing" && i.cutoff).length, 2, "fencing cutoffs live");
  return q;
};
const AOR = "FIE Senior Individual Adjusted Official Ranking (AOR)";
const fencingAt = async ({now = "2027-05-10T08:00:00Z", freilich = {}, teamRank} = {}) => {
  const data = JSON.parse(JSON.stringify(FIXTURE)), q = FENCING_Q();
  Object.assign(data.athletes.find(a => a.id === "yuval-freilich"), freilich);
  if (teamRank !== undefined) q.items.find(i => i.sportId === "fencing" && /קבוצתי/.test(i.event)).teamRank = teamRank;
  const b = await boot({data, quotas: q, now});
  const page = b.view("sport-fencing");
  const blocks = (page.split('aria-labelledby="standH"')[1] || "").split("</section>")[0].split("<h3>").slice(1);
  return {b, page, team: blocks.find(x => x.includes("קבוצתי")) || "", solo: blocks.find(x => x.includes("אישי")) || ""};
};

test("fencing standings: not open before 1.4.2027; then the AOR line for the individual event", async () => {
  const now = await fencingAt({now: "2026-10-20T08:00:00Z"});
  for (const blk of [now.team, now.solo]) assert.ok(blk.includes("תקופת הדירוג להעפלה נפתחת ב־1 באפר׳ 2027.") && !blk.includes("<ol"), blk);
  const above = await fencingAt({freilich: {olympicRankNum: 2, olympicRankList: AOR, olympicRankAsOf: "2027-05-01"}});
  const ol = above.solo.split('<ol class="rows standings">')[1].split("</ol>")[0];
  assert.ok(ol.indexOf('<span class="d">2</span>') < ol.indexOf("cutline") && ol.includes("קו המכסה: מקום 2") && ol.includes("1 במאי 2027"), ol);
  assert.ok(!above.solo.includes("בדירוג אחר"), "the world rank isn't listed when the AOR one is placed");
  const below = await fencingAt({freilich: {olympicRankNum: 5, olympicRankList: AOR, olympicRankAsOf: "2027-01-20"}});
  const ol2 = below.solo.split('<ol class="rows standings">')[1].split("</ol>")[0];
  assert.ok(ol2.indexOf("cutline") < ol2.indexOf('<span class="d">5</span>') && ol2.includes('<span class="pill ended">דירוג מ־20 בינו׳ 2027</span>'), "below the line, stale flagged");
  const world = await fencingAt({freilich: {rankNum: 262, rankList: "FIE Senior Individual Ranking", rankAsOf: "2027-05-01", olympicRankNum: null}});
  assert.ok(world.solo.includes("בדירוג אחר: ") && world.solo.includes("מקום 262 ב־<bdi>FIE Senior Individual Ranking</bdi>"), "world only: other list");
  const none = await fencingAt({freilich: {rankNum: null, olympicRankNum: null}});
  assert.ok(none.solo.includes('ללא דירוג: <a href="#a-yuval-freilich">'), "unranked");
});

test("fencing standings: the team event ranks the national team, never its fencers", async () => {
  const src = "https://fie.org/athletes";
  const above = (await fencingAt({teamRank: {num: 3, asOf: "2027-05-01", source: src}})).team;
  const ol = above.split('<ol class="rows standings">')[1].split("</ol>")[0];
  assert.ok(ol.indexOf("נבחרת ישראל") < ol.indexOf("cutline") && ol.includes('<span class="d">3</span>') && ol.includes("קו המכסה: מקום 4")
    && ol.includes('<span class="sr">, מעל קו המכסה</span>') && ol.includes(`href="${src}"`), ol);
  const below = await fencingAt({teamRank: {num: 9, asOf: "2027-01-20", source: src}});
  const ol2 = below.team.split('<ol class="rows standings">')[1].split("</ol>")[0];
  assert.ok(ol2.indexOf("cutline") < ol2.indexOf("נבחרת ישראל") && ol2.includes('<span class="pill ended">דירוג מ־20 בינו׳ 2027</span>'), "below, stale flagged");
  const unranked = await fencingAt({teamRank: null});
  assert.ok(unranked.team.includes("ללא דירוג: נבחרת ישראל") && !unranked.team.includes('href="#a-'), "no team rank: the team, unranked");
  // A team fencer's own rank never stands for the team, on the sport page or the athlete page.
  const fencer = FIXTURE.athletes.find(a => a.sportId === "fencing" && /קבוצתי/.test(a.event));
  const data = JSON.parse(JSON.stringify(FIXTURE));
  Object.assign(data.athletes.find(a => a.id === fencer.id), {rankNum: 1, rankList: "FIE Senior Team Ranking", rankAsOf: "2027-05-01"});
  const b = await boot({data, quotas: FENCING_Q(), now: "2027-05-10T08:00:00Z"});
  assert.ok(!b.view(`a-${fencer.id}`).includes("מול קו המכסה"), "no team standing on a fencer's page");
  assert.ok(b.run(`teamRankOf({num: 0, asOf: "2027-05-01", source: "${src}"})`) === null && b.run(`teamRankOf({num: 2, asOf: "x", source: "${src}"})`) === null, "invalid teamRank dropped");
});

// tests/livecheck.js: Gil's v55 live check §3/§4 (docs/qa/live-check-v55.md) on the fixture, so a regression it
// would catch on the live site fails the PR instead.
test("live check v55 §3/§4 on the fixture: every check passes", async () => {
  const {livecheck} = require("./livecheck.js");
  const results = await livecheck({data: FIXTURE, quotas: JSON.parse(fs.readFileSync(path.join(ROOT, "site/quotas.json"), "utf8"))});
  assert.ok(results.length >= 36, `only ${results.length} checks`);
  assert.deepStrictEqual(results.filter(([, ok]) => !ok).map(([id, , note]) => id + (note ? ` (${note})` : "")), []);
});

// tests/preview_at.js reuses boot() to render real data on a chosen date.
module.exports = {boot};
if (require.main === module) (async () => {
  let failed = 0;
  for (const {name, fn} of tests) {
    try { await fn(); console.log(`ok   ${name}`); }
    catch (e) { failed++; console.log(`FAIL ${name}\n     ${e && e.stack || e}`); }
  }
  console.log(`${tests.length - failed}/${tests.length} passed (scripts: ${SCRIPTS.map(f => path.relative(ROOT, f)).join(", ")})`);
  process.exit(failed ? 1 : 0);
})();
