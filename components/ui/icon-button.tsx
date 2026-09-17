import type { ComponentProps, ReactNode } from 'react';

import { buttonClass, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * A button that is only an icon.
 *
 * The `label` is mandatory and becomes both the accessible name and the tooltip, so an
 * icon-only control can never ship without a name. The tooltip is CSS — `data-tooltip`
 * drawn by `globals.css` on hover and on keyboard focus — which keeps it working before
 * hydration and costs nothing to render.
 *
 * 44px by default (`size="icon"`), the WCAG 2.5.5 target size; `compact` is 36px for a
 * dense list row where the row itself is the target and the icon is the affordance.
 */
export function IconButton({
  label,
  icon,
  compact = false,
  variant = 'ghost',
  className,
  type,
  ...props
}: Omit<ComponentProps<'button'>, 'children'> & {
  label: string;
  icon: ReactNode;
  compact?: boolean;
  variant?: ButtonProps['variant'];
}) {
  return (
    <button
      type={type ?? 'button'}
      aria-label={label}
      data-tooltip={label}
      className={cn(
        buttonClass({ variant, size: 'icon' }),
        'tooltip-host',
        compact && 'size-9 [&_svg]:size-[1.15rem]',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
