# אישורי הגעה

מערכת אישורי הגעה לאירועים — הזמנה דיגיטלית שנשלחת בוואטסאפ, טופס אישור הגעה
לאורחים, ודשבורד ניהול לבעלי השמחה. עברית מלאה, RTL, mobile-first.

בניגוד לשירותי אישורי ההגעה המסחריים, המערכת הזו **חינמית לחלוטין** — היא רצה על
המסלול החינמי של Vercel ושל Supabase, בלי מנוי, בלי תשלום לפי אורח ובלי הגבלה על
מספר ההזמנות.

המערכת אינה קשורה לסוג אירוע מסוים. `config/eventTypes.ts` מגדיר 11 סוגי אירוע —
ברית מילה, זבד הבת, פדיון הבן, חלאקה, בר מצווה, בת מצווה, אירוסין, חינה, חתונה,
יום הולדת ואירוע כללי — וכל אחד מהם מביא איתו את הנוסח והתוויות המתאימים.

---

## סטטוס בנייה

הפרויקט נבנה בפאזות לפי [PLAN.md](PLAN.md), שהוא שחזור מלא של המפרט.

| #   | פאזה                                                          | סטטוס                  |
| --- | ------------------------------------------------------------- | ---------------------- |
| 1   | תשתית וכלים                                                   | ✅ הושלם               |
| 2   | מסד נתונים: מיגרציות, אילוצים, RLS, `is_admin()`, seed        | ✅ הושלם (ללא seed)    |
| 3   | ליבת שרת: טוקנים, invite sessions, idempotency, rate limiting | 🟡 חלקי                |
| 4   | דף ההזמנה הציבורי + טופס RSVP                                 | ✅ הושלם               |
| 5   | דשבורד הניהול                                                 | ✅ הושלם               |
| 6   | חבילות הטסטים המלאות                                          | 🟡 unit + e2e + a11y   |
| 7   | תיעוד, שמירת נתונים, ביצועים, כותרות אבטחה                    | 🟡 כותרות אבטחה הושלמו |
| 8   | אימות סופי + clean-room                                       | ⬜                     |
| 9   | דחיפה ל-GitHub                                                | ⬜                     |

מה שעדיין לא קיים, במפורש: אין סקריפטי `seed`/`reset` למסד, אין מנגנון קישורים
אישיים לאורח (`guests`, invite sessions — הטבלאות קיימות, הזרימה לא), אין מחיקת
נתונים אוטומטית לאחר האירוע (§14), ואין חבילות `integration`, `rls` ו-`component`
— התיקיות שלהן מוגדרות ב-`vitest.config.ts` וריקות.

צילומי מסך ותיאור מסכים יתווספו כשיהיה seed שאפשר לצלם בלי נתוני אורחים אמיתיים —
ראו §17 ב-PLAN.md: אין בתיעוד הזה שום דבר שלא רץ באמת.

## סטאק

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 ·
Supabase (Postgres, Auth, RLS) · Server Actions + Zod · Vitest · Playwright ·
axe-core · Stryker · Vercel

הטפסים אינם מבוקרים ומשתמשים ב-`useActionState` מול Server Actions, ולא ב-React
Hook Form: כך הם עובדים גם לפני hydration — אורח על חיבור חלש באולם יכול לענות
לפני שה-JavaScript סיים להיטען. הקומפוננטות ב-`components/ui/` נכתבו לפרויקט לפי
מוסכמות shadcn, אך אינן מותקנות ממנו.

## מבנה התיקיות

```
app/            נתיבים — Server Components כברירת מחדל
components/ui/  פרימיטיבים של shadcn
config/         event.config.ts · eventTypes.ts · messages.ts
lib/            עזרים, פורמט, שגיאות
lib/server/     מודולים server-only — לקוחות מורשים, טוקנים, IP resolver
scripts/        כלי תחזוקה ו-CI
tests/          unit · component · integration · rls · security
e2e/            Playwright
```

הגבול הקשיח: ה-UI לעולם לא ניגש למסד ישירות. רק `repositories/` מדבר עם Supabase,
ו-`services/` מחזיק את הלוגיקה העסקית.

## התחלה מהירה

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # ומלאו ערכים אמיתיים
pnpm dev
```

הוראות מלאות, כולל מאיפה משיגים כל מפתח: **[SETUP.md](SETUP.md)**.

## פקודות

| פקודה                       | מה היא עושה                      |
| --------------------------- | -------------------------------- |
| `pnpm dev`                  | שרת פיתוח                        |
| `pnpm build` / `pnpm start` | build פרודקשן והרצתו             |
| `pnpm check`                | format:check + lint + typecheck  |
| `pnpm test`                 | טסטי unit + component            |
| `pnpm test:coverage`        | דוח כיסוי + אכיפת הספים          |
| `pnpm test:integration`     | טסטי אינטגרציה — טרם נכתבו       |
| `pnpm test:rls`             | טסטי RLS — טרם נכתבו             |
| `pnpm test:e2e`             | Playwright                       |
| `pnpm test:a11y`            | סריקות נגישות                    |
| `pnpm test:mutation`        | Stryker על לוגיקת הליבה          |
| `pnpm scan:secrets`         | סריקת סודות במקור ובפלט ה-build  |
| `pnpm deadcode`             | זיהוי קוד מת ו-exports לא בשימוש |
| `pnpm ci`                   | שער האיכות המלא                  |

## אבטחה

מודל האבטחה המלא — מטריצת הגישה למסד, מחזור החיים של טוקן ההזמנה, החלפת הטוקן
לסשן, הרשאות האדמין והגבלת הקצב — יתועד ב-SECURITY.md בפאזה 7. העקרונות עצמם
מוגדרים ב-§4 של [PLAN.md](PLAN.md) ומיושמים מפאזה 2 והלאה.

כללים שכבר אכופים בקוד:

- `lib/server/env.ts` מוגן בחבילת `server-only`, כך שייבוא שלו מקומפוננטת לקוח הוא
  שגיאת build ולא באג בזמן ריצה.
- `pnpm scan:secrets` נכשל אם ערך סוד אמיתי, JWT עם `role: service_role`, או אפילו
  שם של משתנה סביבה מורשה מופיע בבאנדל של הדפדפן.
- `next.config.ts` שולח כותרות אבטחה בכל תגובה: CSP עם `frame-ancestors 'none'`,
  `object-src 'none'` ו-`base-uri 'self'`, ולצדן `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` ו-HSTS.
  הן נבדקות ב-`e2e/invitation.spec.ts`.
- `assertNoPlaceholders()` רץ ב-`app/layout.tsx`, כך ש-build לפרודקשן נכשל כל עוד
  ערך תצורה כלשהו עדיין מכיל `__REPLACE_ME__`.

## רישיון ושימוש בנתוני אורחים

לעולם אין להכניס פרטי אורחים אמיתיים ל-seeds, ל-fixtures, לצילומי מסך, ללוגים או
ל-artifacts של CI. תהליך שמירת הנתונים ומחיקתם לאחר האירוע מתועד ב-§14 של PLAN.md
ויוטמע בפאזה 7.
