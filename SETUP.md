# SETUP — הרצה מקומית

מדריך ההתקנה מאפס עד סביבת פיתוח עובדת. הדפלוי לפרודקשן מתועד ב-DEPLOYMENT.md,
מודל האבטחה ב-SECURITY.md, ואסטרטגיית הטסטים ב-TESTING.md.

## דרישות

| כלי  | גרסה                                |
| ---- | ----------------------------------- |
| Node | ‎>= 22 (נבדק על 24.11.1)            |
| pnpm | 11.1.3 — נעוץ בשדה `packageManager` |
| Git  | כל גרסה עדכנית                      |

אין תלות ב-Docker. מסד הנתונים לפיתוח ולטסטים הוא פרויקט Supabase בענן, כפי ש-§11
במפרט מתיר במפורש. `pnpm supabase:start` יסביר זאת במקום להריץ סטאק מקומי.

## התקנה

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
```

## משתני סביבה

הכל נכנס ל-`.env.local`, שלעולם אינו נכנס ל-git. `.env.example` הוא הרשימה
המוסמכת; הטבלה הבאה מסבירה מאיפה משיגים כל ערך.

### ציבורי — מגיע לדפדפן

| משתנה                           | מקור                                                        |
| ------------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → Data API → Project URL        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → anon / publishable |
| `NEXT_PUBLIC_SITE_URL`          | כתובת הבסיס. בפיתוח `http://localhost:3000`                 |

### שרת בלבד — אסור בהחלט עם קידומת `NEXT_PUBLIC_`

| משתנה                       | מקור                                                  |
| --------------------------- | ----------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → service_role |
| `TOKEN_PEPPER`              | ייצור מקומי, ‎>= 32 תווים                             |
| `IP_HASH_PEPPER`            | ייצור מקומי, ‎>= 32 תווים, **חייב להיות שונה** מהקודם |

מפתח ה-service_role עוקף RLS. הוא נטען אך ורק במודולים תחת `lib/server/`, שמוגנים
בחבילת `server-only`. אימות הסביבה ידחה כל ניסיון להשתמש באותו ערך לשני הפלפלים.

ייצור פלפלים:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### טסטים בלבד

`TEST_DATABASE_URL`, `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `TEST_USER_EMAIL`,
`TEST_USER_PASSWORD`, `TEST_BASE_URL`. נדרשים רק לחבילות `integration`, `rls` ו-E2E.
חבילות ה-unit וה-component רצות בלי אף אחד מהם — `tests/setup/unit.setup.ts` מספק
ערכים דמה דטרמיניסטיים.

> **אזהרה:** `TEST_DATABASE_URL` חייב להצביע על פרויקט טסטים ייעודי. הסוויטות
> מרוקנות טבלאות לפני כל טסט. `tests/setup/database.setup.ts` מסרב לרוץ עם
> `NODE_ENV=production`, אבל הוא לא יכול לזהות שהצבעתם בטעות על מסד אמיתי.

## ערכי placeholder שחייבים החלפה לפני פרודקשן

לפי §0 במפרט, ערכי placeholder מותרים אך ורק ב-`config/event.config.ts`, מסומנים
בקבוע `PLACEHOLDER_SENTINEL`, ונכשלים באימות בעליית פרודקשן.

| מפתח           | משמעות                        | סטטוס    |
| -------------- | ----------------------------- | -------- |
| `supportEmail` | כתובת התמיכה בהצהרות המשפטיות | ✅ הוחלף |
| `supportPhone` | טלפון רכז הנגישות             | ✅ הוחלף |

`assertNoPlaceholders()` נקראת ב-`app/layout.tsx` וזורקת `PlaceholderConfigError`
כאשר `NODE_ENV=production` וערך כזה עדיין במקומו — כלומר **build לפרודקשן נכשל**,
ולא מתגלה רק כשמשתמש נתקל בזה.

## הגדרת כתובות ההפניה ב-Supabase

**חובה, ובלי זה איפוס הסיסמה לא עובד.** זו לא הגדרה בקוד אלא בדשבורד.

כשמשתמש לוחץ על קישור איפוס, Supabase מפנה אותו לכתובת ש-`redirectTo` מבקש — אבל
**רק אם היא נמצאת ברשימת ההיתר**. אחרת הוא מתעלם ממנה בשקט ומפנה ל-Site URL. אם
ה-Site URL הוא `http://localhost:3000`, כל משתמש בפרודקשן נשלח לשרת שלא רץ אצלו,
והתסמין הוא בדיוק "המייל מגיע אבל האיפוס לא עובד".

**Supabase → Authentication → URL Configuration**

| שדה             | ערך                                                               |
| --------------- | ----------------------------------------------------------------- |
| `Site URL`      | `https://<הדומיין-שלכם>`                                          |
| `Redirect URLs` | `https://<הדומיין-שלכם>/**` וגם `http://localhost:3000/**` לפיתוח |

לבדיקה שההגדרה נתפסה — הפקודה הבאה אמורה להפנות לדומיין שלכם, לא ל-localhost:

```bash
curl -sI "https://<project-ref>.supabase.co/auth/v1/verify?token=bogus&type=recovery&redirect_to=https%3A%2F%2F<הדומיין-שלכם>%2Fauth%2Fcallback" | grep -i location
```

