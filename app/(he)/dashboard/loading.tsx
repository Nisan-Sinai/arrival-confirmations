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
    <main id="main" className="flex-1 py-8 sm:py-12" role="status" aria-live="polite">
      <span className="sr-only">טוען את האירועים שלכם…</span>
      <Container width="app">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-10 w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} padding="md">
              <div className="flex items-start gap-4">
                <Skeleton className="size-16 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 rounded-full" />
                  <Skeleton className="mt-3 h-6 w-48" />
                  <Skeleton className="mt-2 h-4 w-24" />
                </div>
              </div>
              <Skeleton className="mt-5 h-4 w-full max-w-sm" />
              <div className="border-border mt-5 border-t pt-4">
                <Skeleton className="h-11 w-full rounded-full" />
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4].map((tile) => (
                    <Skeleton key={tile} className="h-16 rounded-xl" />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
