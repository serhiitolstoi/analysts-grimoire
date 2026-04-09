"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils/cn";

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultRatio?: number;  // 0–1, fraction for left panel
  minRatio?: number;
  maxRatio?: number;
  className?: string;
}

export function SplitPane({
  left,
  right,
  defaultRatio = 0.4,
  minRatio = 0.2,
  maxRatio = 0.75,
  className,
}: SplitPaneProps) {
  const [ratio, setRatio] = useState(defaultRatio);
  const [isMobile, setIsMobile] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Detect mobile breakpoint (< 768px = md)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Mouse drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = (e.clientX - rect.left) / rect.width;
      setRatio(Math.max(minRatio, Math.min(maxRatio, newRatio)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [minRatio, maxRatio]);

  // Touch drag handlers
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = (e.touches[0].clientX - rect.left) / rect.width;
      setRatio(Math.max(minRatio, Math.min(maxRatio, newRatio)));
    };
    const onTouchEnd = () => { dragging.current = false; };
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [minRatio, maxRatio]);

  // ── Mobile: stacked layout ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div ref={containerRef} className={cn("flex flex-col h-full overflow-hidden relative", className)}>
        {/* Toggle button for SQL pane */}
        <button
          onClick={() => setShowLeft((s) => !s)}
          className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded border border-g-border bg-g-surface text-[10px] text-g-muted hover:text-g-tan hover:border-g-tan transition-colors"
        >
          {showLeft ? "Hide SQL ▲" : "Show SQL ▼"}
        </button>

        {/* Code pane — shown when toggled */}
        {showLeft && (
          <div className="h-[45%] overflow-auto flex flex-col border-b border-g-border shrink-0">
            {left}
          </div>
        )}

        {/* Chart / viz pane — always visible */}
        <div className="flex-1 overflow-auto flex flex-col min-h-0">
          {right}
        </div>
      </div>
    );
  }

  // ── Desktop: side-by-side layout ───────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={cn("flex h-full overflow-hidden", className)}
    >
      {/* Left pane */}
      <div
        className="h-full overflow-auto flex flex-col"
        style={{ width: `${ratio * 100}%` }}
      >
        {left}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        onTouchStart={() => { dragging.current = true; }}
        className="w-1 shrink-0 bg-g-border hover:bg-g-tan cursor-col-resize transition-colors relative group"
        style={{ touchAction: "none" }}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* Right pane */}
      <div className="h-full overflow-auto flex flex-col flex-1">
        {right}
      </div>
    </div>
  );
}
