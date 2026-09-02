import type { Metadata } from 'next';

import { Container, Rule } from '@/components/ui/layout';
import { appConfig } from '@/config/event.config';
import { KineticHeading } from '@/features/landing/KineticHeading';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { languageAlternates, localePath, type Locale } from '@/lib/i18n';

/**
 * The shared engine behind the two legal pages — the privacy notice and the
 * accessibility statement (§12, §14).
 *
 * Both are the same shape: an eyebrow, a title, a revision date and a run of clauses,
 * each a heading over paragraphs and lists, with a contact block of the same email and
 * phone. Rather than duplicate that skeleton per language, the copy is expressed as
 * data — runs of plain and bold text — and rendered once. The two languages then cannot
 * drift in structure, only in words.
 *
 * Bold is a `{ b }` run rather than markup inside a string, so the copy carries no HTML
 * and nothing is set with `dangerouslySetInnerHTML`. `{token}` placeholders in a string
 * run are filled from `tokens`, which is how the retention counts reach the prose
 * without splitting a sentence into fragments.
 */

/** A stretch of copy: plain text, or text to render bold. */
export type Inline = string | { readonly b: string };

/** One block inside a clause. */
export type Block =
  | { readonly kind: 'p'; readonly runs: readonly Inline[] }
  /** A quieter, smaller paragraph — a footnote to the clause above it. */
  | { readonly kind: 'note'; readonly runs: readonly Inline[] }
  | { readonly kind: 'ul'; readonly items: readonly (readonly Inline[])[] }
  /** The email-and-phone contact list, rendered from `appConfig`. */
  | { readonly kind: 'contact'; readonly emailLabel: string; readonly phoneLabel: string };

export type LegalSection = { readonly title: string; readonly blocks: readonly Block[] };

export type LegalContent = {
  readonly meta: { readonly title: string; readonly description: string };
  readonly eyebrow: string;
  readonly title: string;
  readonly updated: string;
  readonly sections: readonly LegalSection[];
};

/** Metadata for a legal page, pairing the two languages with `hreflang`. */
export function buildLegalMetadata(
  locale: Locale,
  path: string,
  content: Record<Locale, LegalContent>,
): Metadata {
  const { meta } = content[locale];
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: localePath(locale, path), languages: languageAlternates(path) },
  };
}

function fill(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key]! : match,
  );
}

function Runs({ runs, tokens }: { runs: readonly Inline[]; tokens: Record<string, string> }) {
  return (
    <>
      {runs.map((run, index) =>
        typeof run === 'string' ? (
          fill(run, tokens)
        ) : (
          <strong key={index}>{fill(run.b, tokens)}</strong>
        ),
      )}
    </>
  );
}

function ContactList({ emailLabel, phoneLabel }: { emailLabel: string; phoneLabel: string }) {
  return (
    <ul className="list-inside list-disc space-y-1">
      <li>
        {emailLabel}:{' '}
        <a
          className="text-primary font-semibold underline underline-offset-2"
          href={`mailto:${appConfig.supportEmail}`}
          dir="ltr"
        >
          {appConfig.supportEmail}
        </a>
      </li>
      <li>
        {phoneLabel}:{' '}
        <a
          className="text-primary font-semibold underline underline-offset-2"
          href={`tel:${appConfig.supportPhone.replace(/[^\d+]/g, '')}`}
          dir="ltr"
        >
          {appConfig.supportPhone}
        </a>
      </li>
    </ul>
  );
}

export function LegalPageBody({
  locale,
  content,
  tokens = {},
}: {
  locale: Locale;
  content: Record<Locale, LegalContent>;
  tokens?: Record<string, string>;
}) {
  const page = content[locale];

  return (
    <>
      <SiteHeader locale={locale} showLanguageSwitch />
      <main id="main" className="flex-1 py-12 sm:py-16">
        <Container width="prose">
          <p className="text-eyebrow text-accent-strong font-semibold">{page.eyebrow}</p>
          <h1 className="text-h1 text-primary mt-3 font-bold">
            <KineticHeading text={page.title} />
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">{page.updated}</p>
          <Rule draw="scroll" className="mt-8 mb-10" />

          {page.sections.map((section) => (
            <section
              key={section.title}
              /*
                Deliberately not `.reveal`.
              
                The privacy notice and the accessibility statement are compliance
                documents, and someone reaching them is usually looking for one specific
                sentence. Fading them in on scroll serves that reader nothing, and it
                costs something real: axe reports a contrast violation against a section
                still at low opacity, so the site's own accessibility statement failed an
                accessibility check. Decoration is not worth that here.
              */
              className="border-border mt-10 border-t pt-8 first:mt-0 first:border-t-0 first:pt-0"
            >
              <h2 className="text-primary text-h3 font-semibold">{section.title}</h2>
              <div className="text-foreground mt-3.5 space-y-3.5 leading-[1.75]">
                {section.blocks.map((block, index) => {
                  if (block.kind === 'p') {
                    return (
                      <p key={index}>
                        <Runs runs={block.runs} tokens={tokens} />
                      </p>
                    );
                  }
                  if (block.kind === 'note') {
                    return (
                      <p key={index} className="text-muted-foreground text-sm">
                        <Runs runs={block.runs} tokens={tokens} />
                      </p>
                    );
                  }
                  if (block.kind === 'ul') {
                    return (
                      <ul key={index} className="list-inside list-disc space-y-1">
                        {block.items.map((item, itemIndex) => (
                          <li key={itemIndex}>
                            <Runs runs={item} tokens={tokens} />
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <ContactList
                      key={index}
                      emailLabel={block.emailLabel}
                      phoneLabel={block.phoneLabel}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </Container>
      </main>
    </>
  );
}
