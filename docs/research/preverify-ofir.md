# Pre-verify: Ofir's records outside the drive (2026-10-18)

Scope: the 24 records in my sports that are not among the drive's 30: 11 athletics and 13 sailing. Rowing and canoe
have no tracked athletes. Surfing (Lelior) and triathlon (Sagiv) are already in the drive. Proposals only:
nothing is written to the DB. Tamar signs off.

**Status: partial.** This first version holds the key findings with their official sources, as relayed from the
two research passes. The full per-field tables (field → current → verified → source), including the exact URL of
each sailing breakdown file, follow in the next commit on this branch. Until then, rows without a URL here are not
ready to mark.

## Athletics: sources
- World Athletics athlete profiles: each record's `source` (worldathletics.org/athletes/israel/…).
- `rank`: World Athletics World Rankings for the athlete's event, page reads **"As of 13 Oct 2026"**. Every
  `rank` text should name that list date: "(World Athletics, 2026-10-13)" instead of "אוק׳ 2026".
- Olympic Committee of Israel (OCI), European Championships 2026 delegation (2026-08-16): the Hebrew spelling.
- Israel Athletic Association (IAA): https://iaa.co.il/23183, https://iaa.co.il/31193.

## Athletics: key fields

| record | field | current | proposed | source |
|---|---|---|---|---|
| `bukayawe-malede` | `name` | בוקיאווה מלדה ("איות השם בעברית לא אומת") | **בוקאיו מלדה**; remove "איות השם בעברית לא אומת" from `notes` | OCI-EC26 delegation, 2026-08-16 |
| `girmaw-amare` | `name` | גירמאו אמרה | **גירמה אמרה** | https://iaa.co.il/23183 |
| `girmaw-amare` | `notes` / status | "…לא נמצאו תוצאות 2025–2026; סטטוס לא ברור" | Retired, per IAA. Propose a retirement **proposal** for a person; automation never writes it (CLAUDE.md) | https://iaa.co.il/31193 |
| `girmaw-amare` | `source` | en.wikipedia.org (not official) | https://worldathletics.org/athletes/_/14427580 | World Athletics |
| all 11 | `rank` date | "אוק׳ 2026" | "(World Athletics, 2026-10-13)", with the position as shown on the list | WA World Rankings, "As of 13 Oct 2026" |

## Sailing: sources
- World Sailing ranking: the official datafeed, `datafeed.sailing.org/stats/api/rankingReference`, **release
  2026-09-15**. Every `rank` text should name it: "(World Sailing, 2026-09-15)" instead of "ספט׳ 2026".
- Per-sailor results: World Sailing ranking breakdown files on `assets.sailing.org/ranking_results/` (exact file
  URLs to follow).
- 2026 Formula Kite Worlds: https://fir.com.pl/results/IKA/women.html, https://fir.com.pl/results/IKA/men.html
  (linked from https://www.kiteclasses.org/2026worlds).

## Sailing: key fields

| record | field | finding | source |
|---|---|---|---|
| `shahar-tibi` | `notes` | Bronze at the 2026 European Championships | WS ranking breakdown |
| `yoav-omer` | `notes` | 5th of 117 at the 2026 European Championships | WS ranking breakdown |
| `daniela-peleg` | `notes` | 1st of 55 at the 2025 European Championships | WS ranking breakdown |
| `tal-sade-maor-abo` | `notes` | Raced in 2026, so a "no 2026 results" type claim must go | WS ranking breakdown |
| `nitai-hason-noga-tyano` | `name_en` | "Hasson" (WS sailor id ISRNH3) | WS datafeed |
| `roy-levi-ariel-gal` | `name_en` | "Roi/Roy Levy" (WS sailor id ISRRL4). Use the WS spelling | WS datafeed |
| `roy-levi-ariel-gal` | `notes` | Their medals are **junior** level (470 Junior Worlds), not senior. Say "באליפות העולם לנוער" explicitly | https://jns.org/news/israel-news/israeli-sailors-win-silver-at-470-junior-world-championships, https://www.mysailing.com.au/?p=94399 (media; two independent outlets) |
| `zohar-harubi` | `name_en` | "Haruvi" (as in the 2026 Formula Kite Worlds results) | https://fir.com.pl/results/IKA/men.html |
| `mia-ashkenazi` | `name_en` | "Maya Ashkenazi" (results spelling) | https://fir.com.pl/results/IKA/women.html |
| all 13 | `rank` date | "(World Sailing, 2026-09-15)" | WS datafeed, release 2026-09-15 |

## Next
1. Add the full per-field tables for all 24 records, with the exact breakdown-file URLs.
2. Tamar signs off; the editors apply the ✏️ rows. The retirement of `girmaw-amare` goes through a proposal.
