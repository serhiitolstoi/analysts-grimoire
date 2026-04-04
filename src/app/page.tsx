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
    levelLabel: "Foundation — Volume & Flow",
    levelColor: "tan" as const,
    modules: [
      {
        title: "Conversion Latency Funnels",
        path: "/modules/conversion-funnels",
        badge: "LAT",
        badgeVariant: "tan" as const,
        desc: "How long does each activation step really take? Box plots of p25/p50/p75/p90 latency reveal where users stall — and where onboarding friction silently kills conversion.",
        signal: "Onboarding friction → p90 latency explosion",
      },
      {
        title: "Retention Heatmaps",
        path: "/modules/retention-heatmaps",
        badge: "N-DAY",
        badgeVariant: "tan" as const,
        desc: "Cohort retention matrices tell you whether your product has achieved product-market fit. Look for the 'smile curve' — the week where decay flattens and your core users emerge.",
        signal: "Model quality shifts the smile curve inflection point",
      },
    ],
  },
  {
    level: "Level 2",
    levelLabel: "Intermediate — Habit & Momentum",
    levelColor: "purple" as const,
    modules: [
      {
        title: "IAT Distribution",
        path: "/modules/iat-distribution",
        badge: "EXP",
        badgeVariant: "purple" as const,
        desc: "Session return intervals follow an exponential distribution — but not uniformly. Segment by feature adoption to find the habit loop: users who create artifacts return 40% faster.",
        signal: "Artifact users show 40% shorter IAT (higher λ)",
      },
      {
        title: "Session Intensity",
        path: "/modules/session-intensity",
        badge: "2D",
        badgeVariant: "purple" as const,
        desc: "Not all sessions are equal. Map duration × event count to discover four behavioral archetypes — from 30-second glances to 45-minute deep work sessions. Bubble size reveals token consumption intensity.",
        signal: "Bimodal clustering reveals two distinct usage patterns",
      },
    ],
  },
  {
    level: "Level 3",
    levelLabel: "Advanced — Causal & Predictive",
    levelColor: "blue" as const,
    modules: [
      {
        title: "Transition Matrices",
        path: "/modules/transition-matrices",
        badge: "MARKOV",
        badgeVariant: "blue" as const,
        desc: "Model user engagement as a Markov chain with weekly state transitions. Compare the full population against users exposed to high latency — the churn probability spike is the smoking gun.",
        signal: "High latency → 2-3× elevated churn probability",
      },
      {
        title: "Survival Analysis",
        path: "/modules/survival-analysis",
        badge: "KM",
        badgeVariant: "blue" as const,
        desc: "Kaplan-Meier survival curves with Greenwood 95% CI bands. Stratify by artifact usage, latency exposure, or plan tier to quantify exactly how long each segment survives before churning.",
        signal: "Artifact users retain 2-3× longer (median survival)",
      },
      {
        title: "Activity Clusters",
        path: "/modules/activity-clusters",
        badge: "K-M",
        badgeVariant: "green" as const,
        desc: "Let the data speak: K-Means discovers natural user archetypes from 6 behavioral features. PCA projects high-dimensional clusters into 2D space. Each centroid tells a story about how users engage.",
        signal: "Cluster centroids map to distinct product personas",
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
          <p className="text-g-muted text-sm mt-1 max-w-2xl">
            Product Analytics Flight Simulator — Master advanced behavioral analytics
            on a synthetic Claude-like AI product. Discover hidden causal signals by
            combining SQL, Python, and statistical modeling on ~2,200 users and ~140K events.
          </p>
          <p className="text-g-dim text-xs mt-2 max-w-2xl leading-relaxed">
            Every dataset contains <span className="text-g-tan">four hidden behavioral signals</span> embedded
            in the data generation process. Use the simulation controller (bottom bar) to change system
            parameters — latency, model quality, onboarding friction — and watch how causal effects
            propagate through every module. The signals are not labeled. You have to find them through analysis.
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
              <span className="text-[10px] text-g-dim">{section.levelLabel}</span>
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

      {/* How to use */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="mt-8"
      >
        <TerminalCard title="How to Use This Simulator" accent="tan">
          <div className="text-[11px] text-g-muted space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-g-tan font-bold mb-1">1. Explore a module</div>
                <p className="text-g-dim leading-relaxed">
                  Click any module above. The left pane shows editable SQL or Python code.
                  The right pane renders live visualizations. Modify the query and press
                  <span className="text-g-text"> Run</span> to see your changes instantly.
                </p>
              </div>
              <div>
                <div className="text-g-purple font-bold mb-1">2. Adjust the simulation</div>
                <p className="text-g-dim leading-relaxed">
                  The bottom bar has three sliders: <span className="text-g-tan">System Latency</span>,{" "}
                  <span className="text-g-purple">Model Quality</span>, and{" "}
                  <span className="text-g-red">Onboarding Friction</span>. Each controls a causal lever
                  in the data generator. Move them and watch metrics shift across all modules.
                </p>
              </div>
              <div>
                <div className="text-g-blue font-bold mb-1">3. Discover the signals</div>
                <p className="text-g-dim leading-relaxed">
                  Four hidden behavioral signals are baked into the synthetic data. They mimic
                  real product dynamics: habit formation, frustration-driven churn, onboarding
                  barriers, and quality elasticity. Can you find all four?
                </p>
              </div>
            </div>
          </div>
        </TerminalCard>
      </motion.div>

      {/* Hidden Signals Reference */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="mt-4"
      >
        <TerminalCard title="The Four Hidden Signals" accent="none">
          <div className="text-[11px] space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-g-border/50 rounded p-2.5 bg-g-bg/50">
                <div className="text-g-purple font-bold mb-0.5">Signal 1: The Artifact Habit Loop</div>
                <p className="text-g-dim leading-relaxed">
                  Users who create their first artifact develop a habit — their inter-arrival time
                  drops by 40%. The product delivers an &quot;aha moment&quot; that mechanically shortens
                  the return interval. <span className="text-g-muted">Best seen in: IAT Distribution, Survival Analysis.</span>
                </p>
              </div>
              <div className="border border-g-border/50 rounded p-2.5 bg-g-bg/50">
                <div className="text-g-red font-bold mb-0.5">Signal 2: Latency-Driven Churn</div>
                <p className="text-g-dim leading-relaxed">
                  Each high-latency event (&gt;2s response time) accumulates frustration. When it
                  crosses a threshold, users churn within 1-3 weeks. This is a silent killer — it
                  doesn&apos;t show up in averages. <span className="text-g-muted">Best seen in: Transition Matrices, Survival Analysis.</span>
                </p>
              </div>
              <div className="border border-g-border/50 rounded p-2.5 bg-g-bg/50">
                <div className="text-g-tan font-bold mb-0.5">Signal 3: The Onboarding Barrier</div>
                <p className="text-g-dim leading-relaxed">
                  Users who fail onboarding never generate any events — they&apos;re permanently lost
                  before they can experience the product. Friction controls the rate of this silent
                  attrition. <span className="text-g-muted">Best seen in: Conversion Funnels, Retention Heatmaps.</span>
                </p>
              </div>
              <div className="border border-g-border/50 rounded p-2.5 bg-g-bg/50">
                <div className="text-g-blue font-bold mb-0.5">Signal 4: Quality Elasticity</div>
                <p className="text-g-dim leading-relaxed">
                  Lower model quality reduces artifact and code creation rates, which weakens the
                  habit loop (Signal 1), which increases churn. Quality is the upstream lever
                  that compounds through the entire engagement funnel. <span className="text-g-muted">Best seen in: All modules when toggling Model Quality slider.</span>
                </p>
              </div>
            </div>
          </div>
        </TerminalCard>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0 }}
        className="mt-6 pt-4 border-t border-g-border text-[10px] text-g-dim space-y-1"
      >
        <p>Powered by DuckDB-Wasm · Pyodide · Observable Plot · Next.js · Framer Motion</p>
        <p>All computation runs in-browser. No data leaves your machine.</p>
      </motion.div>
    </div>
  );
}
