import { NotFoundContent } from '@/features/layout/NotFoundContent';
import { RootDocument } from '@/features/layout/RootDocument';

export const metadata = { title: 'הדף לא נמצא' };

export default function GlobalNotFound() {
  return (
    <RootDocument locale="he">
      <NotFoundContent />
    </RootDocument>
  );
}
