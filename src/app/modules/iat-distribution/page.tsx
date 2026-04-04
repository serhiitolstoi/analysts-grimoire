"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { IATDistributionChart } from "@/components/viz/distribution-chart";
import { Badge } from "@/components/ui/badge";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { IAT_DISTRIBUTION_SQL, IAT_SUMMARY_SQL } from "@/lib/sql/iat.sql";

export default function IATDistributionPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();
  const [sql, setSql] = useState(IAT_DISTRIBUTION_SQL.trim());
  const [data, setData] = useState<unknown[] | null>(null);
  const [summary, setSummary] = useState<unknown[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runQuery = useCallback(async (q: string) => {
    if (!ready || isGenerating) return;
    setIsRunning(true); setError(null);
    try {
      const [rows, sumRows] = await Promise.all([runSQL(q), runSQL(IAT_SUMMARY_SQL.trim())]);
      setData(rows); setSummary(sumRows);
    } catch (e) { setError(String(e)); }
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
                <Badge variant="purple">EXP</Badge>
                <Badge variant="muted">Level 2</Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">IAT Distribution</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                f(t) = λe<sup>−λt</sup> · The habit loop model
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
            <TerminalCard title="Inter-Arrival Time Distribution" accent="purple" animate>
              <IATDistributionChart
                data={data as Parameters<typeof IATDistributionChart>[0]["data"]}
                summary={summary as Parameters<typeof IATDistributionChart>[0]["summary"]}
                isLoading={isRunning && !data}
                error={error}
                width={580}
                height={360}
              />
            </TerminalCard>
            <TerminalCard title="Hidden Signal" accent="purple">
              <div className="text-[11px] text-g-muted space-y-2">
                <p>
                  <span className="text-g-purple font-bold">Artifact users</span> (purple) have a{" "}
                  <span className="text-g-text font-bold">40% shorter IAT</span> than regular users (tan).
                  This manifests as a higher λ parameter — they return to the product more frequently.
                </p>
                <p>
                  The exponential model f(t) = λe<sup>−λt</sup> fits session arrivals well when
                  sessions are independent. Deviation from the fit (bimodal distribution) signals
                  structured usage patterns like weekly work cycles.
                </p>
                <p className="text-g-dim">
                  Adjust <span className="text-g-purple">Model Quality</span> slider —
                  higher quality increases artifact creation → strengthens the IAT shift.
                </p>
              </div>
            </TerminalCard>
          </div>
        }
      />
    </div>
  );
}
