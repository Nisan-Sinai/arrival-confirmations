'use client';

/**
 * The last-resort boundary: an error thrown by the root layout itself (§13).
 *
 * This replaces `<html>` and `<body>`, so it cannot use the layout's fonts, its
 * stylesheet or any component that assumes them — which is why the styles here are
 * inline and the shell is rebuilt by hand. `lang` and `dir` are repeated for the same
 * reason: at this depth nothing else has set them, and a Hebrew sentence rendered
 * left-to-right is unreadable.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="he" dir="rtl">
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
            משהו השתבש
          </h1>
          <p style={{ marginTop: '1rem', lineHeight: 1.7, color: '#5b6472' }}>
            אירעה תקלה בטעינת האתר. נסו לרענן את הדף; אם התקלה חוזרת, נסו שוב בעוד מספר דקות.
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
              A plain anchor on purpose. This boundary catches a failure in the root
              layout, so the router that `next/link` navigates through is exactly the
              thing that has just broken. A full document load is the recovery. */}
          <a
            href="/"
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
            חזרה לדף הבית
          </a>
          {error.digest !== undefined && (
            <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#7b8494' }}>
              מזהה תקלה: <span dir="ltr">{error.digest}</span>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
