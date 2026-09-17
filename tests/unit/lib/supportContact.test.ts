import { describe, expect, it } from 'vitest';

import { appConfig } from '@/config/event.config';
import { supportWhatsAppUrl } from '@/lib/supportContact';

describe('supportWhatsAppUrl', () => {
  it('turns the configured local number into an international wa.me link', () => {
    const expectedDigits = `972${appConfig.supportPhone.replace(/\D/g, '').slice(1)}`;
    const url = new URL(supportWhatsAppUrl('שלום'));

    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe(`/${expectedDigits}`);
    expect(url.searchParams.get('text')).toBe('שלום');
  });

  it('keeps a number that is already international as it is', () => {
    const url = new URL(supportWhatsAppUrl('hi', '+972 58-000-0000'));

    expect(url.pathname).toBe('/972580000000');
  });

  it('encodes the prepared message for the query string', () => {
    const url = supportWhatsAppUrl('שלום ניסן, מסלול Basic?');

    expect(url).toContain(
      'text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%A0%D7%99%D7%A1%D7%9F%2C%20%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%20Basic%3F',
    );
  });
});
