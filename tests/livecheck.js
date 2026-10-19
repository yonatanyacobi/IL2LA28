// docs/qa/live-check-v55.md §3 (routes) and §4 (regressions since v52) as render checks, by Gil; smoke.test.js runs
// them on the fixture, so a PR that breaks one fails CI. Run on real data before a publish:
//   node tests/livecheck.js [data.json] [quotas.json]   (defaults: the fixture and site/quotas.json; exits 1 on a FAIL)
// The clock is 20.10.2026 10:00 Israel, the v55 check's time; §3's data checks (Simin 7, Goshen 35, Rotterdam's
// floor final) read the 19.10 export, so a fixture refresh that changes them needs this file updated with it.
"use strict";
const fs = require("fs");
const path = require("path");
const {boot} = require("./smoke.test.js");

const ROOT = path.join(__dirname, "..");
const NF = "הדף לא נמצא";
const NOW = "2026-10-20T07:00:00Z";

async function livecheck({data, quotas}){
  const css = fs.readFileSync(path.join(ROOT, "site/styles.css"), "utf8");
  const results = [];
  const check = (id, ok, note = "") => results.push([id, !!ok, note]);
  const b = await boot({data, quotas, now: NOW});
  const v = r => b.view(r);
  // §3 routes
  const home = v("home");
  check("§3 home: one freshness line", (home.match(/class="fresh/g) || []).length === 1);
  check("§3 home: 'היום, …' heading", /id="todayH"[\s\S]*?היום, /.test(home));
  check("§3 home: no 14-day list / upcoming", !home.includes("ישראלים בפעולה ב־14") && !/<h2>תחרויות קרובות<\/h2>/.test(home));
  check("§3 #today renders", !v("today").includes(NF));
  const d29 = v("day-2026-10-29");
  check("§3 #day-29.10: judo listed", d29.includes('id="ds-judo"'));
  const ab = v("c-judo-gs-abu-dhabi-2026");
  check("§3 #c- Abu Dhabi: 3 day headings link to #day-", (ab.match(/<div class="sess-day"><h3><a [^>]*href="#day-2026-10-(29|30|31)"/g) || []).length === 3,
    `${(ab.match(/href="#day-2026-10-(29|30|31)"/g) || []).length} day links`);
  const ag = v("c-ag-worlds-2026");
  check("§3 #c- Rotterdam: Dolgopyat and Berkovich", ag.includes("#a-artem-dolgopyat") && ag.includes("#a-noam-berkovich"));
  const judo = v("sport-judo"), panel = (judo.split('id="standH"')[1] || "").split("</section>")[0];
  const b100 = (panel.split("100- ק״ג גברים")[1] || "").split("<h3>")[0], b70 = (panel.split("70- ק״ג נשים")[1] || "").split("<h3>")[0];
  check("§3 #sport-judo: 100- Simin 7 above the line", b100.indexOf("יוסיף סימין") > -1 && b100.indexOf("יוסיף סימין") < b100.indexOf("cutline"));
  check("§3 #sport-judo: 70- line above Goshen 35", b70.indexOf("cutline") > -1 && b70.indexOf("cutline") < b70.indexOf("מאיה גושן"));
  check("§3 #sport-fencing: not-open line only", v("sport-fencing").includes("תקופת הדירוג להעפלה נפתחת ב־1 באפר׳ 2027."));
  const sim = v("a-iosif-simin");
  check("§3 #a-iosif-simin: Olympic rank + line facts + game log", /<dt>דירוג ההעפלה[^<]*<\/dt>/.test(sim) && sim.includes("<dt>מול קו המכסה</dt>") && sim.includes('id="logH"'));
  for (const r of ["quotas", "calendar", "updates", "digest", "about", "about-trust", "following", "following-sports"]) check(`§3 #${r} renders`, !v(r).includes(NF));
  check("§3 digest < 3,500", b.run("digestText().length") < 3500, String(b.run("digestText().length")));
  for (const r of ["nope", "a-nope", "day-2026-02-30"]) check(`§3 #${r} → not found`, v(r).includes(NF));
  // §4 regressions
  check("§4.1 #following tab: visible selected style", /\.chips a\[aria-current="page"\]\{[^}]*background/.test(css));
  const all = data.athletes.map(a => v(`a-${a.id}`)).join("") + home + v("today") + d29 + ab + ag;
  check("§4.3 no 'השעה תפורסם'", !all.includes("השעה תפורסם"));
  check("§4.4 no .now", !/class="now"/.test(all));
  const closest = (home.split("ההזדמנויות הקרובות למכסה")[1] || "").split("</section>")[0];
  check("§4.5 home 'השבוע'/closest names link to #c-", /href="#c-/.test(closest) && (!home.includes('id="weekH"') || /id="weekH"[\s\S]*?href="#c-/.test(home)));
  check("§4.6 no repeated competition name", !/מכשירים, רוטרדם · <a href="#c-ag-worlds-2026"/.test(all + closest));
  check("§4.7 home 'היום' heading is hlink", /<h2 id="todayH"><a class="hlink"/.test(home));
  const bs = await boot({data, quotas, now: NOW, storage: {"la28.followSports": JSON.stringify(["judo"])}});
  check("§4.8 sport-only follow shows a chip on home", /<div class="chips"[^>]*>[\s\S]*?href="#sport-judo"/.test(bs.view("home")));
  check("§4.9 no 'LA28' in the standings facts", !data.athletes.some(a => /<dt>[^<]*LA28/.test(v(`a-${a.id}`))));
  const h25 = (await boot({data, quotas, now: "2026-10-25T06:00:00Z"})).view("home");
  check("§4.11 'אתמול' count wording", !/ממתינים לתוצאה/.test(h25) && (/הופעות ממתינות לתוצאה|הופעה אחת ממתינה לתוצאה/.test(h25) || !h25.includes(">אתמול<")));
  check("§4.12 load-failure copy present", /הטעינה נמשכת יותר מדי/.test(fs.readFileSync(path.join(ROOT, "site/app.js"), "utf8")));
  // 400px / dark, by CSS
  const vars = [...new Set([...css.matchAll(/var\(--([a-z0-9-]+)/g)].map(m => m[1]))];
  const blocks = [css.split("@media (prefers-color-scheme: dark)")[0].match(/:root\{[^}]*\}/)[0], css.match(/:root\[data-theme="dark"\]\{[^}]*\}/)[0]];
  const missing = vars.filter(x => !blocks[0].includes(`--${x}:`) && !/^f-/.test(x));
  check("CSS: every var defined in :root", !missing.length, missing.join(","));
  const notDark = [...blocks[0].matchAll(/--([a-z0-9-]+):/g)].map(m => m[1]).filter(k => !/^f-/.test(k) && !blocks[1].includes(`--${k}:`));
  check("CSS: color tokens redefined for dark", !notDark.length, notDark.join(","));
  const wide = [...css.matchAll(/(?:min-width|width|minmax\()\s*:?\s*(\d{3,})px/g)].map(m => +m[1]).filter(n => n > 368 && n < 640);
  check("CSS: no fixed width over 368px below the phone breakpoint", !wide.length, wide.join(","));
  return results;
}

module.exports = {livecheck};

if (require.main === module) (async () => {
  const read = (p, d) => JSON.parse(fs.readFileSync(p || path.join(ROOT, d), "utf8"));
  const results = await livecheck({data: read(process.argv[2], "tests/fixtures/data.json"), quotas: read(process.argv[3], "site/quotas.json")});
  const fail = results.filter(r => !r[1]);
  for (const [id, ok, note] of results) console.log(`${ok ? "PASS" : "FAIL"} ${id}${note ? ` (${note})` : ""}`);
  console.log(`\n${results.length - fail.length}/${results.length} pass`);
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error("ERROR", e); process.exit(2); });
