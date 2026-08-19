'use client';

import { useEffect, useState } from 'react';

import type { Locale } from '@/lib/i18n';

type AccessibilitySettings = {
  fontScale: number;
  contrast: boolean;
  grayscale: boolean;
  underlineLinks: boolean;
  reduceMotion: boolean;
};

const STORAGE_KEY = 'arrival-confirmations:a11y';

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontScale: 100,
  contrast: false,
  grayscale: false,
  underlineLinks: false,
  reduceMotion: false,
};

const copy = {
  he: {
    open: 'פתיחת תפריט נגישות',
    close: 'סגירת תפריט נגישות',
    title: 'כלי נגישות',
    increaseText: 'הגדלת טקסט',
    decreaseText: 'הקטנת טקסט',
    highContrast: 'ניגודיות גבוהה',
    grayscale: 'גווני אפור',
    underlineLinks: 'הדגשת קישורים',
    reduceMotion: 'עצירת אנימציות',
    reset: 'איפוס הגדרות',
    statement: 'הצהרת נגישות',
    textSize: 'גודל טקסט',
  },
  en: {
    open: 'Open accessibility menu',
    close: 'Close accessibility menu',
    title: 'Accessibility tools',
    increaseText: 'Increase text',
    decreaseText: 'Decrease text',
    highContrast: 'High contrast',
    grayscale: 'Grayscale',
    underlineLinks: 'Underline links',
    reduceMotion: 'Reduce motion',
    reset: 'Reset settings',
    statement: 'Accessibility statement',
    textSize: 'Text size',
  },
} as const;

function getInitialSettings(): AccessibilitySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_SETTINGS;

    return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } as AccessibilitySettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applySettings(settings: AccessibilitySettings) {
  const root = document.documentElement;

  root.style.fontSize = `${settings.fontScale}%`;
  root.dataset.a11yContrast = String(settings.contrast);
  root.dataset.a11yGrayscale = String(settings.grayscale);
  root.dataset.a11yLinks = String(settings.underlineLinks);
  root.dataset.a11yMotion = String(settings.reduceMotion);
}

export function AccessibilityWidget({ locale }: Readonly<{ locale: Locale }>) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(getInitialSettings);
  const labels = copy[locale];

  useEffect(() => {
    applySettings(settings);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Keep the current-session settings even if persistence is blocked.
    }
  }, [settings]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const update = (patch: Partial<AccessibilitySettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const setFontScale = (fontScale: number) => {
    update({ fontScale: Math.min(140, Math.max(80, fontScale)) });
  };

  const statementHref = locale === 'he' ? '/accessibility' : '/en/accessibility';

  return (
    <>
      {open ? (
        <section
          id="accessibility-panel"
          aria-labelledby="accessibility-title"
          className="fixed bottom-20 left-4 z-[60] w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-overlay"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="accessibility-title" className="text-lg font-bold">
              {labels.title}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={labels.close}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-2xl leading-none hover:bg-muted"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div className="mb-3 rounded-xl border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold">
              <span>{labels.textSize}</span>
              <span aria-live="polite">{settings.fontScale}%</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFontScale(settings.fontScale + 10)}
                disabled={settings.fontScale >= 140}
                className="min-h-11 rounded-lg border border-border bg-card px-3 py-2 font-bold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                A+ · {labels.increaseText}
              </button>
              <button
                type="button"
                onClick={() => setFontScale(settings.fontScale - 10)}
                disabled={settings.fontScale <= 80}
                className="min-h-11 rounded-lg border border-border bg-card px-3 py-2 font-bold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                A− · {labels.decreaseText}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ToggleButton
              pressed={settings.contrast}
              label={labels.highContrast}
              onClick={() => update({ contrast: !settings.contrast })}
            />
            <ToggleButton
              pressed={settings.grayscale}
              label={labels.grayscale}
              onClick={() => update({ grayscale: !settings.grayscale })}
            />
            <ToggleButton
              pressed={settings.underlineLinks}
              label={labels.underlineLinks}
              onClick={() => update({ underlineLinks: !settings.underlineLinks })}
            />
            <ToggleButton
              pressed={settings.reduceMotion}
              label={labels.reduceMotion}
              onClick={() => update({ reduceMotion: !settings.reduceMotion })}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSettings(DEFAULT_SETTINGS)}
              className="min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
            >
              {labels.reset}
            </button>
            <a
              href={statementHref}
              className="flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              {labels.statement}
            </a>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        aria-label={labels.open}
        aria-expanded={open}
        aria-controls="accessibility-panel"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-4 left-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lifted transition hover:bg-primary-hover"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="4.5" r="2" />
          <path d="M5 8.5c2.2 1.1 4.6 1.7 7 1.7s4.8-.6 7-1.7" />
          <path d="M12 10.2v9.3" />
          <path d="m8.5 21 3.5-5 3.5 5" />
        </svg>
      </button>

      <style jsx global>{`
        html[data-a11y-contrast='true'] {
          --background: #ffffff;
          --foreground: #000000;
          --card: #ffffff;
          --card-foreground: #000000;
          --popover: #ffffff;
          --popover-foreground: #000000;
          --primary: #000000;
          --primary-hover: #202020;
          --primary-foreground: #ffffff;
          --secondary: #f2f2f2;
          --secondary-foreground: #000000;
          --muted: #f4f4f4;
          --muted-foreground: #1f1f1f;
          --border: #555555;
          --border-strong: #222222;
          --input: #333333;
          --ring: #000000;
        }

        html[data-a11y-grayscale='true'] {
          filter: grayscale(1);
        }

        html[data-a11y-links='true'] a {
          text-decoration: underline !important;
          text-decoration-thickness: 2px !important;
          text-underline-offset: 0.2em !important;
        }

        html[data-a11y-motion='true'],
        html[data-a11y-motion='true'] * {
          scroll-behavior: auto !important;
        }

        html[data-a11y-motion='true'] *,
        html[data-a11y-motion='true'] *::before,
        html[data-a11y-motion='true'] *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `}</style>
    </>
  );
}

function ToggleButton({
  pressed,
  label,
  onClick,
}: Readonly<{ pressed: boolean; label: string; onClick: () => void }>) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-12 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
        pressed
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:bg-muted'
      }`}
    >
      {label}
    </button>
  );
}
