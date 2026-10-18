# Session times for #day – Yael's sports (window 18.10–1.11.2026, plus the Israelis' Doha days)

Official sources only. All times are **Israel time**: UTC+3 until 25.10.2026, UTC+2 after.
Doha (AST, UTC+3) is Israel time + 1h from 25.10.
These are competition **proposals**; nothing is written to the DB. There is no `sessions` field in the schema yet,
so the shape below is a proposal for the dev who builds #day.

```
{id, sportId, name, location, start, end, source,
 sessions: [{date, from, to, label, israelis: [athleteId], quota: bool}]}   // from/to = HH:MM Israel time
```

## 1. Shooting – ISSF World Championship Rifle/Pistol/Shotgun, Doha (Israelis on 3.11 and 4.11)

Existing competition id in data.json: `issf-wch-doha-2026`. The proposal adds sessions only.
Source: ISSF final competition schedule,
https://backoffice.issf-sports.org/getfile.aspx?mod=docf&pane=1&inst=783&iist=365&file=WCH-RPSH-Doha-2026-Final-Competition-Schedule.pdf
Entries: ISSF entry list by NOC, 3.10.2026 (Richter: ARM and ARMT; Tashtchiev: ARW and ARMT).

```json
{"id": "issf-wch-doha-2026", "sportId": "shooting", "name": "אליפות העולם בקליעה", "location": "דוחא, קטאר",
 "start": "2026-11-01", "end": "2026-11-14",
 "source": "https://backoffice.issf-sports.org/getfile.aspx?mod=docf&pane=1&inst=783&iist=365&file=WCH-RPSH-Doha-2026-Final-Competition-Schedule.pdf",
 "sessions": [
  {"date": "2026-11-03", "from": "08:15", "to": "09:30", "label": "רובה אוויר 10 מ׳ גברים – מוקדמות, מקצה 1", "israelis": ["sergey-richter"], "quota": true},
  {"date": "2026-11-03", "from": "10:15", "to": "11:30", "label": "רובה אוויר 10 מ׳ גברים – מוקדמות, מקצה 2", "israelis": ["sergey-richter"], "quota": true},
  {"date": "2026-11-03", "from": "12:15", "to": "13:30", "label": "רובה אוויר 10 מ׳ נשים – מוקדמות, מקצה 1", "israelis": ["olga-tashtchiev"], "quota": true},
  {"date": "2026-11-03", "from": "13:30", "to": "14:30", "label": "רובה אוויר 10 מ׳ גברים – גמר", "israelis": [], "quota": true},
  {"date": "2026-11-03", "from": "14:15", "to": "15:30", "label": "רובה אוויר 10 מ׳ נשים – מוקדמות, מקצה 2", "israelis": ["olga-tashtchiev"], "quota": true},
  {"date": "2026-11-03", "from": "17:30", "to": "18:15", "label": "רובה אוויר 10 מ׳ נשים – גמר", "israelis": [], "quota": true},
  {"date": "2026-11-04", "from": "08:15", "to": "08:55", "label": "רובה אוויר זוגות מעורבים – מוקדמות, מקצה 1", "israelis": ["sergey-richter", "olga-tashtchiev"], "quota": false},
  {"date": "2026-11-04", "from": "09:45", "to": "10:25", "label": "רובה אוויר זוגות מעורבים – מוקדמות, מקצה 2", "israelis": ["sergey-richter", "olga-tashtchiev"], "quota": false},
  {"date": "2026-11-04", "from": "12:30", "to": "13:15", "label": "רובה אוויר זוגות מעורבים – גמר", "israelis": [], "quota": false}
 ]}
```
Notes:
- The schedule lists each session's start and end in Doha time. I subtracted one hour for Israel time.
- **Which relay** each Israeli shoots in isn't known until the start lists are out. Both relays are listed with the Israeli;
  keep only the right one after the ISSF start list (expected 2.11).
- The finals list no Israelis until they qualify. Set `israelis` from the qualification result. The top 8 go to the final.
- 1.11–2.11 are equipment control and pre-event training (PET), so they are not sessions for #day.

## 2. Not available from official sources (window 18.10–1.11)
| Competition | Sport | Dates | Why no sessions |
|---|---|---|---|
| IWF World Championships, Ningbo | Weightlifting | 27.10–8.11 | IWF Start Book (session per category) is behind a bot-check; no Israeli entrant confirmed |
| European Sixes, Salou (women 2.11–9.11; men 10.11–18.11) | Lacrosse | after the window | No game schedule published by World Lacrosse or the Israel Lacrosse Association yet |
| UCI Track World Championships, Shanghai | Cycling | 14–18.10 (ends today) | Ends on the first day of the window; Yakovlev's entry and results were not found |
| UCI Urban Worlds, Riyadh (BMX freestyle) | Cycling | 3–7.11 | No Israelis tracked |
| FIE World Cup men's épée, Bern | Fencing | 12–14.11 | Outside the window |

No other competition in my sports (archery, equestrian, golf, climbing, badminton, basketball, 3x3, beach volleyball,
baseball or flag football) has an Israeli session in 18.10–1.11.
