"use client";

import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { COLORS } from "@/lib/utils/colors";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useContainerWidth } from "@/lib/hooks/use-container-width";

/* ── Types ──────────────────────────────────────────────────────────── */

export interface AdoptionCurveRow {
  event_type: string;
  week: string;
  new_adopters: number;
  cumulative_adopters: number;
  adoption_pct: number;
}

export interface DepthRow {
  depth_bucket: string;
  user_count: number;
  avg_sessions: number;
  retention_pct: number;
  paid_pct: number;
}

export interface PowerUserRow {
  segment: string;
  user_count: number;
  avg_sessions: number;
  avg_depth: number;
  avg_ltv: number;
  avg_tenure_months: number;
  retention_pct: number;
}

export interface TimeToAdoptRow {
  event_type: string;
  days_to_adopt: number;
  user_count: number;
}

/* ── Feature label helper ──────────────────────────────────────────── */

const FEATURE_LABELS: Record<string, string> = {
  artifact_created: "Artifacts",
  code_run: "Code Run",
  file_upload: "File Upload",
};
const FEATURE_COLORS: Record<string, string> = {
  artifact_created: COLORS.tan,
  code_run: COLORS.purple,
  file_upload: COLORS.blue,
};
function featureLabel(t: string) { return FEATURE_LABELS[t] || t; }
function featureColor(t: string) { return FEATURE_COLORS[t] || COLORS.muted; }

/* ── S-Curve Chart ──────────────────────────────────────────────────── */

interface SCurveProps {
  data: AdoptionCurveRow[] | null;
  isLoading?: boolean;
  error?: string | null;
}

