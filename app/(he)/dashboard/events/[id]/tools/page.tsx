import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * The advanced tools moved onto the guest-management page, so everything for one event —
 * the list, personal links and the whole Premium suite — lives in one place. This route
 * stays only to carry old links and bookmarks there.
 */
export default async function EventToolsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/events/${id}/guests`);
}
