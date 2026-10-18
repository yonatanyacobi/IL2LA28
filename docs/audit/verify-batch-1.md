# מבצע אימות, אצווה 1: 2026-10-18

בודקת: DANA. בדקתי את הספורטאים ברצועת "היום", במרתון אמסטרדם ובאליפות העולם ברוטרדם, ובאירועי מכסה עד 1.11 (ג׳ודו, התעמלות, טריאתלון, קליעה).
מכיוון שהיא מתחילה ב-1.11, נכללה גם אליפות העולם בהרמת משקולות מ-27.10.
השדות שנבדקו: name, rank, next, nextDate ו-source. הבסיס הוא `tests/fixtures/data.json`, ועליו עדכון ריכטר שכבר הוחל.

הכלל: מסמנים verifiedAt ו-verifiedBy רק לרשומות בלי תיקון פתוח, כלומר ✅ מלא.
ברשומות עם תיקון, מסמנים אחרי שהתיקון מוחל.

| athleteId | שדות שאומתו | תיקון | מקור |
|---|---|---|---|
| artem-dolgopyat | ✅ name, rank, next, nextDate (מוקדמות גברים 18.10), source | – | https://en.wikipedia.org/wiki/2026_European_Men%27s_Artistic_Gymnastics_Championships · https://en.wikipedia.org/wiki/2026_World_Artistic_Gymnastics_Championships |
| ilia-liubimov | ✅ name (עברית), next, nextDate, source. rank ריק | ❓ name_en: ב-iSport ובספורט 5 מופיע Ilya; לבדוק מול FIG לפני סימון | https://www.sport5.co.il/articles.aspx?FolderID=8008&docID=564098 |
| noam-berkovich | ✅ name, rank (מקום 31 בקרב-רב באירופה 2026), next, nextDate, source | notes: להסיר "לא נמצאו תוצאות אישיות עדכניות" (הצעה פתוחה) | https://isport.co.il/%D7%A9%D7%A0%D7%99-%D7%92%D7%9E%D7%A8%D7%99%D7%9D-%D7%9C%D7%99%D7%A9%D7%A8%D7%90%D7%9C-%D7%95%D7%A7%D7%A8%D7%99%D7%98%D7%A8%D7%99%D7%95%D7%9F-%D7%A7%D7%91%D7%95%D7%A6%D7%AA%D7%99-%D7%9C%D7%90%D7%9C/ |
| ron-ortal | ✅ name, rank (ארד מתח בוורנה, 13.633), next, nextDate, source | – | https://www.sport5.co.il/articles.aspx?FolderId=8008&DocId=544078 |
| ron-pyatov | ✅ name, rank (מקום 4 במקבילים באירופה 2026, 14.300), next, nextDate, source | – | https://en.wikipedia.org/wiki/2026_European_Men%27s_Artistic_Gymnastics_Championships |
| lihie-raz | ✅ name, rank (זהב קרקע, גביע האתגר קופר), next, nextDate (מוקדמות נשים 19.10), source | – | https://www.sport5.co.il/articles.aspx?FolderID=8008&docID=564098 |
| roni-shamay | ✅ name, rank (זהב מקבילים מדורגים בוורנה, 13.200), next, nextDate (19.10), source | – | https://www.sport5.co.il/articles.aspx?FolderId=8008&DocId=544078 |
| yali-shoshani | ✅ name, nextDate (19.10), source. rank ריק | event ו-next: "קורה" → "מקבילים מדורגים" (הצעה פתוחה) | https://www.sport5.co.il/articles.aspx?FolderID=8008&docID=564098 |
| maru-teferi | ✅ name, rank (238), next (מרתון אמסטרדם, רשום עם מספר 5), nextDate (18.10), source | notes: להוסיף "מקום 22 באירופה 2026 (2:13:36)" (הצעה פתוחה) | https://worldathletics.org/athletes/israel/maru-teferi-14526757 · https://athleticsillustrated.com/amsterdam-marathons-elite-athlete-lists-include-defending-champions/ |
| selamawit-teferi | ✅ rank (248), next (אמסטרדם, F22), nextDate (18.10), source | name: "סלאמוויט באיולין-טפרי" (הצעה פתוחה) | https://worldathletics.org/athletes/israel/selamawit-teferi-14794741 · https://sport1.maariv.co.il/Tags/%D7%A1%D7%9C%D7%90%D7%9E%D7%95%D7%95%D7%99%D7%98-%D7%91%D7%90%D7%99%D7%95%D7%9C%D7%99%D7%9F-%D7%98%D7%A4%D7%A8%D7%99/ |
| izhak-ashpiz | ✅ name, rank (5), next (אבו דאבי, מדורג 2), nextDate (29.10), source | – | https://www.ijf.org/judoka/67289 · https://www.ijf.org/competition/3157/judoka_athletes |
| yonatan-elbaz | ✅ rank (26), next (אבו דאבי, מדורג 8), nextDate (29.10; ה-73 ק״ג ביום 2, 30.10), source | name: "יהונתן אלבז" / Yehonatan Elbaz (הצעה פתוחה). nextDate: לשקול 2026-10-30 | https://www.ijf.org/judoka/24088 · https://www.ijf.org/competition/3157/judoka_athletes |
| gefen-primo | ✅ name, rank (11), next (אבו דאבי, מדורגת 3), nextDate (29.10, יום 1), source | – | https://www.ijf.org/judoka/20206 · https://www.ijf.org/competition/3157/judoka_athletes |
| timna-nelson-levy | ✅ name, rank (6), next (אבו דאבי, מדורגת 1), nextDate (29.10, יום 1), source | – | https://www.ijf.org/judoka/14858/results?results_rank_group=all · https://www.ijf.org/competition/3157/judoka_athletes |
| raz-hershko | ✅ name, rank (1), next (אבו דאבי, מדורגת 1), source | nextDate: ה-78+ ק״ג ביום 3, כלומר 2026-10-31 ולא 29.10 | https://www.ijf.org/judoka/13713 · https://www.ijf.org/competition/3157/judoka_athletes |
| inbal-shemesh | ✅ name, rank (35), next ריק (לא רשומה לאבו דאבי), source | notes: להסיר "דירוג נוכחי לא נמצא" (הצעה פתוחה) | https://www.ijf.org/judoka/13716 |
| kerem-primo | ✅ name, rank (13), next ריק (לא רשומה), source | notes: "קרע ברצועה" → "פציעה ממושכת" (PR #54) | https://www.ijf.org/judoka/60920 |
| inbar-lanir | ✅ name, rank (22), next ריק (לא רשומה, אחרי ניתוח), source | notes: להסיר "דירוג נוכחי לא נמצא" (הצעה פתוחה) | https://www.ijf.org/judoka/20209 |
| yuli-alma-mishiner | ✅ name, rank (13), next ריק (לא רשומה), source | notes: להוסיף את השנה 2024 לתואר עד 23 (הצעה פתוחה) | https://www.ijf.org/judoka/64647/results?results_rank_group=all |
| shachar-sagiv | ✅ name, rank (63), next (טונגיונג, ב"Next events" בפרופיל), nextDate (24.10), source | – (רשימת הזינוק הרשמית עוד לא פורסמה; לבדוק שוב ב-23.10) | https://triathlon.org/athletes/profile/41870 |
| sergey-richter | ✅ name, next (אליפות העולם בדוחא), nextDate (3.11), source | ❓ rank 55: קובץ הדירוג של ISSF (xlsx) לא נקרא. לבדוק ידנית לפני סימון | https://backoffice.issf-sports.org/getfile.aspx?mod=docf&pane=1&inst=783&iist=366&file=WCH-RPSH-Doha-2026-Entry-List-by-NOC-03.10.2026.pdf |
| celia-gold | ❓ אף שדה לא אומת. rank ו-next ריקים, ולא נמצאה רשימת רשומים לאליפות העולם (מ-27.10) | name: "סיליה גולד" (הצעה פתוחה). next: לא להוסיף בלי רשימת רשומים של IWF | https://www.srugim.co.il/741477-%D7%9E%D7%A8%D7%99%D7%9E%D7%AA-%D7%94%D7%9E%D7%A9%D7%A7%D7%95%D7%9C%D7%95%D7%AA-%D7%A9%D7%91%D7%A8%D7%94-%D7%A9%D7%99%D7%90-%D7%99%D7%A9%D7%A8%D7%90%D7%9C%D7%99-%D7%91%D7%90%D7%9C%D7%99%D7%A4%D7%95 |

## לסימון עכשיו (verifiedAt=2026-10-18, verifiedBy=dana)
artem-dolgopyat, ron-ortal, ron-pyatov, lihie-raz, roni-shamay, izhak-ashpiz, gefen-primo, timna-nelson-levy, shachar-sagiv (9).

## אחרי החלת התיקון
noam-berkovich, yali-shoshani, maru-teferi, selamawit-teferi, yonatan-elbaz, raz-hershko (nextDate), inbal-shemesh, kerem-primo, inbar-lanir, yuli-alma-mishiner (10).

## נשאר ❓
ilia-liubimov (name_en), sergey-richter (rank), celia-gold.
