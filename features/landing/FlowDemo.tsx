'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { FlowWalkthrough } from '@/features/landing/FlowWalkthrough';

/** The animated poster opens the full screen recording on demand. */
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    // The top layer escapes the poster's animated, clipped ancestors.
    if (open) dialogRef.current?.showModal();
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
        <dialog
          ref={dialogRef}
          aria-label={playLabel}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus({ preventScroll: true });
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
          className="modal-scroll-lock fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none items-center justify-center overflow-hidden bg-transparent p-4 backdrop:bg-black/80 backdrop:backdrop-blur-sm open:flex"
        >
          <div className="motion-safe:animate-rise relative w-[min(calc(100dvw-3rem),47.8125dvh)]">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={closeLabel}
              className="focus-visible:outline-accent bg-primary text-primary-foreground absolute -end-2 -top-2 z-10 flex size-11 items-center justify-center rounded-full border border-white/20 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2"
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
            {/* The silent recording is described by the accompanying walkthrough. */}
            <video
              src="/media/walkthrough.mp4"
              width={1080}
              height={1920}
              tabIndex={0}
              className="aspect-[9/16] w-full rounded-2xl bg-black object-contain"
              controls
              autoPlay
              playsInline
              preload="auto"
            />
          </div>
        </dialog>
      )}
    </figure>
  );
}
