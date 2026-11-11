import { describe, expect, it } from 'vitest';

import manifest from '@/app/manifest';

/** The web app manifest: what "add to home screen" installs. */
describe('manifest', () => {
  const value = manifest();

  it('opens the dashboard as a standalone app', () => {
    expect(value.start_url).toBe('/dashboard');
    expect(value.scope).toBe('/');
    expect(value.display).toBe('standalone');
  });

  it('names itself in Hebrew, right to left', () => {
    expect(value.name).toBe('אישורי הגעה');
    expect(value.lang).toBe('he-IL');
    expect(value.dir).toBe('rtl');
  });

  it('carries the brand colours the document itself declares', () => {
    expect(value.theme_color).toBe('#5e1b28');
    expect(value.background_color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('offers an icon large enough for a splash screen', () => {
    expect(value.icons).toContainEqual(
      expect.objectContaining({ src: '/icon.png', sizes: '512x512', type: 'image/png' }),
    );
    for (const icon of value.icons ?? []) {
      // Same-origin paths only: the CSP has no allowance for an icon host.
      expect(icon.src.startsWith('/')).toBe(true);
    }
  });
});
