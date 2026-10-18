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

## טאקוונדו: פתוח (0 מתוך 5)

| athleteId | rankNum | rankList | rankAsOf | source |
|---|---|---|---|---|
| alexandra-dan | null | WT Olympic Ranking | | פתוח |
| rivka-bayech | null | WT Olympic Ranking | | פתוח |
| avishag-semberg | null | WT Olympic Ranking | | פתוח |
| ariel-vigdor | null | WT Olympic Ranking | | פתוח |
| nimrod-krivitsky | null | WT Olympic Ranking | | פתוח |

- **רשימה:** WT Olympic Ranking. 5 הראשונים בה ב-6.1.2028 מקבלים מכסה, כך שזו הרשימה הנכונה לפי המפרט.
  לפי WT, מחזור הנקודות האולימפי התאפס ביולי 2026: https://www.worldtaekwondo.org/wtnews/view.html?nid=142099
- **למה פתוח:** הדירוג מתפרסם רק ב-worldtkd.simplycompete.com/playerRankingV2. זו אפליקציית JavaScript שלא נקראה
  כאן, ובאתר WT לא נמצא PDF או גיליון של דירוג אולימפי לאוקטובר 2026.
- **צפוי:** WT מפרסמת דירוג חודשי. אפשר לנסות שוב בדפדפן עם גישה ל-simplycompete, או לבקש קובץ מ-sport@worldtaekwondo.org.
  יעד: לפני גמר הגרנד פרי ב-28.11. ל-28.10 אפשר להגיע רק אם תהיה גישה לאתר.
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
| taekwondo | WT Olympic Ranking | Roni ✔ (הנתונים פתוחים) |
| fencing | FIE Senior Individual Ranking; לקבוצות: FIE Senior Team Ranking | Roni ✔ (`rankAsOf` פתוח) |
