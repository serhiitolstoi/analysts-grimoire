"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ message, size = "md", className }: LoadingSpinnerProps) {
  const chars = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className={cn(
          "border-2 border-g-border border-t-g-tan rounded-full",
          size === "sm" ? "w-4 h-4" : size === "md" ? "w-8 h-8" : "w-12 h-12"
        )}
      />
      {message && (
        <div className="text-g-muted text-xs animate-pulse">{message}</div>
      )}
    </div>
  );
}

interface TerminalLoaderProps {
  lines: string[];
  className?: string;
}

export function TerminalLoader({ lines, className }: TerminalLoaderProps) {
  return (
    <div className={cn("font-mono text-xs space-y-1", className)}>
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15, duration: 0.2 }}
          className="text-g-muted"
        >
          <span className="text-g-green mr-2">▶</span>
          {line}
          {i === lines.length - 1 && (
            <span className="ml-1 text-g-tan cursor-blink">█</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}
