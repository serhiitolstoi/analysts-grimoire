"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

interface CodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  onRun?: (v: string) => void;
  language?: "sql" | "python";
  readOnly?: boolean;
  isRunning?: boolean;
  error?: string | null;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  onRun,
  language = "sql",
  readOnly = false,
  isRunning = false,
  error = null,
  className,
}: CodeEditorProps) {
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    onChange?.(e.target.value);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onRun?.(localValue);
      return;
    }
    // Tab → 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current!;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = localValue.substring(0, start) + "  " + localValue.substring(end);
      setLocalValue(next);
      onChange?.(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }, [localValue, onRun, onChange]);

  const lineCount = localValue.split("\n").length;

  return (
    <div className={cn("flex flex-col h-full bg-g-bg rounded-b", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-g-border bg-g-elevated shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-g-muted">
            {language === "sql" ? "▶ SQL" : "🐍 Python"}
          </span>
          <span className="text-[10px] text-g-dim">
            {lineCount} line{lineCount !== 1 ? "s" : ""}
          </span>
        </div>
        {onRun && (
          <button
            onClick={() => onRun(localValue)}
            disabled={isRunning}
            className={cn(
              "px-3 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors",
              isRunning
                ? "bg-g-border text-g-muted cursor-wait"
                : "bg-g-tan text-g-bg hover:bg-g-tan-dim cursor-pointer"
            )}
          >
            {isRunning ? "Running…" : "Run ⌘↵"}
          </button>
        )}
      </div>

      {/* Editor area */}
      <div className="flex flex-1 overflow-auto">
        {/* Line numbers */}
        <div
          className="select-none text-right text-[11px] text-g-dim px-2 pt-2 pb-2 leading-5 shrink-0 min-w-[36px]"
          aria-hidden
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          className={cn(
            "flex-1 resize-none bg-transparent text-[12px] text-g-text",
            "leading-5 pt-2 pb-2 pr-3 outline-none font-mono",
            "caret-g-tan"
          )}
          style={{ minHeight: "100%" }}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-3 py-2 bg-g-red/10 border-t border-g-red/30 text-g-red text-[11px] shrink-0">
          <span className="font-bold">Error: </span>{error}
        </div>
      )}

      {/* Hint */}
      <div className="px-3 py-1 border-t border-g-border text-[10px] text-g-dim shrink-0">
        ⌘↵ run · Tab indent
      </div>
    </div>
  );
}