export function SCurveChart({ data, isLoading, error }: SCurveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, 600);
  const chartWidth = containerWidth || 600;
  const chartHeight = Math.round(Math.min(300, Math.max(200, chartWidth * 0.48)));

  useEffect(() => {
    if (!ref.current || !data || data.length === 0) return;
    ref.current.innerHTML = "";

    const rows = data.map((d) => ({
      feature: featureLabel(d.event_type),
      date: new Date(d.week),
      pct: Number(d.adoption_pct),
      color: featureColor(d.event_type),
    }));

    const features = [...new Set(rows.map((r) => r.feature))];

    const plot = Plot.plot({
      width: chartWidth, height: chartHeight,
      marginLeft: 45, marginRight: 20, marginTop: 10, marginBottom: 40,
      style: {
        background: "transparent",
        color: COLORS.text,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
      },
      x: {
        label: "Week →",
        labelAnchor: "right",
        tickFormat: (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      },
      y: { label: "Adoption % →", labelAnchor: "top", domain: [0, 100] },
      color: {
        domain: features,
        range: features.map((f) => {
          const row = rows.find((r) => r.feature === f);
          return row ? row.color : COLORS.muted;
        }),
        legend: true,
      },
      marks: [
        Plot.lineY(rows, {
          x: "date", y: "pct", stroke: "feature",
          strokeWidth: 2.5, curve: "catmull-rom",
        }),
        Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, chartWidth, chartHeight]);

  if (isLoading) return <div className="flex items-center justify-center py-8"><LoadingSpinner message="Computing adoption curves..." /></div>;
  if (error)     return <div className="flex items-center justify-center py-6 text-g-red text-xs">{error}</div>;
  if (!data)     return <div className="flex items-center justify-center py-6 text-g-dim text-xs">Run query to render chart</div>;

  return <div ref={containerRef} className="w-full"><div ref={ref} /></div>;
}

/* ── Depth-Retention Chart ──────────────────────────────────────────── */

interface DepthChartProps {
  data: DepthRow[] | null;
  isLoading?: boolean;
  error?: string | null;
}

export function DepthRetentionChart({ data, isLoading, error }: DepthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, 600);
  const chartWidth = containerWidth || 600;
  const chartHeight = Math.round(Math.min(280, Math.max(180, chartWidth * 0.44)));

  useEffect(() => {
    if (!ref.current || !data || data.length === 0) return;
    ref.current.innerHTML = "";

    const rows = data.map((d) => ({
      bucket: String(d.depth_bucket),
      retention: Number(d.retention_pct),
      paid: Number(d.paid_pct),
      users: Number(d.user_count),
    }));

    // Paired bars: retention + paid %
    const paired = [
      ...rows.map((r) => ({ bucket: r.bucket, metric: "Retention %", value: r.retention })),
      ...rows.map((r) => ({ bucket: r.bucket, metric: "Paid %", value: r.paid })),
    ];

    const plot = Plot.plot({
      width: chartWidth, height: chartHeight,
      marginLeft: 90, marginRight: 20, marginTop: 10, marginBottom: 30,
      style: {
        background: "transparent",
        color: COLORS.text,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
      },
      x: { label: "% →", labelAnchor: "right", domain: [0, 100] },
      y: { label: null, domain: rows.map((r) => r.bucket) },
      fy: { label: null },
      color: {
        domain: ["Retention %", "Paid %"],
        range: [COLORS.green, COLORS.purple],
        legend: true,
      },
      marks: [
        Plot.barX(paired, {
          x: "value", y: "bucket", fill: "metric",
          fillOpacity: 0.8, inset: 2,
        }),
        Plot.text(paired, {
          x: "value", y: "bucket",
          dx: 6,
          text: (d: typeof paired[0]) => `${d.value.toFixed(0)}%`,
          fill: (d: typeof paired[0]) => d.metric === "Retention %" ? COLORS.green : COLORS.purple,
          fontSize: 9,
          textAnchor: "start",
        }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, chartWidth, chartHeight]);

  if (isLoading) return <div className="flex items-center justify-center py-8"><LoadingSpinner message="Computing depth analysis..." /></div>;
  if (error)     return <div className="flex items-center justify-center py-6 text-g-red text-xs">{error}</div>;
  if (!data)     return <div className="flex items-center justify-center py-6 text-g-dim text-xs">Run query to render chart</div>;

  return <div ref={containerRef} className="w-full"><div ref={ref} /></div>;
}

/* ── Power User Table ──────────────────────────────────────────────── */

interface PowerUserTableProps {
  data: PowerUserRow[] | null;
  isLoading?: boolean;
  error?: string | null;
}

export function PowerUserTable({ data, isLoading, error }: PowerUserTableProps) {
  if (isLoading) return <div className="flex items-center justify-center py-8"><LoadingSpinner message="Computing segments..." /></div>;
  if (error)     return <div className="flex items-center justify-center py-6 text-g-red text-xs">{error}</div>;
  if (!data)     return <div className="flex items-center justify-center py-6 text-g-dim text-xs">Run query to render table</div>;

  return (
    <div className="overflow-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="border-b border-g-border">
            {["Segment", "Users", "Avg Sessions", "Avg Depth", "Retention %", "Avg Tenure", "Avg LTV"].map((h) => (
              <th key={h} className="text-right first:text-left py-2 pr-3 text-g-muted font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const seg = String(row.segment);
            const color = seg === "Power User" ? "text-g-tan" : seg === "Multi Feature" ? "text-g-purple" : "text-g-muted";
            return (
              <tr key={seg} className="border-b border-g-border/40 hover:bg-g-elevated/40 transition-colors">
                <td className={`py-2 pr-3 font-bold ${color}`}>{seg}</td>
                <td className="py-2 pr-3 text-right text-g-muted">{Number(row.user_count).toLocaleString()}</td>
                <td className="py-2 pr-3 text-right text-g-text">{Number(row.avg_sessions).toFixed(1)}</td>
                <td className="py-2 pr-3 text-right text-g-text">{Number(row.avg_depth).toFixed(1)}</td>
                <td className="py-2 pr-3 text-right">
                  <span className={Number(row.retention_pct) > 50 ? "text-g-green" : Number(row.retention_pct) > 30 ? "text-g-tan" : "text-g-red"}>
                    {Number(row.retention_pct).toFixed(1)}%
                  </span>
                </td>
                <td className="py-2 pr-3 text-right text-g-muted">{Number(row.avg_tenure_months).toFixed(1)} mo</td>
                <td className="py-2 pr-3 text-right text-g-tan font-bold">${Number(row.avg_ltv).toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Time-to-Adopt Box Plots ──────────────────────────────────────── */

interface TimeToAdoptProps {
  data: TimeToAdoptRow[] | null;
  isLoading?: boolean;
  error?: string | null;
}

export function TimeToAdoptChart({ data, isLoading, error }: TimeToAdoptProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, 600);
  const chartWidth = containerWidth || 600;
  const chartHeight = Math.round(Math.min(280, Math.max(180, chartWidth * 0.44)));

  useEffect(() => {
    if (!ref.current || !data || data.length === 0) return;
    ref.current.innerHTML = "";

    // Expand weighted rows for percentile computation
    const expanded: { feature: string; days: number }[] = [];
    for (const row of data) {
      const feature = featureLabel(row.event_type);
      const days = Number(row.days_to_adopt);
      const count = Number(row.user_count);
      for (let i = 0; i < Math.min(count, 50); i++) {
        expanded.push({ feature, days });
      }
    }

    // Compute percentiles per feature
    const features = [...new Set(expanded.map((r) => r.feature))];
    const stats = features.map((f) => {
      const vals = expanded.filter((r) => r.feature === f).map((r) => r.days).sort((a, b) => a - b);
      const pct = (p: number) => vals[Math.floor(vals.length * p)] || 0;
      return { feature: f, p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p90: pct(0.9), min: vals[0] || 0 };
    });

    const plot = Plot.plot({
      width: chartWidth, height: chartHeight,
      marginLeft: 90, marginRight: 30, marginTop: 10, marginBottom: 40,
      style: {
        background: "transparent",
        color: COLORS.text,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
      },
      x: { label: "Days from Signup →", labelAnchor: "right" },
      y: { label: null, domain: stats.map((s) => s.feature) },
      marks: [
        // Whisker: p25 to p90
        Plot.link(stats, {
          x1: "p25", x2: "p90", y1: "feature", y2: "feature",
          stroke: COLORS.muted, strokeWidth: 1,
        }),
        // Box: p25 to p75
        Plot.barX(stats, {
          x1: "p25", x2: "p75", y: "feature",
          fill: (d: typeof stats[0]) => featureColor(
            Object.entries(FEATURE_LABELS).find(([, v]) => v === d.feature)?.[0] || ""
          ),
          fillOpacity: 0.6,
          inset: 8,
        }),
        // Median line
        Plot.tickX(stats, {
          x: "p50", y: "feature",
          stroke: COLORS.text, strokeWidth: 2.5,
          inset: 8,
        }),
        // p90 label
        Plot.text(stats, {
          x: "p90", y: "feature", dx: 8,
          text: (d: typeof stats[0]) => `p90: ${d.p90}d`,
          fill: COLORS.muted, fontSize: 9, textAnchor: "start",
        }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, chartWidth, chartHeight]);

  if (isLoading) return <div className="flex items-center justify-center py-8"><LoadingSpinner message="Computing time-to-adopt..." /></div>;
  if (error)     return <div className="flex items-center justify-center py-6 text-g-red text-xs">{error}</div>;
  if (!data)     return <div className="flex items-center justify-center py-6 text-g-dim text-xs">Run query to render chart</div>;

  return <div ref={containerRef} className="w-full"><div ref={ref} /></div>;
}
