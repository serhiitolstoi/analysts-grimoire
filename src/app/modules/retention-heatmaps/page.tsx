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

            <TerminalCard title="Case Study: Cohort Analysis for an AI Product" accent="tan">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  This is the single most important chart in product analytics. Each row represents a
                  <span className="text-g-purple font-bold"> signup cohort</span> (users who joined in the same month).
                  Each column shows the <span className="text-g-purple font-bold">% of that cohort</span> that was
                  still active N weeks after signing up. Darker purple = higher retention.
                </p>
                <p>
                  For an AI product like Claude, retention is existential. Unlike social networks (which have
                  network effects) or SaaS (which has switching costs), AI assistants must deliver value on
                  <em> every single session</em>. If the model quality dips or latency spikes, users leave immediately
                  because the switching cost to a competitor is zero.
                </p>
                <p className="text-g-dim">
                  <span className="text-g-tan">Industry benchmark:</span> Top consumer AI products retain 15-25%
                  at day 30. Enterprise AI tools retain 40-60%. If week-4 retention is below 10%, you don&apos;t have
                  product-market fit yet.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Reading the Heatmap" accent="none">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  <span className="text-g-purple font-bold">The &quot;smile curve&quot;:</span> Healthy products show a steep
                  initial drop (week 0 → week 2) that gradually flattens. The inflection point where the curve
                  levels off is where your &quot;core users&quot; emerge — the people who found genuine value.
                </p>
                <p>
                  <span className="text-g-purple font-bold">Diagonal patterns:</span> If later cohorts (bottom rows)
                  have brighter cells than earlier cohorts at the same week, your product is improving over time.
                  This is the most bullish signal a PM can see — each cohort retains better than the last.
                </p>
                <p>
                  <span className="text-g-purple font-bold">Vertical dark bands:</span> If a specific week column
                  is dark across all cohorts (e.g., week 3 always drops), you have a structural engagement problem
                  at that lifecycle stage. Something happens at that moment that pushes users away.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="What to Look For" accent="none">
              <div className="text-[11px] text-g-muted space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-g-tan">1.</span> At what week does retention stabilize?
                  That&apos;s your &quot;core user crystallization point.&quot; For most products, it&apos;s week 3-6.
                </p>
                <p>
                  <span className="text-g-tan">2.</span> What&apos;s the retention rate at the stabilization point?
                  If it&apos;s 5%, you need 20x more signups to maintain your active user base. If it&apos;s 25%,
                  you only need 4x.
                </p>
                <p>
                  <span className="text-g-tan">3.</span> Are newer cohorts performing better? Compare the
                  bottom rows to the top rows at the same week — this tells you whether product changes
                  are actually improving retention.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Try This" accent="none">
              <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-g-tan font-bold">Experiment 1:</span> Set{" "}
                  <span className="text-g-purple">Model Quality</span> to maximum (1.0). Watch the smile curve
                  flatten earlier — more users find the habit loop and stick around. Then drop it to 0.2 and
                  see the heatmap go dark.
                </p>
                <p>
                  <span className="text-g-tan font-bold">Experiment 2:</span> Crank up{" "}
                  <span className="text-g-tan">System Latency</span> to 3.0x. The first few weeks look similar
                  (users give it a chance), but weeks 4-8 crater as frustration accumulates. This is the
                  delayed-impact pattern — latency churn doesn&apos;t show up immediately.
                </p>
                <p>
                  <span className="text-g-tan font-bold">SQL challenge:</span> Modify the query to add a
                  CASE WHEN that splits users into &quot;artifact creators&quot; vs &quot;non-creators&quot; by checking
                  if any of their events have event_type = &apos;artifact_created&apos;. Which group retains better?
                </p>
              </div>
            </TerminalCard>
          </div>
        }
      />
    </div>
  );
}
