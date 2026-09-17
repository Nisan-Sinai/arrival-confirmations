import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';

/** The streamed placeholder for a page that is one form in a card (§17). */
export function FormPageLoading({ label }: { label: string }) {
  return (
    <main id="main" className="flex-1 py-8 sm:py-12" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Container width="wide">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-5 h-4 w-16" />
        <Skeleton className="mt-3 h-10 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-lg" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <Card padding="lg">
            <div className="space-y-6">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index}>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-2 h-11 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      </Container>
    </main>
  );
}
