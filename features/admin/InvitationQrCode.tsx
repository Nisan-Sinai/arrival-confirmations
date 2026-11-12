'use client';

import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { encodeQr, QR_QUIET_ZONE, qrSvgPath, qrViewBoxSize, type QrCode } from '@/lib/qr';

/**
 * The invitation link as a QR code, for a host who prints.
 *
 * A paper invitation, a save-the-date card, a sign on an easel at the entrance to the
 * hall: each needs the link in a form a phone camera reads. The code is drawn here, in
 * the page, from the link the host is already looking at — it is never sent to a QR
 * service, because the invitation URL is the credential (§4.2) and an image request to
 * someone else's server would hand it over.
 *
 * Two downloads, for two destinations. The SVG is what a print shop or a designer wants:
 * it scales to a poster without a soft edge. The PNG is what a word processor, a
 * WhatsApp message or an invitation template accepts without argument.
 *
 * Both files are plain black on white whatever the site's palette is. A scanner works on
 * contrast, and a burgundy code on cream looks at home on the page and reads worse off
 * a printed card under the lighting of a banquet hall.
 */

/** Pixels per side of the downloaded PNG — enough for a sharp 8 cm print at 300 dpi. */
const PNG_SIZE = 1024;

function svgMarkup(qr: QrCode): string {
  const size = qrViewBoxSize(qr);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${PNG_SIZE}" height="${PNG_SIZE}" shape-rendering="crispEdges">`,
    `<rect width="${size}" height="${size}" fill="#ffffff"/>`,
    `<path d="${qrSvgPath(qr)}" fill="#000000"/>`,
    '</svg>',
  ].join('');
}

/** Hands a blob to the browser as a file, then releases it. */
function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Draws the modules straight onto a canvas.
 *
 * Rendering the SVG into an `<img>` and copying that would be shorter, and would also
 * blur: the browser resamples an image when it scales it, and a QR code's edges are the
 * data. Filling whole-pixel rectangles keeps every module exactly square.
 */
function drawPng(qr: QrCode, done: (blob: Blob | null) => void): void {
  const modules = qrViewBoxSize(qr);
  const scale = Math.floor(PNG_SIZE / modules);
  const canvas = document.createElement('canvas');
  canvas.width = modules * scale;
  canvas.height = modules * scale;
  const context = canvas.getContext('2d');
  if (context === null) {
    done(null);
    return;
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000000';
  qr.modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) {
        context.fillRect((x + QR_QUIET_ZONE) * scale, (y + QR_QUIET_ZONE) * scale, scale, scale);
      }
    });
  });
  canvas.toBlob(done, 'image/png');
}

export function InvitationQrCode({ url }: { url: string }) {
  /*
   * `null` when the link is too long to encode. An invitation URL is about sixty bytes
   * against a limit of 213, so this cannot happen with a real origin — but a preview
   * deployment behind a long generated hostname is exactly where it eventually would,
   * and the share card should lose its QR strip there rather than take the page down.
   */
  const qr = useMemo(() => {
    try {
      return encodeQr(url);
    } catch {
      return null;
    }
  }, [url]);

  if (qr === null) return null;
  const size = qrViewBoxSize(qr);

  return (
    <div className="border-border bg-card/70 mt-4 flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
      <div className="border-border shrink-0 self-center rounded-xl border bg-white p-1.5 sm:self-auto">
        <svg
          role="img"
          aria-label="קוד QR של קישור ההזמנה"
          viewBox={`0 0 ${size} ${size}`}
          className="size-28"
          shapeRendering="crispEdges"
        >
          <path d={qrSvgPath(qr)} fill="#000000" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-primary flex items-center gap-2 font-semibold">
          <Icon name="qr" className="text-accent-strong size-5" />
          קוד QR להזמנה מודפסת
        </h3>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          מדפיסים את הקוד על ההזמנה או על שלט בכניסה, והאורחים סורקים ומגיעים ישר לאישור ההגעה.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              drawPng(qr, (blob) => {
                if (blob !== null) saveBlob(blob, 'invitation-qr.png');
              })
            }
          >
            <Icon name="download" />
            הורדת PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              saveBlob(new Blob([svgMarkup(qr)], { type: 'image/svg+xml' }), 'invitation-qr.svg')
            }
          >
            <Icon name="download" />
            הורדת SVG להדפסה
          </Button>
        </div>
      </div>
    </div>
  );
}
