"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { Badge } from "@/components/ui/badge";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { AB_COMPARISON_SQL, AB_WEEKLY_SQL } from "@/lib/sql/ab-testing.sql";
import {
  ABBarChart, ABTimeSeriesChart, SampleSizeCalculator,
  type ABGroupRow, type MetricKey,
} from "@/components/viz/ab-chart";

type ViewId = "results" | "timeseries" | "sample-size" | "peeking";

const VIEWS: { id: ViewId; label: string }[] = [
  { id: "results",     label: "Test Results" },
  { id: "timeseries",  label: "WAU Trend" },
  { id: "sample-size", label: "Sample Size" },
  { id: "peeking",     label: "Peeking Problem" },
];

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "activation_rate", label: "Activation" },
  { key: "artifact_rate",   label: "Artifact Adoption" },
  { key: "code_rate",       label: "Code Runner" },
];

// DuckDB-Wasm returns BigInt for INTEGER/BIGINT columns — convert to JS Number
function normalizeRow(row: unknown): unknown {
  if (row === null || typeof row !== "object") return row;
  return Object.fromEntries(
    Object.entries(row as Record<string, unknown>).map(([k, v]) => [
      k,
      typeof v === "bigint" ? Number(v) : v,
    ])
  );
}
function normalizeRows(rows: unknown[] | null): unknown[] | null {
  return rows ? rows.map(normalizeRow) : null;
}

