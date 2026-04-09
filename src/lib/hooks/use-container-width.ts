import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Observes the rendered width of a container element.
 * Returns the current pixel width, updating on resize.
 * SSR-safe: returns `fallback` until mounted.
 */
export function useContainerWidth(
  ref: RefObject<HTMLElement | null>,
  fallback = 600
): number {
  const [width, setWidth] = useState(fallback);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Set initial width
    setWidth(ref.current.getBoundingClientRect().width || fallback);

    const observer = new ResizeObserver((entries) => {
      // Debounce via rAF to avoid ResizeObserver loop warnings
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const entry = entries[0];
        if (entry) {
          const w = entry.contentRect.width;
          if (w > 0) setWidth(w);
        }
      });
    });

    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [ref, fallback]);

  return width;
}
