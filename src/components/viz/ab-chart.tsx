"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import * as Plot from "@observablehq/plot";
import { COLORS } from "@/lib/utils/colors";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useContainerWidth } from "@/lib/hooks/use-container-width";

// ── Statistical helpers ────────────────────────────────────────────────────

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t
    - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

export interface TestStats {
  z: number;
  pValue: number;
  ci95_ctrl: [number, number];
  ci95_treat: [number, number];
  delta: number;
  relative_lift: number;
  significant: boolean;
}

export function computeZTest(
  p_ctrl: number, n_ctrl: number,
  p_treat: number, n_treat: number,
): TestStats {
  const pc = p_ctrl / 100;
  const pt = p_treat / 100;
  const se_ctrl  = Math.sqrt(pc * (1 - pc) / n_ctrl);
  const se_treat = Math.sqrt(pt * (1 - pt) / n_treat);
  const p_pool = (pc * n_ctrl + pt * n_treat) / (n_ctrl + n_treat);
  const se_pool = Math.sqrt(p_pool * (1 - p_pool) * (1 / n_ctrl + 1 / n_treat));
  const z = (pt - pc) / (se_pool || 0.001);
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  return {
    z,
    pValue,
    ci95_ctrl:  [pc - 1.96 * se_ctrl,  pc + 1.96 * se_ctrl].map(v => v * 100) as [number, number],
    ci95_treat: [pt - 1.96 * se_treat, pt + 1.96 * se_treat].map(v => v * 100) as [number, number],
    delta: (pt - pc) * 100,
    relative_lift: pc > 0 ? ((pt - pc) / pc) * 100 : 0,
    significant: pValue < 0.05,
  };
}

// ── Sample Size Calculator ─────────────────────────────────────────────────

export function SampleSizeCalculator() {
  const [baseline, setBaseline] = useState(30);
  const [mde, setMde]           = useState(5);
  const [alpha, setAlpha]       = useState(5);   // as %
  const [power, setPower]       = useState(80);  // as %

  const result = useMemo(() => {
    const z_alpha = alpha === 5 ? 1.96 : alpha === 1 ? 2.576 : 1.645;
    const z_beta  = power === 80 ? 0.842 : power === 90 ? 1.282 : power === 95 ? 1.645 : 0.842;
    const p1 = baseline / 100;
    const p2 = (baseline + mde) / 100;
    const p_pool = (p1 + p2) / 2;
    const n = Math.ceil(
      Math.pow(
        z_alpha * Math.sqrt(2 * p_pool * (1 - p_pool)) +
        z_beta  * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)),
        2
      ) / Math.pow(p2 - p1, 2)
    );
    const totalDays = (n * 2) / (1000 / 7); // assume 1000 signups/week
    return { n, total: n * 2, days: Math.ceil(totalDays) };
  }, [baseline, mde, alpha, power]);

  const SliderRow = ({ label, value, min, max, step, unit, onChange, color }: {
    label: string; value: number; min: number; max: number; step: number;
    unit: string; onChange: (v: number) => void; color: string;
  }) => (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-g-muted uppercase tracking-wider">{label}</span>
        <span style={{ color }} className="font-bold tabular-nums">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        className="w-full" onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );

  return (
    <div className="space-y-4 text-[11px]">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <SliderRow label="Baseline Rate"      value={baseline} min={5}  max={80} step={1}  unit="%" onChange={setBaseline} color={COLORS.tan} />
          <SliderRow label="Min. Detectable Δ"  value={mde}      min={1}  max={20} step={0.5} unit=" pp" onChange={setMde} color={COLORS.purple} />
          <SliderRow label="Significance (α)"   value={alpha}    min={1}  max={10} step={1}  unit="%" onChange={setAlpha} color={COLORS.red} />
          <SliderRow label="Statistical Power"  value={power}    min={70} max={95} step={5}  unit="%" onChange={setPower} color={COLORS.green} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="rounded border border-g-border bg-g-elevated p-3 text-center">
            <div className="text-[10px] text-g-muted uppercase tracking-wider">Per Group</div>
            <div className="text-3xl font-bold text-g-tan tabular-nums mt-1">
              {result.n.toLocaleString()}
            </div>
            <div className="text-[10px] text-g-dim">users required</div>
          </div>
          <div className="rounded border border-g-border p-2 text-center">
            <div className="text-[10px] text-g-muted">Total sample</div>
            <div className="text-lg font-bold text-g-text tabular-nums">{result.total.toLocaleString()}</div>
          </div>
          <div className="rounded border border-g-border p-2 text-center">
            <div className="text-[10px] text-g-muted">Runtime (1k signups/wk)</div>
            <div className="text-lg font-bold text-g-purple tabular-nums">{result.days} days</div>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-g-dim border-t border-g-border pt-2 space-y-1">
        <p><span className="text-g-tan">Formula:</span> n = (z_α + z_β)² × [p₁(1-p₁) + p₂(1-p₂)] / Δ²</p>
        <p>Detecting a <span className="text-g-purple font-bold">{mde}pp lift</span> (from {baseline}% → {baseline + mde}%) with {power}% power requires <span className="text-g-tan font-bold">{result.n.toLocaleString()} users/group</span>.</p>
      </div>
    </div>
  );
}

