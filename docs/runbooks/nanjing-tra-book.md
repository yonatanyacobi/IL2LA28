# Runbook: Nanjing trampoline Results Book (Worlds 4–8.11), from 8.11

For Maya (the code and tests) and the coordinator (the only DB writer). Athlete: בנימין ננדזה (`ben-nanadze`),
individual and synchronised. FIG event page: https://www.gymnastics.sport/site/events/detail.php?id=18189 (already the
Nanjing competition's `source`, so `gym_results.py plan` covers it).

**Why this exists:** #329 reads trampoline books in the Longines layout, but no real Longines trampoline book was
available, so its test text (`TRA_BOOK` in `tests/test_gym_results.py`) copies the Paris artistic layout. The 2025
Worlds book (Pamplona, fidb_12276) was scanned images. Nanjing's book decides which of the two paths below applies.

## 1. When FIG lists the book (from 8.11 evening)

```
python3 job/gym_results.py fig-docs "https://www.gymnastics.sport/site/events/detail.php?id=18189"
python3 job/gym_results.py pdf-text "<the Results Book url>" > <scratchpad>/nanjing.txt
grep -n "Trampoline\|NANADZE" <scratchpad>/nanjing.txt | head
```

- **Text book:** `NANADZE Benyamin ISR` rows appear under `Men's … Trampoline Qualification` / `Final` headers and
  "Results". Go to 2.
- **Scanned or unreadable:** the file is empty, mostly `�`, or has no rows. The daily job then warns
  `לא נקראו טבלאות תוצאות מ־<url>; לבדוק ידנית` and writes nothing. Go to 3.

## 2. Text book: swap the test text (Maya, one PR)

1. Save `nanjing.txt` as `tests/fixtures/gym/fig-nanjing-tra-2026-results-book.txt`, and have `TrampolineTest` read it
   instead of `TRA_BOOK`. Remove `TRA_BOOK`, the placeholder athletes and `noa-tester`.
2. Run `python3 -c 'import sys; sys.path.insert(0, "job"); import gym_results as g; print([r for r in g.parse_results_book(open("<scratchpad>/nanjing.txt").read()) if r["noc"] == "ISR"])'`.
   Nanadze's individual qualification and (if he made it) final must be there, with the place and Q/R mark printed in
   the book. If a header reads differently (e.g. `Men's Individual Trampoline Qualification`), add it to
   `BOOK_APPARATUS`; anything else stays a warning, never a guess.
3. Pin the real texts in the test, run the unit tests and smoke, and open the PR. After merge: copy `job/` to the live
   folder and run `check_live_sync.py`.
4. If the job already ran with the old code and wrote nothing, the next run (within 4 days of 8.11, so until 12.11)
   writes the entries. After 12.11, use 3.

## 3. Scanned book: enter Nanadze by hand (coordinator; Roni checks the place)

Read the place, and the Q / R<n> mark in qualification, from the book itself (never Live results or news). Build the
text with the job's own function, so a later run finds it already logged and adds no duplicate:

```
python3 -c 'import sys; sys.path.insert(0, "job"); import gym_results as g, tri_results as t
print(g.result_text("qual", 14, "trampoline", "<the competition name in the DB>", t.he_date("2026-11-05"), False, gender="m"))'
```

| Book says | Arguments | Text |
|---|---|---|
| Qualification, rank 14, no Q | `"qual", 14, …, False` | `מקום 14 במוקדמות <comp> (5 בנוב׳ 2026), לא עלה לגמר` |
| Qualification, rank 6, Q | `"qual", 6, …, True` | `… , עלה לגמר` |
| Qualification, rank 9, R1 | `"qual", 9, …, False, reserve=1` | `… , מחליף 1 לגמר` |
| Final, rank 5 | `"final", 5, …` | `מקום 5 בגמר <comp> (<day>)` |
| Final, rank 1–3 | `"final", 1, …` | `זהב בגמר <comp> (<day>)` (כסף, ארד) |

- `<comp>` is the competition `name` exactly as in the DB, and the date is the day of that round as the book prints it.
- Send it like any result: save the athlete as read to `cur.json`, write
  `{"result": {"at": "<YYYY-MM-DD>", "text": "<text>", "source": "<the Results Book url>"}}` to `new.json`, and run
  `python3 job/athlete_patch.py cur.json new.json`. It refuses a missing date, empty text or a non-https source
  (`result_entry`).
- A medal: also propose the notes line (`זהב באליפות העולם בטרמפולינה 2026`) for a person to approve, as the job does.

**Synchronised (Nanadze with Amiel)** is outside `gym_results.py`. Enter it by hand only with wording approved by
Roni and Shira; there is no `result_text` form for it.