export default function ABTestingPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();

  const [view, setView]     = useState<ViewId>("results");
  const [metric, setMetric] = useState<MetricKey>("artifact_rate");
  const [sql, setSql]       = useState(AB_COMPARISON_SQL.trim());
  const [data, setData]     = useState<unknown[] | null>(null);
  const [weeklyData, setWeeklyData] = useState<unknown[] | null>(null);
  const [isRunning, setIsRunning]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const runQuery = useCallback(async (q: string) => {
    if (!ready || isGenerating) return;
    setIsRunning(true); setError(null);
    try { setData(normalizeRows(await runSQL(q))); }
    catch (e) { setError(String(e)); }
    finally { setIsRunning(false); }
  }, [ready, isGenerating, runSQL]);

  const fetchAll = useCallback(async () => {
    if (!ready || isGenerating) return;
    const [comp, weekly] = await Promise.all([
      runSQL(AB_COMPARISON_SQL.trim()).catch(() => null),
      runSQL(AB_WEEKLY_SQL.trim()).catch(() => null),
    ]);
    setData(normalizeRows(comp));
    setWeeklyData(normalizeRows(weekly));
    setSql(AB_COMPARISON_SQL.trim());
  }, [ready, isGenerating, runSQL]);

  useEffect(() => { fetchAll(); }, [dataVersion, ready, isGenerating, fetchAll]);

  return (
    <div className="h-full overflow-hidden">
      <SplitPane
        left={
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-g-border bg-g-elevated shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="green">A/B</Badge>
                <Badge variant="muted">Level 2</Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">A/B Testing & Experimentation</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                Statistical significance · Sample sizing · Peeking problem
              </p>
            </div>

            {/* View tabs */}
            <div className="flex border-b border-g-border shrink-0 overflow-x-auto">
              {VIEWS.map((v) => (
                <button key={v.id} onClick={() => setView(v.id)}
                  className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${view === v.id ? "text-g-green border-b-2 border-g-green" : "text-g-muted hover:text-g-text"}`}>
                  {v.label}
                </button>
              ))}
            </div>

            {/* Metric selector for results view */}
            {view === "results" && (
              <div className="flex gap-1 px-2 py-1.5 border-b border-g-border shrink-0">
                <span className="text-[9px] text-g-dim uppercase tracking-wider mr-1 self-center">Metric:</span>
                {METRICS.map((m) => (
                  <button key={m.key} onClick={() => setMetric(m.key)}
                    className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${metric === m.key ? "border-g-green text-g-green bg-g-green/10" : "border-g-border text-g-dim hover:text-g-text"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-hidden">
              {view === "sample-size" || view === "peeking" ? (
                <div className="p-3 text-[11px] text-g-dim h-full overflow-auto">
                  <p className="text-g-muted mb-2">No SQL needed for this view — it&apos;s a pure statistical calculator.</p>
                  <p>Use the <span className="text-g-green">Sample Size</span> tab to plan experiments before collecting data.</p>
                </div>
              ) : (
                <CodeEditor
                  value={view === "timeseries" ? AB_WEEKLY_SQL.trim() : sql}
                  onChange={setSql}
                  onRun={runQuery}
                  language="sql"
                  isRunning={isRunning}
                  error={error}
                />
              )}
            </div>
          </div>
        }
        right={
          <div className="h-full flex flex-col p-3 gap-3 overflow-auto">

            {/* ── Results view ── */}
            {view === "results" && (
              <>
                <TerminalCard title="A/B Test Results — Random 50/50 Split" accent="green" animate>
                  <ABBarChart
                    data={data as ABGroupRow[]}
                    metric={metric}
                    isLoading={isRunning && !data}
                    error={error}
                  />
                </TerminalCard>

                {data && (
                  <TerminalCard title="Group Summary" accent="none">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="text-g-muted uppercase tracking-wider border-b border-g-border">
                            <th className="text-left pb-1">Group</th>
                            <th className="text-right pb-1">N</th>
                            <th className="text-right pb-1">Activation</th>
                            <th className="text-right pb-1">Artifact</th>
                            <th className="text-right pb-1">Code</th>
                            <th className="text-right pb-1">Avg Msgs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data as ABGroupRow[]).map((row) => (
                            <tr key={row.ab_group} className="border-b border-g-border-dim">
                              <td className="py-1 font-bold" style={{ color: row.ab_group === "Control" ? "#707070" : "#5faa7a" }}>{row.ab_group}</td>
                              <td className="text-right text-g-muted tabular-nums">{row.n.toLocaleString()}</td>
                              <td className="text-right tabular-nums text-g-tan">{row.activation_rate}%</td>
                              <td className="text-right tabular-nums text-g-purple">{row.artifact_rate}%</td>
                              <td className="text-right tabular-nums text-g-blue">{row.code_rate}%</td>
                              <td className="text-right tabular-nums text-g-muted">{row.avg_messages}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TerminalCard>
                )}

                <TerminalCard title="Why the groups look identical — and why that matters" accent="green">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      <span className="text-g-green font-bold">This is the point.</span> The two groups are
                      randomly split by <code className="text-g-tan">hash(user_id) % 2</code> — a deterministic,
                      unbiased assignment. In a well-designed experiment, control and treatment should look nearly
                      identical <em>before</em> the treatment is applied. Any pre-existing difference is a red flag
                      called a <span className="text-g-red font-bold">Sample Ratio Mismatch (SRM)</span>.
                    </p>
                    <p>
                      In real experiments, the treatment group receives a different experience (e.g., 20% faster
                      response times). You then measure the <em>delta</em> between groups — which you can detect
                      reliably only if your groups were equivalent at baseline.
                    </p>
                    <p>
                      <span className="text-g-tan">Try this:</span> Use the <strong>System Latency</strong> slider
                      below to simulate giving one group faster responses. Watch the treatment group&apos;s artifact
                      adoption diverge — that&apos;s your treatment effect.
                    </p>
                  </div>
                </TerminalCard>

                <TerminalCard title="Case Study: Booking.com — 1,000 Experiments Per Year" accent="none">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>Booking.com runs over 1,000 concurrent A/B tests across their product. Key lessons:</p>
                    <p><span className="text-g-tan">1.</span> <strong>Only ~10% of experiments</strong> show a statistically significant positive result. Most ideas fail — and that&apos;s fine. The goal is to learn, not to confirm.</p>
                    <p><span className="text-g-tan">2.</span> <strong>Effect sizes are usually tiny</strong> (0.1–0.5%). At Booking&apos;s scale, even a 0.1% improvement in conversion is worth millions. Plan for small effects — your sample sizes need to match.</p>
                    <p><span className="text-g-tan">3.</span> <strong>Heterogeneous treatment effects</strong> — the average effect hides segment-level effects. A feature that helps mobile users might hurt desktop users. Always segment your results.</p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── Time series view ── */}
            {view === "timeseries" && (
              <>
                <TerminalCard title="Weekly Active Users — Control vs Treatment" accent="green" animate>
                  <ABTimeSeriesChart
                    data={weeklyData as any}
                    isLoading={isRunning && !weeklyData}
                    error={error}
                  />
                </TerminalCard>
                <TerminalCard title="What to look for in the time series" accent="none">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      The two lines should track closely together — random variation around the same mean.
                      <span className="text-g-green"> Persistent divergence</span> after experiment start
                      indicates a real treatment effect. <span className="text-g-red">Divergence at the start
                      (before treatment)</span> means your groups weren&apos;t properly randomized — a fatal flaw.
                    </p>
                    <p>
                      <span className="text-g-tan">Seasonality matters:</span> If your experiment runs across
                      weekdays vs weekends, control vs treatment will look different just from day-of-week effects.
                      Always run experiments for full week increments — minimum 2 weeks, ideally 4.
                    </p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── Sample size calculator ── */}
            {view === "sample-size" && (
              <>
                <TerminalCard title="Sample Size Calculator — Power Analysis" accent="green" animate>
                  <SampleSizeCalculator />
                </TerminalCard>
                <TerminalCard title="The most common experimentation mistake" accent="none">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p>
                      Most teams run experiments until they see significance, then stop. This is called
                      <span className="text-g-red font-bold"> optional stopping</span> and it inflates your
                      false positive rate from 5% to over 30%.
                    </p>
                    <p>
                      <strong>The fix:</strong> Calculate sample size before the experiment. Commit to running
                      until you hit that number. Don&apos;t peek. The sample size calculator above gives you
                      the minimum users needed per group to detect your target effect.
                    </p>
                    <p>
                      <span className="text-g-tan">Rule of thumb:</span> If you can&apos;t get to the required
                      sample size within 4 weeks, either increase the MDE (accept you can only detect larger
                      effects), or increase your traffic allocation (run on 100% of users).
                    </p>
                  </div>
                </TerminalCard>
                <TerminalCard title="Power Analysis Vocabulary" accent="none">
                  <div className="text-[11px] space-y-1.5 text-g-muted">
                    <p><span className="text-g-tan font-bold">α (alpha):</span> False positive rate — probability of detecting an effect that doesn&apos;t exist. Convention: 0.05 (5%).</p>
                    <p><span className="text-g-purple font-bold">β (beta):</span> False negative rate. Power = 1-β. Convention: 80% power means 20% chance of missing a real effect.</p>
                    <p><span className="text-g-green font-bold">MDE:</span> Minimum Detectable Effect — the smallest true effect you want to be able to detect. Smaller MDE = larger sample needed.</p>
                    <p><span className="text-g-blue font-bold">p-value:</span> Probability of observing a result at least as extreme as yours, assuming the null hypothesis is true. NOT the probability that the null is true.</p>
                  </div>
                </TerminalCard>
              </>
            )}

            {/* ── Peeking problem ── */}
            {view === "peeking" && (
              <>
                <TerminalCard title="The Peeking Problem — Why Early Stopping Is Dangerous" accent="red" animate>
                  <div className="text-[11px] text-g-muted space-y-3 leading-relaxed">
                    <div className="rounded border border-g-red/30 bg-g-red/5 p-3">
                      <p className="text-g-red font-bold mb-1">Simulation: 10,000 A/A Tests (no real effect)</p>
                      <p>If you check significance every day for 14 days on a null experiment (control = treatment), you&apos;ll see p &lt; 0.05 approximately:</p>
                      <div className="mt-2 space-y-1 font-mono">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-g-muted">Check at day 3 only:</span>
                          <span className="text-g-green">~5% false positives ✓</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-g-muted">Check at days 3, 7, 14:</span>
                          <span className="text-g-tan">~11% false positives ⚠</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-g-muted">Check daily for 14 days:</span>
                          <span className="text-g-red">~23% false positives ✗</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-g-muted">Check daily for 30 days:</span>
                          <span className="text-g-red">~38% false positives ✗✗</span>
                        </div>
                      </div>
                    </div>
                    <p>
                      Every time you peek at your experiment results and apply a stopping rule, you&apos;re
                      running a hypothesis test. Multiple tests inflate your Type I error. The 5% significance
                      level you set only applies if you commit to a single test at a predetermined sample size.
                    </p>
                  </div>
                </TerminalCard>
                <TerminalCard title="Three Solutions to the Peeking Problem" accent="none">
                  <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                    <p><span className="text-g-tan font-bold">1. Sequential testing (mSPRT):</span> Uses a mixture Sequential Probability Ratio Test that maintains Type I error at 5% even with continuous monitoring. Used by Optimizely, Amplitude. Valid to stop early — but requires more samples on average.</p>
                    <p><span className="text-g-purple font-bold">2. Bayesian A/B testing:</span> Reports a probability that treatment beats control. You can look anytime — the interpretation changes continuously but doesn&apos;t inflate false positives. Trade-off: harder to interpret, requires prior beliefs.</p>
                    <p><span className="text-g-green font-bold">3. Pre-register and don&apos;t peek:</span> Decide sample size upfront, run to completion, analyze once. Boring but correct. The gold standard in academic research and clinical trials.</p>
                    <p className="text-g-dim border-t border-g-border pt-2">
                      <span className="text-g-tan">Real-world note:</span> Airbnb, Netflix, and Spotify all use variants of sequential testing to allow valid early stopping while maintaining statistical rigor. If you&apos;re building an experimentation platform, sequential testing is table stakes.
                    </p>
                  </div>
                </TerminalCard>
                <TerminalCard title="SQL Challenge — Detect a Peeking Violation" accent="none">
                  <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                    <p><span className="text-g-tan font-bold">Challenge:</span> Write a query that computes the running p-value for artifact adoption rate week-by-week. At which week does the p-value first cross 0.05? Would you have stopped early?</p>
                    <p>Hint: Use the AB_WEEKLY_SQL as a base, then join with group sizes and compute z-scores per week. DuckDB&apos;s window functions (<code className="text-g-tan">SUM(...) OVER (ORDER BY week_start)</code>) are your friend.</p>
                  </div>
                </TerminalCard>
              </>
            )}

          </div>
        }
      />
    </div>
  );
}
