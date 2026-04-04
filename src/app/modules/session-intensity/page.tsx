"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { SessionChart } from "@/components/viz/session-chart";
import { Badge } from "@/components/ui/badge";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { SESSION_INTENSITY_SQL } from "@/lib/sql/session.sql";

export default function SessionIntensityPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();
  const [sql, setSql] = useState(SESSION_INTENSITY_SQL.trim());
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
                <Badge variant="purple">2D</Badge>
                <Badge variant="muted">Level 2</Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Session Intensity</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                Deep Work vs Quick Checks — token density × duration
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
            <TerminalCard title="Session Intensity Scatter" accent="purple" animate>
              <SessionChart
                data={data as Parameters<typeof SessionChart>[0]["data"]}
                isLoading={isRunning && !data}
                error={error}
                width={560}
                height={400}
              />
            </TerminalCard>
            <TerminalCard title="Classification" accent="none">
              <div className="text-[11px] text-g-muted space-y-1.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-g-tan font-bold">Deep Work:</span>
                    <span className="text-g-dim"> ≥15 min · ≥8 events · high tokens</span>
                  </div>
                  <div>
                    <span className="text-g-purple font-bold">Focused:</span>
                    <span className="text-g-dim"> 5–15 min · 4–7 events</span>
                  </div>
                  <div>
                    <span className="text-g-blue font-bold">Quick Check:</span>
                    <span className="text-g-dim"> 2–5 min · 2–3 events</span>
                  </div>
                  <div>
                    <span className="text-g-muted font-bold">Glance:</span>
                    <span className="text-g-dim"> &lt;2 min · 1 event</span>
                  </div>
                </div>
                <p className="pt-1">
                  Bubble size = total tokens. The bimodal pattern reveals two distinct user archetypes.
                </p>
              </div>
            </TerminalCard>
          </div>
        }
      />
    </div>
  );
}
