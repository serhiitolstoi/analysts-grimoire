"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CrossModuleCard } from "@/components/terminal/cross-module-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { COLORS } from "@/lib/utils/colors";
import { useContainerWidth } from "@/lib/hooks/use-container-width";
import {
  SIMPSONS_AGGREGATE_SQL, SIMPSONS_SEGMENTED_SQL,
  SURVIVOR_BIASED_SQL, SURVIVOR_UNBIASED_SQL,
  NOVELTY_SQL, GOODHARTS_SQL,
} from "@/lib/sql/pitfalls.sql";

type PitfallId = "simpsons" | "survivorship" | "novelty" | "goodhart";

const PITFALLS: { id: PitfallId; label: string; emoji: string; tagline: string }[] = [
  { id: "simpsons",     emoji: "⚡", label: "Simpson's Paradox",  tagline: "Segments reverse the aggregate" },
  { id: "survivorship", emoji: "👻", label: "Survivorship Bias",  tagline: "Only winners are in your data" },
  { id: "novelty",      emoji: "✨", label: "Novelty Effect",     tagline: "Launch spikes aren't retention" },
  { id: "goodhart",     emoji: "🎯", label: "Goodhart's Law",     tagline: "When the metric becomes the target" },
];

// ── Generic mini chart helpers ─────────────────────────────────────────────

