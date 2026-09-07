import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/field';

type CreateCustomerAction = (formData: FormData) => Promise<void>;

function statusMessage(saved: string, error: string) {
  if (saved === 'customer-created') {
    return {
      tone: 'success' as const,
      text: 'הלקוח נוצר בהצלחה ומאושר כבר לכניסה. אין צורך באישור במייל.',
    };
  }

  if (error === 'customer-email') {
    return { tone: 'error' as const, text: 'כתובת האימייל אינה תקינה.' };
  }
  if (error === 'customer-password') {
    return { tone: 'error' as const, text: 'הסיסמה חייבת להכיל בין 8 ל-128 תווים.' };
  }
  if (error === 'customer-exists') {
    return { tone: 'error' as const, text: 'כבר קיים משתמש עם כתובת האימייל הזאת.' };
  }
  if (error === 'customer-confirm') {
    return {
      tone: 'error' as const,
      text: 'המשתמש לא אושר כראוי ולכן היצירה בוטלה. אפשר לנסות שוב.',
    };
  }
  if (error === 'customer-create') {
    return { tone: 'error' as const, text: 'יצירת הלקוח נכשלה. נסו שוב.' };
  }

  return null;
}

export function CreateCustomerPanel({
  createCustomerAction,
  saved = '',
  error = '',
}: {
  createCustomerAction: CreateCustomerAction;
  saved?: string;
  error?: string;
}) {
  const message = statusMessage(saved, error);
  const shouldOpen = saved === 'customer-created' || error.startsWith('customer-');

  return (
    <details id="create-customer" className="mt-8" open={shouldOpen || undefined}>
      <summary className={buttonClass({ variant: 'primary' })}>הוספת לקוח</summary>

      <Card padding="lg" className="mt-4 max-w-2xl">
        <div>
          <p className="text-eyebrow text-accent-strong font-semibold">ניהול לקוחות</p>
          <h2 className="text-h2 text-primary mt-2 font-bold">יצירת לקוח חדש</h2>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            הזינו אימייל וסיסמה. הלקוח ייווצר כמאושר ויוכל להתחבר מיד, בלי ללחוץ על
            אישור במייל.
          </p>
        </div>

        {message !== null && (
          <Alert tone={message.tone} className="mt-5">
            {message.text}
          </Alert>
        )}

        <form action={createCustomerAction} className="mt-6 grid gap-5">
          <Field label="אימייל הלקוח" required>
            <Input
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              dir="ltr"
            />
          </Field>

          <Field
            label="סיסמה"
            required
            hint="לפחות 8 תווים. הסיסמה נשמרת ב-Supabase בצורה מוצפנת."
          >
            <Input
              type="password"
              name="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              dir="ltr"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">צור לקוח מאושר</Button>
            <span className="text-muted-foreground text-sm">לא נשלח מייל אישור.</span>
          </div>
        </form>
      </Card>
    </details>
  );
}
