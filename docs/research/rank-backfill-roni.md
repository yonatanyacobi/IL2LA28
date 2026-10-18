# מילוי דירוג מספרי (rankNum): ג׳ודו, טאקוונדו, סיוף (רוני)

לפי מפרט #73 (`docs/product/spec-rank-tiebreak.md` ב-dev/pm/rank-spec). נכתב ב-18.10.2026, לתאריך יעד 28.10.
`athleteId` לקוח מ-`tests/fixtures/data.json`. ערכי `rankList` כתובים באנגלית, כמו בגוף הבינלאומי.

## ג׳ודו: הושלם (9 מתוך 9)

**איזו רשימה.** לפי המפרט צריך את הרשימה שמכריעה את ההעפלה ל-LA28, כלומר את דירוג ה-WRL של תקופת ההעפלה האולימפית
(ijf.org/wrl_olympic). אבל הדף נטען ב-JavaScript ואין לו PDF רשמי, כך שלא ניתן לקרוא אותו ולצטט אותו.
לכן השתמשתי ב-**IJF World Ranking List**, שמופיע ב-PDF הרשמי מ-12.10.2026. זה גם הדירוג שמופיע ב-`rank` הקיים
ובעמודת ה-WRL ברשימת הרשומים של אבו דאבי. **אני מאשר את השורה של ג׳ודו בטבלת המפרט.**
אם בעתיד יהיה אפשר לקרוא את WRL OG, כדאי לעבור אליו.

