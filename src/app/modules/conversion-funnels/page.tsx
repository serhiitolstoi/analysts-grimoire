"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CrossModuleCard } from "@/components/terminal/cross-module-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { FunnelChart } from "@/components/viz/funnel-chart";
import { DropoffFunnelChart, type DropoffRow } from "@/components/viz/dropoff-funnel";
import { Badge } from "@/components/ui/badge";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import {
  CONVERSION_FUNNEL_SQL,
  CONVERSION_DROPOFF_SQL,
  CONVERSION_BY_PLAN_SQL,
} from "@/lib/sql/conversion-funnel.sql";

type TabId = "latency" | "dropoff" | "by_plan";

const TABS: { id: TabId; label: string; desc: string }[] = [
  { id: "latency",  label: "Latency Analysis", desc: "Time between funnel steps" },
  { id: "dropoff",  label: "Conversion Drop-off", desc: "% reaching each milestone" },
  { id: "by_plan",  label: "By Plan", desc: "Drop-off broken out by subscription tier" },
];

export default function ConversionFunnelsPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();

  const [activeTab, setActiveTab] = useState<TabId>("latency");
  const [sql, setSql] = useState(CONVERSION_FUNNEL_SQL.trim());

  const [latencyData, setLatencyData]   = useState<unknown[] | null>(null);
  const [dropoffData, setDropoffData]   = useState<unknown[] | null>(null);
  const [planData,    setPlanData]      = useState<unknown[] | null>(null);
  const [isRunning, setIsRunning]       = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const runAll = useCallback(async (latencySql: string) => {
    if (!ready || isGenerating) return;
    setIsRunning(true); setError(null);
    try {
      const [lat, drop, plan] = await Promise.all([
        runSQL(latencySql),
        runSQL(CONVERSION_DROPOFF_SQL.trim()),
        runSQL(CONVERSION_BY_PLAN_SQL.trim()),
      ]);
      setLatencyData(lat);
      setDropoffData(drop);
      setPlanData(plan);
    } catch (e) { setError(String(e)); }
    finally { setIsRunning(false); }
  }, [ready, isGenerating, runSQL]);

  useEffect(() => {
    if (ready && !isGenerating) runAll(sql);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, ready, isGenerating]);

  const currentSql =
    activeTab === "latency" ? sql :
    activeTab === "dropoff" ? CONVERSION_DROPOFF_SQL.trim() :
    CONVERSION_BY_PLAN_SQL.trim();

  const onChangeSql = activeTab === "latency" ? setSql : undefined;

  return (
    <div className="h-full overflow-hidden">
      <SplitPane
        left={
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-g-border bg-g-elevated shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="tan">LAT</Badge>
                <Badge variant="muted">Level 1</Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Conversion Funnels</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                Latency distributions, drop-off rates, and plan-level segmentation
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-g-border shrink-0 overflow-x-auto">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${activeTab === t.id ? "text-g-tan border-b-2 border-g-tan" : "text-g-muted hover:text-g-text"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={currentSql}
                onChange={onChangeSql}
                readOnly={activeTab !== "latency"}
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

            {/* ── TAB: LATENCY ── */}
            {activeTab === "latency" && (
              <>
                <TerminalCard title="Conversion Latency Distribution" accent="tan" animate>
                  <FunnelChart
                    data={latencyData as Parameters<typeof FunnelChart>[0]["data"]}
                    isLoading={isRunning && !latencyData}
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
                      <span className="text-g-tan font-bold">Center line</span> = median (p50).
                      <span className="text-g-tan font-bold"> Box edges</span> = p25–p75 (interquartile range).
                      <span className="text-g-tan font-bold"> Right whisker</span> = p90 — the &quot;long tail&quot; users who stall.
                    </p>
                    <p>
                      The <span className="text-g-text font-bold">p90 whisker</span> is the most actionable metric.
                      If p50 is 2h but p90 is 48h, you have a bimodal population: most users activate quickly,
                      but a significant minority hits a wall. That&apos;s where onboarding investment should go.
                    </p>
                    <p>
                      The <span className="text-g-text font-bold">gap between steps</span> reveals where friction lives:
                      fast signup → first message but slow first message → first artifact means users get in
                      but struggle to discover the creation flow.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-tan font-bold">Experiment:</span> Set{" "}
                      <span className="text-g-red">Onboarding Friction</span> to 1.0 — watch the p90 whisker
                      explode on the first step. Then switch to the <em>Drop-off</em> tab to see how that
                      same friction collapses the absolute user count at each milestone.
                    </p>
                    <p>
                      <span className="text-g-tan font-bold">SQL challenge:</span> Add a WHERE clause filtering
                      by plan type to see if Pro users activate faster than Free users.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── TAB: DROP-OFF ── */}
            {activeTab === "dropoff" && (
              <>
                <TerminalCard title="Activation Funnel — Conversion Drop-off" accent="tan" animate>
                  <DropoffFunnelChart
                    data={dropoffData as DropoffRow[]}
                    isLoading={isRunning && !dropoffData}
                    error={error}
                    width={580}
                    height={320}
                  />
                </TerminalCard>

                <TerminalCard title="Case Study: The Classic Funnel" accent="tan">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      The <span className="text-g-tan font-bold">conversion funnel</span> is the most widely used
                      framework in product analytics. Each step is a milestone — a user action that signals
                      deeper engagement. The bars show how many users reach each milestone as a % of the top
                      of funnel (completed onboarding).
                    </p>
                    <p>
                      The <span className="text-g-red font-bold">red drop % on the left</span> shows the
                      step-over-step loss. A 40% drop from &quot;First Message&quot; to &quot;First Artifact&quot; means
                      4 in 10 users who sent a message never discovered or completed artifact creation.
                      That&apos;s the leakage point — fix it and you don&apos;t need more signups.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-tan">Framework:</span> Prioritize the step with the largest
                      absolute drop-off (not the largest % drop). Fixing a step where 500 users are lost
                      is more impactful than fixing one where 20 are lost, even if the % is higher.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Reading This Chart" accent="none">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      <span className="text-g-tan font-bold">Bar width</span> = absolute user count.
                      <span className="text-g-tan font-bold"> % label</span> (right) = users remaining as % of top.
                      <span className="text-g-red font-bold"> ▼ arrow</span> (left) = step-over-step drop rate.
                    </p>
                    <p>
                      <span className="text-g-text font-bold">Healthy AI product benchmarks:</span>{" "}
                      First message ≥ 85% · First artifact ≥ 35% · Code run ≥ 20% · Day-2 return ≥ 30%.
                      If your &quot;Returned (Day 2+)&quot; number is lower than First Artifact, users are
                      creating artifacts but not coming back — the habit loop isn&apos;t forming.
                    </p>
                    <p>
                      <span className="text-g-text font-bold">Onboarding friction</span> hits the very first
                      step (Completed Onboarding is the baseline). Crank the slider and watch all bars
                      shrink uniformly — friction before the product affects every downstream metric.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="What to Look For" accent="none">
                  <div className="text-[11px] text-g-muted space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-tan">1.</span>{" "}
                      <span className="text-g-text font-bold">The biggest absolute drop:</span> Which step loses
                      the most users in absolute numbers? That&apos;s your highest-leverage optimization target.
                    </p>
                    <p>
                      <span className="text-g-tan">2.</span>{" "}
                      <span className="text-g-text font-bold">The &quot;Return&quot; vs &quot;Artifact&quot; gap:</span> If more users
                      create artifacts than return on day 2+, something about the product experience
                      doesn&apos;t pull them back. The artifact isn&apos;t creating enough value to warrant return.
                    </p>
                    <p>
                      <span className="text-g-tan">3.</span>{" "}
                      <span className="text-g-text font-bold">Switch to the &quot;By Plan&quot; tab</span> — do Pro
                      users have dramatically higher artifact conversion? If so, the upgrade prompt may
                      be arriving before users understand the product&apos;s value.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-tan font-bold">Experiment 1:</span> Set{" "}
                      <span className="text-g-purple">Model Quality</span> to 0.2. The Artifact and Code bars
                      shrink — low-quality responses don&apos;t inspire creation. This is the quality elasticity signal.
                    </p>
                    <p>
                      <span className="text-g-tan font-bold">Experiment 2:</span> Set{" "}
                      <span className="text-g-red">Onboarding Friction</span> to max (1.0). The &quot;Completed
                      Onboarding&quot; baseline shrinks, which shrinks every step proportionally. This shows
                      why pre-activation friction is so damaging — it multiplies its effect downstream.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── TAB: BY PLAN ── */}
            {activeTab === "by_plan" && (
              <>
                <TerminalCard title="Funnel Conversion by Plan Tier" accent="tan" animate>
                  {isRunning && !planData ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-g-dim text-xs">Computing…</span>
                    </div>
                  ) : planData && planData.length > 0 ? (
                    <div className="overflow-auto">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="border-b border-g-border">
                            <th className="text-left py-2 pr-4 text-g-muted font-normal">Plan</th>
                            <th className="text-right py-2 pr-4 text-g-muted font-normal">Onboarded</th>
                            <th className="text-right py-2 pr-4 text-g-muted font-normal">Messaged</th>
                            <th className="text-right py-2 pr-4 text-g-muted font-normal">Msg %</th>
                            <th className="text-right py-2 pr-4 text-g-muted font-normal">Artifact</th>
                            <th className="text-right py-2 text-g-muted font-normal">Art %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(planData as Record<string, unknown>[]).map((row, i) => (
                            <tr key={i} className="border-b border-g-border/40 hover:bg-g-elevated/40 transition-colors">
                              <td className="py-1.5 pr-4">
                                <span className="text-g-tan font-bold">{String(row.plan)}</span>
                              </td>
                              <td className="py-1.5 pr-4 text-right text-g-text">
                                {Number(row.onboarded).toLocaleString()}
                              </td>
                              <td className="py-1.5 pr-4 text-right text-g-muted">
                                {Number(row.messaged).toLocaleString()}
                              </td>
                              <td className="py-1.5 pr-4 text-right">
                                <span className={Number(row.msg_pct) >= 80 ? "text-g-green" : Number(row.msg_pct) >= 60 ? "text-g-tan" : "text-g-red"}>
                                  {Number(row.msg_pct).toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-1.5 pr-4 text-right text-g-muted">
                                {Number(row.artifact).toLocaleString()}
                              </td>
                              <td className="py-1.5 text-right">
                                <span className={Number(row.art_pct) >= 40 ? "text-g-green" : Number(row.art_pct) >= 20 ? "text-g-tan" : "text-g-red"}>
                                  {Number(row.art_pct).toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-g-dim text-xs py-4 text-center">Run query to see plan breakdown</div>
                  )}
                </TerminalCard>

                <TerminalCard title="Case Study: Plan-Tier Funnel Segmentation" accent="tan">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      Breaking the funnel by plan tier reveals <span className="text-g-tan font-bold">selection effects</span> vs.
                      <span className="text-g-text font-bold"> product effects</span>. Pro/Team users might convert better
                      because they&apos;re more motivated (self-selected), or because they have access to better features
                      (product-driven). Understanding which it is shapes your strategy.
                    </p>
                    <p>
                      If <span className="text-g-text font-bold">Free tier artifact conversion is &lt;15%</span> but
                      Pro is &gt;50%, you have a feature-gating problem: your best activation step (artifact creation)
                      is behind a paywall. Users can&apos;t experience the &quot;aha moment&quot; before deciding to pay.
                      Fix: give Free users a taste of artifacts (limited, watermarked) to drive upgrade intent.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-tan">Real-world parallel:</span> Figma lets Free users create but limits
                      projects. Notion lets Free users use all features but limits pages. Both strategies ensure
                      the core &quot;aha moment&quot; is accessible before the paywall — which accelerates activation
                      across all plan tiers.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Diagnostic Framework" accent="none">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      <span className="text-g-tan font-bold">Large gap between plans?</span>{" "}
                      Investigate whether the gap persists when you control for signup source (organic vs. paid).
                      High-intent paid signups will convert better regardless of plan.
                    </p>
                    <p>
                      <span className="text-g-tan font-bold">Free &gt; Pro conversion?</span>{" "}
                      This is rare but signals that your paid experience has unexpected friction (more complex UI,
                      confusing feature flags, information overload from new features).
                    </p>
                    <p>
                      <span className="text-g-tan font-bold">Team tier is flat across all steps?</span>{" "}
                      Team purchases are often admin-driven — the buyer isn&apos;t the user. End-users may not be
                      motivated to activate. This is the B2B activation problem.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            <CrossModuleCard links={[
              { module: "Metric Trees", path: "/modules/metric-trees", insight: "Conversion rate is a key node in the MRR decomposition tree." },
              { module: "Feature Adoption", path: "/modules/feature-adoption", insight: "Funnel drop-offs feed into feature adoption S-curves — who survives to try artifacts?" },
              { module: "Retention Heatmaps", path: "/modules/retention-heatmaps", insight: "Users who clear the funnel fast retain better — time-to-activation predicts retention." },
            ]} />

          </div>
        }
      />
    </div>
  );
}
