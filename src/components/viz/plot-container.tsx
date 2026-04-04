"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface PlotContainerProps {
  plot: Element | null;          // Observable Plot element returned by Plot.plot()
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  emptyMessage?: string;
}

/**
 * Generic wrapper for Observable Plot charts.
 * Accepts a pre-built Plot element and mounts it into the DOM.
 * Handles loading and error states.
 */
export function PlotContainer({
  plot,
  isLoading = false,
  error = null,
  className,
  emptyMessage = "Run the query to render visualization",
}: PlotContainerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    // Clear previous content
    container.innerHTML = "";
    if (plot) {
      container.appendChild(plot);
    }
    return () => {
      if (container) container.innerHTML = "";
    };
  }, [plot]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <LoadingSpinner message="Executing query…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center h-full p-4", className)}>
        <div className="text-g-red text-xs text-center max-w-sm">
          <div className="text-sm font-bold mb-1">Query Error</div>
          <div className="text-g-muted">{error}</div>
        </div>
      </div>
    );
  }

  if (!plot) {
    return (
      <div className={cn("flex items-center justify-center h-full p-4", className)}>
        <div className="text-g-dim text-xs text-center">
          <div className="text-2xl mb-2">◈</div>
          <div>{emptyMessage}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "plot-wrapper overflow-auto",
        "[&_figure]:bg-transparent [&_figure]:m-0",
        "[&_svg]:max-w-full [&_svg]:h-auto",
        className
      )}
    />
  );
}
