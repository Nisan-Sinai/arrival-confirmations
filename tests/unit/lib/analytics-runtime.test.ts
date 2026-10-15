import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chooseConsent,
  CONSENT_KEY,
  readConsent,
  stopAnalytics,
  subscribeConsent,
  trackPublicPage,
} from '@/lib/analytics-runtime';

const config = {
  id: 'G-TEST123',
  origin: 'https://site.example',
  name: 'Public site',
  paths: ['/', '/en', '/pricing'],
};
let win: EventTarget & Record<string, unknown>;
let stored: Map<string, string>;
let scripts: Record<string, unknown>[];
let cookieWrites: string[];

beforeEach(() => {
  stored = new Map();
  scripts = [];
  cookieWrites = [];
  win = Object.assign(new EventTarget(), {
    location: {
      origin: config.origin,
      hostname: 'site.example',
      search: '?email=secret@example.com',
      hash: '#token-secret',
      reload: vi.fn(),
    },
    localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
  }) as unknown as EventTarget & Record<string, unknown>;
  const doc = {
    title: 'PRIVATE PERSON',
    referrer: 'https://private.example/?token=secret',
    head: { appendChild: (script: Record<string, unknown>) => scripts.push(script) },
    createElement: () => ({}),
  };
  Object.defineProperty(doc, 'cookie', {
    get: () => '_ga=123; _ga_TEST123=456; essential=ok',
    set: (value: string) => cookieWrites.push(value),
  });
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('navigator', { doNotTrack: null });
});
afterEach(() => vi.unstubAllGlobals());
const commands = () => (win.dataLayer as IArguments[]).map((args) => Array.from(args));
const views = () => commands().filter((args) => args[0] === 'event' && args[1] === 'page_view');

describe('public analytics privacy boundary', () => {
  it('does not load Google before consent or after declining', () => {
    trackPublicPage(config, '/');
    expect(scripts).toHaveLength(0);
    chooseConsent('denied');
    trackPublicPage(config, '/');
    expect(scripts).toHaveLength(0);
    expect(readConsent()).toBe('denied');
  });
  it('loads once and counts one view across repeated effects and cleanup', () => {
    chooseConsent('granted');
    trackPublicPage(config, '/');
    stopAnalytics();
    trackPublicPage(config, '/');
    trackPublicPage(config, '/');
    expect(scripts).toHaveLength(1);
    expect(views()).toHaveLength(1);
    expect(scripts[0]).toMatchObject({ async: true, referrerPolicy: 'no-referrer' });
    expect(commands().find((args) => args[0] === 'config')?.[2]).toMatchObject({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  });
  it('counts public SPA transitions without reading URL parameters, hashes, titles or referrers', () => {
    chooseConsent('granted');
    trackPublicPage(config, '/');
    trackPublicPage(config, '/pricing');
    expect(views()).toHaveLength(2);
    expect(views()[1]![2]).toMatchObject({
      page_location: 'https://site.example/pricing',
      page_referrer: '',
      page_title: 'Public site /pricing',
    });
    expect(JSON.stringify(commands())).not.toMatch(/secret|PRIVATE PERSON|private\.example/);
  });
  it.each([
    '/admin',
    '/dashboard',
    '/e/private-token',
    '/login',
    '/en/admin',
    '/pricing/unknown',
    '/?token=secret',
  ])('never measures %s', (path) => {
    chooseConsent('granted');
    trackPublicPage(config, path);
    expect(scripts).toHaveLength(0);
  });
  it('disables collection on private navigation and counts a return to the same public route', () => {
    chooseConsent('granted');
    trackPublicPage(config, '/');
    trackPublicPage(config, '/admin');
    expect(win['ga-disable-G-TEST123']).toBe(true);
    expect(views()).toHaveLength(1);
    trackPublicPage(config, '/');
    expect(views()).toHaveLength(2);
  });
  it('blocks previews, DNT, GPC and invalid measurement identifiers', () => {
    chooseConsent('granted');
    trackPublicPage({ ...config, origin: 'https://production.example' }, '/');
    vi.stubGlobal('navigator', { doNotTrack: '1' });
    trackPublicPage(config, '/');
    vi.stubGlobal('navigator', { globalPrivacyControl: true });
    trackPublicPage(config, '/');
    vi.stubGlobal('navigator', {});
    trackPublicPage({ ...config, id: '' }, '/');
    expect(scripts).toHaveLength(0);
  });
  it('withdraws consent immediately, deletes only GA cookies and reloads loaded analytics', () => {
    chooseConsent('granted');
    trackPublicPage(config, '/');
    chooseConsent('denied');
    expect(win['ga-disable-G-TEST123']).toBe(true);
    expect(cookieWrites.some((value) => value.startsWith('_ga=;'))).toBe(true);
    expect(cookieWrites.some((value) => value.startsWith('essential='))).toBe(false);
    expect((win.location as { reload: unknown }).reload).toHaveBeenCalledOnce();
  });
  it('fails closed if consent storage is unavailable', () => {
    win.localStorage = {
      getItem: () => {
        throw Error('blocked');
      },
      setItem: () => {
        throw Error('blocked');
      },
    };
    expect(readConsent()).toBe('unset');
    expect(chooseConsent('granted')).toBe(false);
    trackPublicPage(config, '/');
    expect(scripts).toHaveLength(0);
  });
  it('responds to consent changes in another tab and removes its listeners', () => {
    stored.set(CONSENT_KEY, 'granted');
    trackPublicPage(config, '/');
    const callback = vi.fn();
    const unsubscribe = subscribeConsent(callback);
    stored.set(CONSENT_KEY, 'denied');
    win.dispatchEvent(new Event('storage'));
    expect(win['ga-disable-G-TEST123']).toBe(true);
    expect(callback).toHaveBeenCalledOnce();
    unsubscribe();
    win.dispatchEvent(new Event('storage'));
    expect(callback).toHaveBeenCalledOnce();
  });
});
