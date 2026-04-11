"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CrossModuleCard } from "@/components/terminal/cross-module-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { RetentionHeatmap } from "@/components/viz/heatmap";
import { Badge } from "@/components/ui/badge";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import {
  WEEKLY_RETENTION_SQL,
  NDAY_RETENTION_SQL,
  SEGMENT_RETENTION_SQL,
} from "@/lib/sql/retention.sql";

type TabId = "weekly" | "nday" | "segment";

const TABS: { id: TabId; label: string }[] = [
  { id: "weekly",  label: "Weekly Cohort" },
  { id: "nday",    label: "N-Day Benchmarks" },
  { id: "segment", label: "Artifact vs. Non-Creator" },
];

export default function RetentionHeatmapsPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();

  const [activeTab, setActiveTab] = useState<TabId>("weekly");
  const [sql, setSql] = useState(WEEKLY_RETENTION_SQL.trim());

  const [weeklyData,  setWeeklyData]  = useState<unknown[] | null>(null);
  const [ndayData,    setNdayData]    = useState<unknown[] | null>(null);
  const [segmentData, setSegmentData] = useState<unknown[] | null>(null);
  const [isRunning, setIsRunning]     = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const runAll = useCallback(async (weeklySql: string) => {
    if (!ready || isGenerating) return;
    setIsRunning(true); setError(null);
    try {
      const [wk, nd, seg] = await Promise.all([
        runSQL(weeklySql),
        runSQL(NDAY_RETENTION_SQL.trim()),
        runSQL(SEGMENT_RETENTION_SQL.trim()),
      ]);
      setWeeklyData(wk);
      setNdayData(nd);
      setSegmentData(seg);
    } catch (e) { setError(String(e)); }
    finally { setIsRunning(false); }
  }, [ready, isGenerating, runSQL]);

  useEffect(() => {
    if (ready && !isGenerating) runAll(sql);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, ready, isGenerating]);

  const currentSql =
    activeTab === "weekly"  ? sql :
    activeTab === "nday"    ? NDAY_RETENTION_SQL.trim() :
    SEGMENT_RETENTION_SQL.trim();

  const onChangeSql = activeTab === "weekly" ? setSql : undefined;

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
                Cohort retention · N-day benchmarks · segment comparison
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-g-border shrink-0 overflow-x-auto">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${activeTab === t.id ? "text-g-purple border-b-2 border-g-purple" : "text-g-muted hover:text-g-text"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={currentSql}
                onChange={onChangeSql}
                readOnly={activeTab !== "weekly"}
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

            {/* ── TAB: WEEKLY COHORT ── */}
            {activeTab === "weekly" && (
              <>
                <TerminalCard title="Weekly Cohort Retention Matrix" accent="tan" animate>
                  <RetentionHeatmap
                    data={weeklyData as Parameters<typeof RetentionHeatmap>[0]["data"]}
                    mode="weekly"
                    isLoading={isRunning && !weeklyData}
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
                      Each column shows the <span className="text-g-purple font-bold">% of that cohort</span> still
                      active N weeks after signing up. Darker purple = higher retention.
                    </p>
                    <p>
                      For an AI product like Claude, retention is existential. Unlike social networks (network effects)
                      or SaaS (switching costs), AI assistants must deliver value on <em>every single session</em>.
                      If quality dips or latency spikes, users leave immediately — switching cost is zero.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-tan">Industry benchmark:</span> Consumer AI products retain 15–25%
                      at day 30. Enterprise AI tools retain 40–60%. Week-4 retention below 10% means no
                      product-market fit yet.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Reading the Heatmap" accent="none">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      <span className="text-g-purple font-bold">The &quot;smile curve&quot;:</span> Healthy products show a steep
                      initial drop (week 0 → week 2) that flattens. The inflection point is where your &quot;core users&quot;
                      crystallize — the people who found genuine value.
                    </p>
                    <p>
                      <span className="text-g-purple font-bold">Diagonal improvement:</span> If later cohorts (bottom rows)
                      are brighter than earlier ones at the same week, the product is getting better over time.
                      This is the most bullish signal a PM can see.
                    </p>
                    <p>
                      <span className="text-g-purple font-bold">Vertical dark bands:</span> A specific week column dark across
                      all cohorts signals a structural lifecycle problem — something systematically pushes users
                      away at that stage.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-purple font-bold">Experiment:</span> Toggle{" "}
                      <span className="text-g-purple">Model Quality</span> between 1.0 and 0.2 and watch the
                      heatmap shift. Then switch to the <em>Artifact vs. Non-Creator</em> tab to see why — artifact
                      creators are responsible for most of the retained purple cells.
                    </p>
                    <p>
                      <span className="text-g-purple font-bold">SQL challenge:</span> Modify the query to add a
                      CASE WHEN splitting users who created an artifact vs. those who didn&apos;t. Which group drives
                      the week 4+ retention?
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── TAB: N-DAY BENCHMARKS ── */}
            {activeTab === "nday" && (
              <>
                <TerminalCard title="N-Day Retention Benchmarks (D1 / D7 / D14 / D30 / D60 / D90)" accent="purple" animate>
                  <RetentionHeatmap
                    data={ndayData as Parameters<typeof RetentionHeatmap>[0]["data"]}
                    mode="daily"
                    isLoading={isRunning && !ndayData}
                    error={error}
                    width={640}
                    height={360}
                  />
                </TerminalCard>

                <TerminalCard title="Case Study: Industry-Standard Retention Benchmarks" accent="purple">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      N-day retention is the <span className="text-g-purple font-bold">universal language of product health</span>.
                      Every growth report, investor deck, and product review uses D1, D7, D30, and D90 as the
                      standard checkpoints. These aren&apos;t arbitrary — they map to natural user behavior cycles:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="border border-g-border/40 rounded p-2">
                        <div className="text-g-purple font-bold">D1 Retention</div>
                        <p className="text-g-dim mt-0.5 leading-relaxed">
                          Did they come back the next day? Strong D1 signals
                          the product delivered immediate value. Benchmark: ≥25% consumer, ≥40% enterprise.
                        </p>
                      </div>
                      <div className="border border-g-border/40 rounded p-2">
                        <div className="text-g-purple font-bold">D7 Retention</div>
                        <p className="text-g-dim mt-0.5 leading-relaxed">
                          Did they return in the first week? D7 measures whether the use case is recurring.
                          Benchmark: ≥15% consumer, ≥30% enterprise.
                        </p>
                      </div>
                      <div className="border border-g-border/40 rounded p-2">
                        <div className="text-g-purple font-bold">D30 Retention</div>
                        <p className="text-g-dim mt-0.5 leading-relaxed">
                          One-month retention. This is the standard &quot;product-market fit&quot; checkpoint.
                          If D30 &gt; 20%, you likely have PMF. Benchmark: ≥10% consumer, ≥25% enterprise.
                        </p>
                      </div>
                      <div className="border border-g-border/40 rounded p-2">
                        <div className="text-g-purple font-bold">D90 Retention</div>
                        <p className="text-g-dim mt-0.5 leading-relaxed">
                          Three-month retention. This is your &quot;committed user&quot; rate — people for whom
                          the product is genuinely habitual. Benchmark: ≥5% consumer, ≥15% enterprise.
                        </p>
                      </div>
                    </div>
                  </div>
                </TerminalCard>

                <TerminalCard title="Reading the N-Day Heatmap" accent="none">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      Each column is a <span className="text-g-purple font-bold">benchmark day</span>. Each row is
                      a <span className="text-g-purple font-bold">signup cohort</span>. This view compresses the
                      weekly heatmap&apos;s 12 columns into 6 key snapshots — easier to compare across cohorts.
                    </p>
                    <p>
                      <span className="text-g-text font-bold">Reading the decay curve:</span> As you scan left to right
                      (D1 → D90), cells should get darker. The rate of darkening tells you the shape of your
                      retention curve. Rapid early darkening (D1 bright, D7 very dark) means you have a
                      &quot;cliff&quot; product — great first impression, low recurring value.
                    </p>
                    <p>
                      <span className="text-g-text font-bold">Cohort improvement:</span> Scan vertically (top = oldest
                      cohort, bottom = newest). If recent cohorts are brighter at D30/D60/D90, your product is
                      improving. This is the most important signal for whether engineering/design investments are paying off.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-purple">Note:</span> Exact-day retention (was the user active on exactly day N?)
                      is used here. This is more conservative than &quot;at least once in N days&quot; rolling retention.
                      Multiply by ~2-3x to estimate rolling retention.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="What to Look For" accent="none">
                  <div className="text-[11px] text-g-muted space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-purple">1.</span>{" "}
                      <span className="text-g-text font-bold">D1-to-D7 drop:</span> This is your &quot;curiosity decay.&quot;
                      Users who came back next day but not next week tried the product but didn&apos;t find a recurring
                      use case. The fix is onboarding that teaches a repeating workflow, not just a one-time demo.
                    </p>
                    <p>
                      <span className="text-g-purple">2.</span>{" "}
                      <span className="text-g-text font-bold">D7-to-D30 ratio:</span> If D30/D7 &gt; 0.6, you have
                      strong habit formation. If it&apos;s &lt;0.3, users establish a weekly habit but don&apos;t sustain it.
                    </p>
                    <p>
                      <span className="text-g-purple">3.</span>{" "}
                      <span className="text-g-text font-bold">D90 floor:</span> The cohorts with the highest D90
                      retention are your most valuable. What&apos;s different about them? When did they sign up?
                      What country, plan, or channel do they come from?
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-purple font-bold">Experiment:</span> Crank{" "}
                      <span className="text-g-tan">System Latency</span> to 3.0x and watch D30 and D60 darken
                      significantly while D1 stays relatively bright. This is the <em>delayed churn pattern</em> —
                      latency doesn&apos;t kill users immediately, it erodes their habit over weeks.
                    </p>
                    <p>
                      <span className="text-g-purple font-bold">SQL challenge:</span> Modify the query to change
                      the benchmark days to (3, 10, 21, 45, 75). Does the overall pattern look similar, or does
                      choosing different checkpoints change the story?
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── TAB: SEGMENT COMPARISON ── */}
            {activeTab === "segment" && (
              <>
                <TerminalCard title="Retention by Segment — Artifact Creators vs. Non-Creators" accent="purple" animate>
                  <RetentionHeatmap
                    data={segmentData as Parameters<typeof RetentionHeatmap>[0]["data"]}
                    mode="weekly"
                    isLoading={isRunning && !segmentData}
                    error={error}
                    width={640}
                    height={260}
                  />
                </TerminalCard>

                <TerminalCard title="Case Study: Segment-Based Retention" accent="purple">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      Aggregate retention hides a crucial truth: your overall retention number is a{" "}
                      <span className="text-g-purple font-bold">weighted average of very different populations</span>.
                      A product with 20% D30 retention might actually have a segment retaining at 50% and another
                      at 5%. These populations require completely different interventions.
                    </p>
                    <p>
                      This view splits users into two segments: those who created at least one artifact
                      (<span className="text-g-purple font-bold">Artifact Creators</span>) and those who never did
                      (<span className="text-g-text font-bold">Non-Creators</span>). The retention gap between
                      these two groups is the <span className="text-g-tan font-bold">habit loop effect</span> —
                      quantified, not just hypothesized.
                    </p>
                    <p className="text-g-dim">
                      <span className="text-g-purple">Real-world parallel:</span> Twitter found that users who
                      followed 30+ accounts in the first day retained dramatically better. Facebook found that
                      users who added 7 friends in 10 days retained at 3x. These &quot;magic moments&quot; are your
                      artifact creation equivalent. The goal is to get more users to their magic moment faster.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Interpreting the Two-Row Heatmap" accent="none">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      With only two segments, the heatmap becomes a direct visual comparison. The{" "}
                      <span className="text-g-text font-bold">Artifact Creators row</span> should be consistently
                      brighter (higher retention). The brightness gap between the rows is your{" "}
                      <span className="text-g-purple font-bold">opportunity size</span>: if you could convert
                      just 10% of Non-Creators into Creators, how many users would shift from the dark row
                      to the bright row?
                    </p>
                    <p>
                      <span className="text-g-text font-bold">The shape of the Creators row</span> tells you
                      about habit formation speed: does their retention plateau quickly (strong habit) or
                      does it continue declining slowly? A quick plateau means artifact creation creates a
                      durable habit, not just temporary novelty.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Strategic Implications" accent="none">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      <span className="text-g-tan font-bold">If the gap is large (Creators retain 2–3× better):</span>{" "}
                      Your highest-leverage growth investment is reducing the friction to first artifact.
                      Every UX improvement that guides a user to create their first artifact is worth more
                      than any marketing spend — you&apos;re converting low-retention users into high-retention ones.
                    </p>
                    <p>
                      <span className="text-g-tan font-bold">If the gap is small:</span>{" "}
                      Artifact creation may not be the core &quot;aha moment.&quot; The habit loop might be
                      triggered by something else — frequency of conversations, specific event types, session
                      length. Explore the IAT Distribution and Activity Clusters modules to find the real signal.
                    </p>
                    <p>
                      <span className="text-g-tan font-bold">Quantifying the opportunity:</span>{" "}
                      (Non-Creator D30 retention) × (# Non-Creators) × (Creator D30 - Non-Creator D30) =
                      additional retained users if you convert 100% of Non-Creators. Even 20% conversion
                      is a meaningful business impact.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Try This" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p>
                      <span className="text-g-purple font-bold">Experiment:</span> Set{" "}
                      <span className="text-g-purple">Model Quality</span> to 0.2. The Artifact Creators segment
                      shrinks (fewer users discover artifact creation), and the gap between the two rows may
                      narrow or the Non-Creator row may darken further. This demonstrates the compounding
                      effect of model quality on long-term retention.
                    </p>
                    <p>
                      <span className="text-g-purple font-bold">SQL challenge:</span> Modify the query to
                      create a third segment: &quot;Power Creators&quot; (users with &gt;3 artifact events). Does this
                      group retain even better than single-artifact creators? If so, you have a dose-response
                      relationship between artifact usage depth and retention.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            <CrossModuleCard links={[
              { module: "Survival Analysis", path: "/modules/survival-analysis", insight: "Cohort heatmaps are the discrete version — survival curves give you the continuous view." },
              { module: "Metric Trees", path: "/modules/metric-trees", insight: "Week-4 retention is a driver node in the MRR decomposition tree." },
              { module: "Feature Adoption", path: "/modules/feature-adoption", insight: "Retention by feature depth reveals why some cohorts retain better than others." },
            ]} />

          </div>
        }
      />
    </div>
  );
}
