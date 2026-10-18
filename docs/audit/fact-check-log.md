# Fact-check log

One row per record check, newest run first. Process: [fact-check-cadence.md](../runbooks/fact-check-cadence.md).
Verdicts: ✅ unchanged · ✏️ edit sent · ❓ source unreadable.

## 2026-10-18: baseline cross-check (Dana on Tamar's judo, swimming and fencing)
Read from the published data.json of 2026-10-18T15:25:51Z. Sample: Tamar's records (60) → 10% = 6, drawn from her
judo, swimming and fencing records (24, sorted by id); Python `random.Random(20261018).sample`.

| Record | List date read | Verdict | Claims checked | Source | Checker |
|---|---|---|---|---|---|
| raz-hershko | IJF WRL 18.10.2026 | ✅ | rank 1; Euro 2026 gold; Worlds Baku 2026 bronze; GS Hungary, GS Tbilisi, GP Upper Austria (Linz) 2026 gold; Paris 2024 silver; next Abu Dhabi GS | https://www.ijf.org/judoka/13713 + IJF results feed (data.ijf.org, competitor.results) | Dana |
| timna-nelson-levy | IJF WRL 18.10.2026 | ✅ | rank 6; Euro 2026 silver; GS Tbilisi 2026 gold; GS Paris 2025 silver; Worlds 2026 out without a place; Paris 2024; next Abu Dhabi GS 29.10 | https://www.ijf.org/judoka/14858 + IJF results feed | Dana |
| inbar-lanir | IJF WRL 18.10.2026 | ✏️ | rank 22 ✅; Paris 2024 silver ✅; world champion 2023 ✅; no Worlds 2026 entry ✅. **The shoulder-surgery reason has one outlet only (mako): cut "אחרי ניתוח בכתף (mako, 6.7.2026)".** | https://www.ijf.org/judoka/20209 + IJF results feed | Dana |
| maya-goshen | IJF WRL + Olympic list 18.10.2026 | ✅ | Olympic list 35 (148 pts); WRL 57; GS Ulaanbaatar 2026 7th; Paris 2024; next Abu Dhabi GS (on her IJF profile) | https://www.ijf.org/judoka/26366 + ijf.org/internal_api/wrl_olympic (category 12) | Dana |
| anastasia-gorbenko | World Aquatics, read 18.10 | ✏️ | Every fact checks out: Paris 2024; Worlds 2025 7th in the 200 IM (2:10.26) and the 50 breast final; Euro 2026 Paris 7th in the 200 IM (2:10.70) and 400 IM (4:45.07). **The source is media (walla): source ← https://www.worldaquatics.com/athletes/1135373/anastasia-gorbenko.** | api.worldaquatics.com/fina/athletes/1135373/results | Dana |
| dov-vilensky | OCI 29.7.2026 | ✅ | Hebrew name and epee team 4th at the 2026 Worlds (OCI names all four fencers) | OCI post (record source) | Dana |

## 2026-10-18: baseline cross-check (Tamar on Dana's athletics and sailing)
Read from the published data.json of 2026-10-18T15:25:51Z. Sample: verified records in athletics, sailing, triathlon
and surfing, excluding records Tamar signed herself; Python `random.seed(20261018)`, 3 of 25, plus 2 of the 10
sailing records.

| Record | List date read | Verdict | Claims checked | Source | Checker |
|---|---|---|---|---|---|
| gashau-ayale | WA, read 18.10 | ✅ | rank 49; Euro 2026 bronze 2:09:21; Worlds 2025 7th; PB 2:04:53 (Sevilla 2024); HM NR 59:59 (Lisbon 2025); Paris 31st | https://worldathletics.org/athletes/israel/gashau-ayale-14714462 | Tamar |
| lonah-chemtai-salpeter | WA, read 18.10 | ✅ | rank 187; NR 2:17:45 (Tokyo, 1.3.2020); Paris 2:26:08; HM 1:10:51 (15.3.2026) and 1:14:14 (Delhi, 18.10.2026); no 2026 marathon | https://worldathletics.org/athletes/israel/lonah-chemtai-salpeter-14523502 | Tamar |
| yonathan-kapitolnik | WA, read 18.10 | ✅ | rank 34; Worlds 2025 Q 2.21; Grand Slam Jerusalem 2nd 2.21; Euro 2026 5th 2.23 | https://worldathletics.org/athletes/israel/jonathan-kapitolnik-14899455 | Tamar |
| omer-vered-vilenchik | WS 15.9.2026 | ✅ | rank 56; Paris 2024 (OCI delegation list, ILCA 7); U19 world champion 2025, 10th overall (ISA); U21 Worlds 6th/96 (WS, 24.1.2026) | WS rankingReference ILCA 7 + https://sailing.org.il/?p=20072 + OCI post 2396380 | Tamar |
| sharon-kantor | WS 15.9.2026 | ✅ | rank 10; Worlds 2026 2nd/70; no Euro 2026 event in the WS breakdown | WS rankingReference iQFOiL Women | Tamar |

Not in the sample, found while reading the OCI Paris 2024 delegation list:

| Record | Verdict | Finding | Source | Checker |
|---|---|---|---|---|
| dor-zarka | ✏️ | The OCI writes **דור זרקה** (born 3.12.1994, Kitefoil, Paris 2024 delegation); the record has ISA's 2022 spelling זרקא. `notes` misses that he is a Paris 2024 Olympian. | OCI post 2396380 (https://www.olympicsil.co.il/משלחת-ישראל-לפריז-2024/) | Tamar |
