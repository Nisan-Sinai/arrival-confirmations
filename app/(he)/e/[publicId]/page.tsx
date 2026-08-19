import type { Metadata } from 'next';

import {
  buildPublicEventMetadata,
  PublicEventPage,
  type PublicEventPageProps,
} from '@/features/invite/PublicEventPage';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: PublicEventPageProps): Promise<Metadata> {
  return buildPublicEventMetadata(params, 'he');
}

export default function EventPage(props: PublicEventPageProps) {
  return <PublicEventPage {...props} locale="he" />;
}
