# English version: scope (input for strategy, not an implementation spec)

Status: for the CEO's decision · Owner: UX · Base: `main` @ f51e599

## Who it is for
- Diaspora fans and family who follow Israeli athletes but don't read Hebrew.
- Foreign journalists and federation staff who want "where does Israel stand" in one link.
- Not the core Hebrew audience. Decision needed: is the goal **reach** (English) or **inclusion inside
  Israel** (Arabic, and Russian in some sports)? The two pull the roadmap in different directions.

## What we already have
- `name_en` on 99/99 athletes and `en` on 33/33 sports, so lists, cards and search work in English from day one.
- Competition names are often already English. Dates go through `Intl` (switch to `en-GB`).
- CSS uses logical properties (`inline-start`, `text-align:start`), so most layout flips to LTR for free.
  Known exceptions: the `→` crumb arrows, the `.track` order, and a few inline `style="text-align:right"`.

## What is Hebrew-only today
About 280 UI strings live in `app.js` / `quotas.js` / `index.html`. All free-text data is Hebrew:
`event`, `rank`, `next`, `notes`, history `text`, change `text`, `israelNote`, `stakes`, `allocation`,
`window.summary`.

## Scope options

| Option | Visitors see | Effort | Risk |
|---|---|---|---|
| **A. UI-only** | English chrome, names, sports, stages, dates, quota status, calendar. Free text shown in Hebrew under a `Hebrew` tag, or hidden behind "Details in Hebrew" | M (≈1 sprint): string table, `dir` switch, `en` locale, digest template | Looks half-done on athlete pages |
| **B. A + structured English fields** | The above plus `event_en`, `rank_en`, `next_en`, `israelNote_en`, `stakes_en`, written by the daily job and the quota curator | L: job prompt and schema change, a second fact-check pass for every editorial line | Double the fact-check load; English lines may drift from Hebrew |
| **C. English landing only** | One `#en` page: countdown, progress, quota picture, upcoming 14 days, link to the Hebrew site | S (≈2–3 days) | Low; tests demand before committing to A/B |

**UX recommendation: C now, A if C shows demand.** B only if a partner or media deal needs it.

## Constraints to plan around
- **Routing:** only bare `#token` hashes survive sharing, so language must be in the hash
  (`#en`, `#en-a-<id>`, `#en-sport-<id>`), not a query string. Remember the preference in
  localStorage for convenience only; the hash wins.
- **One artifact, one URL:** both languages ship in the same files, with no separate deploy.
- **Trust copy:** the disclaimer, sources and corrections text must exist in English before launch,
  with the same "unofficial, not affiliated" wording.
- **Naming:** an English brand that uses "Olympic" or "LA28" marks needs a trademark check before
  public use. The Hebrew name is descriptive; an English one should be too, e.g. "Israel on the road to Los Angeles 2028".
- **Corrections:** English readers will report in English. Decide who answers and whether fixes must
  land in both languages.

## Success signals to decide A vs stop
Count shares and visits to `#en`/`#en-*` links (only what the artifact host already reports; no new
tracking), and English correction emails. If they don't move after a month, stop at C.

## Out of scope here
Arabic/Russian, machine translation in the browser (no external fetch), per-language data files,
and SEO (an artifact page isn't indexed like a normal site).
