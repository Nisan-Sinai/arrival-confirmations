export const CONSENT_KEY = 'public-analytics-consent-v1';
export type Consent = 'granted' | 'denied' | 'unset' | 'loading';
export type AnalyticsConfig = {
  id: string;
  origin: string;
  paths: readonly string[];
  name: string;
};
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  publicAnalytics?: { id: string; lastPath: string | null };
  publicConsentOverride?: Consent;
};
const browser = () => window as AnalyticsWindow;

export function readConsent(): Consent {
  try {
    const value = browser().publicConsentOverride ?? window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : 'unset';
  } catch {
    return 'unset';
  }
}

export function privacySignal(): boolean {
  return (
    navigator.doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}

export function stopAnalytics(resetPath = false): void {
  const win = browser();
  if (!win.publicAnalytics) return;
  Object.assign(win, { [`ga-disable-${win.publicAnalytics.id}`]: true });
  if (resetPath) win.publicAnalytics.lastPath = null;
}

export function chooseConsent(choice: 'granted' | 'denied'): boolean {
  if (choice === 'denied') stopAnalytics(true);
  browser().publicConsentOverride = choice;
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    browser().publicConsentOverride = 'denied';
    stopAnalytics(true);
    window.dispatchEvent(new Event('analytics-consent-change'));
    return false;
  }
  window.dispatchEvent(new Event('analytics-consent-change'));
  if (choice === 'denied') {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0]!;
      if (name === '_ga' || name.startsWith('_ga_')) {
        const expiry = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
        document.cookie = expiry;
        document.cookie = `${expiry}; Domain=${window.location.hostname}`;
      }
    }
    // Remove the already-loaded library and its handlers after withdrawal.
    if (browser().publicAnalytics) window.location.reload();
  }
  return true;
}

export function subscribeConsent(callback: () => void): () => void {
  const changed = () => {
    if (readConsent() !== 'granted') stopAnalytics(true);
    callback();
  };
  const storageChanged = () => {
    delete browser().publicConsentOverride;
    changed();
  };
  window.addEventListener('storage', storageChanged);
  window.addEventListener('analytics-consent-change', changed);
  return () => {
    window.removeEventListener('storage', storageChanged);
    window.removeEventListener('analytics-consent-change', changed);
  };
}

/** No document titles, referrers, search parameters, hashes, or form values enter GA. */
export function trackPublicPage(config: AnalyticsConfig, pathname: string): void {
  if (
    !/^G-[A-Z0-9]+$/.test(config.id) ||
    window.location.origin !== config.origin ||
    !config.paths.includes(pathname) ||
    readConsent() !== 'granted' ||
    privacySignal()
  ) {
    stopAnalytics(true);
    return;
  }
  const win = browser();
  Object.assign(win, { [`ga-disable-${config.id}`]: false });
  const page = {
    page_location: `${config.origin}${pathname}`,
    page_referrer: '',
    page_title: `${config.name} ${pathname}`,
  };
  if (!win.publicAnalytics) {
    win.dataLayer = win.dataLayer || [];
    win.gtag = function () {
      // Google tag's documented queue uses an Arguments object, not a data object.
      // eslint-disable-next-line prefer-rest-params
      win.dataLayer!.push(arguments);
    };
    win.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    win.gtag('consent', 'update', { analytics_storage: 'granted' });
    win.gtag('js', new Date());
    win.gtag('config', config.id, {
      ...page,
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      ads_data_redaction: true,
      url_passthrough: false,
      cookie_flags: 'SameSite=Lax;Secure',
    });
    win.publicAnalytics = { id: config.id, lastPath: null };
    const script = document.createElement('script');
    script.id = 'public-google-analytics';
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.id}`;
    document.head.appendChild(script);
  }
  if (win.publicAnalytics.id !== config.id || win.publicAnalytics.lastPath === pathname) return;
  win.publicAnalytics.lastPath = pathname;
  win.gtag?.('set', page);
  win.gtag?.('event', 'page_view', { ...page, send_to: config.id });
}
