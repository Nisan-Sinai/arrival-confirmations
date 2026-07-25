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

| #   | פאזה                                                          | סטטוס    |
| --- | ------------------------------------------------------------- | -------- |
| 1   | תשתית וכלים                                                   | ✅ הושלם |
| 2   | מסד נתונים: מיגרציות, אילוצים, RLS, `is_admin()`, seed        | ⬜       |
| 3   | ליבת שרת: טוקנים, invite sessions, idempotency, rate limiting | ⬜       |
| 4   | דף ההזמנה הציבורי + טופס RSVP                                 | ⬜       |
| 5   | דשבורד הניהול                                                 | ⬜       |
| 6   | חבילות הטסטים המלאות                                          | ⬜       |
| 7   | תיעוד, שמירת נתונים, ביצועים, כותרות אבטחה                    | ⬜       |
| 8   | אימות סופי + clean-room                                       | ⬜       |
| 9   | דחיפה ל-GitHub                                                | ⬜       |

צילומי מסך ותיאור מסכים יתווספו כשהמסכים עצמם ייבנו — ראו §17 ב-PLAN.md: אין
בתיעוד הזה שום דבר שלא רץ באמת.

## סטאק

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · shadcn/ui ·
Supabase (Postgres, Auth, RLS) · React Hook Form + Zod · Vitest · Playwright ·
axe-core · Stryker · Vercel

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
| `pnpm test:coverage`        | דוח כיסוי, סף 100% בארבעת המדדים |
| `pnpm test:integration`     | טסטי אינטגרציה מול מסד טסטים     |
| `pnpm test:rls`             | טסטי RLS מול מסד אמיתי           |
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

שני כללים שכבר אכופים בקוד:

- `lib/server/env.ts` מוגן בחבילת `server-only`, כך שייבוא שלו מקומפוננטת לקוח הוא
  שגיאת build ולא באג בזמן ריצה.
- `pnpm scan:secrets` נכשל אם ערך סוד אמיתי, JWT עם `role: service_role`, או אפילו
  שם של משתנה סביבה מורשה מופיע בבאנדל של הדפדפן.

## רישיון ושימוש בנתוני אורחים

לעולם אין להכניס פרטי אורחים אמיתיים ל-seeds, ל-fixtures, לצילומי מסך, ללוגים או
ל-artifacts של CI. תהליך שמירת הנתונים ומחיקתם לאחר האירוע מתועד ב-§14 של PLAN.md
ויוטמע בפאזה 7.
