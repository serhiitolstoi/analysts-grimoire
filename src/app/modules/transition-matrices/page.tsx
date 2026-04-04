"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
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

            {/* Methodology note */}
            <TerminalCard title="Methodology" accent="none">
              <div className="text-[11px] text-g-muted space-y-2">
                <p>
                  <span className="text-g-tan font-bold">States</span> are assigned weekly based on event activity:
                  casual (&lt;3), active (3–9), power (10+). Missing next week = churned.
                </p>
                <p>
                  <span className="text-g-tan font-bold">Hidden Signal:</span> Compare &quot;All Users&quot; vs
                  &quot;High Latency Segment&quot; tabs. Users with ≥3 high-latency events show
                  a statistically significant spike in <em>active → churned</em> probability.
                </p>
                <p className="text-g-dim">
                  Adjust <span className="text-g-tan">System Latency</span> slider below to amplify the signal.
                </p>
              </div>
            </TerminalCard>
          </div>
        }
        defaultRatio={0.42}
      />
    </div>
  );
}
