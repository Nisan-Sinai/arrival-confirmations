'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';

/**
 * Prints the page the host is looking at — the summary and the reply list.
 *
 * A caterer or a venue coordinator is handed paper far more often than a login. The
 * print stylesheet in `globals.css` drops the site chrome and every control, so what
 * comes out is the event's name, the head counts and the list, and nothing to click.
 */
export function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Icon name="printer" />
      הדפסת סיכום
    </Button>
  );
}
