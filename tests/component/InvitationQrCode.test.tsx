import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InvitationQrCode } from '@/features/admin/InvitationQrCode';
import { encodeQr, QR_MAX_BYTES, qrViewBoxSize } from '@/lib/qr';

/**
 * The printable QR code on the share card.
 *
 * What matters here is that the code is drawn from the link in the page, that both
 * downloads produce a real file of the right kind, and that nothing about the link is
 * sent anywhere to make it — the invitation URL is the credential.
 */

const URL_VALUE = 'https://arrival-confirmations.vercel.app/e/Xy7_k2Lm9QpRs4Tv';

/** Every blob handed to the browser as a download, in order. */
let saved: { blob: Blob; filename: string }[] = [];
let revoked: string[] = [];

beforeEach(() => {
  saved = [];
  revoked = [];
  const pending = new Map<string, Blob>();
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: (blob: Blob) => {
        const url = `blob:test/${pending.size}`;
        pending.set(url, blob);
        return url;
      },
      revokeObjectURL: (url: string) => {
        revoked.push(url);
      },
    }),
  );
  // jsdom would try to navigate on an anchor click; record the download instead.
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    saved.push({ blob: pending.get(this.href)!, filename: this.download });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('InvitationQrCode', () => {
  it('draws the code for the link it is given, labelled for assistive technology', () => {
    render(<InvitationQrCode url={URL_VALUE} />);

    const code = screen.getByRole('img', { name: 'קוד QR של קישור ההזמנה' });
    const size = qrViewBoxSize(encodeQr(URL_VALUE));
    expect(code).toHaveAttribute('viewBox', `0 0 ${size} ${size}`);
    expect(code.querySelector('path')?.getAttribute('d')).toMatch(/^M\d+ \d+h\d+v1h-\d+z/);
    expect(screen.getByRole('heading', { name: 'קוד QR להזמנה מודפסת' })).toBeInTheDocument();
  });

  it('draws a different code for a different link', () => {
    const { container, rerender } = render(<InvitationQrCode url={URL_VALUE} />);
    const first = container.querySelector('path')!.getAttribute('d');
    rerender(<InvitationQrCode url={`${URL_VALUE}x`} />);
    expect(container.querySelector('path')!.getAttribute('d')).not.toBe(first);
  });

  it('downloads a standalone black-on-white SVG and releases the object URL', async () => {
    const user = userEvent.setup();
    render(<InvitationQrCode url={URL_VALUE} />);

    await user.click(screen.getByRole('button', { name: 'הורדת SVG להדפסה' }));

    expect(saved).toHaveLength(1);
    expect(saved[0]!.filename).toBe('invitation-qr.svg');
    expect(saved[0]!.blob.type).toBe('image/svg+xml');
    const markup = await saved[0]!.blob.text();
    expect(markup).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(markup).toContain('fill="#ffffff"');
    expect(markup).toContain('fill="#000000"');
    // The link itself is not written into the file — only the pattern that encodes it.
    expect(markup).not.toContain('arrival-confirmations');
    expect(revoked).toHaveLength(1);
    // The temporary anchor does not stay in the document.
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('downloads a PNG drawn module by module', async () => {
    const fillRect = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect,
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done, type) => {
      done(new Blob(['png'], { type }));
    });

    const user = userEvent.setup();
    render(<InvitationQrCode url={URL_VALUE} />);
    await user.click(screen.getByRole('button', { name: 'הורדת PNG' }));

    expect(saved).toHaveLength(1);
    expect(saved[0]!.filename).toBe('invitation-qr.png');
    expect(saved[0]!.blob.type).toBe('image/png');

    // One rectangle for the white ground, then one per dark module.
    const dark = encodeQr(URL_VALUE).modules.flat().filter(Boolean).length;
    expect(fillRect).toHaveBeenCalledTimes(dark + 1);
    // Whole-pixel squares: a resampled edge is a damaged code.
    const [x, y, width, height] = fillRect.mock.calls[1]!;
    for (const value of [x, y, width, height]) expect(Number.isInteger(value)).toBe(true);
    expect(width).toBe(height);
  });

  it('downloads nothing, rather than throwing, when the browser cannot draw', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    const user = userEvent.setup();
    render(<InvitationQrCode url={URL_VALUE} />);
    await user.click(screen.getByRole('button', { name: 'הורדת PNG' }));

    expect(saved).toHaveLength(0);
  });

  it('downloads nothing when the canvas produces no image', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done) => done(null));

    const user = userEvent.setup();
    render(<InvitationQrCode url={URL_VALUE} />);
    await user.click(screen.getByRole('button', { name: 'הורדת PNG' }));

    expect(saved).toHaveLength(0);
  });

  it('renders nothing for a link too long to encode, instead of taking the card down', () => {
    const { container } = render(
      <InvitationQrCode url={`https://example.test/${'x'.repeat(QR_MAX_BYTES)}`} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