function SimpleBarChart({ data, x, y, color = COLORS.tan, label = "", title = "" }: {
  data: Record<string, unknown>[];
  x: string; y: string; color?: string; label?: string; title?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, 460);
  const chartWidth = containerWidth || 460;
  const chartHeight = Math.max(180, Math.round(chartWidth * 0.38));

  useEffect(() => {
    if (!ref.current || !data.length) return;
    ref.current.innerHTML = "";
    const plot = Plot.plot({
      width: chartWidth, height: chartHeight,
      marginLeft: 60, marginRight: 20, marginTop: 16, marginBottom: 45,
      style: { background: "transparent", color: COLORS.text, fontFamily: "var(--font-mono)", fontSize: "11px" },
      x: { label: null },
      y: { label: `${label} →`, labelAnchor: "top" },
      marks: [
        Plot.barY(data, { x, y, fill: color, fillOpacity: 0.8, inset: 4 }),
        Plot.text(data, {
          x, y, dy: -10,
          text: (d: Record<string, unknown>) => `${Number(d[y]).toFixed(1)}%`,
          fill: COLORS.text, fontSize: 10, textAnchor: "middle",
        }),
        Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });
    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, x, y, color, label, chartWidth, chartHeight]);

  return <div ref={containerRef} className="w-full"><div ref={ref} /></div>;
}

function GroupedBarChart({ data, x, y, group, colors, label = "" }: {
  data: Record<string, unknown>[];
  x: string; y: string; group: string;
  colors: Record<string, string>; label?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, 460);
  const chartWidth = containerWidth || 460;
  const chartHeight = Math.max(200, Math.round(chartWidth * 0.42));

  useEffect(() => {
    if (!ref.current || !data.length) return;
    ref.current.innerHTML = "";
    const domain = [...new Set(data.map((d) => String(d[group])))];
    const colorRange = domain.map((g) => colors[g] ?? COLORS.muted);
    const plot = Plot.plot({
      width: chartWidth, height: chartHeight,
      marginLeft: 60, marginRight: 20, marginTop: 16, marginBottom: 45,
      style: { background: "transparent", color: COLORS.text, fontFamily: "var(--font-mono)", fontSize: "11px" },
      x: { label: null },
      y: { label: `${label} →`, labelAnchor: "top" },
      fx: { label: null },
      color: { domain, range: colorRange, legend: true },
      marks: [
        Plot.barY(data, Plot.groupX({ y: "identity" }, { x: group, y, fx: x, fill: group, fillOpacity: 0.8, inset: 2 })),
        Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });
    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, x, y, group, colors, label, chartWidth, chartHeight]);

  return <div ref={containerRef} className="w-full"><div ref={ref} /></div>;
}

function LineChart({ data, x, lines, colors, label = "", xIsDate = false }: {
  data: Record<string, unknown>[];
  x: string; lines: string[]; colors: Record<string, string>; label?: string; xIsDate?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, 460);
  const chartWidth = containerWidth || 460;
  const chartHeight = Math.max(200, Math.round(chartWidth * 0.42));

  useEffect(() => {
    if (!ref.current || !data.length) return;
    ref.current.innerHTML = "";

    const combined = lines.flatMap((l) =>
      data.map((d) => ({
        xVal: xIsDate ? new Date(String(d[x])) : Number(d[x]),
        yVal: Number(d[l]),
        series: l,
      }))
    );

    const plot = Plot.plot({
      width: chartWidth, height: chartHeight,
      marginLeft: 55, marginRight: 20, marginTop: 16, marginBottom: 45,
      style: { background: "transparent", color: COLORS.text, fontFamily: "var(--font-mono)", fontSize: "11px" },
      x: { label: null, tickFormat: xIsDate ? (d: Date) => d.toLocaleDateString("en", { month: "short" }) : undefined },
      y: { label: `${label} →`, labelAnchor: "top" },
      color: { domain: lines, range: lines.map((l) => colors[l] ?? COLORS.muted), legend: true },
      marks: [
        Plot.lineY(combined, { x: "xVal", y: "yVal", stroke: "series", strokeWidth: 2, curve: "monotone-x" }),
        Plot.gridX({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });
    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, x, lines, colors, label, xIsDate, chartWidth, chartHeight]);

  return <div ref={containerRef} className="w-full"><div ref={ref} /></div>;
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AnalyticsPitfallsPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();

  const [pitfall, setPitfall] = useState<PitfallId>("simpsons");
  const [viewMode, setViewMode] = useState<"trap" | "correct">("trap");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [data2, setData2] = useState<Record<string, unknown>[]>([]);
  const [sql, setSql] = useState(SIMPSONS_AGGREGATE_SQL.trim());
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PITFALL_SQLS: Record<PitfallId, { trap: string; correct: string }> = {
    simpsons:     { trap: SIMPSONS_AGGREGATE_SQL,   correct: SIMPSONS_SEGMENTED_SQL },
    survivorship: { trap: SURVIVOR_BIASED_SQL,      correct: SURVIVOR_UNBIASED_SQL },
    novelty:      { trap: NOVELTY_SQL,              correct: NOVELTY_SQL },
    goodhart:     { trap: GOODHARTS_SQL,            correct: GOODHARTS_SQL },
  };

  const fetchData = useCallback(async (p: PitfallId) => {
    if (!ready || isGenerating) return;
    setIsRunning(true); setError(null);
    setData([]); setData2([]);
    try {
      const sqls = PITFALL_SQLS[p];
      const [d1, d2] = await Promise.all([
        runSQL(sqls.trap.trim()).catch(() => [] as unknown[]),
        runSQL(sqls.correct.trim()).catch(() => [] as unknown[]),
      ]);
      setData(d1 as Record<string, unknown>[]);
      setData2(d2 as Record<string, unknown>[]);
      setSql(sqls.trap.trim());
    } catch (e) { setError(String(e)); }
    finally { setIsRunning(false); }
  }, [ready, isGenerating, runSQL]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(pitfall); }, [dataVersion, ready, isGenerating, pitfall, fetchData]);

  const changePitfall = (p: PitfallId) => {
    setPitfall(p);
    setViewMode("trap");
  };

  const currentSql = viewMode === "trap"
    ? PITFALL_SQLS[pitfall].trap
    : PITFALL_SQLS[pitfall].correct;

  const runQuery = useCallback(async (q: string) => {
    if (!ready || isGenerating) return;
    setIsRunning(true); setError(null);
    try {
      const rows = await runSQL(q);
      if (viewMode === "trap") setData(rows as Record<string, unknown>[]);
      else setData2(rows as Record<string, unknown>[]);
    } catch (e) { setError(String(e)); }
    finally { setIsRunning(false); }
  }, [ready, isGenerating, runSQL, viewMode]);

  const activeData = viewMode === "trap" ? data : data2;

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-g-border bg-g-elevated shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="red">TRAPS</Badge>
          <Badge variant="muted">Advanced</Badge>
        </div>
        <h1 className="text-sm font-bold text-g-text">Analytics Pitfalls</h1>
        <p className="text-[11px] text-g-muted mt-0.5">
          Four traps that silently corrupt product decisions — with runnable SQL proof
        </p>
      </div>

      {/* Pitfall selector */}
      <div className="flex border-b border-g-border shrink-0 overflow-x-auto">
        {PITFALLS.map((p) => (
          <button key={p.id} onClick={() => changePitfall(p.id)}
            className={`px-3 py-2 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5
              ${pitfall === p.id ? "text-g-red border-b-2 border-g-red bg-g-red/5" : "text-g-muted hover:text-g-text"}`}>
            <span>{p.emoji}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Main split: left = SQL, right = charts */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: SQL editor */}
        <div className="flex flex-col shrink-0 border-r border-g-border" style={{ width: "40%" }}>
          {/* Trap / Correct toggle */}
          <div className="flex gap-1 p-2 border-b border-g-border shrink-0">
            <button onClick={() => { setViewMode("trap"); setSql(PITFALL_SQLS[pitfall].trap.trim()); }}
              className={`px-3 py-1 rounded text-[10px] border transition-colors ${viewMode === "trap" ? "border-g-red text-g-red bg-g-red/10" : "border-g-border text-g-dim hover:text-g-text"}`}>
              ⚠ Trap View
            </button>
            <button onClick={() => { setViewMode("correct"); setSql(PITFALL_SQLS[pitfall].correct.trim()); }}
              className={`px-3 py-1 rounded text-[10px] border transition-colors ${viewMode === "correct" ? "border-g-green text-g-green bg-g-green/10" : "border-g-border text-g-dim hover:text-g-text"}`}>
              ✓ Correct View
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              value={currentSql}
              onChange={setSql}
              onRun={runQuery}
              language="sql"
              isRunning={isRunning}
              error={error}
            />
          </div>
        </div>

        {/* Right: charts + explanations */}
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {isRunning && !activeData.length && (
            <div className="flex items-center justify-center h-40">
              <LoadingSpinner message="Running query…" />
            </div>
          )}

          {/* ── SIMPSON'S PARADOX ── */}
          {pitfall === "simpsons" && (
            <>
              <TerminalCard
                title={viewMode === "trap" ? "⚠ Trap: Aggregate churn hides the truth" : "✓ Correct: Segment by plan to see reality"}
                accent={viewMode === "trap" ? "red" : "green"}
                animate
              >
                {viewMode === "trap" && activeData.length > 0 && (
                  <SimpleBarChart
                    data={activeData} x="channel" y="churn_pct"
                    color={COLORS.tan} label="Churn %"
                  />
                )}
                {viewMode === "correct" && activeData.length > 0 && (
                  <GroupedBarChart
                    data={activeData} x="plan" y="churn_pct" group="channel"
                    colors={{ organic: COLORS.tan, paid: COLORS.red }}
                    label="Churn %"
                  />
                )}
              </TerminalCard>

              <TerminalCard title="Simpson's Paradox — The Most Dangerous Bias in Analytics" accent="red">
                <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                  <p>
                    <span className="text-g-red font-bold">The trap:</span> In the aggregate view, organic and paid
                    acquisition appear to have similar churn rates. A naive analyst might conclude: &ldquo;acquisition
                    channel doesn&apos;t matter for retention — focus on volume.&rdquo;
                  </p>
                  <p>
                    <span className="text-g-green font-bold">The truth:</span> Paid acquisition users churn more in
                    <em> every single plan tier</em>. The aggregate looks equal because paid acquisition skews toward
                    Team plan users — who have low churn regardless. This is the <strong>confounding variable</strong>
                    that creates the paradox.
                  </p>
                  <p>
                    <span className="text-g-tan">Real-world parallel:</span> This exact paradox appeared in UC
                    Berkeley&apos;s famous 1973 gender bias study — men appeared to have higher admission rates overall,
                    but women had higher rates in 4 of 6 departments. Men were applying to easier departments.
                  </p>
                  <p className="text-g-dim border-t border-g-border pt-2">
                    <span className="text-g-tan">Fix:</span> Always segment before concluding. Ask: &ldquo;Is there a
                    lurking variable that&apos;s differently distributed between my groups?&rdquo; If yes, you have
                    potential Simpson&apos;s Paradox.
                  </p>
                </div>
              </TerminalCard>
            </>
          )}

          {/* ── SURVIVORSHIP BIAS ── */}
          {pitfall === "survivorship" && (
            <>
              <TerminalCard
                title={viewMode === "trap" ? "⚠ Trap: Only measuring users who survived" : "✓ Correct: Full cohort including churned users"}
                accent={viewMode === "trap" ? "red" : "green"}
                animate
              >
                {activeData.length > 0 && (
                  <LineChart
                    data={activeData}
                    x="cohort_month"
                    lines={viewMode === "trap" ? ["avg_messages"] : ["active_pct", "avg_messages_all"]}
                    colors={{
                      avg_messages:     COLORS.tan,
                      active_pct:       COLORS.green,
                      avg_messages_all: COLORS.purple,
                    }}
                    label={viewMode === "trap" ? "Avg Messages (survivors)" : "Active % / Avg Messages (all)"}
                    xIsDate
                  />
                )}
              </TerminalCard>

              <TerminalCard title="Survivorship Bias — Why Your Metrics Always Look Better Than Reality" accent="red">
                <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                  <p>
                    <span className="text-g-red font-bold">The trap:</span> The &ldquo;survivors&rdquo; query filters
                    to users who had activity after July 1st. These are your best users — they came back for 6+ months.
                    Their engagement metrics look amazing. You&apos;d conclude: &ldquo;Our users are highly engaged!&rdquo;
                  </p>
                  <p>
                    <span className="text-g-green font-bold">The truth:</span> The unbiased view includes all users,
                    including those who churned in week 1. Early cohorts show dramatically lower retention. The
                    &ldquo;engaged users&rdquo; are simply the ones who didn&apos;t leave — not representative of your
                    typical user.
                  </p>
                  <p>
                    <span className="text-g-tan">Real-world parallel:</span> Abraham Wald&apos;s WW2 airplane study —
                    engineers wanted to reinforce the parts of returning planes that showed bullet holes. Wald noted
                    they should reinforce the parts with <em>no</em> holes — those were the hits that caused the
                    planes that didn&apos;t return.
                  </p>
                  <p className="text-g-dim border-t border-g-border pt-2">
                    <span className="text-g-tan">Fix:</span> Always define your cohort first (e.g., &ldquo;all users
                    who signed up in January&rdquo;), then measure their behavior — including churned users in the
                    denominator.
                  </p>
                </div>
              </TerminalCard>
            </>
          )}

          {/* ── NOVELTY EFFECT ── */}
          {pitfall === "novelty" && (
            <>
              <TerminalCard
                title="Artifact Adoption Rate by Week Since Signup — Novelty Spike vs True Habit"
                accent={viewMode === "trap" ? "red" : "green"}
                animate
              >
                {activeData.length > 0 && (
                  <LineChart
                    data={activeData}
                    x="weeks_since_signup"
                    lines={["artifact_share_pct"]}
                    colors={{ artifact_share_pct: COLORS.tan }}
                    label="Artifact Usage %"
                  />
                )}
              </TerminalCard>

              <TerminalCard title="The Novelty Effect — Launch Spikes Aren't Retention" accent="red">
                <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                  <p>
                    <span className="text-g-red font-bold">The trap:</span> You launch a new feature (artifacts).
                    Week 1–2 engagement is through the roof. Leadership celebrates. You ship the feature to 100%.
                    Three months later, adoption has decayed to 15% of the launch-week peak.
                  </p>
                  <p>
                    <span className="text-g-green font-bold">The signal:</span> Watch the curve flatten, not the
                    peak. True adoption = the <em>steady-state</em> rate after the novelty wears off (typically
                    weeks 4–6). The flattening point tells you the genuine habit rate.
                  </p>
                  <p>
                    <span className="text-g-tan">Real-world parallel:</span> Duolingo&apos;s streak feature showed
                    a massive novelty spike at launch, then settled to a steady state ~60% below peak. They almost
                    killed the feature based on early data, but held — the steady state was still double the
                    pre-streak baseline.
                  </p>
                  <p className="text-g-dim border-t border-g-border pt-2">
                    <span className="text-g-tan">Fix:</span> Don&apos;t measure adoption at launch. Measure it at
                    weeks 4–8 post-signup. Use the week-since-signup curve (shown here) instead of calendar-week
                    adoption — it normalizes for new user excitement.
                  </p>
                </div>
              </TerminalCard>

              <TerminalCard title="Try This" accent="none">
                <div className="text-[11px] text-g-dim space-y-1.5">
                  <p><span className="text-g-tan font-bold">Experiment:</span> Increase <strong>Model Quality</strong> to 1.0. The novelty spike becomes larger AND the steady-state rate increases — because quality creates genuine artifact habit, not just novelty excitement.</p>
                  <p><span className="text-g-tan font-bold">SQL Challenge:</span> Modify the query to split by <code className="text-g-tan">plan</code>. Do Team plan users maintain higher steady-state artifact adoption than free users?</p>
                </div>
              </TerminalCard>
            </>
          )}

          {/* ── GOODHART'S LAW ── */}
          {pitfall === "goodhart" && (
            <>
              <TerminalCard
                title="Messages/User vs Artifact Conversion — Goodhart's Law in Action"
                accent={viewMode === "trap" ? "red" : "green"}
                animate
              >
                {activeData.length > 0 && (
                  <LineChart
                    data={activeData}
                    x="week_start"
                    lines={["msgs_per_user", "artifact_conversion_pct"]}
                    colors={{ msgs_per_user: COLORS.red, artifact_conversion_pct: COLORS.green }}
                    label="Rate"
                    xIsDate
                  />
                )}
              </TerminalCard>

              <TerminalCard title="Goodhart's Law — When the Metric Becomes the Target, It Ceases to Be a Good Metric" accent="red">
                <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                  <p>
                    <span className="text-g-red font-bold">The trap:</span> Your engagement team is measured on
                    <em> messages sent per user</em>. They ship a feature that makes users send more messages.
                    The metric goes up. Everyone celebrates.
                  </p>
                  <p>
                    <span className="text-g-green font-bold">The truth:</span> Messages per user went up because
                    model quality dropped — users need to send 5 messages to get what used to take 1. The
                    <em> artifact conversion rate</em> (the true value signal) tanks simultaneously. You&apos;re
                    measuring frustration as engagement.
                  </p>
                  <p>
                    <span className="text-g-tan">In this simulation:</span> Drop <strong>Model Quality</strong>
                    to 0.2 using the slider below. Watch messages_per_user rise while artifact_conversion_pct
                    collapses. That&apos;s Goodhart&apos;s Law in action.
                  </p>
                  <p>
                    <span className="text-g-tan">Real-world parallel:</span> YouTube&apos;s watch time metric.
                    They optimized aggressively for watch time → recommendation algorithm shifted toward more
                    engaging (outrage-inducing) content → watch time went up, trust and advertiser relationships
                    went down. The metric was optimized; the goal (valuable video consumption) was not.
                  </p>
                  <p className="text-g-dim border-t border-g-border pt-2">
                    <span className="text-g-tan">Fix:</span> Always pair a <strong>North Star metric</strong>
                    with a <strong>counter-metric</strong>. If you optimize messages_sent, also track
                    artifact_conversion_pct. A rising proxy metric alongside a falling counter-metric tells you
                    you&apos;re Goodharting.
                  </p>
                </div>
              </TerminalCard>
            </>
          )}

        <CrossModuleCard links={[
          { module: "A/B Testing", path: "/modules/ab-testing", insight: "Simpson's Paradox can invalidate A/B results — always segment your experiment results." },
          { module: "Metric Trees", path: "/modules/metric-trees", insight: "Goodhart's Law warns against over-optimizing a single node — the tree shows what else you'll break." },
          { module: "Retention Heatmaps", path: "/modules/retention-heatmaps", insight: "Survivorship bias in retention: if you only measure retained users, cohort curves look artificially healthy." },
        ]} />

        </div>
      </div>
    </div>
  );
}
