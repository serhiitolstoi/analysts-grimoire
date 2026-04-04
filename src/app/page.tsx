"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { Badge } from "@/components/ui/badge";
import { fmtNum } from "@/lib/utils/format";

const BOOT_LINES = [
  "Initializing Analyst's Grimoire v1.0…",
  "Loading DuckDB-Wasm OLAP engine…",
  "Generating 12-month synthetic dataset…",
  "Embedding hidden behavioral signals…",
  "Flight simulator ready.",
];

const MODULES = [
  {
    level: "Level 1",
    levelColor: "tan" as const,
    modules: [
      {
        title: "Conversion Latency Funnels",
        path: "/modules/conversion-funnels",
        badge: "LAT",
        badgeVariant: "tan" as const,
        desc: "Time-to-activation distributions across funnel steps. Box plots of p25/p50/p75/p90 latency.",
        signal: null,
      },
      {
        title: "Retention Heatmaps",
        path: "/modules/retention-heatmaps",
        badge: "N-DAY",
        badgeVariant: "tan" as const,
        desc: "GitHub-style cohort retention matrix. N-day and weekly cadence.",
        signal: null,
      },
    ],
  },
  {
    level: "Level 2",
    levelColor: "purple" as const,
    modules: [
      {
        title: "IAT Distribution",
        path: "/modules/iat-distribution",
        badge: "EXP",
        badgeVariant: "purple" as const,
        desc: "Inter-arrival time modeling. Exponential fit λe⁻λᵗ. Habit loop quantification.",
        signal: "Artifact users show 40% shorter IAT",
      },
      {
        title: "Session Intensity",
        path: "/modules/session-intensity",
        badge: "2D",
        badgeVariant: "purple" as const,
        desc: "Deep Work vs Quick Check classification by duration × token density.",
        signal: null,
      },
    ],
  },
  {
    level: "Level 3",
    levelColor: "blue" as const,
    modules: [
      {
        title: "Transition Matrices",
        path: "/modules/transition-matrices",
        badge: "MARKOV",
        badgeVariant: "blue" as const,
        desc: "Pᵢⱼ = P(Xₙ₊₁=j|Xₙ=i) state transition heatmaps across user activity states.",
        signal: "High latency → churn hazard spike",
      },
      {
        title: "Survival Analysis",
        path: "/modules/survival-analysis",
        badge: "KM",
        badgeVariant: "blue" as const,
        desc: "Kaplan-Meier estimator with 95% CI. Stratified by segment, plan, latency exposure.",
        signal: "Artifact users retain 2–3× longer",
      },
      {
        title: "Activity Clusters",
        path: "/modules/activity-clusters",
        badge: "K-M",
        badgeVariant: "green" as const,
        desc: "K-Means user archetype discovery via scikit-learn + PCA 2D projection.",
        signal: null,
      },
    ],
  },
];

export default function HomePage() {
  const { ready } = useDuckDB();
  const { isGenerating, rowCounts } = useSimulation();

  return (
    <div className="h-full overflow-auto p-6">
      {/* Boot sequence animation */}
      <div className="mb-8">
        <div className="flex flex-col gap-0.5 mb-6">
          {BOOT_LINES.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12, duration: 0.25 }}
              className="text-[11px] text-g-muted font-mono"
            >
              <span className={i === BOOT_LINES.length - 1 ? "text-g-green" : "text-g-dim"}>
                {i === BOOT_LINES.length - 1 ? "✓" : "▶"}
              </span>
              {" "}{line}
              {i === BOOT_LINES.length - 1 && (
                <span className="ml-2 text-g-tan cursor-blink">█</span>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-g-text tracking-tight">
            The Analyst&apos;s{" "}
            <span className="text-g-tan">Grimoire</span>
          </h1>
          <p className="text-g-muted text-sm mt-1 max-w-xl">
            Product Analytics Flight Simulator — Explore advanced behavioral science
            methodologies on a synthetic Claude-like AI product dataset.
          </p>
        </motion.div>
      </div>

      {/* Status bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="flex items-center gap-4 p-3 rounded border border-g-border bg-g-elevated mb-6 text-[11px]"
      >
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${ready ? "bg-g-green" : "bg-g-muted animate-pulse"}`} />
          <span className={ready ? "text-g-green" : "text-g-muted"}>
            {ready ? "DuckDB ready" : "Initializing DuckDB…"}
          </span>
        </div>
        {rowCounts && (
          <>
            <span className="text-g-dim">·</span>
            <span className="text-g-muted">{fmtNum(rowCounts.users)} users</span>
            <span className="text-g-dim">·</span>
            <span className="text-g-muted">{fmtNum(rowCounts.events)} events</span>
            <span className="text-g-dim">·</span>
            <span className="text-g-muted">{fmtNum(rowCounts.conversations)} conversations</span>
          </>
        )}
        {isGenerating && (
          <span className="text-g-tan animate-pulse ml-auto">↻ Regenerating dataset…</span>
        )}
      </motion.div>

      {/* Module grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="space-y-6"
      >
        {MODULES.map((section, si) => (
          <div key={section.level}>
            <div className="flex items-center gap-3 mb-3">
              <Badge variant={section.levelColor}>{section.level}</Badge>
              <div className="h-px flex-1 bg-g-border" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {section.modules.map((mod, mi) => (
                <motion.div
                  key={mod.path}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 + si * 0.1 + mi * 0.05 }}
                >
                  <Link href={mod.path} className="block h-full group">
                    <TerminalCard accent={mod.badgeVariant} className="h-full group-hover:border-g-dim transition-colors">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-g-text group-hover:text-g-tan transition-colors">
                            {mod.title}
                          </span>
                          <Badge variant={mod.badgeVariant}>{mod.badge}</Badge>
                        </div>
                        <p className="text-[11px] text-g-muted leading-relaxed">
                          {mod.desc}
                        </p>
                        {mod.signal && (
                          <div className="flex items-center gap-1.5 text-[10px] text-g-tan border border-g-tan/20 bg-g-tan/5 rounded px-2 py-1">
                            <span>◈</span>
                            <span>Hidden signal: {mod.signal}</span>
                          </div>
                        )}
                      </div>
                    </TerminalCard>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="mt-8 pt-4 border-t border-g-border text-[10px] text-g-dim space-y-1"
      >
        <p>Powered by DuckDB-Wasm · Pyodide · Observable Plot · Next.js · Framer Motion</p>
        <p>All computation runs in-browser. No data leaves your machine.</p>
        <p className="text-g-tan">
          Tip: Use the simulation controller (bottom bar) to change system parameters and observe
          how the hidden signals propagate through all analytics modules.
        </p>
      </motion.div>
    </div>
  );
}
