# Coverage research: athletics, sailing, canoe, rowing (2026-10-18)

Researcher: Ofir. Proposals only: `data/quotas/quotas.json` is untouched (open PRs touch it). Every row needs
sign-off from Dana or Tamar. Item ids are indexes in `data/quotas/quotas.json` on this branch (57–59 are
Yael's PR #64 items, which this branch builds on).

Sources used (official, or the IOC-approved qualification-system PDF mirrored by NOC*NSF):
- [WA-240] World Athletics, 240th Council meeting, 2026-03-18/19, Information and Decisions §2.1.3:
  https://worldathletics.org/download/download?filename=def4c999-fea1-4873-a7bd-ca55e1280201.pdf&urlslug=Decisions
- [SAL-QS] World Sailing LA28 qualification system, version 2026-05-12:
  https://cdn.nocnsf.nl/media/e3fjqs4m/sal-la28-qualification-system.pdf
- [FK-W] / [FK-M] 2026 Formula Kite World Championship final results (linked from the IKA event page
  https://www.kiteclasses.org/2026worlds): https://fir.com.pl/results/IKA/women.html, https://fir.com.pl/results/IKA/men.html
- [CSP-QS] ICF canoe sprint LA28 qualification system, version 2026-05-12:
  https://cdn.nocnsf.nl/media/qllnxmff/csp-la28-qualification-system.pdf
- [CSL-QS] ICF canoe slalom LA28 qualification system, version 2026-05-12:
  https://cdn.nocnsf.nl/media/1v2nt1k3/csl-la28-qualification-system.pdf
- [ROW-QS] World Rowing LA28 qualification system, version 2026-05-12:
  https://cdn.nocnsf.nl/media/li4hvuq4/row-la28-qualification-system.pdf

The IOC hosts the same PDFs at `https://stillmed.olympics.com/media/Documents/Olympic-Games/LA28/<CODE>-LA28-Qualification-System.pdf`
(CSP confirmed by search). That host timed out today, so I could not verify it for ATH, SAL, ROW or CSL.

## 1. The 5 unpublished items

**Finding:** under [SAL-QS] §D, no sailing quota places come from 2026 events. The first quota event is the
2027 Worlds in Fortaleza. The three sailing items were held only because their 2026 placings were unverified.
Those placings provide context, not quota claims.

| item id | current | proposed | source |
|---|---|---|---|
| 28 athletics / מרתון גברים | `allocation`: "שיטת ההעפלה של World Athletics ל-LA28 טרם פורסמה…". `source`: olympic.ca. review: partial | `allocation`: "לפי עקרונות שאישרה מועצת World Athletics (מרץ 2026): כ-40% יעפילו בקריטריון ההעפלה וכ-60% בדירוג העולמי, וקריטריון ייחשב רק בתחרויות בדרג C ומעלה. השיטה המלאה והזמנים טרם אותרו." `source`: [WA-240]. **Still ❓.** The full LA28 system (periods, marathon standard, quota) was due for IOC EB approval in June 2026, but I did not find the document. Keep it unpublished, or publish only with this narrower text. | [WA-240] |
| 30 athletics / מקצועות מסלול ושדה | Same as 28. `israelStatus`: unknown | Same `allocation` and `source` as 28. **Still ❓** for the same reason. | [WA-240] |
| 37 sailing / Formula Kite נשים | israelNote "גל צוקרמן מקום 17 ומיה אשכנזי מקום 14 באליפות העולם 2026" unverified | **Resolved, no text change.** Ashkenazi was 14th (nett 135.0) and Zukerman 17th (nett 202.0). Set `review` to ok. Optional: add to `allocation` "(לא מחולקות מכסות ב-2026)". | [FK-W] |
| 38 sailing / Formula Kite גברים | israelNote "זוהר חרובי מקום 25…" unverified | **Resolved.** Haruvi was 25th, in the gold fleet (nett 247.9). Optional: Dor Zarka and Carmel Avisar were 3rd and 4th in the silver fleet. I did not compute their overall rank. | [FK-M] |
| 41 sailing / 470 מעורב | israelNote "לוי/גל מקום 14 וחסון/טיאנו מקום 16 באליפות העולם 2026" unverified | **Still ❓.** The 2026 470 Worlds were held in Enoshima in August 2026 (74 boats). I found no official full results listing ISR crews. Next step: get the results PDF from 470.org or manage2sail. Related, already verified: Levy/Gal took silver at the 470 Junior Worlds in Gdynia (2026-07-11 to 2026-07-17). | sailing.org report 2026-08-17 (no ISR ranks) |

Flags for the fact-checker, with no change proposed:
- [SAL-QS] contradicts itself on dates. Fortaleza is 20–22 Jan 2027 in §D.1 and 22–30 Jan 2027 in §G. Gdynia is
  6–16 Jul 2027 in the QS, but items 40 and 41 say 2027-07-22, which Dana checked against the World Sailing
  calendar. The calendar is the more specific source, so keep it.
- Kite allocation in [SAL-QS] §D.1.2: 8 places at the Worlds, 1 per continent (6), 5 at the Last Chance Regatta,
  and 1 for the host, so 20 in total. The 470: 8 + 6 + 4 + host = 19. Both match the items.

## 2. Canoe and rowing (Yael's PR #64 items 57–59, now mine)

The audit convention (see 31, 45, 52–54) is that an item covering both genders uses the sum for both genders.
All three of Yael's items use per-gender numbers.

| item id | current | proposed | source |
|---|---|---|---|
| 57 rowing / סקיף יחיד (1x) גברים ונשים | totalQuotas 33, maxPerNOC 1 | totalQuotas **66**, maxPerNOC **2** (1 boat per event per gender). `allocation` text is correct per gender (10 at Lucerne 2027 + 3 Europe CQR + 2 FOQR + 1 host + 2 universality). Make it explicit: "לכל מגדר: …". | [ROW-QS] §B, §D.1–D.7 |
| 57 | `source`: nocnsf ROW PDF | Keep. Add to `stakes`: "אליפות העולם בלוצרן 2027-08-23–2027-08-29: 10 מקומות לכל מגדר; מקום ומועד מקצה הקליטה האירופי ייקבעו עד 2026-12-31". | [ROW-QS] §D.1, §H |
| 57 | `nextQuotaEvent` Lucerne 2027-08-23 | Keep (verified). The FOQR date is TBC in the QS. The fixture's 2028-05-05 comes from row2k, which is not official. | [ROW-QS] §H |
| 58 canoe / קאנו ספרינט – גברים ונשים | totalQuotas 117, maxPerNOC 8 | totalQuotas **234** (+2 universality shared with slalom), maxPerNOC **16** (per gender: 5 kayak + 3 canoe). | [CSP-QS] §B.1–B.2 |
| 58 | `allocation`: "…סירה אחת למדינה בכל מקצה" | "לכל מגדר: 79 מקומות לפי דירוג הקליטה האולימפי (תוצאות 2026-04-20–2027-12-31, אליפויות עולם ×1.5), 36 באירועי קליטה יבשתיים ב-2028 (באירופה 2 בכל אחד מ-K1, K2, C1, C2), ומקום מארחת בקיאק ובקאנו. עד 2 סירות למדינה במקצה; המכסה למדינה ולא לספורטאי/ת." The current "one boat per NOC per event" claim is **wrong**: §B.4.1 allows up to 2. | [CSP-QS] §B.4, §D.3–D.5, §H |
| 58 | `nextQuotaEvent` null; `source` olympic.ca | `nextQuotaEvent`: {"אליפות העולם בקאנו ספרינט 2027", "2027-08-25"}. The three 2027 World Cups come first but have no dates in the QS. `source` → [CSP-QS]. | [CSP-QS] §G |
| 59 canoe / קאנו סלאלום – גברים ונשים | totalQuotas 41, maxPerNOC 3 | totalQuotas **82** (+ shared universality), maxPerNOC **6**. The per-gender split in `allocation` (19 = 6 K1, 3 X1, 10 C1; ranking from 2026-07-20 to 2027-10-03) is **verified**. Add "15 ביבשתיות ו-6 בתחרות עולמית ב-2028, ומקום מארחת". | [CSL-QS] §B, §D, §D.3 |
| 59 | `nextQuotaEvent` Worlds 2027-09-08; `source` olympic.ca | `nextQuotaEvent`: {"גביע העולם בקאנו סלאלום, פראג", "2027-06-04"} (the first remaining ranking event). The QS dates the Worlds in La Seu as 2027-09-07 to 2027-09-12, not 09-08, so fix fixture competition `icf-slalom-worlds-la-seu-2027` too. `source` → [CSL-QS]. | [CSL-QS] §E timeline |

**Israelis involved (canoe, rowing): none identified.** The ICF Road-to-LA28 page
(https://rankings.canoeicf.com/road-to-la28) shows no ranking data yet. I found no ISR entry in any official
2026 canoe sprint, canoe slalom or rowing result. The current israelNote values ("אין … במעקב") are accurate
as worded. Next step: ask the Olympic Committee of Israel and the Israeli canoe and rowing federations which
athletes raced 2026 ranking events.

## Still open
1. World Athletics LA28 qualification system document (items 28 and 30). Check the IOC host above, or World
   Athletics' LA28 page, after the June 2026 IOC EB approval.
2. ISR crews' ranks at the 2026 470 Worlds in Enoshima (item 41).
3. Rowing: coastal rowing (beach sprint) joins the LA28 programme under a separate QS (`RCB`), which I have not
   checked. Also check whether there is an Israeli beach-sprint rower.
4. [ROW-QS] contradicts itself on universality places: the §B.1 table gives 1 per gender, §D and §D.7 give 2.
   The item uses 2.
5. Canoe and rowing athletes, as above.
