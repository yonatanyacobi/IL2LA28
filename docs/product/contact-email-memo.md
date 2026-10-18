# Memo: which address should the public site show for error reports?

For: the owner · From: team lead · 2026-10-18 · Decision needed before wider promotion of the site

## Where things stand
The owner's personal Gmail is the only contact on the public site. It appears in three places: `CONTACT_EMAIL` in
`site/app.js` (the "מצאתם טעות?" box on athlete pages and `#about`, with a copy button and a mailto link), the footer
in `site/index.html`, and `README.md`. The GitHub repo is **public**, and all 119 commits on `main` carry the
same address as the author email, so it is already exposed through the git history whatever the site shows.

## Option A: keep the personal Gmail
- **For:** no work and nothing new to monitor. Reports reach the person who can fix them, and a real name builds
  trust for an unofficial site.
- **Against:**
  - **Spam and scraping:** the address sits in plain text in the page source and in a public repo.
  - **Mixing:** site reports land among personal mail, so they are easy to miss and hard to hand to an editor.
  - **Exposure:** every visitor, including anyone unhappy with a published fact about an athlete, gets a direct
    line to the owner's personal inbox.
  - **No exit:** handing the site over later, or stepping back, means changing code and the history still holds
    the address.

## Option B: a dedicated address (recommended)
For example a new Gmail created for the site, or an alias on a domain if one is bought later.
- **For:** separates site mail from personal mail and can be forwarded or shared with editors. It can be filtered
  and retired without touching the owner's identity, and it costs nothing.
- **Against:**
  - **Setup:** about 10 minutes, and someone has to check it, e.g. forward it to the owner with a label.
  - **Trust:** a generic address feels a little less personal.
  - **History:** the personal address stays in old commits unless future commits use a different author email.
    History will not be rewritten.

## Option C: no email, only an in-page report
This is not possible today. The artifact sandbox has no external fetch or form backend, and the DB is admin-only,
so visitors can't write reports. It is also the reason the site falls back to mail.

## Recommendation
**Option B.** It costs about 10 minutes plus a small PR, and it removes the main personal-exposure and missed-report
risks before the site is promoted.

Steps if approved:
1. The owner creates the address and sets forwarding.
2. Code PR: change `CONTACT_EMAIL` in `site/app.js`, the footer in `site/index.html` and `README.md`, and update
   any smoke test that asserts the address.
3. Optional: set a no-reply author email for future commits (`git config user.email`).
4. Publish the site.

If the owner prefers A, nothing changes; this memo records the decision.

**Owner decision:** ☐ A keep ☐ B dedicated address (\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_)
