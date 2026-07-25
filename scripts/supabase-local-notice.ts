/**
 * `supabase:start` / `supabase:stop` placeholder-free notice.
 *
 * The specification's script list assumes a Docker-backed local Supabase stack.
 * This deployment intentionally does not use Docker (see ARCHITECTURE.md), and runs
 * its integration, RLS and E2E suites against a dedicated cloud project instead —
 * which §11 explicitly permits. Rather than silently doing nothing, these scripts
 * explain where the test database actually lives.
 */

const message = `
מסד הנתונים לפיתוח ולטסטים בפרויקט הזה אינו רץ מקומית ב-Docker.

הטסטים (integration / RLS / E2E) רצים מול פרויקט Supabase בענן, בהתאם ל-§11
במפרט: "Test environment: Supabase Local או פרויקט טסט מוקדש".

הפקודות הרלוונטיות:
  pnpm supabase:reset   מחיקת נתוני הטסט וזריעה מחדש
  pnpm supabase:seed    זריעת נתוני דוגמה בלבד
  pnpm supabase:types   יצירת טיפוסי TypeScript מהסכימה

הגדרת החיבור והמפתחות: SETUP.md
`.trim();

process.stdout.write(`${message}\n`);
