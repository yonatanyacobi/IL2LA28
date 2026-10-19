# Result lines: shooting, golf, fencing, basketball

One wording for result nights and the job (Maya's automation), in the #173 style. Each sport has two forms:
- **History**: the athlete's or team's `result.text`, written through `athlete_patch.result_entry()`.
- **Session**: the short `result` on the session (#day).

## Rules for every line
- **Official source only.** The `source` / `resultSource` is the official results page or PDF named per sport
  below. News, social media and live scores are not sources. No official list means no line yet.
- **At most 120 characters once filled.** The longest filled case per sport is measured at the end. No trailing period.
- **Date** in the job's style at the end of the history line: `(3 בנוב׳ 2026)`. The session line has no date.
  `at` is the local competition day.
- **Gender:** use the form that matches the record. Use the slash form (`עלה/תה`) only when the gender isn't known.
  Where a table's Session column shows two forms (`עלה/עלתה`, `עברה/עבר`, `הודח/ה`, `הפסיד/ה`, `פרשה/פרש`), it lists
  both for the template: write only the athlete's own form on the site.
  Teams take noun forms (`ניצחון`, `הפסד`), so they have no gender.
- **Scores:** write `<HI>:<LO>` with the higher score first, because a dash flips in RTL. Golf scores relative to
  par are written in words (`4 מתחת לפאר`, `2 מעל לפאר`, `פאר`), not `-4` or `+2`, because the sign moves in RTL.
  Keep the pair parallel: `מתחת לפאר` / `מעל לפאר`, never `מעל הפאר`.
- **Placeholders:**
  - `<P>`: place, an integer.
  - `<POS>`: a place that may be tied, `12` or `12 בשוויון`.
  - `<MED>`: זהב, כסף or ארד.
  - `<COMP>`: the event as the competition record names it, with its city when the record has one, e.g.
    `אליפות העולם בדוחא`. A Latin name takes ב־ with a maqaf: `ב־The ANNIKA (LPGA)`.
- **One history line per athlete per competition day.** When a qualification and a final happen on the same day,
  write only the final line.

## Shooting (ISSF)
Source: the ISSF results page of the competition, e.g. https://www.issf-sports.org/competitions/3421/results.
`<EV>` is the event, e.g. `רובה אוויר 10 מ׳`. `<SC>` is the qualification score, e.g. `629.8`. These are the
`doha-outcomes.md` texts in general form; Doha uses them as written there.

| Outcome | History, men | History, women | Session |
|---|---|---|---|
| Qualification, out | `מקום <P> במוקדמות <EV> ב<COMP> (<SC>), לא עלה לגמר (<DATE>)` | `… לא עלתה לגמר (<DATE>)` | `מקום <P> במוקדמות (<SC>), לא עלה/עלתה לגמר` |
| Qualification, through (final on a later day) | `מקום <P> במוקדמות <EV> ב<COMP> (<SC>), עלה לגמר (<DATE>)` | `… עלתה לגמר (<DATE>)` | `מקום <P> במוקדמות (<SC>), עלה/עלתה לגמר` |
| Final, 4–8 | `מקום <P> בגמר <EV> ב<COMP> (<DATE>)` | same | `מקום <P> בגמר` |
| Medal | `מדליית <MED> ב<EV> ב<COMP> (<DATE>)` | same | `מדליית <MED> בגמר` |
| Quota (only once the ISSF quota tracker shows it) | `זכה במכסה לישראל ב<EV> לאולימפיאדת לוס אנג׳לס 2028 – מקום <P> בגמר ב<COMP> (<DATE>)` | `זכתה …` | `מקום <P> בגמר, מכסה לישראל` |
| Mixed team, either phase | `עם <PARTNER>: ` + the line above, with `עלו` / `לא עלו` | same | same as above, `עלו` / `לא עלו` |


## Golf (LPGA)
Source: the official leaderboard, `https://www.lpga.com/tournaments/<slug>/results`. A reserve who doesn't get into
the field gets no line.
- `<TOPAR>`: the total relative to par, in words.
- `<SC>`: the round's strokes.
- `<N>`: the round number.

History gets the cut and the final position only; single rounds go to the session.

| Outcome | History, women | History, men | Session (round `<N>`) |
|---|---|---|---|
| Round played | none | none | `סבב <N>: <SC>, <TOPAR> במצטבר, מקום <POS>` |
| Made the cut | `עברה את הקאט ב<COMP>, מקום <POS> אחרי 2 סבבים (<DATE>)` | `עבר …` | `סבב 2: <SC>, <TOPAR> במצטבר, עברה/עבר את הקאט` |
| Missed the cut | `לא עברה את הקאט ב<COMP>, <TOPAR> אחרי 2 סבבים (<DATE>)` | `לא עבר …` | `סבב 2: <SC>, <TOPAR> במצטבר, לא עברה/עבר את הקאט` |
| Final position | `מקום <POS> ב<COMP>, <TOPAR> (<DATE>)` | same | `סבב 4: <SC>, מקום <POS> בסיום` |
| Win | `זכתה ב<COMP>, <TOPAR> (<DATE>)` | `זכה …` | `סבב 4: <SC>, ניצחון בטורניר` |
| Withdrew | `פרשה מ<COMP> במהלך סבב <N> (<DATE>)` | `פרש …` | `פרשה/פרש במהלך הסבב` |

Events with no cut write only the final position. `<DATE>` is the day the line describes: the round-2 day for the cut,
the last round for the final position.

## Fencing (FIE)
Source: the FIE results page of the competition (fie.org, competition results). `<V>` is pool wins and `<B>` is
pool bouts.

`<RND>` is the elimination round lost:

| Round | `<RND>` |
|---|---|
| Table of 64 | `בשלב ה־64` |
| Table of 32 | `בשלב ה־32` |
| Table of 16 | `בשלב ה־16` |
| Quarterfinal | `ברבע הגמר` |

Name the opponent only by country (`מול יריב/ה מ<COUNTRY>`), so no unverified name transliterations reach the site.

| Outcome | History, men | History, women | Session |
|---|---|---|---|
| Out in the pools | `הודח בשלב הבתים ב<COMP>, <V> ניצחונות מתוך <B> (<DATE>)` | `הודחה …` | `הודח/ה בשלב הבתים, <V> ניצחונות מתוך <B>` |
| Out in the elimination rounds | `מקום <P> ב<COMP>, הפסיד <HI>:<LO> <RND> מול יריב מ<COUNTRY> (<DATE>)` | `… הפסידה <HI>:<LO> <RND> מול יריבה מ<COUNTRY> (<DATE>)` | `מקום <P>, הפסיד/ה <HI>:<LO> <RND>` |
| Medal (both semi-final losers get bronze) | `מדליית <MED> ב<COMP> (<DATE>)` | same | `מדליית <MED>` |
| Team event | `עם נבחרת ישראל: מקום <P> בתחרות הקבוצות ב<COMP> (<DATE>)` | same | `מקום <P> בתחרות הקבוצות` |

## Basketball and 3x3 (FIBA)
Source: the FIBA game page (game id in the session file). Box scores elsewhere are not sources. The team forms
are the November runbooks' drafts, generalised. `<OPP>` is the opponent's Hebrew country name, as in the
session's `phase`.

| Outcome | History | Session |
|---|---|---|
| Win | `ניצחון <HI>:<LO> על <OPP> ב<COMP> (<DATE>)` | `ניצחון <HI>:<LO> על <OPP>` |
| Loss | `הפסד <HI>:<LO> ל<OPP> ב<COMP> (<DATE>)` | `הפסד <HI>:<LO> ל<OPP>` |
| After overtime | add `אחרי הארכה` after the score: `ניצחון <HI>:<LO> אחרי הארכה על <OPP> …` | same |

`<COMP>` examples: `מוקדמות יורובאסקט נשים 2027`, `מוקדמות מונדיאל 2027` (the prefix becomes `במוקדמות`).

## Lengths, measured
Filled with the longest real values:

| Sport | Longest case | Filled with | Length |
|---|---|---|---|
| Shooting | Mixed-team qualification | Doha values, `מקום 112` | 116 |
| Golf | Made the cut | `The ANNIKA (LPGA)`, `מקום 65 בשוויון` | 78 |
| Fencing | Women's elimination loss | `גביע העולם בוונקובר`, `מקום 33`, `15:14`, `ברבע הגמר`, `ארצות הברית` | 91 |
| Basketball | Win after overtime | `מוקדמות יורובאסקט נשים 2027`, `מונטנגרו`, `105:103` | 82 |

Shooting's quota line is 112 with `מקום 8`. Every session line is at most 50.
