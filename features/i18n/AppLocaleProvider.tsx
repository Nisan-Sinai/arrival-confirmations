'use client';

import { createContext, useContext } from 'react';

import { defaultLocale, type Locale } from '@/lib/i18n';

const AppLocaleContext = createContext<Locale>(defaultLocale);

export function AppLocaleProvider({
  locale,
  children,
}: Readonly<{ locale: Locale; children: React.ReactNode }>) {
  return <AppLocaleContext.Provider value={locale}>{children}</AppLocaleContext.Provider>;
}

export function useAppLocale(): Locale {
  return useContext(AppLocaleContext);
}
