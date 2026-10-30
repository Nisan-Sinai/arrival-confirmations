import { describe, expect, it } from 'vitest';
import nextConfig from '../../../next.config';
import { analyticsConfig } from '@/lib/analytics-config';

describe('analytics CSP scope', () => {
  it('allows Google collection only on the approved public pages', async () => {
    const rules = await nextConfig.headers!();
    const base = rules.find((rule) => rule.source === '/:path*');
    const baseCsp = base?.headers.find((header) => header.key === 'Content-Security-Policy')?.value;
    expect(baseCsp).not.toContain('google');
    expect(
      rules
        .filter(
          (rule) =>
            rule.source !== '/:path*' &&
            rule.headers.some((header) => header.key === 'Content-Security-Policy'),
        )
        .map((rule) => rule.source)
        .sort(),
    ).toEqual([...analyticsConfig.paths].sort());
    for (const rule of rules.filter(
      (entry) =>
        entry.source !== '/:path*' &&
        entry.headers.some((header) => header.key === 'Content-Security-Policy'),
    )) {
      const csp = rule.headers[0]?.value ?? '';
      expect(csp).toContain('https://www.googletagmanager.com');
      expect(csp).toContain('https://www.google-analytics.com');
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("object-src 'none'");
    }
  });

  it('adds noindex headers to private invitation, sharing, API and management responses in both languages', async () => {
    const rules = await nextConfig.headers!();
    for (const prefix of ['', '/en']) {
      for (const segment of ['api', 'invite', 'share', 'e', 'dashboard', 'admin']) {
        expect(
          rules.find((rule) => rule.source === `${prefix}/${segment}/:path*`)?.headers,
        ).toContainEqual({ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' });
      }
    }
    for (const path of analyticsConfig.paths) {
      expect(
        rules
          .find((rule) => rule.source === path)
          ?.headers.some((header) => header.key === 'X-Robots-Tag'),
      ).toBe(false);
    }
  });
});
