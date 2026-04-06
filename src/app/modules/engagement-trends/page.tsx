"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { EngagementChart, type EngagementRow } from "@/components/viz/engagement-chart";
import { Badge } from "@/components/ui/badge";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { WEEKLY_ENGAGEMENT_SQL, DAU_SQL } from "@/lib/sql/engagement.sql";

type ViewMode = "wau" | "growth" | "mix";

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: "wau",    label: "WAU Trend" },
  { id: "growth", label: "Growth Accounting" },
  { id: "mix",    label: "Stacked Composition" },
];

export default function EngagementTrendsPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();

  const [sql, setSql]       = useState(WEEKLY_ENGAGEMENT_SQL.trim());
  const [view, setView]     = useState<ViewMode>("wau");
  const [data, setData]     = useState<unknown[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError]   = useState<string | null>(null);

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
                <Badge variant="tan">WAU</Badge>
                <Badge variant="muted">Level 1</Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Engagement Trends</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                WAU · Growth Accounting · New vs. Returning
              </p>
            </div>

            {/* View switcher */}
            <div className="flex border-b border-g-border shrink-0">
              {VIEWS.map((v) => (
                <button key={v.id} onClick={() => setView(v.id)}
                  className={`px-3 py-2 text-xs transition-colors ${view === v.id ? "text-g-tan border-b-2 border-g-tan" : "text-g-muted hover:text-g-text"}`}>
                  {v.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              <CodeEditor value={sql} onChange={setSql} onRun={runQuery}
                language="sql" isRunning={isRunning} error={error} />
            </div>
          </div>
        }
        right={
          <div className="h-full flex flex-col p-3 gap-3 overflow-auto">

            <TerminalCard
              title={
                view === "wau"    ? "Weekly Active Users — WAU & Returning Users" :
                view === "growth" ? "Growth Accounting — New Users vs. Churned" :
                "User Composition — New vs. Returning (Stacked)"
              }
              accent="tan"
              animate
            >
              <EngagementChart
                data={data as EngagementRow[]}
                mode={view}
                isLoading={isRunning && !data}
                error={error}
                width={620}
                height={320}
              />
            </TerminalCard>

            {view === "wau" && (
              <>
                <TerminalCard title="Case Study: WAU as the Heartbeat Metric" accent="tan">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      <span className="text-g-tan font-bold">Weekly Active Users (WAU)</span> is the foundational
                      engagement metric. Unlike DAU (too noisy) or MAU (too lagged), WAU captures the weekly rhythm
                      of most productivity tools — users return on a work-week cycle.
                    </p>
                    <p>
                      The <span className="text-g-text font-bold">dashed returning-user line</span> shows WAU minus
                      new signups — users who came back from a previous week. The gap between WAU and returning users
                      is new-user contribution. A healthy product has both lines growing; a struggling product has
                      WAU held up only by new signups while returning users flatline.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-tan">Real-world parallel:</span> Slack&apos;s WAU grew from 1.5M to 10M
                      in two years before their IPO — driven by returning users (team members), not constant new
                      acquisition. High returning-user ratio is the hallmark of product-market fit.
                    </p>
                  </div>
                </TerminalCard>
                <TerminalCard title="What to Look For" accent="none">
                  <div className="text-[11px] text-g-muted space-y-1.5 leading-relaxed">
                    <p><span className="text-g-tan">1.</span> Is WAU growing week-over-week? Flat WAU despite new signups means churn is absorbing all growth.</p>
                    <p><span className="text-g-tan">2.</span> Is the returning-user line steeper than new users? That&apos;s compounding retention — the best growth engine.</p>
                    <p><span className="text-g-tan">3.</span> Do you see a seasonality dip mid-simulation? Latency spikes or quality drops show up as WAU troughs 2–3 weeks after the parameter change.</p>
                  </div>
                </TerminalCard>
              </>
            )}

            {view === "growth" && (
              <>
                <TerminalCard title="Case Study: Growth Accounting Framework" accent="tan">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      <span className="text-g-tan font-bold">Growth Accounting</span> decomposes WAU change into its
                      components: <span className="text-g-green font-bold">New users</span> (acquired this week) minus
                      <span className="text-g-red font-bold"> Churned users</span> (lost this week). Net growth = New − Churned.
                    </p>
                    <p>
                      This view makes invisible dynamics visible. A product with flat WAU might be
                      <em> churning 200 users/week while acquiring 200</em> — a leaky bucket with 100% gross churn
                      offset by acquisition spending. Fixing retention is 5–10× cheaper than replacing churned users.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-tan">Brian Balfour&apos;s rule:</span> Sustainable growth requires the
                      green bars (new) to consistently exceed the red bars (churned). When churn bars start growing
                      faster than new-user bars, you&apos;re approaching a growth ceiling regardless of acquisition spend.
                    </p>
                  </div>
                </TerminalCard>
                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p><span className="text-g-tan font-bold">Experiment:</span> Crank <span className="text-g-tan">System Latency</span> to 3.0x. Watch the red churn bars grow while green new-user bars stay flat. The gap shows exactly how latency erodes net growth — not just retention.</p>
                    <p><span className="text-g-tan font-bold">Experiment 2:</span> Set <span className="text-g-red">Onboarding Friction</span> to 0.8. New user bars shrink (fewer complete onboarding) while churn stays the same. This is the acquisition-constrained growth pattern.</p>
                  </div>
                </TerminalCard>
              </>
            )}

            {view === "mix" && (
              <>
                <TerminalCard title="Case Study: User Composition Reveals Growth Quality" accent="tan">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      The <span className="text-g-tan font-bold">stacked composition view</span> shows the relative
                      contribution of new vs. returning users to total WAU each week. A growing purple layer (returning)
                      relative to green (new) means your retention engine is getting stronger — you need less acquisition
                      to maintain the same WAU.
                    </p>
                    <p>
                      <span className="text-g-text font-bold">Early stage</span> products are dominated by green
                      (new users) because the retained base is small. <span className="text-g-text font-bold">Mature
                      products</span> flip: the purple returning layer is thick, new users are a small top sliver.
                      Most sustainable businesses are in this second state — low CAC dependency.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-tan">Benchmark:</span> A product with strong PMF should see returning
                      users account for ≥60% of WAU by month 6. If you&apos;re still at &lt;40% after 6 months,
                      retention — not acquisition — is the constraint.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            <TerminalCard title="SQL Challenge" accent="none">
              <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-g-tan font-bold">Challenge 1:</span> Modify the SQL to add a
                  <code className="text-g-tan"> DAU/WAU ratio</code> column — the ratio of average daily
                  active users to weekly active users. A DAU/WAU of 0.2 means users visit ~once a week on average;
                  0.5 means they visit ~3.5 days per week. What&apos;s the ratio here, and how does it change with quality?
                </p>
                <p>
                  <span className="text-g-tan font-bold">Challenge 2:</span> Add a rolling 4-week average
                  (moving average) to smooth out week-to-week noise. Use DuckDB window functions:
                  <code className="text-g-tan"> AVG(wau) OVER (ORDER BY week_start ROWS BETWEEN 3 PRECEDING AND CURRENT ROW)</code>.
                </p>
              </div>
            </TerminalCard>

          </div>
        }
      />
    </div>
  );
}
