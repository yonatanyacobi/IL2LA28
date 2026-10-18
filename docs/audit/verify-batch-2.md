# מבצע אימות, אצווה B2: ג׳ודו (אבו דאבי) + דוחא

בודקת: תמר · 18.10.2026, 18:10 · לפי docs/product/verification-drive.md (#71, 42337ba).
נבדק מול site/data.json מ־18.10, 11:01 (generatedAt). כל רשומה שהשתנתה אחרי זה חוזרת לבדיקה.
ההשוואה היא לעומת הביקורת של דנה מ־18.10 (docs/audit/2026-10-18.md). את כל הטענות הנראות בדקתי מחדש, ולא רק את מה שהשתנה.

מקורות משותפים:
- **דירוג:** IJF World Ranking List, עדכון 12.10.2026 (ijf_sen_wrl_2026_10_12, דרך https://www.ijf.org/wrl_downloads).
- **רשימת המשתתפים באבו דאבי:** https://www.ijf.org/competition/3157/judoka_athletes, נבדקה ב־18.10.

**סיכום:** 8 ✅ ו־2 ✏️. שני ה־❓ נפתרו: ריכטר עבר ל־✅, ובכרם פרימו נשארה טענה אחת להסרה.
אפשר לסמן רק את רשומות ה־✅. את שתי רשומות ה־✏️ מסמנים רק אחרי שהתיקון פורסם.

| athleteId | verdict | fields checked | fix | source |
|---|---|---|---|---|
| kerem-primo | ✏️ | שם, 63־, דירוג 13, כסף בעולם באקו 2026 (הפסד בגמר לקאג׳ו), ארד בג״ס בודפשט ובגרנד פרי לינץ 2026, next ריק (לא רשומה לאבו דאבי) | להסיר את "חזרה ב־2026 אחרי קרע ברצועה". הקרע לא מופיע באף מקור. ynetnews כותב שהייתה מושבתת כמעט שנתיים, אבל ב־IJF יש לה תוצאות ב־2025 (ארד באירופה לנוער, ספט׳ 2025), כך שגם "חזרה ב־2026" לא מבוסס | https://www.ijf.org/judoka/60920/results?results_rank_group=all ; https://www.ynetnews.com/sport/article/b1ftqjvsme ; https://www.euronews.com/2026/10/07/judo-grigalashvili-claims-fourth-world-title-as-kaju-reigns-again |
| sergey-richter | ✅ | דירוג 55 ב־ARM (ISSF, 1.10.2026); במוקדמות רובה אוויר 10 מ׳: מקום 17 בהאנגג׳ואו (629.8), 47 במינכן (628.3), 42 באליפות אירופה בירוואן (627.1); next ריק | אין. ה־❓ מ־18.10 נפתר, כי הקובץ נקרא | https://backoffice.issf-sports.org/getfile.aspx?mod=docf&pane=1&inst=474&iist=385&file=World-Ranking-20261001.xlsx ; https://www.issf-sports.org/competitions/3574/resultstargets/53484953524d323330343139383930313b3b333537343b41524d3b313b513b493b313b303b30 ; https://www.issf-sports.org/competitions/3284/resultstargets/53484953524d323330343139383930313b3b333238343b41524d3b313b513b493b313b303b30 ; https://www.issf-sports.org/competitions/3458/resultstargets/53484953524d323330343139383930313b3b333435383b41524d3b313b513b493b313b303b30 |
| raz-hershko | ✅ | 78+, דירוג 1, next אבו דאבי 29.10 (מדורגת 1), זהב אירופה 2026, ארד עולם באקו 2026, זהב בג״ס בודפשט ובג״ס טביליסי ובגרנד פרי לינץ 2026, כסף פריז 2024 | אין. רשות: להוסיף ארד בגרנד פרי לימה 2026 | https://www.ijf.org/judoka/13713/results?results_rank_group=all |
| gefen-primo | ✅ | 52־, דירוג 11, next אבו דאבי (מדורגת 3), ארד בג״ס טביליסי 2026, מקום 7 בפריז 2024, הדחה מוקדמת בעולם 2026 | אין. רשות: להוסיף זהב בג״ס לוזאן 2026 (הוצע כבר ב־18.10) | https://www.ijf.org/judoka/20206/results?results_rank_group=all |
| izhak-ashpiz | ✅ | 60־, דירוג 5, next אבו דאבי (מדורג 2), זהב בג״ס טביליסי ובודפשט 2026, ארד באירופה 2026 (טביליסי), ארד בג״ס פריז ובאולן בטאר 2026, יליד 2007 (נולד 12.11.2007, גיל 18 ב־IJF), הדחה מוקדמת בעולם 2026 | אין | https://www.ijf.org/judoka/67289/results?results_rank_group=all ; https://en.wikipedia.org/wiki/Izhak_Ashpiz |
| timna-nelson-levy | ✅ | 57־, דירוג 6, next אבו דאבי (מדורגת 1), כסף אירופה 2026, זהב בג״ס טביליסי 2026, כסף בג״ס פריז 2025, הדחה מוקדמת בעולם 2026, השתתפות בפריז 2024 | אין | https://www.ijf.org/judoka/14858/results?results_rank_group=all |
| yonatan-elbaz | ✅ | השם (יהונתן / Yehonatan, תוקן), 73־, דירוג 26, next אבו דאבי (מדורג 8), מקום 5 בעולם באקו 2026 | אין. התיקונים מ־18.10 כבר ברשומה | https://www.ijf.org/judoka/24088/results?results_rank_group=all |
| inbal-shemesh | ✅ | 57־, דירוג 35 ב־57־ (36 ב־63־), כסף בג״ס טביליסי 2026, כסף בג״ס טשקנט 2025, הדחה מוקדמת בעולם 2026, next ריק (לא רשומה לאבו דאבי) | אין. התיקונים מ־18.10 כבר ברשומה | https://www.ijf.org/judoka/13716/results?results_rank_group=all |
| inbar-lanir | ✏️ | 78־, דירוג 22, כסף פריז 2024, אלופת עולם 2023, היעדרות מאליפות העולם 2026, ניתוח בכתף (mako, 6.7.2026), next ריק | להסיר את "צפויה לחזור בתחילת 2027 (ynet)". הכתבה ב־ynet לא נמצאה, ו־mako כותב רק "כמה חודשים". זה מקור תקשורתי אחד, ולפי כלל 2 לא מספיק. נוסח מוצע: "פצועה בכתף – לא השתתפה באליפות העולם 2026" | https://www.ijf.org/judoka/20209/results?results_rank_group=all ; https://www.mako.co.il/Sports-others/q2_2026/Article-1d988d23d12ae91026.htm |
| yuli-alma-mishiner | ✅ | 78+, דירוג 13, אלופת אירופה עד גיל 23 (נוב׳ 2024; התיקון מ־18.10 כבר ברשומה), אותו משקל כמו הרשקו, next ריק (לא רשומה לאבו דאבי) | אין | https://www.ijf.org/judoka/64647/results?results_rank_group=all |
