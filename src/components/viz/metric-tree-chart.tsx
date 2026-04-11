"use client";

import { useEffect, useRef, useMemo } from "react";
import * as Plot from "@observablehq/plot";
import { COLORS } from "@/lib/utils/colors";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useContainerWidth } from "@/lib/hooks/use-container-width";

/* ── Types ──────────────────────────────────────────────────────────── */

export interface MetricTreeRow {
  total_signups: number;
  onboarded: number;
  onboarding_rate: number;
  activated_users: number;
  activation_rate: number;
  artifact_users: number;
  artifact_adoption_rate: number;
  code_users: number;
  code_adoption_rate: number;
  paid_count: number;
  pro_count: number;
  team_count: number;
  conversion_rate: number;
  mrr: number;
  pro_mrr: number;
  team_mrr: number;
  arpu: number;
  week4_retention: number;
  avg_iat_days: number;
}

export interface MonthlySensitivityRow {
  month: string;
  signups: number;
  onboarded: number;
  active_users: number;
  artifact_users: number;
  mrr: number;
  paid_subs: number;
  onboarding_rate: number;
  artifact_rate: number;
  arpu: number;
}

export interface DriverRow {
  user_id: string;
  total_events: number;
  sessions: number;
  artifacts: number;
  active_days: number;
  ltv: number;
  plan: string;
}

/* ── Tree Node Layout ──────────────────────────────────────────────── */

interface TreeNode {
  id: string;
  label: string;
  value: string;
  unit: string;
  x: number;      // 0-1 relative
  y: number;      // 0-1 relative
  color: string;
  children?: string[];
  operator?: string;  // ×, +, →
}

function buildTreeNodes(d: MetricTreeRow): TreeNode[] {
  const mrr = Number(d.mrr) || 0;
  const arpu = Number(d.arpu) || 0;
  const paidCount = Number(d.paid_count) || 0;

  return [
    // Level 0 — North Star
    { id: "mrr", label: "MRR", value: `$${mrr.toLocaleString()}`, unit: "/mo",
      x: 0.5, y: 0.03, color: COLORS.green, children: ["paid_users", "arpu"], operator: "=" },

    // Level 1 — Primary drivers
    { id: "paid_users", label: "Paid Users", value: paidCount.toLocaleString(), unit: "",
      x: 0.25, y: 0.22, color: COLORS.purple, children: ["signups", "onboard", "activate", "convert"], operator: "×" },
    { id: "arpu", label: "ARPU", value: `$${arpu.toFixed(0)}`, unit: "/mo",
      x: 0.75, y: 0.22, color: COLORS.tan, children: ["pro_mix", "team_mix"] },

    // Level 2 — Funnel stages
    { id: "signups", label: "Signups", value: Number(d.total_signups).toLocaleString(), unit: "",
      x: 0.08, y: 0.44, color: COLORS.muted },
    { id: "onboard", label: "Onboarding", value: `${Number(d.onboarding_rate).toFixed(0)}%`, unit: "",
      x: 0.25, y: 0.44, color: Number(d.onboarding_rate) > 70 ? COLORS.green : Number(d.onboarding_rate) > 50 ? COLORS.tan : COLORS.red },
    { id: "activate", label: "Activation", value: `${Number(d.activation_rate).toFixed(0)}%`, unit: "",
      x: 0.42, y: 0.44, color: Number(d.activation_rate) > 70 ? COLORS.green : Number(d.activation_rate) > 50 ? COLORS.tan : COLORS.red },
    { id: "convert", label: "Conversion", value: `${Number(d.conversion_rate).toFixed(0)}%`, unit: "",
      x: 0.58, y: 0.44, color: Number(d.conversion_rate) > 30 ? COLORS.green : Number(d.conversion_rate) > 15 ? COLORS.tan : COLORS.red },

    // Level 2 — ARPU drivers
    { id: "pro_mix", label: "Pro", value: `$${Number(d.pro_mrr).toLocaleString()}`, unit: "",
      x: 0.72, y: 0.44, color: COLORS.purple },
    { id: "team_mix", label: "Team", value: `$${Number(d.team_mrr).toLocaleString()}`, unit: "",
      x: 0.88, y: 0.44, color: COLORS.tan },

    // Level 3 — Behavioral signals
    { id: "artifact", label: "Artifact Adopt.", value: `${Number(d.artifact_adoption_rate).toFixed(0)}%`, unit: "",
      x: 0.15, y: 0.66, color: Number(d.artifact_adoption_rate) > 40 ? COLORS.green : Number(d.artifact_adoption_rate) > 25 ? COLORS.tan : COLORS.red },
    { id: "retention", label: "Wk-4 Retention", value: `${Number(d.week4_retention).toFixed(0)}%`, unit: "",
      x: 0.42, y: 0.66, color: Number(d.week4_retention) > 40 ? COLORS.green : Number(d.week4_retention) > 25 ? COLORS.tan : COLORS.red },
    { id: "iat", label: "Avg IAT", value: `${Number(d.avg_iat_days).toFixed(1)}d`, unit: "",
      x: 0.68, y: 0.66, color: Number(d.avg_iat_days) < 3 ? COLORS.green : Number(d.avg_iat_days) < 5 ? COLORS.tan : COLORS.red },
    { id: "code_adopt", label: "Code Adopt.", value: `${Number(d.code_adoption_rate).toFixed(0)}%`, unit: "",
      x: 0.88, y: 0.66, color: Number(d.code_adoption_rate) > 30 ? COLORS.green : Number(d.code_adoption_rate) > 15 ? COLORS.tan : COLORS.red },
  ];
}

