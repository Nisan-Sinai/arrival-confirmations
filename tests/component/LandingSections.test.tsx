import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Icon } from '@/components/ui/icons';
import { getDictionary } from '@/config/dictionary';
import { guideContent } from '@/features/guide/content';
import { GuideLinks } from '@/features/guide/GuidePage';
import { topicPaths, topics } from '@/features/guide/topics';
import { Comparison } from '@/features/landing/Comparison';
import { FeatureBento } from '@/features/landing/FeatureBento';
import { SiteFooter } from '@/features/layout/SiteFooter';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { locales } from '@/lib/i18n';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

/** Any Hebrew letter. A single one on an English page is an untranslated string. */
const HEBREW = /[֐-׿]/;

beforeEach(() => {
  // The scroll-triggered headings ask for the motion preference before they arm.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each(locales)('feature tiles (%s)', (locale) => {
  const { benefits } = getDictionary(locale).landing;

  it('introduces the grid with the dictionary heading and anchors it for the header', () => {
    const { container } = render(<FeatureBento locale={locale} />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(benefits.title);
    expect(container.querySelector('section#features')).not.toBeNull();
  });

  it('shows every capability as a tile with its own heading', () => {
    render(<FeatureBento locale={locale} />);

    // Seven drawn tiles and the privacy band.
    expect(screen.getAllByRole('article')).toHaveLength(8);
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(8);
    for (const benefit of benefits.items) {
      expect(screen.getByRole('heading', { level: 3, name: benefit.title })).toBeInTheDocument();
      expect(screen.getByText(benefit.body)).toBeInTheDocument();
    }
  });

  it('says which plans carry a feature that is not in all of them', () => {
    render(<FeatureBento locale={locale} />);

    // Personal links, seating and list import are paid-plan features; the tile must not
    // imply otherwise.
    expect(screen.getAllByText('Premium · Pro')).toHaveLength(3);
  });

  it('hides every drawing from assistive technology', () => {
    const { container } = render(<FeatureBento locale={locale} />);

    const drawings = container.querySelectorAll('.bento-art');
    expect(drawings).toHaveLength(7);
    for (const drawing of drawings) expect(drawing).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws a real QR code rather than a picture of one', () => {
    const { container } = render(<FeatureBento locale={locale} />);

    const code = container.querySelector('svg[shape-rendering="crispEdges"] path');
    expect(code?.getAttribute('d')).toMatch(/^M\d+ \d+h\d+v1h-\d+z/);
  });
});

describe('feature tiles in English', () => {
  it('leaves no Hebrew anywhere, including inside the drawings', () => {
    const { container } = render(<FeatureBento locale="en" />);
    expect(container.textContent).not.toMatch(HEBREW);
  });
});

describe.each(locales)('before and after (%s)', (locale) => {
  it('pairs each old way with its replacement, labelled for a screen reader', () => {
    render(<Comparison locale={locale} />);

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      // Two statements per row, each prefixed with which side it belongs to.
      expect(row.querySelectorAll('p')).toHaveLength(2);
      expect(row.querySelectorAll('.sr-only')).toHaveLength(2);
    }
  });

  it('ends on the sign-up call to action in the same language', () => {
    render(<Comparison locale={locale} />);

    const cta = within(screen.getByRole('list').parentElement!).getByRole('link');
    expect(cta).toHaveAttribute('href', locale === 'he' ? '/signup' : '/en/signup');
  });
});

describe('before and after in English', () => {
  it('leaves no Hebrew', () => {
    const { container } = render(<Comparison locale="en" />);
    expect(container.textContent).not.toMatch(HEBREW);
  });
});

describe('direction-aware icons', () => {
  /**
   * The icons that mean "forward" and "back" are drawn for a right-to-left page. The
   * stylesheet always had a rule to mirror them under `dir="ltr"`, but nothing applied
   * its class, so the English site's calls to action pointed backwards.
   */
  it.each(['arrow-forward', 'chevron-back', 'chevron-forward'] as const)(
    'marks %s to be mirrored in a left-to-right document',
    (name) => {
      const { container } = render(<Icon name={name} />);
      expect(container.querySelector('svg')).toHaveClass('dir-flip');
    },
  );

  it.each(['check', 'chevron-down', 'whatsapp', 'trending', 'qr'] as const)(
    'leaves %s alone',
    (name) => {
      const { container } = render(<Icon name={name} />);
      expect(container.querySelector('svg')).not.toHaveClass('dir-flip');
    },
  );

  it('keeps a caller’s own classes beside the mirror', () => {
    const { container } = render(<Icon name="arrow-forward" className="size-4" />);
    expect(container.querySelector('svg')).toHaveClass('dir-flip', 'size-4', 'shrink-0');
  });
});

describe.each(locales)('guide cards (%s)', (locale) => {
  const prefix = locale === 'he' ? '' : '/en';

  it('names each link by exactly the guide’s title', () => {
    render(<GuideLinks locale={locale} />);

    expect(screen.getAllByRole('link')).toHaveLength(topicPaths.length + 1);
    expect(screen.getByRole('link', { name: guideContent[locale].title })).toHaveAttribute(
      'href',
      `${prefix}/guide`,
    );
    for (const path of topicPaths) {
      expect(screen.getByRole('link', { name: topics[path][locale].title })).toHaveAttribute(
        'href',
        `${prefix}${path}`,
      );
    }
  });

  it('leaves out the guide the reader is already on', () => {
    render(<GuideLinks locale={locale} currentPath="/guide" />);

    expect(screen.getAllByRole('link')).toHaveLength(topicPaths.length);
    expect(screen.queryByRole('link', { name: guideContent[locale].title })).toBeNull();
  });
});

describe.each(locales)('site chrome (%s)', (locale) => {
  const dictionary = getDictionary(locale);
  const prefix = locale === 'he' ? '' : '/en';

  it('links to the guide from the header', () => {
    render(<SiteHeader locale={locale} />);

    expect(
      within(screen.getByRole('navigation', { name: dictionary.header.navAria })).getByRole(
        'link',
        { name: dictionary.header.guide },
      ),
    ).toHaveAttribute('href', `${prefix}/guide`);
  });

  it('gives the guides a footer column of their own', () => {
    render(<SiteFooter locale={locale} />);

    const guides = screen.getByRole('navigation', { name: locale === 'he' ? 'מדריכים' : 'Guides' });
    expect(within(guides).getAllByRole('link')).toHaveLength(topicPaths.length + 1);
    for (const path of topicPaths) {
      expect(
        within(guides).getByRole('link', { name: topics[path][locale].title }),
      ).toHaveAttribute('href', `${prefix}${path}`);
    }
  });

  it('keeps both legal links in the bar that survives on an invitation', () => {
    render(<SiteFooter locale={locale} />);

    const legal = screen.getByRole('navigation', { name: dictionary.footer.navAria });
    expect(within(legal).getByRole('link', { name: dictionary.footer.privacy })).toHaveAttribute(
      'href',
      `${prefix}/privacy`,
    );
    expect(
      within(legal).getByRole('link', { name: dictionary.footer.accessibility }),
    ).toHaveAttribute('href', `${prefix}/accessibility`);
  });

  it('keeps the plans link and offers sign-up from the footer', () => {
    render(<SiteFooter locale={locale} />);

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: dictionary.footer.pricing })).toHaveAttribute(
      'href',
      `${prefix}/pricing`,
    );
    expect(within(footer).getByRole('link', { name: dictionary.footer.signup })).toHaveAttribute(
      'href',
      `${prefix}/signup`,
    );
  });
});