// ── A/B Bar Chart ──────────────────────────────────────────────────────────

export interface ABGroupRow {
  ab_group: string;
  n: number;
  n_activated: number;
  n_artifact: number;
  n_code: number;
  activation_rate: number;
  artifact_rate: number;
  code_rate: number;
  avg_messages: number;
}

export type MetricKey = "activation_rate" | "artifact_rate" | "code_rate";

const METRIC_LABELS: Record<MetricKey, string> = {
  activation_rate: "Activation Rate (%)",
  artifact_rate:   "Artifact Adoption (%)",
  code_rate:       "Code Runner Adoption (%)",
};

interface ABBarChartProps {
  data: ABGroupRow[] | null;
  metric?: MetricKey;
  isLoading?: boolean;
  error?: string | null;
}

export function ABBarChart({ data, metric = "artifact_rate", isLoading, error }: ABBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, 500);
  const chartWidth = containerWidth || 500;
  const chartHeight = Math.max(200, Math.round(chartWidth * 0.42));

  const stats = useMemo(() => {
    if (!data || data.length < 2) return null;
    const ctrl  = data.find((d) => d.ab_group === "Control");
    const treat = data.find((d) => d.ab_group === "Treatment");
    if (!ctrl || !treat) return null;
    return computeZTest(ctrl[metric], ctrl.n, treat[metric], treat.n);
  }, [data, metric]);

  useEffect(() => {
    if (!ref.current || !data || data.length === 0 || !stats) return;
    ref.current.innerHTML = "";

    const ctrl  = data.find((d) => d.ab_group === "Control")!;
    const treat = data.find((d) => d.ab_group === "Treatment")!;

    const bars = [
      { group: "Control",   value: ctrl[metric],  lo: stats.ci95_ctrl[0],  hi: stats.ci95_ctrl[1] },
      { group: "Treatment", value: treat[metric], lo: stats.ci95_treat[0], hi: stats.ci95_treat[1] },
    ];

    const maxVal = Math.max(stats.ci95_ctrl[1], stats.ci95_treat[1]) * 1.2;

    const treatColor = stats.significant
      ? (stats.delta > 0 ? COLORS.green : COLORS.red)
      : COLORS.purple;

    const plot = Plot.plot({
      width: chartWidth, height: chartHeight,
      marginLeft: 60, marginRight: 20, marginTop: 20, marginBottom: 50,
      style: { background: "transparent", color: COLORS.text, fontFamily: "var(--font-mono)", fontSize: "11px" },
      x: { domain: ["Control", "Treatment"], label: null },
      y: { domain: [0, maxVal], label: `${METRIC_LABELS[metric]} →`, labelAnchor: "top" },
      marks: [
        Plot.barY(bars, {
          x: "group",
          y: "value",
          fill: (d: typeof bars[0]) => d.group === "Control" ? COLORS.muted : treatColor,
          fillOpacity: 0.75,
          inset: Math.max(15, chartWidth * 0.1),
        }),
        // 95% CI whiskers
        Plot.ruleX(bars, { x: "group", y1: "lo", y2: "hi", stroke: COLORS.text, strokeWidth: 2, strokeOpacity: 0.7 }),
        Plot.tickX(bars, { x: "group", y: "hi", stroke: COLORS.text, strokeWidth: 2 }),
        Plot.tickX(bars, { x: "group", y: "lo", stroke: COLORS.text, strokeWidth: 2 }),
        // Value labels
        Plot.text(bars, {
          x: "group", y: "value", dy: -18,
          text: (d: typeof bars[0]) => `${d.value.toFixed(1)}%`,
          fill: COLORS.text, fontSize: 12, fontWeight: "bold", textAnchor: "middle",
        }),
        Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, metric, stats, chartWidth, chartHeight]);

  if (isLoading) return <div className="flex items-center justify-center h-32"><LoadingSpinner message="Computing A/B results…" /></div>;
  if (error) return <div className="p-4 text-g-red text-xs">{error}</div>;
  if (!data) return <div className="p-4 text-g-dim text-xs">Run query to see results</div>;

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-3">
      {stats && (
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className={`px-2 py-1 rounded border font-bold ${
            stats.significant
              ? stats.delta > 0
                ? "border-g-green text-g-green bg-g-green/10"
                : "border-g-red text-g-red bg-g-red/10"
              : "border-g-border text-g-muted"
          }`}>
            {stats.significant
              ? stats.delta > 0 ? "✓ Significant improvement" : "✗ Significant regression"
              : "○ Not statistically significant"}
          </div>
          <span className="text-g-dim">z = {stats.z.toFixed(3)}</span>
          <span className="text-g-dim">p = {stats.pValue < 0.001 ? "<0.001" : stats.pValue.toFixed(3)}</span>
          <span className={stats.delta > 0 ? "text-g-green" : "text-g-red"}>
            Δ = {stats.delta > 0 ? "+" : ""}{stats.delta.toFixed(2)} pp
            ({stats.relative_lift > 0 ? "+" : ""}{stats.relative_lift.toFixed(1)}% relative)
          </span>
        </div>
      )}
      <div ref={ref} />
    </div>
  );
}

// ── WAU Time Series Chart for A/B groups ──────────────────────────────────

interface ABWeekRow {
  week_start: string;
  control_wau: number;
  treatment_wau: number;
}

interface ABTimeSeriesProps {
  data: ABWeekRow[] | null;
  isLoading?: boolean;
  error?: string | null;
}

export function ABTimeSeriesChart({ data, isLoading, error }: ABTimeSeriesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, 560);
  const chartWidth = containerWidth || 560;
  const chartHeight = Math.max(200, Math.round(chartWidth * 0.45));

  useEffect(() => {
    if (!ref.current || !data || data.length === 0) return;
    ref.current.innerHTML = "";

    const rows = data.map((d) => ({ ...d, date: new Date(d.week_start) }));
    const combined = [
      ...rows.map((d) => ({ date: d.date, wau: Number(d.control_wau),   group: "Control" })),
      ...rows.map((d) => ({ date: d.date, wau: Number(d.treatment_wau), group: "Treatment" })),
    ];

    const plot = Plot.plot({
      width: chartWidth, height: chartHeight,
      marginLeft: 55, marginRight: 80, marginTop: 20, marginBottom: 50,
      style: { background: "transparent", color: COLORS.text, fontFamily: "var(--font-mono)", fontSize: "11px" },
      x: { label: "Week →", labelAnchor: "right",
           tickFormat: (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" }) },
      y: { label: "↑ Active Users", labelAnchor: "top" },
      color: { domain: ["Control", "Treatment"], range: [COLORS.muted, COLORS.purple], legend: true },
      marks: [
        Plot.lineY(combined, { x: "date", y: "wau", stroke: "group", strokeWidth: 2 }),
        Plot.text(
          combined.filter((_, i, a) => i === a.length - 1 || i === a.length / 2 - 1),
          { x: "date", y: "wau", dx: 6, text: "group", fill: (d: typeof combined[0]) => d.group === "Control" ? COLORS.muted : COLORS.purple, fontSize: 9, textAnchor: "start" }
        ),
        Plot.gridX({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, chartWidth, chartHeight]);

  if (isLoading) return <div className="flex items-center justify-center h-32"><LoadingSpinner message="Computing weekly trends…" /></div>;
  if (error) return <div className="p-4 text-g-red text-xs">{error}</div>;
  if (!data) return <div className="p-4 text-g-dim text-xs">Run query to see chart</div>;

  return <div ref={containerRef} className="w-full"><div ref={ref} /></div>;
}