הקוד עצמו תומך בשלוש הזרימות ש-Supabase עשוי להחזיר — `?code=` (PKCE),
`?token_hash=` (תבנית OTP) ו-`#access_token=` (implicit) — כך ששינוי סוג הזרימה
בדשבורד לא ישבור אותו.

פרטי האירוע עצמו — מארחים, בעל השמחה, תאריך, אולם, טלפון — **אינם** כאן. הם יושבים
בטבלת `events` ונקבעים ממסך הניהול, כדי שלא תהיה שום גרסה של "שכחנו להחליף את
הפלייסהולדר לפני העלייה לאוויר".

## הרצה

```bash
pnpm dev          # שרת פיתוח על http://localhost:3000
pnpm build        # build פרודקשן
pnpm start        # הרצת ה-build
```

## בדיקות

```bash
pnpm check        # format:check + lint + typecheck
pnpm test         # unit + component
pnpm test:coverage
pnpm scan:secrets # סריקת סודות במקור ובפלט ה-build
pnpm ci           # שער האיכות המלא
```

`pnpm scan:secrets` סורק גם את `.next/`, ולכן שווה להריץ `pnpm build` לפניו כדי
שהבדיקה תכסה גם את הבאנדל של הדפדפן.

## שיופיע בגוגל

הקוד עושה את כל מה שקוד יכול לעשות: `robots.txt`, `sitemap.xml`, `canonical`, Open
Graph עם תמונת שיתוף לכל אירוע, ו-JSON-LD. **זה לא מכניס את האתר לגוגל.** גוגל לא
מגלה דומיין חדש שאף אחד לא מקשר אליו.

אסימון האימות של Search Console נמצא בקוד — `GOOGLE_SITE_VERIFICATION` ב-`lib/seo.ts`.
הוא לא סוד: כל המנגנון הוא תגית `<meta>` שגוגל קורא מהעמוד הציבורי, הוא לא מתחלף,
ויש אחד לאתר. אם מחליפים דומיין, מייצרים אסימון חדש ב-Search Console ומעדכנים שם.

מה שנשאר ידני, ובלעדיו האתר לא יופיע על שום חיפוש:

1. **אימות.** [Search Console](https://search.google.com/search-console) → Add property
   → URL prefix → `https://arrival-confirmations.vercel.app` → Verify.
2. **הגשת ה-sitemap.** Search Console → Sitemaps → `sitemap.xml` → Submit.

מכאן זה לוקח ימים עד שבועות עד שהעמודים נכנסים לאינדקס. אפשר לעקוב ב-Pages וב-URL
Inspection.

**מה שזה עדיין לא נותן.** אינדוקס הוא לא דירוג. "אישורי הגעה" היא מילת מפתח מסחרית
תחרותית בישראל, ושלושת הדברים שמזיזים אותה — תוכן שעונה על מה שאנשים באמת מחפשים,
ותק של דומיין, וקישורים נכנסים — לא נמצאים בקוד. ריאלי בטווח הקרוב: חיפושים על שם
המוצר, וביטויים ארוכים ומדויקים יותר. הערך המיידי של העבודה הזו הוא לא גוגל אלא
וואטסאפ — קישור שנשלח מגיע עם שמות בעלי השמחה, התאריך והמקום.

## פתרון תקלות

**`EnvValidationError` בעלייה** — חסר משתנה ב-`.env.local`, או שהפלפלים זהים זה לזה.
הודעת השגיאה מפרטת בדיוק אילו שדות נכשלו.

**`TestDatabaseConfigError` בטסטים** — הרצתם `test:integration` או `test:rls` בלי
`TEST_DATABASE_URL`. הריצו `pnpm test` לחבילות שלא צריכות מסד.

**אזהרת workspace root מ-Next.js** — כבר מטופלת דרך `turbopack.root` ב-`next.config.ts`.
אם היא חוזרת, כנראה נוסף lockfile חדש בתיקיית אב.

**`Leaked Password Protection Disabled` מיועץ האבטחה של Supabase** — ידוע, מקובל,
ואי אפשר לסגור אותו. הבדיקה מול HaveIBeenPwned היא פיצ'ר של מסלול Pro; ניסיון להפעיל
אותה במסלול החינמי מוחזר עם `Configuring leaked password protection via
HaveIBeenPwned.org is available on Pro Plans and up`. המוצר הזה בנוי כדי להיכנס
למסלול החינמי, ולכן האזהרה נשארת.

מה שקיים במקומה: מינימום שנים-עשר תווים לסיסמה, נאכף גם בשרת ב-`app/actions/auth.ts` וגם
בטופס ב-`features/auth/AuthForm.tsx` — מעל ברירת המחדל של Supabase, שהיא שישה. וחשוב
מזה, לאורח אין סיסמה בכלל: טופס אישור ההגעה אנונימי, ומי שכן מחזיק סיסמה הוא בעל
שמחה שרואה רק את האירועים שלו, מה שבידוד ה-RLS אוכף ו-`tests/rls/` מוכיח. הסיכון
שנותר הוא סיסמה של בעל שמחה שדלפה במקום אחר, והמענה לו הוא מנהל סיסמאות.

שאר הפריטים שהיועץ מדווח הם `INFO` על טבלאות פנימיות עם RLS ובלי policy — כלומר
דחייה גורפת, שזו הכוונה — ו-`WARN` על פונקציות `SECURITY DEFINER` שנקראות בכוונה
מבחוץ, כמו `get_public_event_by_public_id` שהוא כל מנגנון קריאת ההזמנה.
