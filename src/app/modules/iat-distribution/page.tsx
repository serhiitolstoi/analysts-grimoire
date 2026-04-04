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

            <TerminalCard title="Case Study: Measuring Habit Formation" accent="purple">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  <span className="text-g-purple font-bold">Inter-Arrival Time (IAT)</span> is the time gap between
                  consecutive sessions for the same user. If a user visits on Monday, then again on Wednesday,
                  their IAT is 2 days. This metric directly measures <em>habit strength</em>.
                </p>
                <p>
                  When session arrivals are independent (no habit, no schedule), IAT follows an
                  <span className="text-g-text font-bold"> exponential distribution</span>: f(t) = λe<sup>−λt</sup>.
                  The parameter <span className="text-g-purple font-bold">λ (lambda)</span> is the &quot;return rate&quot; — higher λ means
                  users come back faster. A user with λ=0.5 returns every ~2 days on average; λ=1.0 returns daily.
                </p>
                <p className="text-g-dim">
                  <span className="text-g-purple">Real-world parallel:</span> Duolingo tracks &quot;streaks&quot; as their
                  habit metric, but IAT is more fundamental — it captures the underlying return rate regardless
                  of whether the user maintains a visible streak. Nir Eyal&apos;s &quot;Hook Model&quot; predicts that products
                  which deliver variable rewards will show shorter IAT over time.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="The Hidden Signal: Artifact Habit Loop" accent="purple">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  <span className="text-g-purple font-bold">Artifact users</span> (purple histogram) have a{" "}
                  <span className="text-g-text font-bold">40% shorter IAT</span> than regular users (tan histogram).
                  This manifests as a visibly higher λ — the purple curve is steeper, meaning more probability mass
                  is concentrated at short return intervals.
                </p>
                <p>
                  <span className="text-g-text font-bold">Why does this happen?</span> Creating an artifact (a document,
                  a piece of code, a summary) is the product&apos;s &quot;aha moment.&quot; It transforms the user from a
                  <em> consumer</em> of AI responses into a <em>creator</em> who uses AI as a tool. This cognitive shift
                  makes the product feel essential rather than optional, mechanically compressing return intervals.
                </p>
                <p>
                  <span className="text-g-text font-bold">Business implication:</span> If λ shifts from 0.3 to 0.5,
                  the user goes from returning every ~3.3 days to every ~2 days. Over a year, that&apos;s approximately
                  <span className="text-g-purple font-bold"> 70 additional sessions per user</span>. At scale, accelerating
                  artifact adoption by even 10% can drive massive engagement gains.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Reading the Distribution" accent="none">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  <span className="text-g-purple font-bold">The dashed vertical lines</span> show mean IAT for each group.
                  The gap between them is the habit effect — quantified, not just intuited.
                </p>
                <p>
                  <span className="text-g-purple font-bold">The fitted curves</span> (solid lines) show the theoretical
                  exponential distribution for each group&apos;s λ. Where the histogram deviates from the curve is
                  interesting: a bump at 7 days suggests weekly usage patterns; a bump at 1 day suggests daily
                  habit formation.
                </p>
                <p>
                  <span className="text-g-purple font-bold">Heavy right tail</span> (IAT &gt; 10 days) represents users
                  at churn risk — they haven&apos;t come back in over a week. The proportion of mass in the right tail
                  is a leading indicator of upcoming churn.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Try This" accent="none">
              <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-g-purple font-bold">Experiment 1:</span> Toggle{" "}
                  <span className="text-g-purple">Model Quality</span> from 1.0 to 0.2. Lower quality means fewer
                  artifacts are created, which means fewer users enter the habit loop, which means the two
                  distributions converge. This is Signal 4 (Quality Elasticity) in action.
                </p>
                <p>
                  <span className="text-g-purple font-bold">Experiment 2:</span> Compare the λ values in the legend
                  above the chart. Calculate the % difference: (λ_artifact - λ_regular) / λ_regular × 100.
                  Is it close to 40%? That&apos;s the embedded signal strength.
                </p>
                <p>
                  <span className="text-g-purple font-bold">SQL challenge:</span> Modify the query to filter for
                  only users who signed up in the first 3 months. Does the habit effect strengthen over time
                  as the product matures, or is it constant?
                </p>
              </div>
            </TerminalCard>
          </div>
        }
      />
    </div>
  );
}
