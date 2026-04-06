"use client";

import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { COLORS } from "@/lib/utils/colors";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// ── MRR Trend ──────────────────────────────────────────────────────────────

export interface MrrRow {
  month_start: string;
  mrr:         number;
  paid_subs:   number;
  total_subs:  number;
  pro_mrr:     number;
  team_mrr:    number;
}

interface MrrChartProps {
  data:       MrrRow[] | null;
  isLoading?: boolean;
  error?:     string | null;
  width?:     number;
  height?:    number;
}

export function MrrChart({ data, isLoading, error, width = 600, height = 280 }: MrrChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !data || data.length === 0) return;
    ref.current.innerHTML = "";

    const rows = data.map((d) => ({
      date:    new Date(d.month_start),
      mrr:     Number(d.mrr),
      pro_mrr: Number(d.pro_mrr),
      team_mrr:Number(d.team_mrr),
    }));

    // Stacked: pro + team contributions
    const stacked = [
      ...rows.map((d) => ({ date: d.date, value: d.pro_mrr,  tier: "Pro ($20/mo)" })),
      ...rows.map((d) => ({ date: d.date, value: d.team_mrr, tier: "Team ($50/mo)" })),
    ];

    const plot = Plot.plot({
      width, height,
      marginLeft: 60, marginRight: 20, marginTop: 20, marginBottom: 50,
      style: {
        background: "transparent",
        color: COLORS.text,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
      },
      x: {
        label: "Month →",
        labelAnchor: "right",
        tickFormat: (d: Date) => d.toLocaleDateString("en", { month: "short", year: "2-digit" }),
      },
      y: {
        label: "MRR ($) →",
        labelAnchor: "top",
        tickFormat: (v: number) => `$${(v / 1000).toFixed(0)}k`,
      },
      color: {
        domain: ["Pro ($20/mo)", "Team ($50/mo)"],
        range:  [COLORS.purple, COLORS.tan],
        legend: true,
      },
      marks: [
        (Plot.areaY as any)(stacked, Plot.stackY({
          x: "date", y: "value", fill: "tier", fillOpacity: 0.75,
        })),
        Plot.lineY(rows, {
          x: "date", y: "mrr",
          stroke: COLORS.text, strokeWidth: 1.5, strokeDasharray: "2 3",
        }),
        Plot.gridX({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, width, height]);

  if (isLoading) return <div className="flex items-center justify-center h-full"><LoadingSpinner message="Computing MRR…" /></div>;
  if (error)     return <div className="flex items-center justify-center h-full p-4 text-g-red text-xs">{error}</div>;
  if (!data)     return <div className="flex items-center justify-center h-full text-g-dim text-xs">Run query to render chart</div>;

  return <div ref={ref} />;
}

// ── Cohort Revenue Heatmap ──────────────────────────────────────────────────

export interface CohortRevenueRow {
  cohort_month:    string;
  cohort_size:     number;
  total_revenue:   number;
  avg_ltv_per_user:number;
}

interface CohortRevenueProps {
  data:       CohortRevenueRow[] | null;
  isLoading?: boolean;
  error?:     string | null;
  width?:     number;
  height?:    number;
}

export function CohortRevenueChart({ data, isLoading, error, width = 600, height = 260 }: CohortRevenueProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !data || data.length === 0) return;
    ref.current.innerHTML = "";

    const rows = data.map((d) => ({
      ...d,
      avg_ltv_per_user: Number(d.avg_ltv_per_user),
      cohort_size:      Number(d.cohort_size),
      total_revenue:    Number(d.total_revenue),
    }));

    const maxLtv = Math.max(...rows.map((r) => r.avg_ltv_per_user));

    const plot = Plot.plot({
      width, height,
      marginLeft: 70, marginRight: 80, marginTop: 20, marginBottom: 40,
      style: {
        background: "transparent",
        color: COLORS.text,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
      },
      x: {
        domain: rows.map((d) => d.cohort_month),
        label: "Cohort Month →",
        labelAnchor: "right",
        tickRotate: -35,
      },
      y: { label: "Avg LTV / User ($) →", labelAnchor: "top" },
      marks: [
        Plot.barY(rows, {
          x: "cohort_month",
          y: "avg_ltv_per_user",
          fill: (d: typeof rows[0]) => {
            const t = d.avg_ltv_per_user / Math.max(maxLtv, 1);
            return t > 0.7 ? COLORS.tan : t > 0.4 ? COLORS.purple : COLORS.purpleDim;
          },
          fillOpacity: 0.85,
          inset: 2,
        }),
        Plot.text(rows, {
          x: "cohort_month",
          y: "avg_ltv_per_user",
          dy: -5,
          text: (d: typeof rows[0]) => `$${d.avg_ltv_per_user.toFixed(0)}`,
          fill: COLORS.muted,
          fontSize: 9,
          textAnchor: "middle",
        }),
        Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, width, height]);

  if (isLoading) return <div className="flex items-center justify-center h-full"><LoadingSpinner message="Computing cohort LTV…" /></div>;
  if (error)     return <div className="flex items-center justify-center h-full p-4 text-g-red text-xs">{error}</div>;
  if (!data)     return <div className="flex items-center justify-center h-full text-g-dim text-xs">Run query to render chart</div>;

  return <div ref={ref} />;
}
