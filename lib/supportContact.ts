import { appConfig } from '@/config/event.config';

/**
 * The studio's WhatsApp, as a `wa.me` link with a prepared message.
 *
 * Three screens built this URL for themselves — the dashboard's activation prompt, the
 * pricing cards and now the landing page's closing call to action — each with its own
 * copy of the "strip the leading zero, prefix 972" arithmetic. One place to get it right.
 */
function internationalDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
}

export function supportWhatsAppUrl(message: string): string {
  return `https://wa.me/${internationalDigits(appConfig.supportPhone)}?text=${encodeURIComponent(message)}`;
}
