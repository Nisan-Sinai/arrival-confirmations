import type { Metadata } from 'next';
import Link from 'next/link';

import { requirePlatformOwner } from '@/app/_lib/platformAdmin';
import { loadPlatformWhatsAppSettings } from '@/app/_lib/platformWhatsAppSettings';
import {
  adminSaveWhatsAppSenderAction,
  adminTestWhatsAppSenderAction,
} from '@/app/actions/manageWhatsAppSettings';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { Alert, Badge } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/icons';
import { Container } from '@/components/ui/layout';
import { BackLink, PageHeader } from '@/components/ui/page-header';
import { createPrivilegedClient } from '@/lib/server/supabase';

export const metadata: Metadata = {
  title: 'הגדרות WhatsApp',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function errorMessage(code: string): string | null {
  if (code === '') return null;
  if (code === 'invalid-settings') return 'בדקו שמספר הטלפון וה-Phone Number ID תקינים.';
  if (code === 'meta-not-configured') {
    return 'חסר WHATSAPP_ACCESS_TOKEN ב-Vercel.';
  }
  if (code === 'meta-unreachable') return 'לא הצלחנו להגיע ל-Meta. נסו שוב.';
  if (code.startsWith('whatsapp_http_')) {
    return 'Meta דחתה את בדיקת החיבור. בדקו את ה-Phone Number ID וההרשאות של ה-token.';
  }
  return 'לא הצלחנו לעדכן את הגדרות WhatsApp.';
}

export default async function WhatsAppSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    tested?: string;
    error?: string;
    phone?: string;
    phoneNumberId?: string;
    verifiedPhone?: string;
    name?: string;
  }>;
}) {
  await requirePlatformOwner();
  const params = await searchParams;
  const db = createPrivilegedClient();
  const settings = await loadPlatformWhatsAppSettings(db);
  const message = errorMessage(params.error ?? '');

  const senderPhone = params.phone ?? settings?.senderPhone ?? '';
  const phoneNumberId = params.phoneNumberId ?? settings?.phoneNumberId ?? '';

  return (
    <main id="main" className="flex-1 py-8 sm:py-12">
      <Container width="card">
        <BackLink href="/admin/events">חזרה לניהול המערכת</BackLink>

        <PageHeader
          className="mt-4"
          eyebrow="ניהול מערכת"
          title="הגדרות WhatsApp Business"
          lede="כאן מחליפים את המספר המרכזי שממנו המערכת שולחת הודעות. ה-Access Token נשאר סודי ב-Vercel ואינו נשמר במסד או נשלח לדפדפן."
          actions={
            settings === null ? (
              <Badge tone="warning">טרם הוגדר מספר</Badge>
            ) : (
              <Badge tone="success" dot>
                מספר פעיל מוגדר
              </Badge>
            )
          }
        />

        {params.saved === '1' && (
          <Alert tone="success" className="mt-6">
            הגדרות WhatsApp נשמרו. מעכשיו השליחות החדשות ישתמשו ב-Phone Number ID הזה.
          </Alert>
        )}

        {params.tested === '1' && (
          <Alert tone="success" className="mt-6">
            החיבור ל-Meta תקין
            {params.verifiedPhone ? ` · ${params.verifiedPhone}` : ''}
            {params.name ? ` · ${params.name}` : ''}.
          </Alert>
        )}

        {message !== null && (
          <Alert tone="error" className="mt-6">
            {message}
          </Alert>
        )}

        <Card padding="lg" className="mt-6">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="bg-accent-soft/70 text-accent-strong flex size-11 shrink-0 items-center justify-center rounded-xl"
            >
              <Icon name="whatsapp" />
            </span>
            <div className="min-w-0">
              <h2 className="text-primary text-xl font-bold">המספר המרכזי</h2>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                שינוי כאן אינו דורש שינוי קוד. לאחר שמספר חדש מחובר ומאומת ב-Meta, מעדכנים את שני
                השדות, בודקים חיבור ושומרים.
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-5">
            <Field
              label="מספר WhatsApp שולח"
              hint="לתצוגה ולזיהוי במערכת. לדוגמה: +972501234567"
              required
            >
              <Input
                name="senderPhone"
                type="tel"
                dir="ltr"
                defaultValue={senderPhone}
                placeholder="+972501234567"
                autoComplete="tel"
              />
            </Field>

            <Field
              label="WhatsApp Phone Number ID"
              hint="ה-ID המספרי שמופיע ב-Meta Developers → WhatsApp → API Setup."
              required
            >
              <Input
                name="phoneNumberId"
                inputMode="numeric"
                dir="ltr"
                defaultValue={phoneNumberId}
                placeholder="123456789012345"
              />
            </Field>

            <div className="bg-muted/45 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Icon name="shield" className="text-accent-strong size-4" />
                <p className="text-primary text-sm font-semibold">Access Token</p>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                נשמר רק ב-Vercel כ-WHATSAPP_ACCESS_TOKEN. מטעמי אבטחה אי אפשר לצפות בו או לערוך אותו
                מהמסך הזה.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap">
              <Button
                formAction={adminTestWhatsAppSenderAction}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Icon name="send" />
                בדיקת חיבור ל-Meta
              </Button>
              <Button formAction={adminSaveWhatsAppSenderAction} className="w-full sm:w-auto">
                <Icon name="check-circle" />
                שמירת המספר הפעיל
              </Button>
            </div>
          </form>
        </Card>

        <Card padding="md" className="mt-6">
          <h2 className="text-primary font-bold">החלפת מספר בעתיד</h2>
          <ol className="text-muted-foreground mt-3 list-decimal space-y-2 ps-5 text-sm leading-relaxed">
            <li>מחברים ומאמתים את המספר החדש בחשבון WhatsApp Business של Meta.</li>
            <li>מעתיקים את ה-Phone Number ID החדש למסך הזה.</li>
            <li>לוחצים “בדיקת חיבור ל-Meta”.</li>
            <li>אם הבדיקה ירוקה, לוחצים “שמירת המספר הפעיל”.</li>
          </ol>
          <Link
            href="/admin/events"
            className={buttonClass({ variant: 'ghost', size: 'sm', className: 'mt-4' })}
          >
            חזרה לאירועים
          </Link>
        </Card>
      </Container>
    </main>
  );
}
