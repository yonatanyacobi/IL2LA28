# Result lines: marathon and road, triathlon, sailing, surfing

Ofir's sports, in the same form as `result-lines-yael.md`. The rules there apply here too:
- official source only, at most 120 characters, no trailing period;
- the date in the job's style at the end of the history line;
- gendered forms (the slash form only when the gender isn't known);
- `<P>` / `<POS>` / `<MED>` / `<COMP>` as defined there.

Sources checked by Ofir (19.10, #328):

| Sport | Official source | Not a source |
|---|---|---|
| Marathon and road | The race's own official results (the results link on the race site; e.g. https://www.frankfurt-marathon.com/en/information/results/). It is final first. The race's World Athletics results page comes later (not up a day after Amsterdam). The World Athletics race report counts for the places it lists. Sporthive pages are browser-only (D11) | Live tracking and timing feeds (e.g. UltimateLIVE), splits, news |
| Triathlon | The results tab on the triathlon.org event page, **final list only** (this is what `job/tri_results.py` reads) | TriathlonLIVE, news |
| Sailing | World Sailing events: the results linked from the event page on sailing.org. Class worlds: the class's results link (Formula Kite: IKA at fir.com.pl/results/IKA; iQFoil: iqfoilclassofficial.org). Fallback for a final place: the athlete's World Sailing ranking breakdown (assets.sailing.org/ranking_results/…) | Tracking apps, news |
| Surfing | WSL: the event's results and heat pages on worldsurfleague.com. ISA: the event's results on isasurf.org, **browser-only** (403 to our tools) | Live heat scores before the heat is final, news |

## Marathon and road (World Athletics)
`<TIME>` is the official net time as listed, e.g. `2:07:22`. Add `, שיא אישי` or `, שיא ישראלי` after the time only
when the official list marks it (PB / NR). Don't write a qualifying-time line: World Athletics hasn't published the
LA28 marathon system yet.

| Outcome | History, men | History, women | Session |
|---|---|---|---|
| Finished | `מקום <P> ב<COMP>, <TIME> (<DATE>)` | same | `מקום <P>, <TIME>` |
| Did not finish | `לא סיים את <COMP> (<DATE>)` | `לא סיימה את <COMP> (<DATE>)` | `לא סיים/סיימה` |
| Did not start, or not on the list | no entry | no entry | none |

## Triathlon (World Triathlon)
These are **exactly** the strings `tri_results.result_text()` writes. A manual entry must match them character for
character, or the next run adds a second entry. The job uses the neutral form; making it gendered is a code change
(Maya), not a wording change here.

| Outcome | History (job) | Session |
|---|---|---|
| Finished | `מקום <P> ב<COMP> (<DIST>, <DATE>)`; `<DIST>` is ספרינט / מרחק אולימפי / ספרינט קצר, left out when unknown | `מקום <P>` |
| DNF | `לא סיים/ה את <COMP> (<DATE>)` | `לא סיים` |
| DSQ | `נפסל/ה ב<COMP> (<DATE>)` | `נפסל` |
| DNS | no entry | none |

## Sailing (regatta and medal race)
`<CLASS>` is the class as the quota item names it, e.g. `iQFoil`, `פורמולה קייט`, `ILCA 7`. `<COMP>` is the
record's name without its bracketed class list, because `<CLASS>` already says it: `אליפות העולם בשייט - מקצי יחיד`.
Racing days go to the session only. History gets the end of the opening series and the final result.

| Outcome | History, men | History, women | Session |
|---|---|---|---|
| A racing day | none | none | `יום <N>: מקום <P> במצטבר` |
| Opening series, out | `מקום <P> ב<COMP>, <CLASS>, לא עלה למירוץ המדליות (<DATE>)` | `… לא עלתה …` | `מקום <P> במצטבר, לא עלה/עלתה למירוץ המדליות` |
| Opening series, through (medal race on a later day) | `מקום <P> אחרי סדרת הפתיחה ב<COMP>, <CLASS>, עלה למירוץ המדליות (<DATE>)` | `… עלתה …` | `מקום <P> במצטבר, עלה/עלתה למירוץ המדליות` |
| Kite / iQFoil finals series, out | `מקום <P> ב<COMP>, <CLASS>, הודח <RND> (<DATE>)`; `<RND>` is ברבע הגמר / בחצי הגמר | `… הודחה …` | `מקום <P>, הודח/ה <RND>` |
| Final result | `מקום <P> ב<COMP>, <CLASS> (<DATE>)` | same | `מקום <P> בסיום` |
| Medal | `מדליית <MED> ב<COMP>, <CLASS> (<DATE>)` | same | `מדליית <MED>` |
| Quota (only once World Sailing's quota list shows it) | `זכה במכסה לישראל ב<CLASS> לאולימפיאדת לוס אנג׳לס 2028 – מקום <P> ב<COMP> (<DATE>)` | `זכתה …` | `מקום <P>, מכסה לישראל` |

When the opening series ends and the medal race is sailed on the same day, write only the final line.

## Surfing (WSL / ISA heats)
Heats go to the session; history gets the elimination or the final result. `<SC>` is the heat total as listed,
e.g. `12.43`.

`<RND>` is the round:

| Round | `<RND>` |
|---|---|
| WSL Opening Round | `בסבב הפתיחה` |
| WSL Elimination Round | `בסבב ההדחה` |
| Round of 16 | `בשמינית הגמר` |
| Quarterfinal | `ברבע הגמר` |
| Semifinal | `בחצי הגמר` |
| ISA main round `<N>` | `בסבב <N>` |
| ISA repechage round `<N>` | `בסבב <N> של המקצים החוזרים` |

A WSL Opening Round loss that sends the surfer on to the Elimination Round is a session line only.

| Outcome | History, women | History, men | Session |
|---|---|---|---|
| Heat won or advanced | none | none | `<RND>: <SC>, עלתה/עלה לשלב הבא` |
| Eliminated | `מקום <POS> ב<COMP>, הודחה <RND> (<DATE>)` | `… הודח …` | `<RND>: <SC>, הודחה/הודח` |
| Final, second place | `מקום 2 ב<COMP> (<DATE>)` | same | `גמר: <SC>, מקום 2` |
| Win | `זכתה ב<COMP> (<DATE>)` | `זכה …` | `גמר: <SC>, ניצחון` |
| Quota (ISA WSG, only once ISA's allocation shows it) | `זכתה במכסה לישראל בגלישה לאולימפיאדת לוס אנג׳לס 2028 – מקום <POS> ב<COMP> (<DATE>)` | `זכה …` | `מקום <POS>, מכסה לישראל` |

`<POS>` uses WSL's or ISA's own place, e.g. `9 בשוויון` for "Equal 9th".

## Lengths, measured
Filled with the longest real values and the competition records' real names:

| Sport | Longest case | Filled with | Length |
|---|---|---|---|
| Sailing | Quota, women | `פורמולה קייט`, `מקום 12`, `אליפות העולם בשייט - מקצי יחיד` | 117 |
| Surfing | Quota, women | `מקום 33 בשוויון`, `משחקי הגלישה העולמיים של ISA` | 116 |
| Sailing | Through to the medal race | as above, `מקום 10` | 107 |
| Triathlon | Finished | `גביע העולם בטריאתלון טונגיונג`, `מרחק אולימפי` | 68 |
| Marathon | Finished, national record | `מרתון פרנקפורט`, `מקום 120` | 61 |

Every session line is at most 50. The two quota lines are close to the limit, so keep `<COMP>` to the record's
name as defined above.
