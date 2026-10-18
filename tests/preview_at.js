// Render the site as it will look on a given Israel date, with real data, before publishing (docs/runbooks/publishing.md).
// Usage: node tests/preview_at.js <data.json> <quotas.json> <YYYY-MM-DD>
// Exits 1 if any route throws, a known sport or athlete renders not-found, or the digest is over 3,500 chars.
"use strict";
const fs = require("fs");
const {boot} = require("./smoke.test.js");

const [dataFile, quotasFile, day] = process.argv.slice(2);
if (!dataFile || !quotasFile || !/^\d{4}-\d{2}-\d{2}$/.test(day || "")) {
  console.error("usage: node tests/preview_at.js <data.json> <quotas.json> <YYYY-MM-DD>");
  process.exit(2);
}
const read = f => JSON.parse(fs.readFileSync(f, "utf8"));
const text = html => html.replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ").trim();
const section = (html, cls) => html.split(`class="panel ${cls}"`)[1]?.split("</section>")[0].replace(/^[^>]*>/, "") || "";

(async () => {
  const data = read(dataFile), quotas = read(quotasFile);
  // 09:00 UTC is midday in Israel, so today() is `day` in summer and winter time.
  const {view, run} = await boot({data, quotas, now: `${day}T09:00:00Z`});
  if (run("today()") !== day) throw new Error(`clock pin failed: today() = ${run("today()")}`);
  const errors = [];
  const routes = ["home", "sports", "quotas", "calendar", "updates", "about", "digest",
    ...data.sports.map(s => `sport-${s.id}`), ...data.athletes.map(a => `a-${a.id}`)];
  const pages = {};
  for (const r of routes) {
    try {
      pages[r] = view(r);
      if (pages[r].includes("הדף לא נמצא")) errors.push(`${r}: not found`);
    } catch (e) { errors.push(`${r}: ${e && e.message || e}`); }
  }
  const home = pages.home || "", digest = run("digestText()");
  console.log(`Israel date ${day}: ${routes.length} routes rendered, quotas loaded: ${run("S.quotas.length")}`);
  const byHeading = id => home.split(`aria-labelledby="${id}"`)[1]?.split("</section>")[0].replace(/^[^>]*>/, "") || "";
  console.log(`today: ${text(byHeading("homeTodayH")) || "(hidden)"}`);
  console.log(`recent results: ${text(byHeading("homeResH")) || "(hidden)"}`);
  console.log(`new quota panel: ${text(section(home, "won")) || "(hidden)"}`);
  console.log(`digest: ${digest.length} chars\n${digest}`);
  if (digest.length > 3500) errors.push(`digest is ${digest.length} chars`);
  for (const e of errors) console.log(`ERROR ${e}`);
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
