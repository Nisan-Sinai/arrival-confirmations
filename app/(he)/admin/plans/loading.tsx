import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';

export default function AdminPlansLoading() {
  return (
    <main id="main" className="flex-1 py-8 sm:py-12" role="status" aria-live="polite">
      <span className="sr-only">טוען את המסלולים…</span>
      <Container width="wide">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-10 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <Skeleton className="mt-8 h-11 w-full max-w-2xl rounded-full" />
        <div className="mt-8 space-y-5">
          {[0, 1].map((index) => (
            <Card key={index} padding="lg">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-2 h-4 w-40" />
              <Skeleton className="mt-6 h-24 w-full rounded-xl" />
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
