"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulation } from "@/providers/simulation-provider";

interface Command {
  id: string;
  label: string;
  description?: string;
  group: string;
  icon: string;
  action: () => void;
}

const MODULES = [
  { label: "Overview",            path: "/",                              badge: "HOME"   },
  { label: "Engagement Trends",   path: "/modules/engagement-trends",    badge: "WAU"    },
  { label: "Conversion Funnels",  path: "/modules/conversion-funnels",   badge: "LAT"    },
  { label: "Retention Heatmaps",  path: "/modules/retention-heatmaps",   badge: "N-DAY"  },
  { label: "Revenue & LTV",       path: "/modules/revenue-ltv",          badge: "LTV"    },
  { label: "IAT Distribution",    path: "/modules/iat-distribution",     badge: "EXP"    },
  { label: "Session Intensity",   path: "/modules/session-intensity",    badge: "2D"     },
  { label: "Transition Matrices", path: "/modules/transition-matrices",  badge: "MARKOV" },
  { label: "Survival Analysis",   path: "/modules/survival-analysis",    badge: "KM"     },
  { label: "Activity Clusters",   path: "/modules/activity-clusters",    badge: "K-M"    },
  { label: "A/B Testing",         path: "/modules/ab-testing",           badge: "A/B"    },
  { label: "Analytics Pitfalls",  path: "/modules/analytics-pitfalls",   badge: "TRAP"   },
];

const PRESETS = [
  { label: "Baseline",       latencyFactor: 1.0,  modelQuality: 0.7,  onboardingFriction: 0.3  },
  { label: "Ideal State",    latencyFactor: 0.5,  modelQuality: 1.0,  onboardingFriction: 0.05 },
  { label: "Latency Crisis", latencyFactor: 2.8,  modelQuality: 0.7,  onboardingFriction: 0.3  },
  { label: "Quality Drop",   latencyFactor: 1.0,  modelQuality: 0.15, onboardingFriction: 0.3  },
  { label: "Friction Wall",  latencyFactor: 1.0,  modelQuality: 0.7,  onboardingFriction: 0.9  },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { setParams, params, dataVersion } = useSimulation();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  // Build command list
  const allCommands: Command[] = [
    // Navigate to modules
    ...MODULES.map((m) => ({
      id: `nav-${m.path}`,
      label: m.label,
      description: m.badge,
      group: "Navigate",
      icon: "→",
      action: () => { router.push(m.path); onClose(); },
    })),
    // Apply presets
    ...PRESETS.map((p) => ({
      id: `preset-${p.label}`,
      label: `Apply: ${p.label}`,
      description: `L=${p.latencyFactor}x  Q=${(p.modelQuality * 100).toFixed(0)}%  F=${(p.onboardingFriction * 100).toFixed(0)}%`,
      group: "Presets",
      icon: "⚙",
      action: () => { setParams(p); onClose(); },
    })),
    // Share URL
    {
      id: "share-url",
      label: "Copy Shareable URL",
      description: "Encode current simulation params in URL",
      group: "Actions",
      icon: "🔗",
      action: () => {
        const url = new URL(window.location.href);
        url.searchParams.set("l", params.latencyFactor.toFixed(2));
        url.searchParams.set("q", params.modelQuality.toFixed(2));
        url.searchParams.set("f", params.onboardingFriction.toFixed(2));
        navigator.clipboard.writeText(url.toString()).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
        onClose();
      },
    },
    {
      id: "reset-params",
      label: "Reset Simulation",
      description: "Return to Baseline parameters",
      group: "Actions",
      icon: "↺",
      action: () => { setParams({ latencyFactor: 1.0, modelQuality: 0.7, onboardingFriction: 0.3 }); onClose(); },
    },
  ];

  const filtered = query.trim()
    ? allCommands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          (c.description ?? "").toLowerCase().includes(query.toLowerCase()) ||
          c.group.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands;

  // Group filtered commands
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  // Flatten for keyboard nav
  const flat = filtered;

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, flat.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); flat[selected]?.action(); }
    if (e.key === "Escape")    { onClose(); }
  }, [isOpen, flat, selected, onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Reset selection when filter changes
  useEffect(() => { setSelected(0); }, [query]);

  // Compute flat index offset for each group item
  let flatIndex = 0;
  const groupedWithIndex = Object.entries(grouped).map(([group, cmds]) => ({
    group,
    cmds: cmds.map((cmd) => ({ cmd, idx: flatIndex++ })),
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="palette-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[100]"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            key="palette"
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed top-[15vh] left-1/2 -translate-x-1/2 z-[101] w-full max-w-lg rounded-xl border border-g-border bg-g-surface shadow-2xl overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-g-border">
              <span className="text-g-muted text-sm">⌘</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search modules, presets, actions…"
                className="flex-1 bg-transparent text-g-text text-sm placeholder-g-muted outline-none font-mono"
              />
              <kbd className="text-[10px] text-g-dim border border-g-border rounded px-1.5 py-0.5">ESC</kbd>
            </div>

            {/* Simulator state */}
            <div className="flex gap-3 px-4 py-1.5 border-b border-g-border-dim text-[10px] text-g-dim">
              <span>v{dataVersion}</span>
              <span className="text-g-tan">L={params.latencyFactor.toFixed(1)}x</span>
              <span className="text-g-purple">Q={(params.modelQuality * 100).toFixed(0)}%</span>
              <span className="text-g-red">F={(params.onboardingFriction * 100).toFixed(0)}%</span>
              {copied && <span className="text-g-green ml-auto">✓ URL copied!</span>}
            </div>

            {/* Command list */}
            <div className="max-h-80 overflow-y-auto">
              {groupedWithIndex.length === 0 && (
                <div className="px-4 py-8 text-center text-g-dim text-xs">No results for &ldquo;{query}&rdquo;</div>
              )}
              {groupedWithIndex.map(({ group, cmds }) => (
                <div key={group}>
                  <div className="px-4 py-1.5 text-[9px] text-g-dim uppercase tracking-widest bg-g-elevated/50">
                    {group}
                  </div>
                  {cmds.map(({ cmd, idx }) => (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelected(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                        ${selected === idx ? "bg-g-elevated text-g-text" : "text-g-muted hover:bg-g-elevated hover:text-g-text"}`}
                    >
                      <span className="text-base w-5 text-center shrink-0">{cmd.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{cmd.label}</div>
                        {cmd.description && (
                          <div className="text-[10px] text-g-dim truncate">{cmd.description}</div>
                        )}
                      </div>
                      {selected === idx && (
                        <kbd className="text-[9px] text-g-dim border border-g-border rounded px-1 py-0.5 shrink-0">↵</kbd>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-g-border flex items-center gap-4 text-[10px] text-g-dim">
              <span><kbd className="border border-g-border rounded px-1">↑↓</kbd> navigate</span>
              <span><kbd className="border border-g-border rounded px-1">↵</kbd> select</span>
              <span><kbd className="border border-g-border rounded px-1">esc</kbd> close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
