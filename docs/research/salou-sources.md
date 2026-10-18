# European Sixes Lacrosse Championships, Salou: official results sources (for #214)

Checked 18.10.2026. Women 2–9.11.2026, men 10–18.11.2026. Israel enters both.

## 1. Official sources
| Source | What it is | State on 18.10 |
|---|---|---|
| **ELF event page**: https://www.europeanlacrosse.org/events/2026-eslc | The organiser's page (European Lacrosse Federation, with España Lacrosse). It has "Women's Results" and "Men's Results" sections. | The sections are embeds (Google Sites) that are empty today. The page states 19 women's and 23 men's teams, and that **the top 5 in Salou qualify directly for the 2027 World Lacrosse Sixes Championships**. |
| **Pointbench live stats** (ELF's stats platform in 2026) | For the 2026 European Box Championships, ELF linked schedule, **standings**, points and per-game pages on Pointbench: https://stats.pointbench.com/ecbm/2026 and https://stats.pointbench.com/ecbw/2026 (both live). | No Pointbench page exists for the ESLC yet: I tried the likely codes (`eslc`, `eslcw`, `eslcm`, `ecsw`, `ecsm`, `esw`, `esm`, …), and all return 404. If ELF uses Pointbench again, the link should appear in the ELF event page's results embed. **Check around 1.11.** |
| **World Lacrosse news**: https://worldlacrosse.sport/ | The IF publishes daily recaps and a final-day article with final standings and who qualified. | Precedent, 2025 European Men's Championship: "18 spots in final standings decided on day nine" (18.7.2025) and the final article with the top 8 and the 7 teams qualified for the 2027 Worlds (19.7.2025, the final day): https://worldlacrosse.sport/israel-wins-2025-european-mens-lacrosse-championship-with-narrow-9-8-win-over-italy/ |
| Israel Lacrosse Association: https://www.lacrosse.co.il/ | National federation; confirms the team and coaches. | It's a primary source for participation, but not for results. |

## 2. When are the final standings and the top 5 confirmed?
- **No separate "official top-5 announcement" is known.** Qualification follows from the final standings.
  The placement games decide 5th, so the top 5 is known only when the 5th-place game ends, on the final day or the day before.
- **Expected confirmation:** a World Lacrosse news article on the final day that lists final standings and the 2027 Sixes Worlds qualifiers. For women that's about 9.11, for men about 18.11, following the 2025 precedent (published the same day as the final).
  ELF's results embed or Pointbench standings should show the final table the same day.
- **Caveat:** an older World Lacrosse article said "continental allocations are anticipated to be finalized by the end of the year"
  (https://worldlacrosse.sport/spain-to-host-2026-european-sixes-lacrosse-championships/).
  The ELF page now states 5 for Europe. If World Lacrosse's final article names a different number, its list of qualified teams is the one to use.

## 3. Recommendation for #214
1. **Game results and standings:**
   - First choice: the Pointbench ESLC standings page, once live.
   - Otherwise: the ELF event page results.
   - Session `result` text uses the official game page as `resultSource`.
2. **"Qualified for the 2027 Sixes Worlds"** (an Israeli milestone, not an Olympic quota): only from World Lacrosse's final article, or an ELF announcement that names the qualified teams.
   Not from a standings table alone.
3. **Recheck dates:**
   - 26.10: game schedule (the HOLD in `data/sessions/yael.json`).
   - About 1.11: Pointbench and ELF results links.
   - 9.11 and 18.11: final articles.
