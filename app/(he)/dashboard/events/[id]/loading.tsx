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
    <main id="main" className="flex-1 py-8 sm:py-12" role="status" aria-live="polite">
      <span className="sr-only">טוען את אישורי ההגעה…</span>
      <Container width="wide">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-5 h-5 w-32 rounded-full" />
        <Skeleton className="mt-3 h-11 w-72" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />

        <Skeleton className="mt-8 h-44 w-full rounded-2xl" />

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>

        <div className="mt-12">
          <LoadingState label="טוען את רשימת התשובות…" />
        </div>
      </Container>
    </main>
  );
}
