// Render benchmark for the main routes (not part of CI). Same vm + DOM stub as smoke.test.js, clock pinned to an
// event day, data at today's size and scaled up. Run: node tests/bench.js [scale ...]   (default: 1 3)
// Numbers are a desktop Node baseline; a mid-range phone is roughly 4-6x slower (docs/perf/2026-10.md).
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
// The page's own script order, so a new site/*.js is always benched.
const SCRIPTS = [...fs.readFileSync(path.join(ROOT, "site/index.html"), "utf8").matchAll(/<script src="([\w.-]+\.js)">/g)]
  .map(m => path.join(ROOT, "site", m[1]));
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/data.json"), "utf8"));
const QUOTAS = JSON.parse(fs.readFileSync(path.join(ROOT, "site/quotas.json"), "utf8"));
// site/quotas.json has no standings cutoffs yet: judo's items get one, so #sport-judo renders its standings block.
const OLY = "IJF Olympic Ranking List";
for (const q of QUOTAS.items || []) if (q.sportId === "judo" && !q.cutoff) q.cutoff = {rank: 17, list: OLY, url: "https://www.ijf.org/wrl", final: "2028-06-15"};
const NOW = "2026-10-29T08:00:00Z";   // Abu Dhabi day 1: strip, #day and #c- all have content
// Every route a visitor can reach (#admin is editors only; the budget test switches it on).
const ALL_ROUTES = ["home", "today", "day-2026-10-29", "day-2026-12-24", "c-judo-gs-abu-dhabi-2026", "a-raz-hershko", "following",
  "sports", "sport-judo", "calendar", "calendar-judo", "quotas", "updates", "about", "digest", "corrections", "corrections-raz-hershko"];
const ROUTES = process.env.BENCH_ONLY ? process.env.BENCH_ONLY.split(",") : ALL_ROUTES;

// Today's shape (about 110 athletes, 10 sessions) at scale 1; athletes and sessions multiplied at higher scales.
function dataAt(scale){
  const d = JSON.parse(JSON.stringify(FIXTURE));
  const judo = d.athletes.filter(a => a.sportId === "judo").map(a => a.id);
  const sessions = Array.from({length: 10}, (_, i) => ({competitionId: "judo-gs-abu-dhabi-2026", date: `2026-10-${29 + (i % 3)}`,
    startUtc: `2026-10-${29 + (i % 3)}T${String(6 + i).padStart(2, "0")}:00:00Z`, athleteIds: [judo[i % judo.length]], phase: `סבב ${i}`,
    ...(i % 2 ? {result: `תוצאה ${i}`, resultSource: "https://www.ijf.org/r", resultAt: "2026-10-29T18:00:00Z"} : {})}));
  for (const a of d.athletes) a.history = [...(a.history || []), {at: "2026-09-12", kind: "result", text: "מקום 5", source: "https://example.org/r"}];
  d.athletes.filter(a => a.sportId === "judo").forEach((a, i) => Object.assign(a, {olympicRankNum: 5 + 3 * i, olympicRankList: OLY, olympicRankAsOf: "2026-10-12"}));
  const base = d.athletes.slice();
  for (let k = 1; k < scale; k++) {
    for (const a of base) d.athletes.push({...JSON.parse(JSON.stringify(a)), id: `${a.id}-x${k}`, name: `${a.name} ${k}`});
    for (const s of sessions.slice(0, 10)) sessions.push({...s, athleteIds: s.athleteIds.map(id => `${id}-x${k}`)});
  }
  d.sessions = sessions;
  // A live corrections log with one entry per athlete, spread over the 11 months since launch.
  d.launchAt = "2025-12-01T00:00:00Z";
  const month = i => ["2025-12", ...Array.from({length: 10}, (_, k) => `2026-${String(k + 1).padStart(2, "0")}`)][i % 11];
  d.corrections = d.athletes.map((a, i) => ({id: `fx${i}`, at: `${month(i)}-${String(2 + (i % 26)).padStart(2, "0")}T10:00:00Z`, reportedAt: "",
    by: "reader", source: "https://www.ijf.org/wrl", target: {kind: "athlete", id: a.id, name: a.name}, changes: [{field: "rank", wrong: "א", right: "ב"}]}));
  return d;
}

function fakeEl(id){
  return {id, innerHTML: "", value: "", textContent: "", hidden: false, dataset: {}, addEventListener(){}, setAttribute(){},
    removeAttribute(){}, toggleAttribute(){}, focus(){}, querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    insertAdjacentHTML(_, h){ this.innerHTML += h; }, scrollIntoView(){}};
}

async function boot(data, follows){
  const els = {}, NOWMS = Date.parse(NOW);
  const D = class extends Date { constructor(...a){ a.length ? super(...a) : super(NOWMS); } static now(){ return NOWMS; } };
  const mem = new Map([["la28.follows", JSON.stringify(follows)], ["la28.followSports", '["judo","sailing"]'], ["la28.followingSeen", '"2026-10-01T00:00:00Z"']]);
  const ctx = {console, URL, Intl, Date: D, Math, JSON, Promise, clearTimeout,
    setTimeout: (f, ms, ...a) => { const t = setTimeout(f, ms, ...a); if (ms > 1000) t.unref(); return t; }, setInterval: () => 0, clearInterval(){},
    location: {hash: "", reload(){}}, history: {replaceState(){}}, scrollTo(){}, addEventListener(){}, removeEventListener(){},
    localStorage: {getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k)},
    navigator: {}, matchMedia: () => ({matches: false, addEventListener(){}}),
    document: {getElementById: id => els[id] ??= fakeEl(id), querySelector: () => null, querySelectorAll: () => [], addEventListener(){}, activeElement: null},
    fetch: async url => ({ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(url === "quotas.json" ? QUOTAS : data))})};
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of SCRIPTS) vm.runInContext(fs.readFileSync(f, "utf8"), ctx, {filename: f});
  await new Promise(r => setTimeout(r, 30));
  return {ctx, els, run: e => vm.runInContext(e, ctx)};
}

const median = xs => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// Median ms of `runs` renders of one route, after a warm-up.
function timeRoute(b, r, runs = 15){
  b.ctx.location.hash = "#" + r;
  for (let i = 0; i < 3; i++) b.run("route()");
  return median(Array.from({length: runs}, () => { const t = process.hrtime.bigint(); b.run("route()"); return Number(process.hrtime.bigint() - t) / 1e6; }));
}

// smoke.test.js reuses these for its render budget.
module.exports = {dataAt, boot, timeRoute, ALL_ROUTES};
if (require.main === module) (async () => {
  const scales = process.argv.slice(2).map(Number).filter(Boolean);
  for (const scale of scales.length ? scales : [1, 3]) {
    const data = dataAt(scale), b = await boot(data, data.athletes.slice(0, 10).map(a => a.id));
    console.log(`\nscale ${scale}: ${data.athletes.length} athletes, ${data.sessions.length} sessions, ${data.competitions.length} competitions`);
    for (const r of ROUTES) {
      const ms = timeRoute(b, r);
      console.log(`  #${r.padEnd(26)} median ${ms.toFixed(1).padStart(7)} ms   html ${(b.els.view.innerHTML.length / 1024).toFixed(0)} KB`);
    }
  }
})();
