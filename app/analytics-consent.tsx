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
    <aside className="analytics-privacy" aria-label={he ? 'העדפות פרטיות' : 'Privacy preferences'}>
      {open ? (
        <section className="analytics-consent" aria-labelledby="analytics-consent-title">
          <h2 id="analytics-consent-title">{he ? 'בחירת הפרטיות שלך' : 'Your privacy choice'}</h2>
          <p>
            {he
              ? 'אפשר לאשר מדידת שימוש בדפים הציבוריים באמצעות Google Analytics כדי לעזור לנו לשפר את האתר. סירוב לא יפגע בשימוש באתר. אין מדידה של טפסים, הזמנות או ממשקי ניהול.'
              : 'Allow Google Analytics on public pages to help us improve the website. Declining does not affect your use of the site. Forms, invitations and management pages are not measured.'}
          </p>
          <a href={he ? '/privacy' : '/en/privacy'}>{he ? 'מדיניות פרטיות' : 'Privacy policy'}</a>
          <div className="analytics-consent-actions">
            <button type="button" onClick={() => select('denied')}>
              {he ? 'ללא מדידה' : 'Decline analytics'}
            </button>
            <button type="button" onClick={() => select('granted')}>
              {he ? 'אישור מדידה' : 'Allow analytics'}
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
