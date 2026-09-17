import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';

/**
 * Loading the guest page.
 *
 * The widest read in the product after the reply list — guests, replies, tables and
 * snapshots — and the page that a host opens with a phone in the other hand, pasting
 * contacts. A shape in the meantime is what tells them the tap landed.
 */
export default function GuestsLoading() {
  return (
    <main id="main" className="flex-1 py-8 sm:py-12" role="status" aria-live="polite">
      <span className="sr-only">טוען את רשימת המוזמנים…</span>
      <Container width="wide">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-5 h-4 w-40" />
        <Skeleton className="mt-3 h-10 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>

        <Skeleton className="mt-8 h-12 w-full rounded-full" />

        <div className="mt-6 space-y-6">
          {[0, 1].map((index) => (
            <Card key={index} padding="lg">
              <div className="flex items-start gap-4">
                <Skeleton className="size-11 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-7 w-48" />
                  <Skeleton className="mt-2 h-4 w-full max-w-md" />
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((field) => (
                  <Skeleton key={field} className="h-16 rounded-xl" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
