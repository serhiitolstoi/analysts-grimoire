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
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

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
        className="w-1 shrink-0 bg-g-border hover:bg-g-tan cursor-col-resize transition-colors relative group"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* Right pane */}
      <div
        className="h-full overflow-auto flex flex-col flex-1"
      >
        {right}
      </div>
    </div>
  );
}
