import { UI_MESSAGES } from '@/config/messages';

/**
 * Where to send a gift.
 *
 * At an Israeli simcha the gift is money, and it moves through Bit or PayBox. Guests ask
 * where to send it; hosts answer the same question forty times over. Every RSVP service
 * here treats this as a revenue line — WiWi processes the card payment and handles the
 * envelope for a cut — and all it actually requires is showing a link the host already
 * has.
 *
 * Three decisions worth keeping:
 *
 *   * **Nothing renders without a link.** Most events will not set one, and an empty
 *     "gift" heading on an invitation reads as asking.
 *   * **It sits below the reply, never above it.** The point of the page is the answer;
 *     a gift prompt in front of it would make the invitation feel like a request for
 *     money. A guest who has already answered is the one who scrolls this far.
 *   * **It opens in a new tab with `noopener`.** These are payment pages, and handing one
 *     a live `window.opener` back into the invitation is the one link on this site where
 *     that would genuinely matter.
 *
 * No provider is named or detected. Bit and PayBox have both changed the shape of their
 * share links more than once, and a bank transfer page or a PayPal.me is just as valid an
 * answer — sniffing the host's URL to print a logo would break quietly the first time
 * either of them moved.
 */
export function GiftLink({ url }: { readonly url: string | null }) {
  const href = url?.trim() ?? '';
  if (href === '') return null;

  return (
    <div className="text-center">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="border-accent/40 bg-card/70 text-primary shadow-paper hover:border-accent focus-visible:outline-accent inline-flex min-h-11 items-center gap-2.5 rounded-full border px-6 py-3 text-sm font-semibold backdrop-blur-sm transition-colors duration-[--duration-fast] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent-strong size-5"
        >
          {/* A wrapped box: lid, body, and the ribbon down the middle. */}
          <path d="M3 8h18v3H3z" />
          <path d="M4.5 11v9h15v-9" />
          <path d="M12 8v12" />
          <path d="M12 8S9.5 8 8.5 7A2 2 0 0 1 12 5a2 2 0 0 1 3.5 2c-1 1-3.5 1-3.5 1Z" />
        </svg>
        רוצים לשלוח מתנה? <span className="sr-only">({UI_MESSAGES.a11y.externalLink})</span>
      </a>
      <p className="text-muted-foreground mt-2.5 text-xs">הקישור נפתח באפליקציית התשלום</p>
    </div>
  );
}
