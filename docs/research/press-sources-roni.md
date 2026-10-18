# Press and Wikipedia sources → official replacements (Roni's sports), for Tamar

Scope:
- Every record in combat, gymnastics and aquatics whose `source` is a press outlet or Wikipedia, per the published
  data.json (generatedAt 2026-10-18T15:25:51Z).
- **12 records.**
- Records whose source is already official are not listed: IJF, FIG documents, European Gymnastics, World Aquatics,
  europeanaquatics.org, WT and Longines.

Each row gives:
- the proposed official `source`;
- what that source confirms;
- **the claim to cut** (or "none") when the official source doesn't support it.

Nothing is written to the DB.

| id | official source (proposed) | confirmed there | claim to cut |
|---|---|---|---|
| alexey-glivinskiy | https://api.worldaquatics.com/fina/athletes/1227400/results | Euros 2026: 200 IM semifinal (16th, 2:01.53), 4x200 free relay heats (4th, 7:06.71). Worlds 2025: 200 IM semifinal (14th), 4x200 relay final 8th | none |
| anastasia-gorbenko | https://api.worldaquatics.com/fina/athletes/1135373/results | Euros 2026: 7th in the 200 IM final (2:10.70) and 400 IM final (4:45.07). Worlds 2025: 200 IM final 7th, 50 breaststroke final 7th | none. Optional addition: 3 bronzes at the 2025 short-course Euros (200 IM, 100 IM, 100 breaststroke) |
| eitan-ben-shitrit | https://api.worldaquatics.com/fina/athletes/1218445/results | Euros 2026: 200 IM semifinal 10th (1:59.31); 4x200 free relay final 7th (7:07.55) | "מקום 9 במוקדמות" (200 IM): World Aquatics doesn't list his 200 IM heat |
| tomer-shuster | https://api.worldaquatics.com/fina/athletes/1320484/results | Euros 2026: 50 back final 5th (24.44); 100 back heats 7th (53.39), semifinal 9th | "שיא ישראלי": a national record isn't shown by World Aquatics. Keep only with an Israel Swimming Association record page |
| ofek-adir | https://api.worldaquatics.com/fina/athletes/1453908/results | Worlds 2025: 10 km 32nd (2:20:44.50). Euros 2026: 10 km 22nd, 5 km 19th | none (replaces Wikipedia) |
| nimrod-krivitsky | https://results.worldtaekwondo.org/resultbooks/2026-european-senior-championships-result-book-6a0c409e7de7a.pdf | WT spells him "KRIVISHKIY Nimrod" (ISR-1566), Men -68kg: beat VAN VULPEN (NED) PTF 2:0, then lost to ERER Berkay (TUR) 2:0, and Erer won gold | "בשמינית הגמר": the book shows the bout, but not the round label as read here. Wording if not confirmed: "הודח בקרב השני" |
| avishag-semberg | https://results.worldtaekwondo.org/competitions/tokyo-2020-og · https://results.worldtaekwondo.org/competitions/2024-paris-olympic-games | WT's official result pages for both Games. The Tokyo bronze and the Paris loss to Abutaleb should be read on these pages before marking | none, if both pages confirm |
| lihie-raz | FIG Drawing of Lots https://www.gymnastics.sport/asset.php?id=fidb_24017 (Rotterdam: ISR AA 1) · OCI for the Paris 31st (to find) | the Rotterdam all-around entry (official) | "זהב קרקע בגביע האתגר בסלובניה (מאי 2026)" and "אלופת ישראל 2026": no FIG or federation source found. Cut, or keep only with the FIG results of the Koper Challenge Cup |
| roni-shamay | FIG Drawing of Lots (fidb_24017) | the Rotterdam all-around entry | "זהב במקבילים בגביע האתגר בוורנה": no FIG Varna results found (the same gap as Pyatov and Ortal in #191) |
| ron-ortal | European Gymnastics men's floor qualification book (Zagreb 2026) https://new-backend.europeangymnastics.com/sites/default/files/paragraph/age-group-competition-info/competition-results/SENIORS%20-%20Individual%20-%20Qualification%20Floor%20exercise%20ApparatusResultsMag_5.pdf | his Euros 2026 floor qualification (13.200) | the Varna horizontal bar bronze and its score (13.633 vs 13.566; see #191) |
| yali-shoshani | FIG Drawing of Lots (fidb_24017): "Yali SHOSHANI (ISR)", AS Group 1, uneven bars | the Rotterdam entry as a bars specialist | none |
| israel-water-polo-women | – | – | **not press** (europeanaquatics.org is the official LEN/European Aquatics site). Listed only because my first filter flagged it |

## Mirrors of official result books (lower priority)
These sources are official result PDFs (Swiss Timing/Longines layout) hosted by USA Gymnastics, not the press:
- ben-nanadze, shemtov-amiel: trampoline Worlds 2025;
- daniela-munits, meital-maayan-sumkin, israel-rhythmic-group: rhythmic Worlds 2026.

I suggest keeping them and switching to FIG's own copy when one is found. There's nothing to cut.

## How this was checked
- World Aquatics: the athlete search API (nationality ISR) and each athlete's `/results`, read 2026-10-18.
- WT: the official 2026 European Championships result book (pypdf), searched for every ISR row and bout.
- FIG: the Drawing of Lots PDF (updated 12.10.2026).
- European Gymnastics: the Zagreb 2026 qualification books.
- Not reached: FIG Challenge Cup results for Varna and Koper, and the Israel Swimming Association records list.
