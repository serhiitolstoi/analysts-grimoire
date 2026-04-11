"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CrossModuleCard } from "@/components/terminal/cross-module-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { MatrixGrid } from "@/components/viz/matrix-grid";
import { Badge } from "@/components/ui/badge";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { useGhost } from "@/providers/ghost-provider";
import {
  TRANSITION_MATRIX_SQL,
  TRANSITION_MATRIX_HIGH_LATENCY_SQL,
} from "@/lib/sql/transition-matrix.sql";
import { motion } from "framer-motion";

const MODULE_ID = "transition-matrices";

export default function TransitionMatricesPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();
  const { ghosts } = useGhost();

  const [sql, setSql] = useState(TRANSITION_MATRIX_SQL.trim());
  const [data, setData] = useState<unknown[] | null>(null);
  const [latencyData, setLatencyData] = useState<unknown[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"all" | "high_latency">("all");

  const runQuery = useCallback(async (querySql: string) => {
    if (!ready || isGenerating) return;
    setIsRunning(true);
    setError(null);
    try {
      const [rows, latRows] = await Promise.all([
        runSQL(querySql),
        runSQL(TRANSITION_MATRIX_HIGH_LATENCY_SQL.trim()),
      ]);
      setData(rows);
      setLatencyData(latRows);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRunning(false);
    }
  }, [ready, isGenerating, runSQL]);

  // Auto-run when data version changes
  useEffect(() => {
    if (ready && !isGenerating) {
      runQuery(sql);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, ready, isGenerating]);

  const ghostRows = ghosts[0]?.data.get(MODULE_ID) ?? null;

  return (
    <div className="h-full overflow-hidden">
      <SplitPane
        left={
          <div className="h-full flex flex-col gap-0">
            {/* Module header */}
            <div className="px-4 py-3 border-b border-g-border bg-g-elevated shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="purple">MARKOV</Badge>
                <Badge variant="muted">Level 3</Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Transition Matrices</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                P<sub>ij</sub> = P(X<sub>n+1</sub> = j | X<sub>n</sub> = i)
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-g-border shrink-0">
              <button
                onClick={() => setActiveView("all")}
                className={`px-4 py-2 text-xs transition-colors ${activeView === "all" ? "text-g-tan border-b-2 border-g-tan" : "text-g-muted hover:text-g-text"}`}
              >
                All Users
              </button>
              <button
                onClick={() => setActiveView("high_latency")}
                className={`px-4 py-2 text-xs transition-colors flex items-center gap-1.5 ${activeView === "high_latency" ? "text-g-red border-b-2 border-g-red" : "text-g-muted hover:text-g-text"}`}
              >
                High Latency Segment
                <span className="text-[9px] text-g-dim">[signal]</span>
              </button>
            </div>

            {/* Code editor */}
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={activeView === "all" ? sql : TRANSITION_MATRIX_HIGH_LATENCY_SQL.trim()}
                onChange={activeView === "all" ? setSql : undefined}
                onRun={(v) => runQuery(v)}
                language="sql"
                isRunning={isRunning}
                error={error}
              />
            </div>
          </div>
        }
        right={
          <div className="h-full flex flex-col p-3 gap-3 overflow-auto">
            {/* Primary matrix */}
            <TerminalCard
              title={activeView === "all" ? "State Transition Matrix — All Users" : "State Transition Matrix — High Latency Segment"}
              accent={activeView === "high_latency" ? "red" : "purple"}
              animate
            >
              <MatrixGrid
                data={(activeView === "all" ? data : latencyData) as Parameters<typeof MatrixGrid>[0]["data"]}
                ghostData={ghostRows as Parameters<typeof MatrixGrid>[0]["ghostData"]}
                isLoading={isRunning && !data}
                error={error}
                width={460}
                height={400}
              />
            </TerminalCard>

            {/* Comparative view when on all-users */}
            {activeView === "all" && data && latencyData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <TerminalCard title="High Latency Segment — Compare Churn Risk" accent="red">
                  <div className="text-[11px] text-g-muted mb-3 px-1">
                    Users exposed to latency &gt;2s. Notice elevated{" "}
                    <span className="text-g-red font-bold">→ churned</span> probabilities.
                  </div>
                  <MatrixGrid
                    data={latencyData as Parameters<typeof MatrixGrid>[0]["data"]}
                    width={460}
                    height={400}
                  />
                </TerminalCard>
              </motion.div>
            )}

            <TerminalCard title="Case Study: Markov Chains for Engagement" accent="blue">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  A <span className="text-g-blue font-bold">Markov chain</span> models user behavior as transitions
                  between discrete states. The key assumption: the probability of moving to the next state depends
                  <em> only on the current state</em>, not on history. This is the &quot;memoryless&quot; property.
                </p>
                <p>
                  Each cell P<sub>ij</sub> in the matrix represents: &quot;Given a user is in state i this week,
                  what&apos;s the probability they&apos;ll be in state j next week?&quot; The rows sum to 1.0 (a user must go
                  <em>somewhere</em>). <span className="text-g-text font-bold">Churned is an absorbing state</span> — once
                  a user churns, they stay churned (P<sub>churned→churned</sub> ≈ 1.0).
                </p>
                <p className="text-g-dim">
                  <span className="text-g-blue">Real-world parallel:</span> Spotify uses Markov models to predict
                  subscriber churn. Netflix uses similar state-transition analysis to identify &quot;at-risk&quot; subscribers
                  before they cancel. The power is in the comparison — baseline vs. exposed segment.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="The Hidden Signal: Latency Kills" accent="red">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  Switch to the <span className="text-g-red font-bold">High Latency Segment</span> tab or compare
                  the two matrices side by side (shown above when on &quot;All Users&quot; view).
                  Focus on the <span className="text-g-red font-bold">→ churned column</span>.
                </p>
                <p>
                  <span className="text-g-text font-bold">The signal:</span> Users who experienced ≥3 events with
                  latency &gt;2 seconds show a <span className="text-g-red font-bold">2-3x higher transition probability
                  from active → churned</span> compared to the general population. This is the &quot;death by a thousand cuts&quot;
                  pattern — no single slow response kills a user, but accumulated frustration crosses a threshold.
                </p>
                <p>
                  <span className="text-g-text font-bold">Why it matters:</span> Latency-driven churn is invisible
                  in aggregate metrics. Average latency might be 800ms (fine!), but the p95 could be 4 seconds,
                  and those tail experiences are silently accumulating frustration in your most active users — the ones
                  who encounter the most requests.
                </p>
                <p>
                  <span className="text-g-text font-bold">Business implication:</span> If your &quot;active → churned&quot;
                  probability is 0.15 for the general population but 0.35 for high-latency users, and 20% of your
                  users are in the high-latency segment, then latency alone accounts for ~4% of total weekly churn.
                  At 100K active users, that&apos;s 4,000 users lost per week to infrastructure problems.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Reading the Matrix" accent="none">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  <span className="text-g-blue font-bold">Diagonal dominance:</span> Strong diagonal (high P<sub>ii</sub>)
                  means states are &quot;sticky&quot; — power users tend to stay power users, casual users stay casual.
                  This is good for power users but bad for casual ones (they&apos;re not growing).
                </p>
                <p>
                  <span className="text-g-blue font-bold">Upward mobility:</span> Look at P<sub>casual→active</sub>
                  and P<sub>active→power</sub>. These are your &quot;graduation rates.&quot; If they&apos;re low (&lt;0.10),
                  users are getting stuck at their current engagement level.
                </p>
                <p>
                  <span className="text-g-blue font-bold">Churn vulnerability:</span> Compare P<sub>casual→churned</sub>
                  vs P<sub>power→churned</sub>. The difference tells you how much &quot;insurance&quot; higher engagement provides
                  against churn. If even power users have high churn probability, your product has a retention ceiling.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Try This" accent="none">
              <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-g-blue font-bold">Experiment 1:</span> Set{" "}
                  <span className="text-g-tan">System Latency</span> to 3.0x. Watch the &quot;→ churned&quot; column
                  light up across all states. Then drop it to 0.5x — the matrix should show much stronger
                  diagonal stickiness and lower churn rates.
                </p>
                <p>
                  <span className="text-g-blue font-bold">Experiment 2:</span> Compare the &quot;active → churned&quot;
                  cell between the two matrices at different latency levels. Calculate the relative risk:
                  P(churn|high_latency) / P(churn|all). Is it &gt;2x? That&apos;s a strong causal signal.
                </p>
                <p>
                  <span className="text-g-blue font-bold">SQL challenge:</span> Modify the transition SQL to use
                  monthly states instead of weekly. Do the transition probabilities change? Monthly cadence
                  should show lower churn (more time to come back) but also lower upward mobility.
                </p>
              </div>
            </TerminalCard>

            <CrossModuleCard links={[
              { module: "Survival Analysis", path: "/modules/survival-analysis", insight: "Markov churn probabilities manifest as steeper survival curve drops in the high-latency stratum." },
              { module: "Feature Adoption", path: "/modules/feature-adoption", insight: "Markov states (Casual/Active/Power) align with feature depth segments — depth drives state transitions." },
              { module: "Metric Trees", path: "/modules/metric-trees", insight: "Latency-driven churn elevates the churn rate node in the metric tree, compressing paid user count." },
            ]} />

          </div>
        }
        defaultRatio={0.42}
      />
    </div>
  );
}