מקור לכל השורות: https://78884ca60822a34fb0e6-082b8fd5551e97bc65e327988b444396.ssl.cf3.rackcdn.com/up/2026/10/ijf_sen_wrl_2026_10_12-1791826-1791826179.pdf
(שורת הכותרת: "Latest Update: 12/10/2026"; קישור מ-https://www.ijf.org/wrl_downloads)

| athleteId | rankNum | rankList | rankAsOf | source |
|---|---|---|---|---|
| raz-hershko | 1 | IJF World Ranking List | 2026-10-12 | WRL PDF, +78 kg |
| izhak-ashpiz | 5 | IJF World Ranking List | 2026-10-12 | WRL PDF, -60 kg |
| timna-nelson-levy | 6 | IJF World Ranking List | 2026-10-12 | WRL PDF, -57 kg |
| gefen-primo | 11 | IJF World Ranking List | 2026-10-12 | WRL PDF, -52 kg |
| kerem-primo | 13 | IJF World Ranking List | 2026-10-12 | WRL PDF, -63 kg |
| yuli-alma-mishiner | 13 | IJF World Ranking List | 2026-10-12 | WRL PDF, +78 kg |
| inbar-lanir | 22 | IJF World Ranking List | 2026-10-12 | WRL PDF, -78 kg |
| yonatan-elbaz | 26 | IJF World Ranking List | 2026-10-12 | WRL PDF, -73 kg (ב-IJF: ELBAZ Yehonatan) |
| inbal-shemesh | 35 | IJF World Ranking List | 2026-10-12 | WRL PDF, -57 kg (מופיעה גם ב-63- במקום 36; המשקל שלה ב-data.json הוא 57-) |

ערכי השורות האלה זהים לטקסט החופשי ב-`rank`, כך שאין צורך לשנות אותו.

**ישראלים שלא במעקב ונמצאים בטופ 60 ב-WRL**, למידע בלבד:
גילי שריר 63- (18), יוסף סימין 100- (23), תמר מלכה 48- (26), אדלינה נוביצקי 70- (42), מאיה גושן 70- (57).
שריר במקום 18 קרובה ל-17 הראשונות, ולכן כדאי שהעורכים ישקלו להוסיף אותה למעקב.

## טאקוונדו: חלקי (2 מתוך 5)

**מקור חלופי רשמי:** ספר התוצאות של WT לגרנד פרי פריז 2026 (9–11.10.2026).
במסמך יש טבלת זריעה עם העמודה "Rank WT Olympic" ועם הכותרת "As of 11 OCT 2026":
https://results.worldtaekwondo.org/resultbooks/paris-2026-world-taekwondo-grand-prix-result-book-6acf30b155e45.pdf
(הקישור נמצא ב-https://results.worldtaekwondo.org/competitions?type=gp)

| athleteId | rankNum | rankList | rankAsOf | source |
|---|---|---|---|---|
| rivka-bayech | 21 | WT Olympic Ranking | **פתוח** (ספר התוצאות מתאריך 11.10.2026) | ספר התוצאות של פריז, W-49kg: "BAYECH Rivka ISR-1815 21", זרועה 19 |
| alexandra-dan | 37 | WT Olympic Ranking | **פתוח** (ספר התוצאות מתאריך 11.10.2026) | ספר התוצאות של פריז, W-49kg: "DAN Oleksandra ISR-2245 37", זרועה 29 |
| avishag-semberg | null | WT Olympic Ranking | | לא השתתפה בפריז ולא במוג׳ו |
| ariel-vigdor | null | WT Olympic Ranking | | לא השתתפה בפריז ולא במוג׳ו |
| nimrod-krivitsky | null | WT Olympic Ranking | | לא השתתף בפריז ולא במוג׳ו |

- **רשימה:** WT Olympic Ranking. 5 הראשונים בה ב-6.1.2028 מקבלים מכסה.
  לפי WT, השלב השני של מחזור הנקודות התחיל ביולי 2026: https://www.worldtaekwondo.org/wtnews/view.html?nid=142099
- **הדירוג המלא:** מתפרסם רק ב-worldtkd.simplycompete.com/playerRankingV2. האתר מחזיר 403 לבקשות אוטומטיות,
  ולא עקפתי את החסימה. גם באתר WT ובהודעות שלו לא נמצא PDF של הדירוג האולימפי.
- **תאריך הרשימה:** ספר התוצאות לא מציין מאיזה חודש הדירוג ששימש לזריעה. לפי המפרט `rankAsOf` חובה,
  וזו אותה שאלה כמו בסיוף.
  - הצעה: `rankAsOf` = 2026-10-11, תאריך ספר התוצאות, עם הערה ב-`rank`.
  - חלופה: לחכות לגמר הגרנד פרי (28–29.11.2026). ספר התוצאות שלו יציג דירוג עדכני של המשתתפים.
- **השלושה האחרים:** נבדק גם ספר התוצאות של מוג׳ו (5–7.9.2026, "As of 29 SEP 2026") ולא נמצאו בו ישראלים.
  נשארו שתי דרכים:
  - גישה ידנית ל-simplycompete בדפדפן רגיל.
  - בקשה ל-sport@worldtaekwondo.org.
- לפי המפרט, `rankNum: null` לא מזיק: הפריטים האלה ממוינים אחרי פריטים עם דירוג.

## סיוף: חלקי

| athleteId | rankNum | rankList | rankAsOf | source |
|---|---|---|---|---|
| yuval-freilich | 262 | FIE Senior Individual Ranking, Men's Épée | **חסר** | https://fie.org/athletes/24944 ("World ranking #262 - Israel - Epee", עונה 2027, 4.250 נק׳) |
| alon-sarid | null | FIE Senior Team Ranking, Men's Épée | | פתוח |
| dov-vilensky | null | FIE Senior Team Ranking, Men's Épée | | פתוח |
| yehonatan-mesika | null | FIE Senior Team Ranking, Men's Épée | | פתוח |
| yonatan-cohen | null | FIE Senior Team Ranking, Men's Épée | | פתוח |

- **פריילך:** FIE מציגה את המקום, אבל לא את תאריך הפרסום. לפי המפרט `rankAsOf` חובה, ולכן אין להזין את הערך כמו שהוא.
  יש שתי אפשרויות, וה-PM יחליט:
  - (א) להזין `rankAsOf: 2026-10-18`, תאריך הקריאה, עם הערה.
  - (ב) לחכות לתחרות FIE הבאה, שאחריה הדירוג מתעדכן והתאריך ידוע.
- **ארבעת סייפי הנבחרת:** המפרט אומר שקבוצות משתמשות בדירוג הקבוצתי. עדיין לא נבדק מקום ישראל בדירוג הקבוצתי של FIE בדקר גברים.
  שאלה ל-PM: האם `rankNum` של ספורטאי/ת שמתחרה רק בקבוצה הוא המקום של הנבחרת?
- **הקשר:** תקופת הדירוג ל-LA28 נפתחת רק ב-1.4.2027, ולכן כרגע הדירוג משמש רק כשובר שוויון.

## שורות לטבלת המפרט

| Sport | List (`rankList`) | Confirmed by |
|---|---|---|
| judo | IJF World Ranking List. ה-WRL OG האולימפי עדיף, אבל אי אפשר לקרוא אותו כרגע | Roni ✔ |
| taekwondo | WT Olympic Ranking | Roni ✔ (2 מתוך 5 מספר התוצאות של פריז; `rankAsOf` פתוח) |
| fencing | FIE Senior Individual Ranking; לקבוצות: FIE Senior Team Ranking | Roni ✔ (`rankAsOf` פתוח) |
