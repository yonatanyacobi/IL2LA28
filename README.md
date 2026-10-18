# הדרך ללוס אנג׳לס 28

מעקב לא רשמי אחרי מסלול ההעפלה של ספורטאיות וספורטאים ישראלים לאולימפיאדת לוס אנג׳לס 2028.

- האתר: https://claude.ai/artifact/RyYBeRXq6pYwKdXujvTWvT
- `site/` – קבצי האתר (HTML, CSS, JS). הנתונים הציבוריים נטענים מ־`data.json`.
- `job/` – העדכון היומי: הוראות המשימה המתוזמנת וסקריפט הייצוא.
- `tests/` – בדיקות ונתוני דוגמה.

## הרצה מקומית
ל־`index.html` אין `<meta charset>` (מעטפת ה־Artifact מוסיפה אותו), ולכן שרת מקומי חייב לשלוח `charset=utf-8`, אחרת העברית תוצג כג׳יבריש. `python3 -m http.server` לא שולח charset, ולכן:

```sh
cp tests/fixtures/data.json site/   # או data.json שיוצא מהמאגר
cd site && python3 -c 'import http.server as h; H=h.SimpleHTTPRequestHandler; H.extensions_map.update({".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8"}); h.test(H, port=8000)'
```

ואז לפתוח את http://localhost:8000.

אין לאתר קשר לוועד האולימפי הבין־לאומי, לוועדה המארגנת של המשחקים או לוועד האולימפי בישראל.
דיווח על טעויות: il2la28.site@gmail.com
