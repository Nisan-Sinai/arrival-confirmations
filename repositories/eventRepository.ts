import 'server-only';

import { createAnonymousClient } from '@/lib/server/supabase';
import type { Database } from '@/types/database.types';

/**
 * Read access to event data (§2 "only repositories/ talks to Supabase").
 *
 * The public read goes through `get_public_event_by_public_id()` rather than a
 * SELECT on `events`. That routine's fixed return type is what stops a column added
 * later from becoming visible to anonymous visitors (§4.6); selecting columns here
 * would move the guarantee into application code, where the next person to add a
 * field has to remember it.
 */

export type PublicEvent = NonNullable<Database['public']['CompositeTypes']['public_event_v2']>;

/**
 * One published event, addressed by its unguessable public id.
 *
 * Returns null both when no such event exists and when it exists but is unpublished.
 * The caller renders the same 404 for either, so a visitor probing ids cannot tell
 * the two apart — which is what stops the URL space from being enumerable.
 */
export async function getEventByPublicId(publicId: string): Promise<PublicEvent | null> {
  // Cheap rejection before a database round trip; the column has the same CHECK.
  if (!/^[A-Za-z0-9_-]{10,32}$/.test(publicId)) return null;

  const supabase = createAnonymousClient();
  const { data, error } = await supabase.rpc('get_public_event_by_public_id', {
    p_public_id: publicId,
  });

  if (error) {
    // §13: the Supabase error carries connection detail that must not reach a guest.
    throw new Error(`get_public_event_by_public_id failed: ${error.code}`);
  }

  // The composite comes back with every field null when nothing matched.
  if (data === null || data.id === null) return null;
  return data;
}
