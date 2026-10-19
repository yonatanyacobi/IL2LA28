# Owner decisions (as of 18.10.2026, after the owner's answers)

This is the single list of decisions that need the owner, from the launch checklist (#43), the company strategy (PR #58, §6)
and results automation (PR #76). It's one batched ask a week, per the strategy. To decide, reply with the number
and an option letter. The PM keeps this page current.

## Open

| # | Decision | Decide by | Options | Recommendation | If no decision |
|---|---|---|---|---|---|
| D1 | **Public launch date** | The owner's call | Any date after a green readiness check (first one: 22.10 12:00, reported to the owner) | Launch on a day that isn't a result night, ideally before Abu Dhabi (29–31.10) | The site stays unshared. Everything else continues |
| D8 | **Digest-copy counter** (needs DB writes; only signed-in viewers can write) | 25.10 | A: allow it for signed-in viewers · B: don't count; use the share log | **B**: it would count only claude.ai users and adds a DB write path to a read-only site | B |
| D9 | **Scope**: no English version and no Paralympics until mid-2027 | 25.10 | A: confirm · B: reopen | **A** | Treated as confirmed |
| D10 | **Trampoline athletes' Hebrew names.** DB: "בנימין ננדזה", "שם טוב עמיאל". **The federation's own spelling** (its 14.6.2026 Israel Championships schedule, [PDF](https://israelgym.org.il/?jet_download=0421574cb7af32cba958f116dfd1cb9131802858), both at Maccabi Acrobats Jerusalem): "בנימין ננדזה" (Senior men) and "שם-טוב שלום עמיאל" (listed in the AG3 house; name and club match). Press: [Israel Hayom 24.3.2026](https://www.israelhayom.co.il/sport/other-sports/article/20187566) captions a federation photo "בן ננדזה"; [Makor Rishon 7.8.2025](https://www.makorrishon.co.il/culture/sport/article/186258) writes "שם־טוב עמיאל" and, quoting him, "בן ננדזה". FIG: "NANADZE Benyamin". So "בן" is a nickname; "שם־טוב" is hyphenated everywhere. gym.org.il is blocked by the company proxy; the federation's current site is israelgym.org.il. Contact if still needed: [office@gym.org.il](https://israelgym.org.il/%d7%a6%d7%a8%d7%95-%d7%a7%d7%a9%d7%a8/), 03-6491476, or the competitions coordinator who signed the schedule (emily@gym.org.il) | before launch (D1) | A: keep the DB spelling · B: follow the press ("בן ננדזה", "שם־טוב עמיאל") · C: the owner asks the federation · D: follow the federation: keep "בנימין ננדזה", change to "שם־טוב עמיאל" | **D**: the federation's own document settles both, so no question to the federation is needed. The middle name "שלום" stays out, as in the press. Dana verifies, then both records can lose the "transliteration" note | A. Both records stay unverified ("טרם נבדק ידנית") |
| D11 | **Checks in the owner's browser** (the company proxy and bot-checks block the team's tools). Steps and what to record: [D11 checks](#d11-checks-in-the-owners-browser) below. ~~(1) Sporthive, Teferi's Amsterdam result~~ closed 19.10; (2) WT ranking for Bayech and Dan; (3) IWF Start Book, Ningbo; (4) The ANNIKA entries for Beck, optional; (5) isasurf.org, the 2026 World Surfing Games quota rule. UCI Riyadh needs no check: the event is cancelled | before launch (D1); (3) by 26.10 | A: the owner does (2)–(3) if possible, and replies with what's listed under "Record" · B: skip | **A** for (3): it gives Celia Gold her session | B: Bayech and Dan keep `rankAsOf` open; Celia Gold has no session |

## D11 checks in the owner's browser

Owner of this list: Ofir (sprint 7, item 6). Reply in the thread with what's under **Record**, as shown on screen.
Nothing needs a login.

| # | Check | Steps | Record | Then |
|---|---|---|---|---|
| 1 | ~~Sporthive: Maru Teferi, Amsterdam Marathon 18.10~~ **Closed 19.10, no check needed.** World Athletics' official results page lists "20. Maru TEFERI … ISR 2:07:22" (https://worldathletics.org/competitions/world-athletics-label-road-races/calendar-results/7235581/result); Dana signed and the result is in the DB | – | – | – |
| 2 | **WT Olympic Ranking: Rivka Bayech and Oleksandra Dan** (W-49kg). The ranks (21 and 37) come from the Paris GP result book of 11.10; the list date is open | Open https://worldtkd.simplycompete.com/playerRankingV2. Pick Olympic ranking, Women, -49kg. Find BAYECH Rivka and DAN Oleksandra | Each one's rank and points, and the list's date as the page shows it | Roni writes `rankNum`/`rankAsOf` from that list. Fallback: the GP Final result book (28–29.11) |
| 3 | **IWF Start Book: World Championships, Ningbo (27.10–8.11)**. A bot-check blocks iwf.sport | Open https://iwf.sport/wp-content/plugins/download-monitor/download.php?id=3004 (Start Book). If it doesn't open, use the entry list, id=2956. Search "ISR" | Each Israeli's name, bodyweight category, group (A/B…) and the session date and time as printed (China time) | Yael sets `celia-gold` `next`/`nextDate` and adds the session. Any new lifter goes through `proposals` |
| 4 | **lpga.com: The ANNIKA entries (12–15.11), Laetitia Beck** (optional; Dana accepted Yael's quoted read) | Open the tournament's Entries page on lpga.com and find Beck | "In the field" or "Reserve #N" | Yael updates the session only if it differs from her read |
| 5 | **isasurf.org: 2026 ISA World Surfing Games, quota rule** (competition `isa-wsg-2026`). isasurf.org answers 403 to the team's tools | Open isasurf.org, the 2026 World Surfing Games page and its qualification or LA28 pathway document | Per gender: does the quota place go to the **top individual** or to the **top team** (nation), in the page's own words, and the URL | Tamar releases the notes she is holding on `isa-wsg-2026` and the quota item's `stakes`; Yael corrects them if they differ |

**Not a check:** UCI Urban Cycling Worlds, Riyadh (3–7.11). The UCI and the Saudi federation say the event will not take place
(https://fr.uci.org/pressrelease/luci-et-la-federation-saoudienne-de-cyclisme-confirment-que-les-championnats-du-monde-urban-cycling-uci-2026-nauront-pas-lieu/AsZUTThGT0DsbQPmWS58d).
The UCI will announce the sporting consequences later. The DB record `uci-urban-worlds-riyadh-2026` still shows the event, with
`qualifying: true`, and needs a cancellation note (Yael).

## Decided
| # | Decision | Decided | Consequence |
|---|---|---|---|
| D2 | Contact address | Owner, 18.10: dedicated address `il2la28.site@gmail.com` opened | Shira swaps it into the site in place of the personal Gmail and the `{REPORT_EMAIL}` placeholder. Launch gate G5 turns green once that is merged and published |
| D3 | Marking records verified | Delegated, 18.10 | The coordinator writes `verifiedAt`/`verifiedBy` after a fact-checker's sign-off (verification drive, PR #71) |
| D4 | Result-night approvals | Owner, 18.10: "the team decides alone" | `earned` (and stage 2–3) is approved by **both fact-checkers (Dana + Tamar)**, with no owner approval. Omer publishes per `docs/runbooks/result-night.md` |
| D5 | New athletes (incl. Olga Tashtchiev) | Owner, 18.10: added without the owner | A fact-checker signs off and the coordinator writes the record. A Hebrew name without a source is marked as a transliteration in `notes` |
| D6 | Launch announcement | Owner, 18.10: none planned | No announcement work. PR #46's copy stays a draft |
| D7 | Hires | 18.10 | Tamar (second fact-checker) and Ofir (athletics and water-sports researcher) are hired |
| D-R1 | World Triathlon API key | Owner, 18.10: will register | The key lives only in the scheduled-task folder, never in the repo or a chat. Maya wires it up once it exists |
| D-R2 | Quota drafts from results | Delegated to the coordinator, 19.10: **C** (drafts in the run log, copied by hand) | Cheapest option (token economy). A only if C's drafts prove accurate on real events. ISSF's tracker still shows Paris 2024, so Doha quotas are read by hand |
| D12 | FIE ranking date | Delegated to the coordinator, 19.10 | FIE prints no list date, so `rankAsOf` is the date of the latest event the list counts (team épée 29.7.2026, individual 20.9.2026), stated in `notes`. Releases #321 and #291 after sign-off |
| D13 | Marathon result wording | Owner, 19.10 | Time inside the brackets: `מקום 20 במרתון אמסטרדם (2:07:22, 18 באוק׳ 2026)` |
| D14 | Test account (launch gate 8) | Owner, 19.10: none will be provided | Gate 8 uses visitor mode plus `as_level: "view"` DB reads |
| D15 | Coverage | Owner, 19.10: add every Israeli athlete found on official entry lists | Normal new-athlete sign-off (two checkers) |

## Defaults (no decision needed)
- The 5 partial quota items stay unpublished until they're sourced. The build enforces this.
- Unverified athlete records keep the "אוטומטי" chip.
- 18.10: the 25 audit corrections were applied to the DB by the coordinator under the owner's delegation (gate G1).
