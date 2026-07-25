import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional class names and resolves Tailwind conflicts so a caller-supplied
 * `className` reliably wins over a component's default.
 *
 * This is the helper shadcn/ui primitives import by convention, hence the location
 * and name declared in `components.json`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
