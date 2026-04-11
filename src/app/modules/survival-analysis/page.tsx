"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CrossModuleCard } from "@/components/terminal/cross-module-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { SurvivalCurve, type KMCurve } from "@/components/viz/survival-curve";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useDuckDB } from "@/providers/duckdb-provider";
import { usePyodide } from "@/providers/pyodide-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { SURVIVAL_PREP_SQL } from "@/lib/sql/survival.sql";
import { SURVIVAL_PYTHON } from "@/lib/python/survival.py";

type StratifyBy = "overall" | "is_artifact_user" | "had_high_latency" | "plan";

export default function SurvivalAnalysisPage() {
  const { runSQL, ready: dbReady } = useDuckDB();
  const { init, ready: pyReady, loading: pyLoading, runPython } = usePyodide();
  const { dataVersion, isGenerating } = useSimulation();

  const [sqlCode] = useState(SURVIVAL_PREP_SQL.trim());
  const [pyCode, setPyCode] = useState(SURVIVAL_PYTHON.trim());
  const [curves, setCurves] = useState<KMCurve[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stratifyBy, setStratifyBy] = useState<StratifyBy>("is_artifact_user");
  const [activeTab, setActiveTab] = useState<"sql" | "python">("sql");

  const runAnalysis = useCallback(async () => {
    if (!dbReady || isGenerating) return;
    setIsRunning(true); setError(null);
    try {
      if (!pyReady) await init();
      const rows = await runSQL(SURVIVAL_PREP_SQL.trim());

      const groupCol = stratifyBy === "overall"
        ? rows.map(() => "all users")
        : rows.map((r) => {
            const v = r[stratifyBy];
            if (stratifyBy === "is_artifact_user" || stratifyBy === "had_high_latency")
              return v ? (stratifyBy === "is_artifact_user" ? "artifact user" : "high latency") : "baseline";
            return String(v);
          });

      const input = {
        durations: rows.map((r) => Number(r.duration)),
        observed:  rows.map((r) => Number(r.churned)),
        groups:    groupCol,
      };

      const result = await runPython(pyCode, input);
      const parsed: KMCurve[] = JSON.parse(result as string);
      setCurves(parsed);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRunning(false);
    }
  }, [dbReady, isGenerating, pyReady, init, runSQL, runPython, pyCode, stratifyBy]);

  useEffect(() => {
    if (dbReady && !isGenerating) runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, dbReady, isGenerating, stratifyBy]);

  return (
    <div className="h-full overflow-hidden">
      <SplitPane
        left={
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-g-border bg-g-elevated shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="blue">KM</Badge>
                <Badge variant="muted">Level 3</Badge>
                <Badge variant={pyReady ? "green" : "muted"}>
                  {pyLoading ? "Python…" : pyReady ? "Python ready" : "Python"}
                </Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Survival Analysis</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                Kaplan-Meier time-to-churn estimator
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-g-border shrink-0">
              {(["sql","python"] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 text-xs transition-colors ${activeTab === t ? "text-g-tan border-b-2 border-g-tan" : "text-g-muted hover:text-g-text"}`}>
                  {t === "sql" ? "SQL Prep" : "Python KM"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === "sql"
                ? <CodeEditor value={sqlCode} language="sql" readOnly />
                : <CodeEditor value={pyCode} onChange={setPyCode}
                    onRun={runAnalysis} language="python"
                    isRunning={isRunning} error={error} />
              }
            </div>
          </div>
        }
        right={
          <div className="h-full flex flex-col p-3 gap-3 overflow-auto">
            {/* Stratify controls */}
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="text-g-muted">Stratify by:</span>
              {([
                { key: "overall", label: "Overall" },
                { key: "is_artifact_user", label: "Artifact Usage" },
                { key: "had_high_latency", label: "Latency Exposure" },
                { key: "plan", label: "Plan" },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setStratifyBy(key)}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${stratifyBy === key ? "border-g-tan text-g-tan" : "border-g-border text-g-dim hover:border-g-muted"}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Python init prompt */}
            {!pyReady && !pyLoading && (
              <div className="flex items-center gap-3 p-3 rounded border border-g-border bg-g-elevated text-[11px]">
                <span className="text-g-muted">Python runtime not loaded.</span>
                <button onClick={init} className="px-2 py-1 rounded bg-g-tan text-g-bg text-[10px] font-bold">
                  Initialize Pyodide
                </button>
              </div>
            )}
            {pyLoading && (
              <div className="p-3 rounded border border-g-border bg-g-elevated">
                <LoadingSpinner message="Downloading Python runtime (~10MB)…" size="sm" />
              </div>
            )}

            <TerminalCard title="Kaplan-Meier Survival Curves" accent="blue" animate>
              <SurvivalCurve
                curves={curves}
                isLoading={isRunning && !curves}
                error={error}
                width={580}
                height={380}
              />
            </TerminalCard>

            <TerminalCard title="Case Study: Time-to-Churn Analysis" accent="blue">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  <span className="text-g-blue font-bold">Survival analysis</span> answers: &quot;How long until a user
                  churns?&quot; Unlike retention heatmaps (which show % active at discrete intervals), survival curves
                  model the continuous probability of &quot;surviving&quot; (staying active) over time.
                </p>
                <p>
                  The critical concept is <span className="text-g-text font-bold">censoring</span>. Not every user
                  has churned — many are still active at the end of our observation window. These users are
                  &quot;right-censored&quot; — we know they survived <em>at least</em> X days, but we don&apos;t know their true
                  churn time. Kaplan-Meier handles this correctly by adjusting the risk set at each event time.
                </p>
                <p className="text-g-dim">
                  <span className="text-g-blue">Real-world parallel:</span> Clinical trials use survival analysis to
                  compare drug efficacy. &quot;Median survival time&quot; tells you when 50% of patients are still alive.
                  In product analytics, &quot;median survival&quot; tells you when 50% of users have churned — the half-life
                  of your user base.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Reading the Curves" accent="none">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  <span className="text-g-blue font-bold">Y-axis = S(t)</span>: The probability of &quot;surviving&quot;
                  (not churning) past time t. Starts at 1.0 (everyone alive) and decreases over time.
                  The <span className="text-g-text font-bold">step function</span> shape reflects that churn events
                  happen at discrete times.
                </p>
                <p>
                  <span className="text-g-blue font-bold">Shaded bands = 95% CI</span>: Computed via Greenwood&apos;s
                  formula. Wider bands mean fewer users are still at risk (less statistical precision).
                  Bands widen over time because the remaining population shrinks.
                </p>
                <p>
                  <span className="text-g-blue font-bold">Curve separation</span>: When two stratified curves
                  diverge, the gap between them is the <em>survival advantage</em> of one group over another.
                  If the curves overlap (and confidence bands intersect), the difference may not be statistically
                  significant. If they separate cleanly, you have a strong signal.
                </p>
                <p>
                  <span className="text-g-blue font-bold">Median survival</span>: Draw a horizontal line at S(t)=0.5.
                  Where it intersects each curve is the median survival time — the point where 50% of users
                  have churned. The gap between median times quantifies the retention advantage.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="The Hidden Signals in Survival" accent="blue">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  <span className="text-g-purple font-bold">Artifact Usage stratification:</span> Artifact users show
                  dramatically higher survival — their curve stays elevated while baseline users drop off.
                  The median survival gap is typically <span className="text-g-text font-bold">2-3x</span>. This confirms
                  the habit loop: artifact creation → shorter IAT → longer retention.
                </p>
                <p>
                  <span className="text-g-red font-bold">Latency Exposure stratification:</span> Users who experienced
                  multiple high-latency events churn faster — their curve drops earlier and steeper. This is the
                  same signal as Transition Matrices but viewed through a different lens: instead of weekly probability,
                  you see the cumulative time-to-churn effect.
                </p>
                <p>
                  <span className="text-g-tan font-bold">Plan stratification:</span> Different plans may show different
                  survival patterns. Team/Enterprise users often have higher retention (switching costs, organizational
                  buy-in) while Free users churn fastest (zero switching cost).
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Try This" accent="none">
              <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-g-blue font-bold">Experiment 1:</span> Select &quot;Artifact Usage&quot; stratification
                  and note the median survival times for both groups. Now increase{" "}
                  <span className="text-g-purple">Model Quality</span> to 1.0 — does the gap widen? Higher quality means
                  more users become artifact creators, so the &quot;baseline&quot; group shrinks and becomes more
                  negatively selected (the remaining non-creators are harder to convert).
                </p>
                <p>
                  <span className="text-g-blue font-bold">Experiment 2:</span> Select &quot;Latency Exposure&quot; and set{" "}
                  <span className="text-g-tan">System Latency</span> to 0.5x vs 3.0x. At low latency, the two curves
                  should nearly overlap (almost nobody hits the frustration threshold). At high latency, the curves
                  diverge dramatically — this is the dose-response relationship between latency and churn.
                </p>
                <p>
                  <span className="text-g-blue font-bold">Python challenge:</span> Modify the KM code to compute
                  the log-rank test statistic. Add: after computing curves, calculate the expected events under
                  the null hypothesis and compare to observed. A chi-squared p-value &lt; 0.05 confirms the curves
                  are statistically different.
                </p>
              </div>
            </TerminalCard>

            <CrossModuleCard links={[
              { module: "Retention Heatmaps", path: "/modules/retention-heatmaps", insight: "Survival curves are the continuous version of cohort heatmaps — same story, different lens." },
              { module: "Revenue & LTV", path: "/modules/revenue-ltv", insight: "Median survival time directly feeds LTV: ARPU × median months retained = expected LTV." },
              { module: "Transition Matrices", path: "/modules/transition-matrices", insight: "Markov churn probabilities determine the shape of survival curves for each user state." },
            ]} />

          </div>
        }
      />
    </div>
  );
}
