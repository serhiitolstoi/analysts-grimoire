"use client";

import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { COLORS } from "@/lib/utils/colors";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface RetentionRow {
  cohort_month: string;
  day_offset?: number;
  week_number?: number;
  retention_rate: number;
  cohort_size: number;
}

interface HeatmapProps {
  data: RetentionRow[] | null;
  mode?: "daily" | "weekly";
  isLoading?: boolean;
  error?: string | null;
  width?: number;
  height?: number;
}

export function RetentionHeatmap({ data, mode = "weekly", isLoading, error, width = 700, height = 380 }: HeatmapProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !data) return;
    ref.current.innerHTML = "";

    const xKey = mode === "weekly" ? "week_number" : "day_offset";
    const xLabel = mode === "weekly" ? "Week Since Signup" : "Day Since Signup";
    const xMax = mode === "weekly" ? 12 : 30;

    const filtered = data.filter((d) => (d[xKey] ?? 0) <= xMax);

    const plot = Plot.plot({
      width,
      height,
      marginLeft: 70,
      marginBottom: 50,
      marginTop: 20,
      marginRight: 60,
      style: {
        background: "transparent",
        color: COLORS.text,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
      },
      x: {
        label: xLabel,
        labelAnchor: "right",
      },
      y: {
        label: "Cohort",
        domain: [...new Set(filtered.map((d) => d.cohort_month))].sort().reverse(),
      },
      color: {
        type: "sequential",
        scheme: "purples",
        domain: [0, 1],
        label: "Retention %",
        legend: true,
      },
      marks: [
        Plot.cell(filtered, {
          x: xKey,
          y: "cohort_month",
          fill: "retention_rate",
          tip: true,
          title: (d: RetentionRow) =>
            `Cohort: ${d.cohort_month}\n${xLabel}: ${d[xKey]}\nRetention: ${(d.retention_rate * 100).toFixed(1)}%\nCohort size: ${d.cohort_size}`,
          inset: 0.5,
        }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, mode, width, height]);

  if (isLoading) return <div className="flex items-center justify-center h-full"><LoadingSpinner message="Computing retention cohorts…" /></div>;
  if (error) return <div className="flex items-center justify-center h-full p-4 text-g-red text-xs">{error}</div>;
  if (!data) return <div className="flex items-center justify-center h-full text-g-dim text-xs">Run query to render heatmap</div>;

  return <div ref={ref} />;
}
