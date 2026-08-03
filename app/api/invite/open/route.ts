import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getActiveInviteContext } from '@/lib/server/currentInvite';
import { createPrivilegedClient } from '@/lib/server/supabase';

export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  const context = await getActiveInviteContext();
  if (context === null) {
    return NextResponse.json({ recorded: false }, { status: 401 });
  }

  const privileged = createPrivilegedClient() as unknown as SupabaseClient;
  const { data, error } = await privileged.rpc('record_guest_invite_open', {
    p_session_id: context.sessionId,
    p_guest_id: context.guest.id,
    p_event_id: context.event.id,
  });

  if (error) {
    return NextResponse.json({ recorded: false }, { status: 500 });
  }

  return NextResponse.json(
    { recorded: data === true },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
