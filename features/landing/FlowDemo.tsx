'use client';

import { useEffect, useRef, useState } from 'react';

import { FlowWalkthrough } from '@/features/landing/FlowWalkthrough';

/**
 * The drawing is the poster; pressing play opens the clip in a lightbox.
 *
 * The first version played the video in place, in the same 9:16 slot the drawing sits
 * in beside the steps. That slot is right for an abstraction and wrong for a 1080×1920
 * screen recording whose every frame is full of Hebrew UI text — at 220–300px the thing
 * it is demonstrating is illegible, and `object-cover` cropped it further the moment it
 * went full screen. Someone who taps play wants to *watch* it.
 *
 * So play now dims the page and shows the clip centred, sized to the viewport with its
 * aspect ratio kept whole. The 1.9MB file is still fetched only on that tap —
 * `preload="none"` on an element that does not exist until `open` — and the drawn
 * walkthrough keeps running underneath as the trigger.
 */
export function FlowDemo({
  playLabel,
  caption,
  closeLabel,
}: {
  readonly playLabel: string;
  readonly caption: string;
  readonly closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // A lightbox owns the keyboard while it is up: Escape closes it, and focus starts on
    // the close button rather than wherever it happened to be on the page.
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = [
        ...(dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), video[controls]',
        ) ?? []),
      ].filter((element) => element.tabIndex >= 0);
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    // The page must not scroll behind the overlay.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Captured now rather than read in the cleanup: by the time this unmounts the ref may
    // point somewhere else, and the button to restore focus to is the one that was there
    // when the dialog opened.
    const trigger = triggerRef.current;

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      // Return focus to the thing that opened it, the way a dialog should.
      trigger?.focus();
    };
  }, [open]);

  return (
    <figure className="m-0 w-full max-w-[240px] sm:max-w-[280px]">
      <div className="border-accent/25 relative aspect-[9/16] w-full overflow-hidden rounded-[26px] border">
        <FlowWalkthrough />
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={playLabel}
          aria-haspopup="dialog"
          className="focus-visible:outline-accent group absolute inset-0 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span className="border-accent/60 bg-primary/80 flex size-14 items-center justify-center rounded-full border backdrop-blur-sm transition-transform duration-[--duration-fast] ease-[--ease-out] group-hover:scale-105">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="text-accent ms-0.5 size-6"
              fill="currentColor"
            >
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </span>
        </button>
      </div>
      <figcaption className="mt-3 text-center text-xs text-white/60">{caption}</figcaption>

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={playLabel}
          onClick={(event) => {
            // A click on the backdrop closes; a click that started on the video does not.
            if (event.target === event.currentTarget) setOpen(false);
          }}
          className="animate-rise fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="relative max-h-full w-auto">
            {/*
              `max-h-[85vh]` with `h-auto w-auto`: the clip is shown at whatever size fits
              the shorter axis of the viewport with its 9:16 ratio intact — never cropped,
              never stretched. On a phone that is nearly full-bleed; on a desktop it is a
              tall centred panel.
            */}
            {/* No <track>: a silent screen recording, and the steps carry the words. */}
            <video
              src="/media/walkthrough.mp4"
              tabIndex={0}
              className="max-h-[85vh] w-auto rounded-2xl"
              controls
              autoPlay
              playsInline
              preload="auto"
            />
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="focus-visible:outline-accent bg-primary text-primary-foreground absolute -top-3 -right-3 flex size-9 items-center justify-center rounded-full border border-white/20 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="size-4"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </figure>
  );
}
