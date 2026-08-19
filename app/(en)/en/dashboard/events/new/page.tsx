import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createEventAction } from '@/app/actions/manageEvent';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/layout';
import { getAppCopy } from '@/config/appCopy';
import { EventForm } from '@/features/admin/EventForm';
import { localePath } from '@/lib/i18n';
import { createUserClient } from '@/lib/server/supabase';

const copy = getAppCopy('en').eventForm;

export const metadata: Metadata = {
  title: copy.newMetadata,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function NewEventPage() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect(localePath('en', '/login'));

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="card">
        <Link
          href={localePath('en', '/dashboard')}
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 rounded-sm text-sm"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          {copy.allEvents}
        </Link>

        <div className="mt-4">
          <p className="text-eyebrow text-accent-strong font-semibold">{copy.newEyebrow}</p>
          <h1 className="text-h1 text-primary mt-2 font-bold">{copy.newTitle}</h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">{copy.newIntro}</p>
        </div>

        <Card padding="lg" className="mt-8">
          <EventForm action={createEventAction} submitLabel={copy.create} />
        </Card>
      </Container>
    </main>
  );
}
