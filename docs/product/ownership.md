# Code ownership

Status: reference · Set by the CEO's plan (owner-approved, 19.10). One owner per area. A change to an owned area goes
through its owner: the owner makes it, or reviews the PR before the lead merges it. Specs (UX, copy) still come from
their usual owners; ownership is about who changes the code.

We don't use a GitHub CODEOWNERS file: every agent pushes as the same GitHub account, so it can't tell owners apart.

| Area | Owner | Files |
|---|---|---|
| Home page (`#home`) | Itai | `site/home.js`; in `site/app.js`, `viewHome()` and the helpers only it calls (`heroFresh`, `wonPanel`, `closestPanel`, `nextUpLine`). `todayRows` and `closestGroups` are shared with `site/following.js`: changing them needs both owners |

## Home: what the owner keeps stable
- **Panel order** (pinned by the smoke test "home panel order"): hero → won panel (only when a quota was earned in
  the last 7 days) → "היום" → "תוצאות אחרונות" → "השבוע" → "במעקב שלי" → search → won panel (otherwise) → quota
  chances → review queue → KPI → "מה התעדכן". Reordering needs a UX spec change first (`docs/design/home-today.md`).
- Every session row on the home is the shared `sessionRow()` (`docs/design/components.md` §1).
