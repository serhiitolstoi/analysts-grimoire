"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulation } from "@/providers/simulation-provider";
import { useDuckDB } from "@/providers/duckdb-provider";
import { cn } from "@/lib/utils/cn";
import { fmtNum } from "@/lib/utils/format";

const NAV = [
  {
    level: "Level 1",
    label: "Volume & Flow",
    color: "text-g-tan",
    items: [
      { label: "Engagement Trends",  path: "/modules/engagement-trends",  badge: "WAU" },
      { label: "Conversion Funnels", path: "/modules/conversion-funnels", badge: "LAT" },
      { label: "Retention Heatmaps", path: "/modules/retention-heatmaps", badge: "N-DAY" },
      { label: "Revenue & LTV",      path: "/modules/revenue-ltv",        badge: "LTV" },
    ],
  },
  {
    level: "Level 2",
    label: "Habit & Momentum",
    color: "text-g-purple",
    items: [
      { label: "IAT Distribution",  path: "/modules/iat-distribution",  badge: "EXP" },
      { label: "Session Intensity", path: "/modules/session-intensity", badge: "2D" },
    ],
  },
  {
    level: "Level 3",
    label: "Topology & Prediction",
    color: "text-g-cyan",
    items: [
      { label: "Transition Matrices", path: "/modules/transition-matrices", badge: "MARKOV" },
      { label: "Survival Analysis",   path: "/modules/survival-analysis",   badge: "KM" },
      { label: "Activity Clusters",   path: "/modules/activity-clusters",   badge: "K-M" },
    ],
  },
  {
    level: "Level 4",
    label: "Experimentation & Traps",
    color: "text-g-red",
    items: [
      { label: "A/B Testing",        path: "/modules/ab-testing",        badge: "A/B" },
      { label: "Analytics Pitfalls", path: "/modules/analytics-pitfalls", badge: "TRAP" },
    ],
  },
] as const;

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { ready } = useDuckDB();
  const { isGenerating, rowCounts } = useSimulation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (label: string) =>
    setCollapsed((s) => ({ ...s, [label]: !s[label] }));

  return (
    <>
      {/* Logo / title */}
      <div className="px-4 py-4 border-b border-g-border">
        <div className="text-g-tan text-xs font-bold tracking-widest uppercase">
          The Analyst&apos;s
        </div>
        <div className="text-g-text text-sm font-bold tracking-wider">
          Grimoire
        </div>
        <div className="mt-1 text-g-muted text-[10px] tracking-wide">
          Flight Simulator v1.0
        </div>
      </div>

      {/* Engine status */}
      <div className="px-4 py-2 border-b border-g-border-dim">
        <div className="flex items-center gap-1.5 text-[10px]">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              ready ? "bg-g-green" : "bg-g-muted animate-pulse"
            )}
          />
          <span className={ready ? "text-g-green" : "text-g-muted"}>
            {ready ? "DuckDB ready" : "Loading engine…"}
          </span>
        </div>
        {rowCounts && (
          <div className="mt-1 text-[10px] text-g-muted space-y-0.5">
            <div>{fmtNum(rowCounts.users)} users · {fmtNum(rowCounts.events)} events</div>
            {isGenerating && (
              <div className="text-g-tan animate-pulse">↻ regenerating…</div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        <Link
          href="/"
          onClick={onClose}
          className={cn(
            "flex items-center px-2 py-1.5 rounded text-xs transition-colors",
            pathname === "/"
              ? "bg-g-elevated text-g-tan"
              : "text-g-muted hover:text-g-text hover:bg-g-elevated"
          )}
        >
          <span className="mr-2">⌂</span> Overview
        </Link>

        {NAV.map((section) => (
          <div key={section.label} className="pt-2">
            {/* Section header */}
            <button
              onClick={() => toggle(section.label)}
              className="w-full flex items-center justify-between px-2 py-1 text-[10px] tracking-widest uppercase cursor-pointer hover:text-g-text transition-colors"
            >
              <span className={section.color}>{section.level}</span>
              <span className="text-g-dim ml-auto mr-1 normal-case tracking-normal text-[10px]">
                {section.label}
              </span>
              <span className="text-g-dim text-[9px]">
                {collapsed[section.label] ? "▶" : "▼"}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {!collapsed[section.label] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {section.items.map((item) => {
                    const active = pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={onClose}
                        className={cn(
                          "flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ml-2 group",
                          active
                            ? "bg-g-elevated text-g-text border-l-2 border-l-g-tan pl-1.5"
                            : "text-g-muted hover:text-g-text hover:bg-g-elevated"
                        )}
                      >
                        <span>{item.label}</span>
                        <span
                          className={cn(
                            "text-[9px] px-1 rounded font-bold tracking-wider",
                            active
                              ? "text-g-tan bg-g-bg"
                              : "text-g-dim group-hover:text-g-muted"
                          )}
                        >
                          {item.badge}
                        </span>
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-g-border text-[10px] text-g-dim">
        <div>Powered by DuckDB-Wasm</div>
        <div>+ Pyodide + Observable Plot</div>
      </div>
    </>
  );
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar — always visible on md+ */}
      <aside
        className="hidden md:flex flex-col shrink-0 border-r border-g-border bg-g-surface overflow-y-auto"
        style={{ width: "var(--spacing-sidebar)" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile drawer — overlay on < md */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={onClose}
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: -220 }}
              animate={{ x: 0 }}
              exit={{ x: -220 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 flex flex-col bg-g-surface border-r border-g-border md:hidden overflow-y-auto"
              style={{ width: 220 }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-g-muted hover:text-g-text text-lg leading-none z-10"
                aria-label="Close menu"
              >
                ✕
              </button>
              <SidebarContent onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
