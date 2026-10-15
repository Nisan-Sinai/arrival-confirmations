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
        .filter((rule) => rule.source !== '/:path*')
        .map((rule) => rule.source)
        .sort(),
    ).toEqual([...analyticsConfig.paths].sort());
    for (const rule of rules.filter((entry) => entry.source !== '/:path*')) {
      const csp = rule.headers[0]?.value ?? '';
      expect(csp).toContain('https://www.googletagmanager.com');
      expect(csp).toContain('https://www.google-analytics.com');
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("object-src 'none'");
    }
  });
});
