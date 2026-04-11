"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CrossModuleCard } from "@/components/terminal/cross-module-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { Badge } from "@/components/ui/badge";
import { SCurveChart, DepthRetentionChart, PowerUserTable, TimeToAdoptChart,
         type AdoptionCurveRow, type DepthRow, type PowerUserRow, type TimeToAdoptRow } from "@/components/viz/adoption-chart";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { ADOPTION_CURVE_SQL, ADOPTION_DEPTH_SQL, POWER_USER_SQL, TIME_TO_ADOPT_SQL } from "@/lib/sql/feature-adoption.sql";

type TabId = "scurve" | "depth" | "power" | "time";

const TABS: { id: TabId; label: string }[] = [
  { id: "scurve", label: "Adoption Curves" },
  { id: "depth",  label: "Depth & Retention" },
  { id: "power",  label: "Power Users" },
  { id: "time",   label: "Time to Adopt" },
];

export default function FeatureAdoptionPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();

  const [activeTab, setActiveTab] = useState<TabId>("scurve");
  const [sql, setSql]             = useState(ADOPTION_CURVE_SQL.trim());

  const [curveData, setCurveData]   = useState<AdoptionCurveRow[] | null>(null);
  const [depthData, setDepthData]   = useState<DepthRow[] | null>(null);
  const [powerData, setPowerData]   = useState<PowerUserRow[] | null>(null);
  const [timeData,  setTimeData]    = useState<TimeToAdoptRow[] | null>(null);
  const [isRunning, setIsRunning]   = useState(false);
  const [error,     setError]       = useState<string | null>(null);

  const runAll = useCallback(async (curveSql: string) => {
    if (!ready || isGenerating) return;
    setIsRunning(true); setError(null);
    try {
      const [curve, depth, power, time] = await Promise.all([
        runSQL(curveSql),
        runSQL(ADOPTION_DEPTH_SQL.trim()),
        runSQL(POWER_USER_SQL.trim()),
        runSQL(TIME_TO_ADOPT_SQL.trim()),
      ]);
      setCurveData(curve as unknown as AdoptionCurveRow[]);
      setDepthData(depth as unknown as DepthRow[]);
      setPowerData(power as unknown as PowerUserRow[]);
      setTimeData(time as unknown as TimeToAdoptRow[]);
    } catch (e) { setError(String(e)); }
    finally { setIsRunning(false); }
  }, [ready, isGenerating, runSQL]);

  useEffect(() => {
    if (ready && !isGenerating) runAll(sql);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, ready, isGenerating]);

  const currentSql =
    activeTab === "scurve" ? sql :
    activeTab === "depth"  ? ADOPTION_DEPTH_SQL.trim() :
    activeTab === "power"  ? POWER_USER_SQL.trim() :
    TIME_TO_ADOPT_SQL.trim();

  return (
    <div className="h-full overflow-hidden">
      <SplitPane
        left={
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-g-border bg-g-elevated shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="purple">S-CURVE</Badge>
                <Badge variant="muted">Level 2</Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Feature Adoption</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                Adoption Curves &middot; Depth Analysis &middot; Power Users &middot; Time-to-Adopt
              </p>
            </div>

            <div className="flex border-b border-g-border shrink-0">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-2 text-xs transition-colors ${activeTab === t.id ? "text-g-purple border-b-2 border-g-purple" : "text-g-muted hover:text-g-text"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={currentSql}
                onChange={activeTab === "scurve" ? setSql : undefined}
                readOnly={activeTab !== "scurve"}
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

            {/* ── S-CURVE TAB ── */}
            {activeTab === "scurve" && (
              <>
                <TerminalCard title="Cumulative Feature Adoption Over Time" accent="purple" animate>
                  <SCurveChart
                    data={curveData}
                    isLoading={isRunning && !curveData}
                    error={error}
                  />
                </TerminalCard>

                <TerminalCard title="Mental Model: The S-Curve" accent="purple">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      Every feature follows an <span className="text-g-purple font-bold">S-curve</span>: slow initial
                      adoption (early adopters), rapid growth (majority), then plateau (market saturation). The shape
                      tells you everything about feature health.
                    </p>
                    <p>
                      A <span className="text-g-green">steep inflection</span> means the feature is spreading
                      virally or the onboarding is excellent. A <span className="text-g-red">flat curve</span> that
                      never inflects means the feature is either undiscoverable, too complex, or not valuable enough.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-purple">The plateau percentage matters:</span> If artifacts plateau at
                      35% adoption, that&apos;s your ceiling without intervention. The gap from 35% to 100% represents
                      users who are active but never discover the core feature — your biggest growth lever.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Case Study: Slack's 2,000 Messages" accent="none">
                  <div className="text-[11px] text-g-dim space-y-2 leading-relaxed">
                    <p>
                      Slack discovered that teams exchanging <span className="text-g-purple font-bold">2,000+ messages</span>{" "}
                      had a 93% retention rate. This wasn&apos;t an arbitrary number — it was the inflection point on their
                      adoption S-curve. Below 2,000 messages, teams were evaluating. Above it, they were habituated.
                    </p>
                    <p>
                      The same principle applies here: watch which features cross their inflection point. Features that
                      plateau early (below 20%) are failing to deliver value. Features that keep climbing are your
                      product&apos;s core loop.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-purple font-bold">Experiment 1:</span> Set{" "}
                      <span className="text-g-purple">Model Quality</span> to 1.0, then to 0.3. Watch the artifact
                      S-curve: at high quality, it reaches inflection quickly. At low quality, the curve flattens —
                      users try artifacts once but never come back because the output quality doesn&apos;t justify the effort.
                    </p>
                    <p>
                      <span className="text-g-purple font-bold">Experiment 2:</span> Set{" "}
                      <span className="text-g-red">Onboarding Friction</span> to 0.9. All curves start later (delayed
                      adoption) but their <em>shape</em> doesn&apos;t change much — friction delays adoption, it
                      doesn&apos;t prevent it. Quality does.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── DEPTH TAB ── */}
            {activeTab === "depth" && (
              <>
                <TerminalCard title="Feature Depth vs. Retention & Paid Conversion" accent="purple" animate>
                  <DepthRetentionChart
                    data={depthData}
                    isLoading={isRunning && !depthData}
                    error={error}
                  />
                </TerminalCard>

                <TerminalCard title="Mental Model: The Activation Ladder" accent="purple">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      Users climb an <span className="text-g-purple font-bold">activation ladder</span>: Signup → First
                      Session → First Artifact → Multi-Feature → Power User. Each rung has a drop-off rate. The
                      product&apos;s job is to widen each rung.
                    </p>
                    <p>
                      This chart shows the punchline: <span className="text-g-green font-bold">users who adopt more
                      features retain dramatically better</span>. The gap between &quot;0 features&quot; and &quot;3+
                      features&quot; is typically 30-50 percentage points of retention. This isn&apos;t correlation —
                      it&apos;s the causal chain of product value discovery.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-purple">Watch the paid %:</span> Feature depth also predicts
                      monetization. Users who adopt 3+ features are far more likely to be on paid plans — they&apos;ve
                      discovered enough value to justify paying.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-purple font-bold">Key question:</span> What retention % does the
                      &quot;3+ features&quot; bucket have? Now check &quot;0 features&quot;. The <em>difference</em>
                      is your opportunity: if you could move users from 0 to 3+ features, that&apos;s the retention lift
                      you&apos;d unlock. Multiply by user count to get the business impact.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── POWER USERS TAB ── */}
            {activeTab === "power" && (
              <>
                <TerminalCard title="User Segments by Feature Engagement" accent="purple" animate>
                  <PowerUserTable
                    data={powerData}
                    isLoading={isRunning && !powerData}
                    error={error}
                  />
                </TerminalCard>

                <TerminalCard title="Defining Power Users" accent="purple">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      <span className="text-g-tan font-bold">Power Users</span> = 3+ feature types AND 10+ sessions.
                      They represent your product&apos;s core advocates — highest retention, highest LTV, most likely
                      to refer others. Every product decision should be evaluated by: &quot;Does this grow the power
                      user segment?&quot;
                    </p>
                    <p>
                      <span className="text-g-purple font-bold">Single Feature users</span> are the opposite — they
                      found one use case but never expanded. They&apos;re fragile: any disruption to their one use case
                      causes immediate churn. Your job is to show them the second and third features.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-purple">The LTV gap</span> between Power and Single Feature users is
                      your revenue opportunity per user converted. Multiply by the number of Single Feature users to
                      size the business case for improved feature discovery.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-purple font-bold">Cross-module link:</span> The Power User segment here
                      maps directly to the clusters in <span className="text-g-blue">Activity Clusters</span> (Level 3).
                      Compare: are the K-Means clusters aligned with these feature-depth segments? If they are, your
                      behavioral clustering is capturing real product value, not noise.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── TIME TO ADOPT TAB ── */}
            {activeTab === "time" && (
              <>
                <TerminalCard title="Time from Signup to First Feature Use" accent="purple" animate>
                  <TimeToAdoptChart
                    data={timeData}
                    isLoading={isRunning && !timeData}
                    error={error}
                  />
                </TerminalCard>

                <TerminalCard title="Reading Time-to-Adopt" accent="purple">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      Box plots show the distribution of days from signup to first use of each feature.
                      The <span className="text-g-text font-bold">median line</span> is the typical user journey;
                      the <span className="text-g-muted font-bold">p90 whisker</span> shows the long tail.
                    </p>
                    <p>
                      <span className="text-g-purple font-bold">Fast adoption</span> (low median, tight box) means
                      the feature is discoverable and the onboarding guides users to it. <span className="text-g-red font-bold">
                      Slow adoption</span> (high median, wide box) means users are finding the feature organically
                      weeks after signup — or through word-of-mouth instead of product guidance.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-purple">Product action:</span> If artifact creation has a p50 of 10 days
                      but code_run has a p50 of 2 days, users discover code running quickly but take a week+ to try
                      artifacts. Add artifact prompts earlier in the user journey.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-purple font-bold">Experiment:</span> Set{" "}
                      <span className="text-g-red">Onboarding Friction</span> to 1.0. Watch the p90 values explode — users
                      who struggle with onboarding take dramatically longer to discover advanced features. This is why
                      onboarding isn&apos;t just about retention; it&apos;s about <em>time to value</em>.
                    </p>
                    <p>
                      <span className="text-g-purple font-bold">Decision framework:</span> If S-curves plateau below
                      30%, focus on <em>discoverability</em> (users don&apos;t know the feature exists). If time-to-adopt
                      is high but eventual adoption is fine, focus on <em>onboarding guidance</em> (users find it
                      eventually, just too slowly).
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            <CrossModuleCard links={[
              { module: "Activity Clusters", path: "/modules/activity-clusters", insight: "K-Means segments align with feature depth — compare cluster centroids to power user profiles." },
              { module: "Metric Trees", path: "/modules/metric-trees", insight: "Artifact adoption rate is a key driver node — feature depth moves the whole MRR tree." },
              { module: "IAT Distribution", path: "/modules/iat-distribution", insight: "Artifact adoption is what creates the habit loop — the S-curve inflection = IAT drop." },
              { module: "Retention Heatmaps", path: "/modules/retention-heatmaps", insight: "Depth-retention relationship here explains why some cohort rows in the heatmap are brighter." },
            ]} />

          </div>
        }
      />
    </div>
  );
}
