import { renderProductShareImage } from '@/features/og/ProductShareImage';
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE } from '@/lib/server/ogImage';
import { socialImage } from '@/lib/social-image';

/** Keep the file-based Hebrew home image while sharing accurate localized product copy. */
export const alt = socialImage('he').alt;
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default function OpengraphImage() {
  return renderProductShareImage('he');
}
