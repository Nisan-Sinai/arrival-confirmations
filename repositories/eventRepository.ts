import 'server-only';

import { createAnonymousClient } from '@/lib/server/supabase';
import type { Database } from '@/types/database.types';

/**
 * Read access to event data (§2 "only repositories/ talks to Supabase").
 *
 * The public projection is fetched through `get_public_event()` rather than by
 * selecting from `events`, because that routine's fixed return type is what stops a
 * column added later from becoming visible to anonymous visitors (§4.6). Selecting
 * columns here would move that guarantee into application code, where the next
 * person to add a field has to remember it.
 */

export type PublicEvent = NonNullable<Database['public']['CompositeTypes']['public_event']>;

/**
 * The active event, or null when none is published.
 *
 * Returning null rather than throwing is deliberate: "no event is live yet" is an
 * ordinary state for a fresh deployment, and the page renders a real message for it
 * instead of an error screen.
 */
export async function getPublicEvent(): Promise<PublicEvent | null> {
  const supabase = createAnonymousClient();
  const { data, error } = await supabase.rpc('get_public_event');

  if (error) {
    // §13: the Supabase error carries connection details that must not reach a guest.
    // It is re-thrown as a plain message; the route's error boundary renders Hebrew.
    throw new Error(`get_public_event failed: ${error.code}`);
  }

  // The routine returns a composite whose fields are all null when no row matched.
  if (data === null || data.id === null) return null;
  return data;
}
