// Render benchmark for the main routes (not part of CI). Same vm + DOM stub as smoke.test.js, clock pinned to an
// event day, data at today's size and scaled up. Run: node tests/bench.js [scale ...]   (default: 1 3)
// Numbers are a desktop Node baseline; a mid-range phone is roughly 4-6x slower (docs/perf/2026-10.md).
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const SCRIPTS = ["app.js", "admin.js", "quotas.js", "digest.js", "corrections.js", "sessions.js", "day.js", "event.js", "gamelog.js", "following.js"]
  .map(f => path.join(ROOT, "site", f)).filter(fs.existsSync);
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/data.json"), "utf8"));
const QUOTAS = JSON.parse(fs.readFileSync(path.join(ROOT, "site/quotas.json"), "utf8"));
const NOW = "2026-10-29T08:00:00Z";   // Abu Dhabi day 1: strip, #day and #c- all have content
const ROUTES = (process.env.BENCH_ONLY || "home,today,c-judo-gs-abu-dhabi-2026,a-raz-hershko,following,sports,calendar,quotas").split(",");

// Today's shape (about 110 athletes, 10 sessions) at scale 1; athletes and sessions multiplied at higher scales.
function dataAt(scale){
  const d = JSON.parse(JSON.stringify(FIXTURE));
  const judo = d.athletes.filter(a => a.sportId === "judo").map(a => a.id);
  const sessions = Array.from({length: 10}, (_, i) => ({competitionId: "judo-gs-abu-dhabi-2026", date: `2026-10-${29 + (i % 3)}`,
    startUtc: `2026-10-${29 + (i % 3)}T${String(6 + i).padStart(2, "0")}:00:00Z`, athleteIds: [judo[i % judo.length]], phase: `סבב ${i}`,
    ...(i % 2 ? {result: `תוצאה ${i}`, resultSource: "https://www.ijf.org/r", resultAt: "2026-10-29T18:00:00Z"} : {})}));
  for (const a of d.athletes) a.history = [...(a.history || []), {at: "2026-09-12", kind: "result", text: "מקום 5", source: "https://example.org/r"}];
  const base = d.athletes.slice();
  for (let k = 1; k < scale; k++) {
    for (const a of base) d.athletes.push({...JSON.parse(JSON.stringify(a)), id: `${a.id}-x${k}`, name: `${a.name} ${k}`});
    for (const s of sessions.slice(0, 10)) sessions.push({...s, athleteIds: s.athleteIds.map(id => `${id}-x${k}`)});
  }
  d.sessions = sessions;
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

(async () => {
  const scales = process.argv.slice(2).map(Number).filter(Boolean);
  for (const scale of scales.length ? scales : [1, 3]) {
    const data = dataAt(scale), b = await boot(data, data.athletes.slice(0, 10).map(a => a.id));
    console.log(`\nscale ${scale}: ${data.athletes.length} athletes, ${data.sessions.length} sessions, ${data.competitions.length} competitions`);
    for (const r of ROUTES) {
      b.ctx.location.hash = "#" + r;
      for (let i = 0; i < 3; i++) b.run("route()");   // warm-up
      const times = Array.from({length: 15}, () => { const t = process.hrtime.bigint(); b.run("route()"); return Number(process.hrtime.bigint() - t) / 1e6; });
      console.log(`  #${r.padEnd(26)} median ${median(times).toFixed(1).padStart(7)} ms   html ${(b.els.view.innerHTML.length / 1024).toFixed(0)} KB`);
    }
  }
})();
