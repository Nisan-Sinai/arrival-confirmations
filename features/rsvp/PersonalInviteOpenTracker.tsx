'use client';

import { useEffect } from 'react';

export function PersonalInviteOpenTracker() {
  useEffect(() => {
    const controller = new AbortController();

    void fetch('/api/invite/open', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      keepalive: true,
      signal: controller.signal,
    }).catch(() => undefined);

    return () => controller.abort();
  }, []);

  return null;
}
