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

| מפתח           | משמעות                   | סטטוס       |
| -------------- | ------------------------ | ----------- |
| `supportEmail` | כתובת התמיכה במסכי שגיאה | ⚠ טרם הוחלף |

`assertNoPlaceholders()` זורק `PlaceholderConfigError` כאשר `NODE_ENV=production`
וערך כזה עדיין במקומו. מחוץ לפרודקשן הוא נסבל ומסומן ויזואלית.

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

## פתרון תקלות

**`EnvValidationError` בעלייה** — חסר משתנה ב-`.env.local`, או שהפלפלים זהים זה לזה.
הודעת השגיאה מפרטת בדיוק אילו שדות נכשלו.

**`TestDatabaseConfigError` בטסטים** — הרצתם `test:integration` או `test:rls` בלי
`TEST_DATABASE_URL`. הריצו `pnpm test` לחבילות שלא צריכות מסד.

**אזהרת workspace root מ-Next.js** — כבר מטופלת דרך `turbopack.root` ב-`next.config.ts`.
אם היא חוזרת, כנראה נוסף lockfile חדש בתיקיית אב.
