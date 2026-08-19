'use client';

const COPY = {
  he: {
    title: 'משהו השתבש',
    body: 'אירעה תקלה בטעינת האתר. נסו לרענן את הדף; אם התקלה חוזרת, נסו שוב בעוד מספר דקות.',
    home: 'חזרה לדף הבית',
    digest: 'מזהה תקלה:',
  },
  en: {
    title: 'Something went wrong',
    body: 'There was a problem loading the site. Refresh the page; if the problem returns, try again in a few minutes.',
    home: 'Back to home',
    digest: 'Error ID:',
  },
} as const;

/**
 * The last-resort boundary replaces the root document, so it repeats the language and
 * direction itself and intentionally uses only inline styles and a plain recovery link.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const locale =
    typeof window !== 'undefined' && /^\/en(?:\/|$)/.test(window.location.pathname) ? 'en' : 'he';
  const copy = COPY[locale];

  return (
    <html lang={locale === 'he' ? 'he-IL' : 'en'} dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.25rem',
          background: '#fbf9f4',
          color: '#25303f',
          fontFamily: 'system-ui, "Segoe UI", Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '32rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#2b3f5e' }}>
            {copy.title}
          </h1>
          <p style={{ marginTop: '1rem', lineHeight: 1.7, color: '#5b6472' }}>{copy.body}</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload is the recovery path */}
          <a
            href={locale === 'he' ? '/' : '/en'}
            style={{
              display: 'inline-block',
              marginTop: '2rem',
              padding: '0.75rem 2rem',
              borderRadius: '999px',
              background: '#2b3f5e',
              color: '#fbf9f4',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            {copy.home}
          </a>
          {error.digest !== undefined && (
            <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#7b8494' }}>
              {copy.digest} <span dir="ltr">{error.digest}</span>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
