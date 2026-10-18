# About — trust block (sources, fact-checking, corrections)

Status: wireframe + copy, ready for implementation · Owner: UX · Base: `main`
Replaces the "איך הנתונים נאספים" and "עדכניות" sections of `viewAbout()`; "על האתר", "ארבעת השלבים"
and `reportBox()` stay. Existing classes/tokens only; numbers are computed, never hard-coded.

## Wireframe (400px)
```
┌──────────────────────────────────────┐
│ ┌ אפשר לסמוך? ככה זה עובד ─────────┐ │
│ │ [100 רשומות] [37 נבדקו ידנית]    │ │  ← .adm-tiles, non-link tiles
│ │ [26 מקצים במכסות, כולם נבדקו]    │ │
│ │ ● הנתונים עודכנו: 18 באוק׳ 14:00 │ │  ← freshness()
│ ├ מאיפה הנתונים ─────────────────── │ │
│ │ • דירוגים ותוצאות: אתרי ההתאחדויות│ │
│ │ • הודעות: הוועד האולימפי, כלי תקשורת│ │
│ │ המקורות המובילים: worldathletics… │ │  ← top 5 hosts
│ ├ שלוש רמות ביטחון ──────────────── │ │
│ │ [✓ נבדק ידנית 18 באוק׳] אדם בדק… │ │  ← real trustChip markup
│ │ [✓ נבדק · עודכן מאז] נבדק, ואז… │ │
│ │ [◌ איסוף אוטומטי] נאסף אוטומטית… │ │
│ ├ מה אוטומטי ומה לא ─────────────── │ │
│ │ ✓ אוטומטי: דירוגים, תחרויות      │ │
│ │ ✗ רק באישור אדם: שלב, ספורטאי/ת  │ │
│ │   חדש/ה, הסרה, מכסות             │ │
│ ├ תיקונים ─────────────────────────  │ │
│ │ מצאתם טעות? ← (reportBox below)  │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## Markup and copy
```html
<section class="panel prose" aria-labelledby="trustH">
  <h2 id="trustH">אפשר לסמוך? ככה זה עובד</h2>
  <div class="adm-tiles">
    <div class="adm-tile"><b>{N}</b><span>ספורטאים ונבחרות במעקב</span></div>
    <div class="adm-tile"><b>{V}</b><span>נבדקו ידנית מול המקור</span></div>
    <div class="adm-tile"><b>{Q}</b><span>מקצים בתמונת המכסות, כולם נבדקו לפני פרסום</span></div>  <!-- omit if Q = 0 -->
  </div>
  <p>{freshness()}</p>

  <h3>מאיפה הנתונים</h3>
  <ul>
    <li>דירוגים, תוצאות ושיטות העפלה: האתרים הרשמיים של ההתאחדויות הבין־לאומיות.</li>
    <li>בחירות לנבחרת והודעות: הוועד האולימפי בישראל וכלי תקשורת.</li>
  </ul>
  <p class="foot">המקורות הנפוצים באתר: {top 5 hosts of athlete sources, joined with " · "}. בכל דף ספורטאי/ת יש קישור למקור.</p>

  <h3>שלוש רמות ביטחון</h3>
  <dl class="facts">
    <dt>{trustChip ok}</dt><dd>אדם בדק את הרשומה מול המקור, והיא לא השתנתה מאז.</dd>
    <dt>{trustChip stale}</dt><dd>נבדקה ידנית, ואחר כך התעדכנה אוטומטית. ייתכן שהעדכון עוד לא נבדק.</dd>
    <dt>{trustChip auto}</dt><dd>נאספה אוטומטית ועוד לא נבדקה ידנית. כדאי לבדוק מול המקור.</dd>
  </dl>

  <h3>מה אוטומטי ומה לא</h3>
  <ul>
    <li><b>אוטומטי, פעם ביום:</b> דירוגים, תוצאות אחרונות, תחרויות קרובות.</li>
    <li><b>רק אחרי אישור של אדם:</b> שינוי שלב, ספורטאי/ת חדש/ה, הסרה מהרשימה, וכל נתוני המכסות.</li>
  </ul>

  <h3>תיקונים</h3>
  <p>כל דיווח נבדק מול מקור לפני שהוא מתפרסם, ותיקון מופיע ב„מה התעדכן”. אין לנו גישה למידע שאינו פומבי.</p>
</section>
```
- Sample chips use the real `trustChip()` output with a fixed sample date, so the legend can't drift
  from the UI. Chips in `<dt>`: `.facts` is `auto 1fr`; at 400px add
  `@media (max-width:640px){.trust-legend{grid-template-columns:1fr}}` with `class="facts trust-legend"`.
- `.adm-tile` is a static `div` here; scope its hover to links (`a.adm-tile:hover`) so these don't look clickable.
- h1 → h2 → h3 order holds; no new colours.
