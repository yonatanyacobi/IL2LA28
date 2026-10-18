// Route probe: renders every route on several Israel dates, as a visitor and as a viewer with follows (plus a launched
// corrections log), and checks invariants that per-feature tests miss. Run before a publish with real data:
//   node tests/probe.js [data.json] [quotas.json] [YYYY-MM-DD ...]
// Defaults: the test fixture, the frozen quotas snapshot, and dates from the export day to 13 days after it.
// Exits 1 on any finding. smoke.test.js runs it on the fixture.
"use strict";
const fs = require("fs");
const path = require("path");
const {boot} = require("./smoke.test.js");

const NOT_FOUND = "הדף לא נמצא";
const BANNED = /השעה תפורסם|נתונים חיים|class="now"/;   // components.md "Checks"
const JUNK = /\b(undefined|NaN|null|Invalid Date)\b|\[object \w+\]/;
const DAY_OFFSETS = [0, 1, 2, 5, 7, 11, 13];

const ilDay = iso => new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Jerusalem"}).format(new Date(iso));
const addDays = (d, n) => new Date(Date.parse(d + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const defaultDays = data => (b => DAY_OFFSETS.map(n => addDays(b, n)))(ilDay(data.generatedAt || data.lastRun || Date.now()));

function check(html, r, add){
  const text = html.replace(/<[^>]*>/g, " ");
  const junk = text.match(JUNK) || html.match(/="[^"]*\b(?:undefined|NaN|null)\b[^"]*"/);
  if (junk) add(`"${junk[0].trim().slice(0, 60)}" in output`);
  const banned = html.match(BANNED);
  if (banned) add(`banned "${banned[0]}"`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  if (dup.length) add(`duplicate id ${dup.join(", ")}`);
  const dangling = [...html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)].flatMap(m => m[1].split(" ")).filter(x => !ids.includes(x));
  if (dangling.length) add(`aria reference to missing id ${[...new Set(dangling)].join(", ")}`);
  const href = html.match(/<a\b[^>]*\bhref="(?!https:\/\/|#|mailto:)[^"]*"/);
  if (href) add(`non-https link ${href[0].slice(0, 80)}`);
}

// Returns {renders, findings}; each finding is "route [date mode]: what". Repeats of one finding on other dates are
// folded into the first.
async function probe({data, quotas, days = defaultDays(data)}){
  const findings = new Map();
  let renders = 0;
  const athletes = data.athletes || [], sports = data.sports || [], comps = data.competitions || [];
  for (const day of days) for (const mode of ["visitor", "follows"]) {
    const follows = mode === "visitor" ? [] : athletes.slice(0, 12).map(a => a.id);
    const {view, run} = await boot({data: mode === "visitor" ? data : {...data, launchAt: data.launchAt || "2026-09-01T00:00:00Z"},
      quotas, now: `${day}T09:00:00Z`, follows, storage: mode === "visitor" ? {} : {
        "la28.followSports": JSON.stringify(sports.slice(0, 4).map(s => s.id)),
        "la28.followingSeen": JSON.stringify(addDays(day, -10) + "T00:00:00Z"), "la28.followingShown": "{}"}});
    const fixedRoutes = ["home", "today", "day", ...[-3, -1, 0, 1, 3, 7].map(n => `day-${addDays(day, n)}`), "sports", "quotas",
      "calendar", "updates", "about", "about-trust", "digest", "following", "following-sports"];
    const routes = [...fixedRoutes, ...(mode === "follows" ? ["corrections"] : []),
      ...sports.flatMap(s => [`sport-${s.id}`, `calendar-${s.id}`]), ...athletes.map(a => `a-${a.id}`), ...comps.map(c => `c-${c.id}`)];
    for (const r of routes) {
      renders++;
      const key = r.startsWith("day-") ? "day-<date>" : r;
      const add = what => { const k = `${key}: ${what}`; if (!findings.has(k)) findings.set(k, `${r} [${day} ${mode}]: ${what}`); };
      let html;
      try { html = view(r); } catch (e) { add(`throws ${e && e.message || e}`); continue; }
      if (html.includes(NOT_FOUND)) add("renders not-found");
      check(html, r, add);
    }
    let digest = "";
    try { digest = run("digestText()"); } catch (e) { findings.set(`digest throws`, `digest [${day}]: throws ${e.message}`); }
    if (JUNK.test(digest)) findings.set("digest junk", `digest [${day}]: "${digest.match(JUNK)[0]}"`);
  }
  return {renders, findings: [...findings.values()]};
}

module.exports = {probe, check, defaultDays};

if (require.main === module) (async () => {
  const [dataFile, quotasFile, ...days] = process.argv.slice(2);
  if (days.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d))) { console.error("usage: node tests/probe.js [data.json] [quotas.json] [YYYY-MM-DD ...]"); process.exit(2); }
  const read = f => JSON.parse(fs.readFileSync(f, "utf8"));
  const data = read(dataFile || path.join(__dirname, "fixtures/data.json"));
  const quotas = read(quotasFile || path.join(__dirname, "fixtures/site-quotas-2026-10-18.json"));
  const t0 = Date.now(), {renders, findings} = await probe({data, quotas, ...(days.length ? {days} : {})});
  console.log(`${renders} renders in ${((Date.now() - t0) / 1000).toFixed(1)} s, ${findings.length} findings`);
  for (const f of findings) console.log(`FINDING ${f}`);
  process.exit(findings.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
