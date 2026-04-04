/**
 * Simple className merger — replaces clsx/twMerge for minimal dep footprint.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
