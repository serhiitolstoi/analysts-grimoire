"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { FunnelChart } from "@/components/viz/funnel-chart";
import { Badge } from "@/components/ui/badge";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { CONVERSION_FUNNEL_SQL } from "@/lib/sql/conversion-funnel.sql";

export default function ConversionFunnelsPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();
  const [sql, setSql] = useState(CONVERSION_FUNNEL_SQL.trim());
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
                <Badge variant="tan">LAT</Badge>
                <Badge variant="muted">Level 1</Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Conversion Latency Funnels</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                Time between funnel steps — not just drop-off rates
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
            <TerminalCard title="Conversion Latency Distribution" accent="tan" animate>
              <FunnelChart
                data={data as Parameters<typeof FunnelChart>[0]["data"]}
                isLoading={isRunning && !data}
                error={error}
                width={580}
                height={280}
              />
            </TerminalCard>
            <TerminalCard title="Methodology" accent="none">
              <div className="text-[11px] text-g-muted space-y-2">
                <p>
                  <span className="text-g-tan font-bold">Box plot interpretation:</span>{" "}
                  Center line = median (p50). Box = IQR (p25–p75). Right whisker = p90.
                </p>
                <p>
                  The <span className="text-g-tan">signup → first message</span> step shows
                  time-to-activation — a key leading indicator of 30-day retention.
                </p>
                <p className="text-g-dim">
                  Adjust <span className="text-g-tan">Onboarding Friction</span> slider to see
                  how barrier changes the latency distribution.
                </p>
              </div>
            </TerminalCard>
          </div>
        }
      />
    </div>
  );
}
