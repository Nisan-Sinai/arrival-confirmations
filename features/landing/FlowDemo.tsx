'use client';

import { useState } from 'react';

import { FlowWalkthrough } from '@/features/landing/FlowWalkthrough';

/**
 * The drawing is the poster; the clip is what plays.
 *
 * A 20-second recording of the real product is more convincing than any abstraction of
 * it, and it is also 1.9MB — which is a lot to spend on a visitor who scrolled past. So
 * nothing is fetched until someone asks: `preload="none"` means the browser has not
 * touched the file while the drawing is on screen, and the drawing is a working demo in
 * its own right rather than a placeholder rectangle.
 *
 * That also solves the poster frame. There is no ffmpeg on the machine this was built
 * on, so no still could be extracted — and a generated poster would have been another
 * asset to keep in step with the clip. An SVG that already animates the same three steps
 * is a better first impression than a frozen frame anyway.
 *
 * The box is `aspect-[9/16]` from the first paint, taken from the file's own `tkhd`
 * atom — 1080×1920 — so swapping the drawing for the video moves nothing.
 */
export function FlowDemo({
  playLabel,
  caption,
}: {
  readonly playLabel: string;
  readonly caption: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <figure className="m-0 w-full max-w-[220px]">
      <div className="border-accent/25 relative aspect-[9/16] w-full overflow-hidden rounded-[26px] border">
        {/*
          No `<track>` on the video below: the clip carries no dialogue, and the three
          steps beside it are the words. A caption file of an empty transcript would be
          worse than none — it claims the content is covered when there is nothing to
          cover.
        */}
        {playing ? (
          <video
            src="/media/walkthrough.mp4"
            className="h-full w-full object-cover"
            controls
            autoPlay
            playsInline
            preload="auto"
          />
        ) : (
          <>
            <FlowWalkthrough />
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={playLabel}
              className="focus-visible:outline-accent absolute inset-0 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2"
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
          </>
        )}
      </div>
      <figcaption className="mt-3 text-center text-xs text-white/60">{caption}</figcaption>
    </figure>
  );
}
