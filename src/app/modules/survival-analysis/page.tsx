"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { SurvivalCurve, type KMCurve } from "@/components/viz/survival-curve";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useDuckDB } from "@/providers/duckdb-provider";
import { usePyodide } from "@/providers/pyodide-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { SURVIVAL_PREP_SQL } from "@/lib/sql/survival.sql";
import { SURVIVAL_PYTHON } from "@/lib/python/survival.py";

type StratifyBy = "overall" | "is_artifact_user" | "had_high_latency" | "plan";

export default function SurvivalAnalysisPage() {
  const { runSQL, ready: dbReady } = useDuckDB();
  const { init, ready: pyReady, loading: pyLoading, runPython } = usePyodide();
  const { dataVersion, isGenerating } = useSimulation();

  const [sqlCode] = useState(SURVIVAL_PREP_SQL.trim());
  const [pyCode, setPyCode] = useState(SURVIVAL_PYTHON.trim());
  const [curves, setCurves] = useState<KMCurve[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stratifyBy, setStratifyBy] = useState<StratifyBy>("is_artifact_user");
  const [activeTab, setActiveTab] = useState<"sql" | "python">("sql");

  const runAnalysis = useCallback(async () => {
    if (!dbReady || isGenerating) return;
    setIsRunning(true); setError(null);
    try {
      if (!pyReady) await init();
      const rows = await runSQL(SURVIVAL_PREP_SQL.trim());

      const groupCol = stratifyBy === "overall"
        ? rows.map(() => "all users")
        : rows.map((r) => {
            const v = r[stratifyBy];
            if (stratifyBy === "is_artifact_user" || stratifyBy === "had_high_latency")
              return v ? (stratifyBy === "is_artifact_user" ? "artifact user" : "high latency") : "baseline";
            return String(v);
          });

      const input = {
        durations: rows.map((r) => Number(r.duration)),
        observed:  rows.map((r) => Number(r.churned)),
        groups:    groupCol,
      };

      const result = await runPython(pyCode, input);
      const parsed: KMCurve[] = JSON.parse(result as string);
      setCurves(parsed);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRunning(false);
    }
  }, [dbReady, isGenerating, pyReady, init, runSQL, runPython, pyCode, stratifyBy]);

  useEffect(() => {
    if (dbReady && !isGenerating) runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, dbReady, isGenerating, stratifyBy]);

  return (
    <div className="h-full overflow-hidden">
      <SplitPane
        left={
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-g-border bg-g-elevated shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="blue">KM</Badge>
                <Badge variant="muted">Level 3</Badge>
                <Badge variant={pyReady ? "green" : "muted"}>
                  {pyLoading ? "Python…" : pyReady ? "Python ready" : "Python"}
                </Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Survival Analysis</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                Kaplan-Meier time-to-churn estimator
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-g-border shrink-0">
              {(["sql","python"] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 text-xs transition-colors ${activeTab === t ? "text-g-tan border-b-2 border-g-tan" : "text-g-muted hover:text-g-text"}`}>
                  {t === "sql" ? "SQL Prep" : "Python KM"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === "sql"
                ? <CodeEditor value={sqlCode} language="sql" readOnly />
                : <CodeEditor value={pyCode} onChange={setPyCode}
                    onRun={runAnalysis} language="python"
                    isRunning={isRunning} error={error} />
              }
            </div>
          </div>
        }
        right={
          <div className="h-full flex flex-col p-3 gap-3 overflow-auto">
            {/* Stratify controls */}
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="text-g-muted">Stratify by:</span>
              {([
                { key: "overall", label: "Overall" },
                { key: "is_artifact_user", label: "Artifact Usage" },
                { key: "had_high_latency", label: "Latency Exposure" },
                { key: "plan", label: "Plan" },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setStratifyBy(key)}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${stratifyBy === key ? "border-g-tan text-g-tan" : "border-g-border text-g-dim hover:border-g-muted"}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Python init prompt */}
            {!pyReady && !pyLoading && (
              <div className="flex items-center gap-3 p-3 rounded border border-g-border bg-g-elevated text-[11px]">
                <span className="text-g-muted">Python runtime not loaded.</span>
                <button onClick={init} className="px-2 py-1 rounded bg-g-tan text-g-bg text-[10px] font-bold">
                  Initialize Pyodide
                </button>
              </div>
            )}
            {pyLoading && (
              <div className="p-3 rounded border border-g-border bg-g-elevated">
                <LoadingSpinner message="Downloading Python runtime (~10MB)…" size="sm" />
              </div>
            )}

            <TerminalCard title="Kaplan-Meier Survival Curves" accent="blue" animate>
              <SurvivalCurve
                curves={curves}
                isLoading={isRunning && !curves}
                error={error}
                width={580}
                height={380}
              />
            </TerminalCard>

            <TerminalCard title="Interpretation" accent="none">
              <div className="text-[11px] text-g-muted space-y-2">
                <p>
                  The y-axis shows the <span className="text-g-blue font-bold">probability of survival</span>{" "}
                  (not having churned) at each time point. The shaded bands are 95% confidence intervals
                  via Greenwood&apos;s formula.
                </p>
                <p>
                  Stratify by <span className="text-g-tan">Artifact Usage</span> to see artifact users
                  retain significantly longer — confirming the hidden habit-loop signal.
                </p>
                <p>
                  Stratify by <span className="text-g-red">Latency Exposure</span> to see the churn hazard spike
                  in users who encountered high latency events.
                </p>
              </div>
            </TerminalCard>
          </div>
        }
      />
    </div>
  );
}
