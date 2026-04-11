"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CrossModuleCard } from "@/components/terminal/cross-module-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { Badge } from "@/components/ui/badge";
import { MetricTreeViz, SensitivityChart, DriverScatter,
         type MetricTreeRow, type MonthlySensitivityRow, type DriverRow } from "@/components/viz/metric-tree-chart";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { METRIC_TREE_SQL, METRIC_SENSITIVITY_SQL, DRIVER_CORRELATION_SQL } from "@/lib/sql/metric-tree.sql";

type TabId = "tree" | "sensitivity" | "drivers";

const TABS: { id: TabId; label: string }[] = [
  { id: "tree",        label: "Metric Tree" },
  { id: "sensitivity", label: "Sensitivity" },
  { id: "drivers",     label: "Driver Scatter" },
];

export default function MetricTreesPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();

  const [activeTab, setActiveTab] = useState<TabId>("tree");
  const [sql, setSql]             = useState(METRIC_TREE_SQL.trim());

  const [treeData,    setTreeData]    = useState<MetricTreeRow | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlySensitivityRow[] | null>(null);
  const [driverData,  setDriverData]  = useState<DriverRow[] | null>(null);
  const [isRunning,   setIsRunning]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const runAll = useCallback(async (treeSql: string) => {
    if (!ready || isGenerating) return;
    setIsRunning(true); setError(null);
    try {
      const [tree, monthly, drivers] = await Promise.all([
        runSQL(treeSql),
        runSQL(METRIC_SENSITIVITY_SQL.trim()),
        runSQL(DRIVER_CORRELATION_SQL.trim()),
      ]);
      setTreeData(tree[0] as unknown as MetricTreeRow);
      setMonthlyData(monthly as unknown as MonthlySensitivityRow[]);
      setDriverData(drivers as unknown as DriverRow[]);
    } catch (e) { setError(String(e)); }
    finally { setIsRunning(false); }
  }, [ready, isGenerating, runSQL]);

  useEffect(() => {
    if (ready && !isGenerating) runAll(sql);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, ready, isGenerating]);

  const currentSql =
    activeTab === "tree"        ? sql :
    activeTab === "sensitivity" ? METRIC_SENSITIVITY_SQL.trim() :
    DRIVER_CORRELATION_SQL.trim();

  return (
    <div className="h-full overflow-hidden">
      <SplitPane
        left={
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-g-border bg-g-elevated shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="tan">NSM</Badge>
                <Badge variant="muted">Level 1</Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Metric Trees</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                North Star Decomposition &middot; Driver Analysis &middot; Sensitivity
              </p>
            </div>

            <div className="flex border-b border-g-border shrink-0">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-2 text-xs transition-colors ${activeTab === t.id ? "text-g-tan border-b-2 border-g-tan" : "text-g-muted hover:text-g-text"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={currentSql}
                onChange={activeTab === "tree" ? setSql : undefined}
                readOnly={activeTab !== "tree"}
                onRun={runAll}
                language="sql"
                isRunning={isRunning}
                error={error}
              />
            </div>
          </div>
        }
        right={
          <div className="h-full flex flex-col p-3 gap-3 overflow-auto">

            {/* ── TREE TAB ── */}
            {activeTab === "tree" && (
              <>
                <TerminalCard title="North Star Metric Tree — MRR Decomposition" accent="tan" animate>
                  <MetricTreeViz
                    data={treeData}
                    isLoading={isRunning && !treeData}
                    error={error}
                  />
                </TerminalCard>

                <TerminalCard title="Mental Model: The Multiplication Problem" accent="tan">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      <span className="text-g-tan font-bold">MRR = Paid Users x ARPU.</span> When metrics multiply,
                      small improvements compound: a 10% lift in <em>both</em> drivers yields 21% total growth
                      (1.1 x 1.1 = 1.21). This is why metric trees reveal compounding leverage that flat dashboards hide.
                    </p>
                    <p>
                      <span className="text-g-text font-bold">Paid Users</span> itself decomposes into a funnel:
                      Signups x Onboarding Rate x Activation Rate x Conversion Rate. Each stage is a multiplier — a
                      50% onboarding rate means you&apos;re throwing away half your signups before they ever see the product.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-tan">Key insight:</span> The tree makes invisible dependencies visible.
                      Artifact adoption (bottom row) feeds retention, which feeds paid user count, which feeds MRR.
                      One broken link in this chain and the top-line metric stalls — even if everything else is healthy.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Case Study: Spotify's North Star" accent="none">
                  <div className="text-[11px] text-g-dim space-y-2 leading-relaxed">
                    <p>
                      Spotify decomposes <span className="text-g-tan font-bold">&quot;Time Spent Listening&quot;</span> into
                      four driver branches: <em>Discovery</em> (how users find new music), <em>Playlist Creation</em>
                      (engagement depth), <em>Social Sharing</em> (viral loops), and <em>Algorithmic Recommendations</em>
                      (personalization quality). Each branch has a team that owns it.
                    </p>
                    <p>
                      When &quot;Time Spent Listening&quot; dropped in Q3 2022, the tree immediately pointed to the Discovery
                      branch — podcast recommendations were crowding out music discovery. Without the tree, they would have
                      investigated all four branches equally, wasting weeks.
                    </p>
                    <p>
                      <span className="text-g-text font-bold">The principle:</span> A metric tree isn&apos;t just a
                      decomposition — it&apos;s an <em>accountability map</em>. Every node has an owner. When the
                      top-line number moves, the tree tells you who to call.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-tan font-bold">Experiment 1:</span> Move{" "}
                      <span className="text-g-purple">Model Quality</span> to 0.2 and watch which nodes turn
                      <span className="text-g-red"> red</span> first. The propagation order reveals the causal chain:
                      Quality → Artifact Adoption → Retention → Paid Users → MRR.
                    </p>
                    <p>
                      <span className="text-g-tan font-bold">Experiment 2:</span> Set{" "}
                      <span className="text-g-red">Onboarding Friction</span> to 0.9. Notice the Onboarding Rate node
                      collapses — but ARPU stays stable. This tells you friction is a <em>volume</em> problem, not a
                      <em> monetization</em> problem. Different root cause → different fix.
                    </p>
                    <p>
                      <span className="text-g-tan font-bold">Decision Framework:</span> Use the tree when MRR is flat
                      but you don&apos;t know why. Start at the root. Walk down until you find the red node. That
                      branch is your investigation target. Don&apos;t fix what isn&apos;t broken.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── SENSITIVITY TAB ── */}
            {activeTab === "sensitivity" && (
              <>
                <TerminalCard title="Metric Sensitivity — First-to-Last Month Change" accent="tan" animate>
                  <SensitivityChart
                    treeData={treeData}
                    monthlyData={monthlyData}
                    isLoading={isRunning && !monthlyData}
                    error={error}
                  />
                </TerminalCard>

                <TerminalCard title="Reading the Sensitivity Chart" accent="tan">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      This chart shows how each metric <em>changed</em> from the first to last month of the simulation.
                      <span className="text-g-green"> Green bars</span> = growth,{" "}
                      <span className="text-g-red">red bars</span> = decline. The longer the bar, the more volatile
                      the metric.
                    </p>
                    <p>
                      <span className="text-g-tan font-bold">Sensitivity analysis</span> answers: &quot;Which input
                      lever has the biggest impact on my North Star?&quot; If MRR grew 40% but Artifact Rate only grew
                      5%, artifacts aren&apos;t the bottleneck <em>right now</em>. Focus on the metric with the largest
                      negative bar — that&apos;s your constraint.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-tan">Eliyahu Goldratt&apos;s Theory of Constraints:</span> &quot;Any
                      improvement not at the constraint is an illusion.&quot; The sensitivity chart tells you where
                      the constraint is.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-tan font-bold">Experiment:</span> Compare Baseline vs Latency Crisis
                      presets. In Baseline, MRR grows steadily. In Latency Crisis, watch which bars flip from green to
                      red — that tells you exactly which metrics latency destroys first.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── DRIVERS TAB ── */}
            {activeTab === "drivers" && (
              <>
                <TerminalCard title="Behavioral Drivers vs. Revenue (LTV)" accent="tan" animate>
                  <DriverScatter
                    data={driverData}
                    isLoading={isRunning && !driverData}
                    error={error}
                  />
                </TerminalCard>

                <TerminalCard title="Reading the Driver Scatter" accent="tan">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      Each dot is a user. <span className="text-g-text font-bold">X-axis</span> = sessions (engagement frequency),{" "}
                      <span className="text-g-text font-bold">Y-axis</span> = lifetime value (revenue generated),{" "}
                      <span className="text-g-text font-bold">bubble size</span> = artifact count (feature depth).
                    </p>
                    <p>
                      Look for the <span className="text-g-tan font-bold">hockey stick</span>: users with many
                      sessions AND high artifact count cluster in the top-right with the highest LTV. Users with
                      many sessions but few artifacts (large x, small bubbles) have moderate LTV — they&apos;re engaged
                      but haven&apos;t found the core value.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-tan">Product action:</span> The gap between &quot;high session, low artifact&quot;
                      and &quot;high session, high artifact&quot; users represents your <em>activation opportunity</em>.
                      These users are already engaged — they just need a nudge toward artifact creation.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-tan font-bold">SQL Challenge:</span> Modify the query to add a{" "}
                      <code className="text-g-tan">avg_latency_ms</code> column. Does high latency exposure
                      correlate with lower LTV even among high-session users? This would confirm the causal chain:
                      latency → reduced engagement quality → lower monetization.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            <CrossModuleCard links={[
              { module: "Revenue & LTV", path: "/modules/revenue-ltv", insight: "MRR is the root node here — see how ARPU and cohort LTV feed into it." },
              { module: "Conversion Funnels", path: "/modules/conversion-funnels", insight: "Activation and conversion funnel rates are driver nodes in this tree." },
              { module: "A/B Testing", path: "/modules/ab-testing", insight: "Use A/B tests to validate fixes for the red nodes you identify in the tree." },
              { module: "IAT Distribution", path: "/modules/iat-distribution", insight: "Artifact adoption rate here is the same 40% habit-loop signal discovered in IAT." },
            ]} />

          </div>
        }
      />
    </div>
  );
}
