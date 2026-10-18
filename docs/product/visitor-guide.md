# Visitor guide: "איך לקרוא את האתר" (draft for #about)

Draft for Shira's review, then the owner (launch). A new `#about` section between "ארבעת השלבים" and the trust
block. Every label below is the one the site shows today (`STAGES`, `Q_LABEL`, `trustChip`, the nav); if a label
changes in code, change it here too. Not covered yet: "השתנה ב־" (#193) until it merges.

Rules followed: gender-neutral forms, geresh ׳, „” quotes, no "live" wording, no promises about times.

## Copy

```
איך לקרוא את האתר

כל ספורטאי/ת ונבחרת במעקב מקבלים כרטיס. בכרטיס:
• השלב: במעקב, בחלון ההעפלה, מכסה הושגה או נבחר/ה לנבחרת (הסבר למעלה).
• דירוג או הישג: דירוג עולמי רשמי כשיש כזה. אחרת, התוצאה הבולטת האחרונה, מסומנת „מיקום, לא דירוג”.
• התחרות הבאה, כשהיא ידועה.
• ✓ נבדק: אדם השווה את הרשומה למקור. ◌ טרם נבדק ידנית: נאסף אוטומטית, כדאי לבדוק מול המקור.

מכסות. בכל ענף יש „תמונת מכסות”, מקצה אחרי מקצה:
✓ מכסה הושגה · ◐ במרוץ למכסה · ○ מחוץ למכסות כרגע · ? אין מידע עדיין.
ברוב הענפים המכסה שייכת למדינה, לא לספורטאי/ת. „מה זה אומר” מסביר מה מוכרע בתחרות הקרובה.
◷ בהמתנה לתוצאות: התחרות הסתיימה, והמכסות יתעדכנו רק אחרי הודעה רשמית.

היום ולוח התחרויות. „היום” מראה מי מישראל מתחרה היום ובאיזו שעה, לפי שעון ישראל. לכל תחרות יש דף משלה, עם הישראלים, לוח הזמנים והתוצאות כשהן מתפרסמות.

תוצאות. האתר מתעדכן פעם ביום, ולפעמים גם בערב תחרות. אין כאן שידור או תוצאות בזמן אמת. התוצאה מופיעה אחרי שפורסמה רשמית, עם קישור למקור ועם השעה שבה עודכנה.

מעקב. לחיצה על ☆ בדף של ספורטאי/ת, נבחרת או ענף מוסיפה אותם ל„מעקב”. שם מופיע מה השתנה מאז הביקור הקודם. המעקב נשמר רק בדפדפן הזה, בלי חשבון.

שיתוף. בדפי הספורטאים והתחרויות יש קישור להעתקה. מדף „עדכונים” אפשר להגיע לתקציר שבועי מוכן להדבקה בוואטסאפ.

טעות? כל נתון מגיע עם קישור למקור. אם משהו לא תואם, אפשר לדווח בטופס למטה, וכל תיקון נרשם.
```

## Notes for Shira

- "ולפעמים גם בערב תחרות": result nights are entered by editors after official results (the runbooks), so the
  site can change in the evening. If the owner prefers not to say it, cut those four words.
- "ועם השעה שבה עודכנה": true only for session results with `resultAt` (`#day`, `#c-`); history entries have a
  date only. Alternative: "ועם מועד העדכון".
- "וכל תיקון נרשם": the corrections log is only linked after launch (`fixLogLive()`); before then, drop the clause.
- About 1,290 characters. If it's too long for `#about`, the first three paragraphs are enough on their own.
