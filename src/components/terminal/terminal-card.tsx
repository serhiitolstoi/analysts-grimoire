"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface TerminalCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  accent?: "tan" | "purple" | "green" | "red" | "blue" | "none";
  animate?: boolean;
}

export function TerminalCard({
  title,
  children,
  className,
  noPadding = false,
  accent = "none",
  animate = false,
}: TerminalCardProps) {
  const accentBorderClass = {
    tan:    "border-t-g-tan",
    purple: "border-t-g-purple",
    green:  "border-t-g-green",
    red:    "border-t-g-red",
    blue:   "border-t-g-blue",
    none:   "border-t-g-border",
  }[accent];

  const content = (
    <div
      className={cn(
        "rounded-lg border border-g-border bg-g-surface shrink-0",
        accent !== "none" ? `border-t-2 ${accentBorderClass}` : "",
        className
      )}
    >
      {/* Chrome bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-g-border bg-g-elevated rounded-t-lg">
        <span className="w-2.5 h-2.5 rounded-full bg-dot-close opacity-80" />
        <span className="w-2.5 h-2.5 rounded-full bg-dot-min opacity-80" />
        <span className="w-2.5 h-2.5 rounded-full bg-dot-max opacity-80" />
        {title && (
          <span className="ml-2 text-xs text-g-muted tracking-wide uppercase">
            {title}
          </span>
        )}
      </div>

      {/* Content */}
      <div className={cn(!noPadding && "p-4")}>
        {children}
      </div>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="contents"
      >
        {content}
      </motion.div>
    );
  }

  return content;
}
