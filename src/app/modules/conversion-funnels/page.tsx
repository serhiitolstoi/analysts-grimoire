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

            <TerminalCard title="Case Study: Activation Latency" accent="tan">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  You&apos;re looking at a Claude-like AI product with a four-step activation funnel:
                  <span className="text-g-tan font-bold"> Signup → First Message → First Artifact → First Code Run</span>.
                  Each step represents deeper engagement — from passive interest to active creation.
                </p>
                <p>
                  Most analytics tools show <em>conversion rates</em> (what % of users pass each step).
                  But that hides a critical dimension: <span className="text-g-text font-bold">how long does each step take?</span>{" "}
                  A funnel with 80% conversion but 72-hour median time-to-activation is fundamentally different
                  from one that converts in 15 minutes.
                </p>
                <p className="text-g-dim">
                  <span className="text-g-tan">Real-world parallel:</span> Slack famously tracked &quot;time to 2,000 messages sent&quot;
                  as their activation metric. Teams that hit it within the first week had 93% retention
                  vs. 10% for those that didn&apos;t. The <em>speed</em> of activation predicts retention better than activation itself.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Reading the Box Plots" accent="none">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  <span className="text-g-tan font-bold">Center line</span> = median (p50) — half of users complete this step faster, half slower.
                  <span className="text-g-tan font-bold"> Box edges</span> = p25 and p75 (the interquartile range).
                  <span className="text-g-tan font-bold"> Right whisker</span> = p90 — the &quot;long tail&quot; users who get stuck.
                </p>
                <p>
                  The <span className="text-g-text font-bold">p90 whisker</span> is the most actionable metric.
                  If p50 is 2 hours but p90 is 48 hours, you have a bimodal population: most users activate
                  quickly, but a significant minority hits a wall. That&apos;s where your onboarding investment should go.
                </p>
                <p>
                  Watch the <span className="text-g-tan font-bold">gap between steps</span>: if
                  signup → first message is fast (low friction) but first message → first artifact is
                  slow (high friction), users understand the product but struggle with the creation flow.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="What to Look For" accent="none">
              <div className="text-[11px] text-g-muted space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-g-tan">1.</span> Which step has the widest IQR box?
                  That&apos;s your highest-variance step — some users breeze through, others struggle.
                </p>
                <p>
                  <span className="text-g-tan">2.</span> Is the p90 whisker disproportionately long
                  on any step? That signals a &quot;cliff&quot; — a subpopulation that may never convert.
                </p>
                <p>
                  <span className="text-g-tan">3.</span> Do later steps have <em>shorter</em> latency than earlier ones?
                  That means the hard part is getting started — once users are in, they accelerate.
                  This is the &quot;activation energy&quot; pattern.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Try This" accent="none">
              <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-g-tan font-bold">Experiment 1:</span> Set{" "}
                  <span className="text-g-red">Onboarding Friction</span> to maximum (1.0).
                  Watch the p90 whisker explode on the first step. This simulates what happens when
                  you add a mandatory phone verification or credit card requirement.
                </p>
                <p>
                  <span className="text-g-tan font-bold">Experiment 2:</span> Set friction to minimum (0.0)
                  and <span className="text-g-purple">Model Quality</span> to minimum (0.0).
                  Now the first step is easy but later steps slow down — users get in but don&apos;t find enough value
                  to progress through the funnel.
                </p>
                <p>
                  <span className="text-g-tan font-bold">SQL challenge:</span> Modify the query to add a
                  WHERE clause filtering by plan type. Do Pro users have faster activation than Free users?
                </p>
              </div>
            </TerminalCard>
          </div>
        }
      />
    </div>
  );
}
