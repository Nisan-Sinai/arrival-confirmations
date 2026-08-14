import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';

/**
 * The dashboard's loading state (§17 of the design brief).
 *
 * Every route under /dashboard is `force-dynamic` and makes two or three Supabase
 * round trips before it can render anything, so on a slow connection the host was
 * looking at the previous page — or at nothing — with no indication that a navigation
 * had even started. This is what Next.js streams in the meantime.
 *
 * It mirrors the real layout rather than showing a spinner: matching the shape of what
 * is coming means the content does not jump when it arrives, which is the whole
 * argument for skeletons over a centred loader.
 */
export default function DashboardLoading() {
  return (
    // One announcement for the whole screen. Each skeleton is aria-hidden, so a
    // screen reader hears "טוען" once rather than fifteen times.
    <main id="main" className="flex-1 py-10 sm:py-14" role="status" aria-live="polite">
      <span className="sr-only">טוען את האירועים שלכם…</span>
      <Container width="app">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-10 w-56" />

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} padding="md">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-4 w-24" />
              <div className="mt-5 space-y-2">
                <Skeleton className="h-4 w-full max-w-xs" />
                <Skeleton className="h-4 w-full max-w-[14rem]" />
              </div>
              <div className="border-border mt-5 flex items-center justify-between gap-3 border-t pt-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
