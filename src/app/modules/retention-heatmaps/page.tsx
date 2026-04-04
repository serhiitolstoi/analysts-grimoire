"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { RetentionHeatmap } from "@/components/viz/heatmap";
import { Badge } from "@/components/ui/badge";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { WEEKLY_RETENTION_SQL } from "@/lib/sql/retention.sql";

export default function RetentionHeatmapsPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();
  const [sql, setSql] = useState(WEEKLY_RETENTION_SQL.trim());
  const [data, setData] = useState<unknown[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runQuery = useCallback(async (q: string) => {
    if (!ready || isGenerating) return;
    setIsRunning(true); setError(null);
    try { setData(await runSQL(q)); }
    catch (e) { setError(String(e)); }
    finally { setIsRunning(false); }
  }, [ready, isGenerating, runSQL]);

  useEffect(() => {
    if (ready && !isGenerating) runQuery(sql);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, ready, isGenerating]);

  return (
    <div className="h-full overflow-hidden">
      <SplitPane
        left={
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-g-border bg-g-elevated shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="tan">N-DAY</Badge>
                <Badge variant="muted">Level 1</Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Retention Heatmaps</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                GitHub-style cohort retention matrix
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeEditor value={sql} onChange={setSql} onRun={runQuery}
                language="sql" isRunning={isRunning} error={error} />
            </div>
          </div>
        }
        right={
          <div className="h-full flex flex-col p-3 gap-3 overflow-auto">
            <TerminalCard title="Weekly Cohort Retention Matrix" accent="tan" animate>
              <RetentionHeatmap
                data={data as Parameters<typeof RetentionHeatmap>[0]["data"]}
                mode="weekly"
                isLoading={isRunning && !data}
                error={error}
                width={640}
                height={360}
              />
            </TerminalCard>
            <TerminalCard title="Reading the Heatmap" accent="none">
              <div className="text-[11px] text-g-muted space-y-2">
                <p>
                  Each <span className="text-g-purple font-bold">row</span> is a signup cohort month.
                  Each <span className="text-g-purple font-bold">column</span> is weeks since signup.
                  Cell color = % of cohort still active.
                </p>
                <p>
                  <span className="text-g-tan">Darker purple = higher retention.</span>{" "}
                  Look for the "smile curve" — early drop-off that flattens for retained users.
                </p>
                <p className="text-g-dim">
                  Adjust <span className="text-g-purple">Model Quality</span> slider —
                  higher quality strengthens the habit loop and improves week 4+ retention.
                </p>
              </div>
            </TerminalCard>
          </div>
        }
      />
    </div>
  );
}
