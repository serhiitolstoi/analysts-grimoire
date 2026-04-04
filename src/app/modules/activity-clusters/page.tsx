"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { ClusterScatter, type ClusterResult } from "@/components/viz/cluster-scatter";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useDuckDB } from "@/providers/duckdb-provider";
import { usePyodide } from "@/providers/pyodide-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { CLUSTERING_PYTHON } from "@/lib/python/clustering.py";

const CLUSTER_PREP_SQL = `
SELECT
  u.user_id,
  COUNT(DISTINCT e.event_id)                                              AS total_events,
  COUNT(DISTINCT s.session_id)                                            AS total_sessions,
  COUNT(DISTINCT CASE WHEN e.event_type = 'artifact_created' THEN e.event_id END) AS artifact_events,
  COUNT(DISTINCT CASE WHEN e.event_type = 'code_run'         THEN e.event_id END) AS code_events,
  AVG(e.latency_ms)                                                       AS avg_latency_ms,
  COUNT(DISTINCT e.timestamp::DATE)                                       AS active_days,
  COUNT(DISTINCT e.event_id)::DOUBLE /
    NULLIF(COUNT(DISTINCT e.timestamp::DATE), 0)                          AS events_per_day,
  COALESCE(COUNT(DISTINCT CASE WHEN e.event_type = 'artifact_created' THEN e.event_id END)::DOUBLE /
    NULLIF(COUNT(DISTINCT e.event_id), 0), 0)                             AS artifact_ratio,
  COALESCE(COUNT(DISTINCT CASE WHEN e.event_type = 'code_run' THEN e.event_id END)::DOUBLE /
    NULLIF(COUNT(DISTINCT e.event_id), 0), 0)                             AS code_ratio
FROM users u
JOIN events e ON e.user_id = u.user_id
JOIN (SELECT DISTINCT session_id FROM events) s ON s.session_id = e.session_id
WHERE u.onboarding_completed = true
GROUP BY u.user_id
HAVING total_events >= 5
`;

// We'll compute avg_session_min separately and merge

const SESSION_DUR_SQL = `
SELECT
  user_id,
  AVG(EPOCH(MAX(timestamp::TIMESTAMP) - MIN(timestamp::TIMESTAMP)) / 60.0) AS avg_session_min
FROM events
GROUP BY user_id, session_id
HAVING COUNT(*) > 1
`;

export default function ActivityClustersPage() {
  const { runSQL, ready: dbReady } = useDuckDB();
  const { init, ready: pyReady, loading: pyLoading, runPython } = usePyodide();
  const { dataVersion, isGenerating } = useSimulation();

  const [pyCode, setPyCode] = useState(CLUSTERING_PYTHON.trim());
  const [result, setResult] = useState<ClusterResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [k, setK] = useState(4);
  const [activeTab, setActiveTab] = useState<"sql" | "python">("python");

  const runAnalysis = useCallback(async () => {
    if (!dbReady || isGenerating) return;
    setIsRunning(true); setError(null);
    try {
      if (!pyReady) await init();
      const [rows, durRows] = await Promise.all([
        runSQL(CLUSTER_PREP_SQL.trim()),
        runSQL(SESSION_DUR_SQL.trim()),
      ]);

      // Build duration lookup
      const durMap = new Map<string, number>(
        (durRows as { user_id: string; avg_session_min: number }[]).map((r) => [r.user_id, r.avg_session_min])
      );

      const users = (rows as Record<string, unknown>[]).map((r) => ({
        user_id: String(r.user_id),
        total_events: Number(r.total_events),
        avg_session_min: durMap.get(String(r.user_id)) ?? 5,
        artifact_ratio: Number(r.artifact_ratio),
        code_ratio: Number(r.code_ratio),
        avg_latency_ms: Number(r.avg_latency_ms),
        active_days: Number(r.active_days),
      }));

      const pyResult = await runPython(pyCode, { users, k });
      const parsed: ClusterResult = JSON.parse(pyResult as string);
      setResult(parsed);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRunning(false);
    }
  }, [dbReady, isGenerating, pyReady, init, runSQL, runPython, pyCode, k]);

  useEffect(() => {
    if (dbReady && !isGenerating) runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, dbReady, isGenerating]);

  return (
    <div className="h-full overflow-hidden">
      <SplitPane
        left={
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-g-border bg-g-elevated shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="green">K-M</Badge>
                <Badge variant="muted">Level 3</Badge>
                <Badge variant={pyReady ? "green" : "muted"}>
                  {pyLoading ? "Python…" : pyReady ? "scikit-learn" : "Python"}
                </Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Activity Clusters</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                K-Means user archetypes via scikit-learn
              </p>
            </div>

            {/* k selector */}
            <div className="px-4 py-2 border-b border-g-border shrink-0 flex items-center gap-3 text-[11px]">
              <span className="text-g-muted">Clusters k =</span>
              {[3,4,5,6].map((n) => (
                <button key={n} onClick={() => setK(n)}
                  className={`w-6 h-6 rounded text-[10px] font-bold transition-colors ${k === n ? "bg-g-green text-g-bg" : "text-g-dim hover:text-g-text"}`}>
                  {n}
                </button>
              ))}
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-g-border shrink-0">
              {(["sql","python"] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 text-xs transition-colors ${activeTab === t ? "text-g-green border-b-2 border-g-green" : "text-g-muted hover:text-g-text"}`}>
                  {t === "sql" ? "SQL Features" : "Python K-Means"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === "sql"
                ? <CodeEditor value={CLUSTER_PREP_SQL.trim()} language="sql" readOnly />
                : <CodeEditor value={pyCode} onChange={setPyCode}
                    onRun={runAnalysis} language="python"
                    isRunning={isRunning} error={error} />
              }
            </div>
          </div>
        }
        right={
          <div className="h-full flex flex-col p-3 gap-3 overflow-auto">
            {!pyReady && !pyLoading && (
              <div className="flex items-center gap-3 p-3 rounded border border-g-border bg-g-elevated text-[11px]">
                <span className="text-g-muted">Python (scikit-learn) required.</span>
                <button onClick={init} className="px-2 py-1 rounded bg-g-green text-g-bg text-[10px] font-bold">
                  Initialize Pyodide
                </button>
              </div>
            )}
            {pyLoading && (
              <div className="p-3 rounded border border-g-border bg-g-elevated">
                <LoadingSpinner message="Loading scikit-learn…" size="sm" />
              </div>
            )}

            <TerminalCard title={`User Archetypes — K=${k} Clusters (PCA Projection)`} accent="green" animate>
              <ClusterScatter
                result={result}
                isLoading={isRunning && !result}
                error={error}
                width={560}
                height={400}
              />
            </TerminalCard>

            {result && (
              <TerminalCard title="Cluster Profiles" accent="none">
                <div className="space-y-2">
                  {result.cluster_stats.map((cs) => (
                    <div key={cs.cluster} className="text-[11px] border-b border-g-border pb-2 last:border-0">
                      <div className="font-bold text-g-text">{cs.name} <span className="text-g-dim font-normal">({cs.size} users · {(cs.pct * 100).toFixed(0)}%)</span></div>
                      <div className="text-g-dim mt-0.5 grid grid-cols-3 gap-1">
                        {Object.entries(cs.centroid_raw).slice(0, 6).map(([k, v]) => (
                          <span key={k}>{k.replace(/_/g, ' ')}: <span className="text-g-muted">{Number(v).toFixed(1)}</span></span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TerminalCard>
            )}
          </div>
        }
      />
    </div>
  );
}
