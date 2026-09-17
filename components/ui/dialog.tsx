'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

/**
 * A confirmation dialog (§17).
 *
 * This replaces `window.confirm`, which was the one piece of browser chrome left in the
 * product: unstyleable, rendered in the browser's language rather than the page's, and
 * blocking the main thread. A native `<dialog>` opened with `showModal()` keeps what the
 * browser does well — the focus trap, the Escape key, inert content behind it, top-layer
 * stacking — and lets the page draw the rest.
 *
 * Deliberately narrow: a title, a sentence, two buttons. Anything a dialog needs beyond
 * that is a page. `tone="destructive"` puts the confirming action in the alarm colour,
 * and the cancel button always takes initial focus, so a slip of the Enter key never
 * deletes a guest list.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'ביטול',
  tone = 'primary',
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'destructive';
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open) {
      if (dialog.open) return;
      // jsdom and very old engines lack `showModal`; the `open` attribute still shows it.
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
    } else if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description !== undefined ? descriptionId : undefined}
      // `close` fires for Escape as well as for `.close()`, so both routes end in one place.
      onClose={() => {
        if (open) onCancel();
      }}
      // Clicking the backdrop lands on the dialog element itself, never on its children.
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className={cn(
        'dialog-card bg-card text-card-foreground shadow-overlay m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border p-0',
        'backdrop:bg-surface-ink/45 backdrop:backdrop-blur-[2px]',
      )}
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-full',
              tone === 'destructive'
                ? 'bg-destructive-soft text-destructive'
                : 'bg-accent-soft text-accent-strong',
            )}
          >
            <Icon
              name={tone === 'destructive' ? 'alert-triangle' : 'help-circle'}
              className="size-5"
            />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-primary text-lg leading-snug font-bold">
              {title}
            </h2>
            {description !== undefined && (
              <div
                id={descriptionId}
                className="text-muted-foreground mt-2 text-sm leading-relaxed"
              >
                {description}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={pending} autoFocus>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'destructive' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
