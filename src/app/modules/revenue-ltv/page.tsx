"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CrossModuleCard } from "@/components/terminal/cross-module-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { MrrChart, CohortRevenueChart, type MrrRow, type CohortRevenueRow } from "@/components/viz/revenue-chart";
import { Badge } from "@/components/ui/badge";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { MRR_TREND_SQL, PLAN_LTV_SQL, COHORT_REVENUE_SQL } from "@/lib/sql/revenue.sql";

type TabId = "mrr" | "ltv" | "cohort";

const TABS: { id: TabId; label: string }[] = [
  { id: "mrr",    label: "MRR Trend" },
  { id: "ltv",    label: "ARPU & LTV by Plan" },
  { id: "cohort", label: "Cohort Revenue" },
];

interface PlanRow {
  plan: string;
  arpu: number;
  total_users: number;
  active_users: number;
  retention_pct: number;
  avg_months_retained: number;
  avg_ltv: number;
  total_revenue: number;
}

export default function RevenueLtvPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();

  const [activeTab, setActiveTab] = useState<TabId>("mrr");
  const [sql, setSql]             = useState(MRR_TREND_SQL.trim());

  const [mrrData,    setMrrData]    = useState<unknown[] | null>(null);
  const [planData,   setPlanData]   = useState<unknown[] | null>(null);
  const [cohortData, setCohortData] = useState<unknown[] | null>(null);
  const [isRunning,  setIsRunning]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const runAll = useCallback(async (mrrSql: string) => {
    if (!ready || isGenerating) return;
    setIsRunning(true); setError(null);
    try {
      const [mrr, plan, cohort] = await Promise.all([
        runSQL(mrrSql),
        runSQL(PLAN_LTV_SQL.trim()),
        runSQL(COHORT_REVENUE_SQL.trim()),
      ]);
      setMrrData(mrr);
      setPlanData(plan);
      setCohortData(cohort);
    } catch (e) { setError(String(e)); }
    finally { setIsRunning(false); }
  }, [ready, isGenerating, runSQL]);

  useEffect(() => {
    if (ready && !isGenerating) runAll(sql);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, ready, isGenerating]);

  const currentSql =
    activeTab === "mrr"    ? sql :
    activeTab === "ltv"    ? PLAN_LTV_SQL.trim() :
    COHORT_REVENUE_SQL.trim();

  return (
    <div className="h-full overflow-hidden">
      <SplitPane
        left={
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-g-border bg-g-elevated shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="green">LTV</Badge>
                <Badge variant="muted">Level 1</Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Revenue & LTV</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                MRR · ARPU · Cohort Lifetime Value
              </p>
            </div>

            <div className="flex border-b border-g-border shrink-0">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-2 text-xs transition-colors ${activeTab === t.id ? "text-g-green border-b-2 border-g-green" : "text-g-muted hover:text-g-text"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={currentSql}
                onChange={activeTab === "mrr" ? setSql : undefined}
                readOnly={activeTab !== "mrr"}
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

            {/* ── MRR TAB ── */}
            {activeTab === "mrr" && (
              <>
                <TerminalCard title="Monthly Recurring Revenue — Pro + Team Stacked" accent="green" animate>
                  <MrrChart
                    data={mrrData as MrrRow[]}
                    isLoading={isRunning && !mrrData}
                    error={error}
                    width={600}
                    height={280}
                  />
                </TerminalCard>

                <TerminalCard title="Case Study: MRR as the Business Heartbeat" accent="green">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      <span className="text-g-green font-bold">Monthly Recurring Revenue (MRR)</span> is the north-star
                      metric for subscription businesses. It translates behavioral engagement into business impact —
                      connecting everything you&apos;ve analyzed in retention, funnels, and survival directly to dollars.
                    </p>
                    <p>
                      This simulator uses synthetic pricing: <span className="text-g-purple font-bold">Pro = $20/mo</span>,{" "}
                      <span className="text-g-tan font-bold">Team = $50/mo</span>, Free = $0. The stacked area shows
                      how each tier contributes to total MRR. The dashed total line shows the combined trajectory.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-green">Key insight:</span> MRR growth is a product of two forces:
                      (1) new paid subscriber acquisition and (2) paid subscriber retention. The simulation controller
                      lets you stress-test each: high latency erodes retention → MRR plateaus; high friction reduces
                      new signups → MRR grows slower.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-green font-bold">Experiment 1:</span> Set{" "}
                      <span className="text-g-tan">System Latency</span> to 3.0x. Watch MRR growth flatten in the
                      later months — latency churn eats into paid subscriber counts. Compare the MRR trajectory
                      to the Survival Analysis curves: the curves tell you <em>when</em> users churn; MRR shows
                      you <em>how much money</em> that costs.
                    </p>
                    <p>
                      <span className="text-g-green font-bold">Experiment 2:</span> Drop{" "}
                      <span className="text-g-purple">Model Quality</span> to 0.2. Free users who never discover
                      artifact creation have lower upgrade intent → paid subscriber growth slows → MRR stagnates
                      even if retention is stable. This is the quality → conversion → MRR chain.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── LTV TAB ── */}
            {activeTab === "ltv" && (
              <>
                <TerminalCard title="ARPU, Retention & Estimated LTV by Plan Tier" accent="green" animate>
                  {isRunning && !planData ? (
                    <div className="flex items-center justify-center py-6 text-g-dim text-xs">Computing…</div>
                  ) : planData ? (
                    <div className="overflow-auto">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="border-b border-g-border">
                            {["Plan","ARPU/mo","Users","Active","Active %","Avg Tenure","Avg LTV","Total Rev"].map((h) => (
                              <th key={h} className="text-right first:text-left py-2 pr-3 text-g-muted font-normal">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(planData as PlanRow[]).map((row) => (
                            <tr key={row.plan} className="border-b border-g-border/40 hover:bg-g-elevated/40 transition-colors">
                              <td className="py-2 pr-3">
                                <span className={`font-bold ${row.plan === "team" ? "text-g-tan" : row.plan === "pro" ? "text-g-purple" : "text-g-muted"}`}>
                                  {row.plan}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-right text-g-text">${Number(row.arpu).toFixed(0)}</td>
                              <td className="py-2 pr-3 text-right text-g-muted">{Number(row.total_users).toLocaleString()}</td>
                              <td className="py-2 pr-3 text-right text-g-muted">{Number(row.active_users).toLocaleString()}</td>
                              <td className="py-2 pr-3 text-right">
                                <span className={Number(row.retention_pct) > 50 ? "text-g-green" : Number(row.retention_pct) > 30 ? "text-g-tan" : "text-g-red"}>
                                  {Number(row.retention_pct).toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-right text-g-muted">{Number(row.avg_months_retained).toFixed(1)} mo</td>
                              <td className="py-2 pr-3 text-right text-g-tan font-bold">${Number(row.avg_ltv).toLocaleString()}</td>
                              <td className="py-2 text-right text-g-green">${Math.round(Number(row.total_revenue)).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-g-dim text-xs py-4 text-center">Run query</div>
                  )}
                </TerminalCard>

                <TerminalCard title="Case Study: LTV and the Unit Economics of Growth" accent="green">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      <span className="text-g-green font-bold">Lifetime Value (LTV)</span> = ARPU × Average Months
                      Retained. It answers: &quot;How much revenue does a typical user generate before churning?&quot;
                      This number, relative to Customer Acquisition Cost (CAC), determines whether growth is
                      economically viable.
                    </p>
                    <p>
                      The <span className="text-g-text font-bold">LTV:CAC ratio</span> is the fundamental unit
                      economics test. LTV:CAC &gt; 3:1 is generally considered healthy for SaaS (you get $3 back
                      for every $1 spent acquiring a customer). Below 1:1, you&apos;re destroying value.
                    </p>
                    <p>
                      Notice how <span className="text-g-tan font-bold">Team tier LTV</span> dominates despite fewer
                      users. This is why enterprise SaaS companies often have 10% of users generating 50%+ of revenue —
                      higher ARPU × better retention = dramatically higher LTV.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="The Behavioral → Revenue Connection" accent="none">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      Every behavioral signal you&apos;ve discovered in previous modules has a direct LTV impact:
                    </p>
                    <p>
                      <span className="text-g-purple font-bold">Artifact adoption</span> (IAT module) →
                      shorter return interval → more months retained → higher LTV. If artifact adoption
                      increases from 30% to 50%, and those users retain 2× longer, LTV roughly doubles
                      for that segment.
                    </p>
                    <p>
                      <span className="text-g-red font-bold">Latency churn</span> (Transition Matrices) →
                      shorter avg tenure → lower LTV. A 1-month reduction in avg tenure for Pro users = $20
                      less LTV per churned user. At 500 churned Pro users, that&apos;s $10,000 in lost LTV
                      per latency incident.
                    </p>
                    <p>
                      <span className="text-g-tan font-bold">Onboarding friction</span> (Funnel module) →
                      fewer users reach artifact creation → lower upgrade rate → lower paid subscriber count →
                      lower total revenue even if per-user LTV is unchanged.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── COHORT REVENUE TAB ── */}
            {activeTab === "cohort" && (
              <>
                <TerminalCard title="Average LTV per User by Signup Cohort" accent="green" animate>
                  <CohortRevenueChart
                    data={cohortData as CohortRevenueRow[]}
                    isLoading={isRunning && !cohortData}
                    error={error}
                    width={600}
                    height={260}
                  />
                </TerminalCard>

                <TerminalCard title="Case Study: Cohort Revenue Analysis" accent="green">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      <span className="text-g-green font-bold">Cohort revenue analysis</span> answers a critical
                      question: are newer cohorts generating more or less revenue than older ones? If avg LTV per
                      user is increasing across cohorts, the product is improving its ability to monetize. If it&apos;s
                      declining, something is eroding monetization — lower upgrade rates, shorter tenures, or
                      changing user mix.
                    </p>
                    <p>
                      Earlier cohorts (left bars) naturally have higher LTV because they&apos;ve had more time to
                      accumulate subscription months. The bars for recent cohorts should be interpreted as
                      <em> lower bounds</em> — their tenure isn&apos;t complete yet. A fair comparison adjusts for
                      cohort age (e.g., LTV at month 3 for all cohorts).
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-green">Interpretation rule:</span> If recent cohorts have
                      <em> lower LTV even at the same age</em> as older cohorts, investigate: did model quality
                      drop? Did the user mix shift toward lower-intent segments? Did pricing change?
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-green font-bold">Experiment:</span> Move all three simulation
                      sliders to stress states (high latency, low quality, high friction). Watch how cohort LTV
                      bars flatten or shrink for later cohorts — the product&apos;s degradation manifests as lower
                      revenue per user in every subsequent cohort.
                    </p>
                    <p>
                      <span className="text-g-green font-bold">SQL challenge:</span> Modify the query to add a
                      <code className="text-g-green"> paid_pct</code> column showing what % of each cohort
                      is on a paid plan. Multiply avg_ltv by paid_pct to get &quot;blended LTV per user&quot;
                      (including free users at $0). This is the number that actually matters for unit economics.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            <CrossModuleCard links={[
              { module: "Metric Trees", path: "/modules/metric-trees", insight: "MRR is the root of the metric tree — see how every driver feeds into it." },
              { module: "Retention Heatmaps", path: "/modules/retention-heatmaps", insight: "Cohort revenue depends on retention — longer tenure = higher LTV." },
              { module: "Conversion Funnels", path: "/modules/conversion-funnels", insight: "Paid user count driving MRR depends on funnel conversion rates." },
            ]} />

          </div>
        }
      />
    </div>
  );
}