const EDGES: [string, string][] = [
  ["mrr", "paid_users"], ["mrr", "arpu"],
  ["paid_users", "signups"], ["paid_users", "onboard"], ["paid_users", "activate"], ["paid_users", "convert"],
  ["arpu", "pro_mix"], ["arpu", "team_mix"],
  ["activate", "artifact"], ["activate", "retention"],
  ["retention", "iat"],
  ["arpu", "code_adopt"],
];

/* ── MetricTreeViz ──────────────────────────────────────────────────── */

interface MetricTreeVizProps {
  data: MetricTreeRow | null;
  isLoading?: boolean;
  error?: string | null;
}

export function MetricTreeViz({ data, isLoading, error }: MetricTreeVizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, 600);
  const w = containerWidth || 600;
  const h = Math.round(Math.max(340, w * 0.55));

  const nodes = useMemo(() => data ? buildTreeNodes(data) : [], [data]);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  if (isLoading) return <div className="flex items-center justify-center py-8"><LoadingSpinner message="Computing metric tree..." /></div>;
  if (error)     return <div className="flex items-center justify-center py-6 text-g-red text-xs">{error}</div>;
  if (!data)     return <div className="flex items-center justify-center py-6 text-g-dim text-xs">Run query to render tree</div>;

  const nodeW = Math.min(100, w * 0.14);
  const nodeH = Math.min(46, h * 0.1);
  const fontSize = Math.max(8, Math.min(11, w * 0.017));

  return (
    <div ref={containerRef} className="w-full">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="select-none">
        {/* Edges */}
        {EDGES.map(([fromId, toId]) => {
          const from = nodeMap.get(fromId);
          const to = nodeMap.get(toId);
          if (!from || !to) return null;
          const x1 = from.x * w;
          const y1 = from.y * h + nodeH;
          const x2 = to.x * w;
          const y2 = to.y * h;
          const midY = (y1 + y2) / 2;
          return (
            <path
              key={`${fromId}-${toId}`}
              d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              fill="none"
              stroke={COLORS.border}
              strokeWidth={1.5}
              strokeOpacity={0.5}
            />
          );
        })}

        {/* Operator labels on edges from mrr */}
        <text x={w * 0.37} y={h * 0.14} fill={COLORS.muted} fontSize={fontSize + 2} textAnchor="middle" fontFamily="var(--font-mono)">x</text>

        {/* Nodes */}
        {nodes.map((node) => {
          const cx = node.x * w;
          const cy = node.y * h;
          const rx = nodeW / 2;
          const ry = nodeH / 2;
          return (
            <g key={node.id}>
              <rect
                x={cx - rx} y={cy}
                width={nodeW} height={nodeH}
                rx={6} ry={6}
                fill={COLORS.elevated}
                stroke={node.color}
                strokeWidth={node.id === "mrr" ? 2 : 1.5}
                strokeOpacity={0.8}
              />
              <text
                x={cx} y={cy + ry * 0.65}
                fill={COLORS.muted}
                fontSize={fontSize - 1}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {node.label}
              </text>
              <text
                x={cx} y={cy + ry * 1.4}
                fill={node.color}
                fontSize={fontSize + 1}
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {node.value}{node.unit}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Sensitivity Chart ──────────────────────────────────────────────── */

interface SensitivityProps {
  treeData: MetricTreeRow | null;
  monthlyData: MonthlySensitivityRow[] | null;
  isLoading?: boolean;
  error?: string | null;
}

export function SensitivityChart({ treeData, monthlyData, isLoading, error }: SensitivityProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, 600);
  const chartWidth = containerWidth || 600;
  const chartHeight = Math.round(Math.min(300, Math.max(200, chartWidth * 0.48)));

  useEffect(() => {
    if (!ref.current || !monthlyData || monthlyData.length < 2) return;
    ref.current.innerHTML = "";

    // Compute sensitivity: for each metric, what's the % change from first to last month?
    const first = monthlyData[0];
    const last = monthlyData[monthlyData.length - 1];

    const metrics = [
      { metric: "MRR", first: Number(first.mrr), last: Number(last.mrr) },
      { metric: "Paid Subs", first: Number(first.paid_subs), last: Number(last.paid_subs) },
      { metric: "Onboarding %", first: Number(first.onboarding_rate), last: Number(last.onboarding_rate) },
      { metric: "Artifact %", first: Number(first.artifact_rate), last: Number(last.artifact_rate) },
      { metric: "ARPU", first: Number(first.arpu), last: Number(last.arpu) },
      { metric: "Signups", first: Number(first.signups), last: Number(last.signups) },
      { metric: "Active Users", first: Number(first.active_users), last: Number(last.active_users) },
    ].map((m) => ({
      metric: m.metric,
      change: m.first > 0 ? ((m.last - m.first) / m.first) * 100 : 0,
    })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    const plot = Plot.plot({
      width: chartWidth, height: chartHeight,
      marginLeft: 100, marginRight: 40, marginTop: 10, marginBottom: 30,
      style: {
        background: "transparent",
        color: COLORS.text,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
      },
      x: {
        label: "% Change (first → last month) →",
        labelAnchor: "right",
        tickFormat: (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`,
      },
      y: {
        domain: metrics.map((m) => m.metric),
        label: null,
      },
      marks: [
        Plot.barX(metrics, {
          x: "change",
          y: "metric",
          fill: (d: typeof metrics[0]) => d.change >= 0 ? COLORS.green : COLORS.red,
          fillOpacity: 0.8,
          inset: 3,
        }),
        Plot.text(metrics.filter((m) => m.change >= 0), {
          x: "change", y: "metric", dx: 6,
          text: (d: typeof metrics[0]) => `+${d.change.toFixed(1)}%`,
          fill: COLORS.green, fontSize: 9, textAnchor: "start",
        }),
        Plot.text(metrics.filter((m) => m.change < 0), {
          x: "change", y: "metric", dx: -6,
          text: (d: typeof metrics[0]) => `${d.change.toFixed(1)}%`,
          fill: COLORS.red, fontSize: 9, textAnchor: "end",
        }),
        Plot.ruleX([0], { stroke: COLORS.muted, strokeWidth: 1 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [monthlyData, chartWidth, chartHeight]);

  if (isLoading) return <div className="flex items-center justify-center py-8"><LoadingSpinner message="Computing sensitivity..." /></div>;
  if (error)     return <div className="flex items-center justify-center py-6 text-g-red text-xs">{error}</div>;
  if (!monthlyData) return <div className="flex items-center justify-center py-6 text-g-dim text-xs">Run query to render chart</div>;

  return <div ref={containerRef} className="w-full"><div ref={ref} /></div>;
}

/* ── Driver Scatter ──────────────────────────────────────────────────── */

interface DriverScatterProps {
  data: DriverRow[] | null;
  isLoading?: boolean;
  error?: string | null;
}

export function DriverScatter({ data, isLoading, error }: DriverScatterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, 600);
  const chartWidth = containerWidth || 600;
  const chartHeight = Math.round(Math.min(300, Math.max(200, chartWidth * 0.48)));

  useEffect(() => {
    if (!ref.current || !data || data.length === 0) return;
    ref.current.innerHTML = "";

    const rows = data.map((d) => ({
      sessions: Number(d.sessions),
      artifacts: Number(d.artifacts),
      ltv: Number(d.ltv),
      plan: String(d.plan || "free"),
    })).filter((d) => d.ltv > 0);

    const plot = Plot.plot({
      width: chartWidth, height: chartHeight,
      marginLeft: 50, marginRight: 20, marginTop: 10, marginBottom: 40,
      style: {
        background: "transparent",
        color: COLORS.text,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
      },
      x: { label: "Sessions →", labelAnchor: "right" },
      y: { label: "LTV ($) →", labelAnchor: "top" },
      color: {
        domain: ["team", "pro", "free"],
        range: [COLORS.tan, COLORS.purple, COLORS.muted],
        legend: true,
      },
      r: { range: [2, 12] },
      marks: [
        Plot.dot(rows, {
          x: "sessions",
          y: "ltv",
          r: "artifacts",
          fill: "plan",
          fillOpacity: 0.6,
          stroke: "plan",
          strokeOpacity: 0.3,
        }),
        Plot.gridX({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, chartWidth, chartHeight]);

  if (isLoading) return <div className="flex items-center justify-center py-8"><LoadingSpinner message="Computing correlations..." /></div>;
  if (error)     return <div className="flex items-center justify-center py-6 text-g-red text-xs">{error}</div>;
  if (!data)     return <div className="flex items-center justify-center py-6 text-g-dim text-xs">Run query to render chart</div>;

  return (
    <div ref={containerRef} className="w-full">
      <div ref={ref} />
      <p className="text-[10px] text-g-dim mt-1 px-1">Bubble size = artifact count. Color = plan tier.</p>
    </div>
  );
}
