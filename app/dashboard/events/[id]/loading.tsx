import { Card } from '@/components/ui/card';
import { LoadingState, Skeleton } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';

/**
 * Loading an event's reply list.
 *
 * The heaviest read in the product — the event, every RSVP and every guest row — so
 * it is the screen most worth streaming a shape into. The stat tiles are reserved at
 * their real size, which is what stops the reply list jumping down the page the moment
 * the numbers land.
 */
export default function EventLoading() {
  return (
    <main id="main" className="flex-1 py-10 sm:py-14" role="status" aria-live="polite">
      <span className="sr-only">טוען את אישורי ההגעה…</span>
      <Container width="wide">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-4 w-20" />
        <Skeleton className="mt-3 h-11 w-72" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />

        <Skeleton className="mt-9 h-44 w-full rounded-2xl" />

        <div className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} padding="none" className="p-4 sm:p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-9 w-16" />
            </Card>
          ))}
        </div>

        <div className="mt-12">
          <LoadingState label="טוען את רשימת התשובות…" />
        </div>
      </Container>
    </main>
  );
}
