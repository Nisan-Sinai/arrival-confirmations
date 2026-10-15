'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import {
  chooseConsent,
  privacySignal,
  readConsent,
  stopAnalytics,
  subscribeConsent,
  trackPublicPage,
  type AnalyticsConfig,
  type Consent,
} from '@/lib/analytics-runtime';

const serverConsent = (): Consent => 'loading';

export function AnalyticsConsent({
  config,
  locale,
}: {
  config: AnalyticsConfig;
  locale: 'he' | 'en';
}) {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribeConsent, readConsent, serverConsent);
  const [editing, setEditing] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const publicPage = pathname !== null && config.paths.includes(pathname);
  const he = locale === 'he';

  useEffect(() => {
    if (pathname) trackPublicPage(config, pathname);
    return stopAnalytics;
  }, [config, pathname, consent]);

  if (!publicPage || consent === 'loading') return null;
  const select = (choice: 'granted' | 'denied') => {
    const saved = chooseConsent(choice);
    setStorageError(!saved);
    if (saved) setEditing(false);
  };
  const open = consent === 'unset' || editing;

  return (
    <aside className="analytics-privacy" aria-label={he ? 'העדפות עוגיות' : 'Cookie preferences'}>
      {open ? (
        <section className="analytics-consent" aria-labelledby="analytics-consent-title">
          <h2 id="analytics-consent-title">{he ? 'העדפות עוגיות 🍪' : 'Cookie preferences 🍪'}</h2>
          <p>
            {he
              ? 'אנחנו משתמשים בעוגיות למדידת השימוש באתר ולשיפורו באמצעות Google Analytics, רק בהסכמתך. אפשר לסרב ולהמשיך להשתמש באתר כרגיל.'
              : 'We use cookies to measure website usage and improve it with Google Analytics, only with your consent. You can decline and continue using the website as usual.'}
          </p>
          <a href={he ? '/privacy' : '/en/privacy'}>{he ? 'מדיניות פרטיות' : 'Privacy policy'}</a>
          <div className="analytics-consent-actions">
            <button type="button" onClick={() => select('denied')}>
              {he ? 'ללא עוגיות מדידה' : 'Decline analytics cookies'}
            </button>
            <button type="button" onClick={() => select('granted')}>
              {he ? 'אישור עוגיות מדידה' : 'Accept analytics cookies'}
            </button>
            {editing ? (
              <button type="button" onClick={() => setEditing(false)}>
                {he ? 'סגירה' : 'Close'}
              </button>
            ) : null}
          </div>
          {consent === 'granted' && privacySignal() ? (
            <p>
              {he
                ? 'המדידה חסומה לפי הגדרות הפרטיות בדפדפן שלך.'
                : 'Your browser privacy settings block analytics.'}
            </p>
          ) : null}
          {storageError ? (
            <p role="alert">
              {he
                ? 'לא ניתן לשמור את הבחירה. המדידה נשארת כבויה.'
                : 'Your choice could not be saved. Analytics stays off.'}
            </p>
          ) : null}
        </section>
      ) : null}
      <button type="button" className="analytics-settings" onClick={() => setEditing(true)}>
        {he ? 'הגדרות פרטיות' : 'Privacy settings'}
      </button>
    </aside>
  );
}
