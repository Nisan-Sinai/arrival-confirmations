import publicPages from '@/config/public-pages.json';
import type { AnalyticsConfig } from './analytics-runtime';
import { localePath, locales } from './i18n';

export const analyticsConfig: AnalyticsConfig = {
  id: 'G-99JR59EV5X',
  origin: 'https://arrival-confirmations.vercel.app',
  name: 'Arrival Confirmations',
  paths: publicPages.flatMap((path) => locales.map((locale) => localePath(locale, path))),
};
