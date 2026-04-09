"use client";

import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { COLORS } from "@/lib/utils/colors";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useContainerWidth } from "@/lib/hooks/use-container-width";

interface IATRow {
  user_id: string;
  iat_days: number;
  user_type: "artifact_user" | "regular_user";
}

interface SummaryRow {
  user_type: string;
  mean_iat_days: number;
  lambda_estimate: number;
  n: number;
}

interface DistributionChartProps {
  data: IATRow[] | null;
  summary?: SummaryRow[] | null;
  isLoading?: boolean;
  error?: string | null;
  width?: number;
  height?: number;
}

export function IATDistributionChart({ data, summary, isLoading, error, width = 640, height = 380 }: DistributionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, width);
  const chartWidth = containerWidth || width;
  const chartHeight = Math.round(Math.min(height, Math.max(220, chartWidth * 0.59)));

  useEffect(() => {
    if (!ref.current || !data) return;
    ref.current.innerHTML = "";

    // Exponential PDF overlay points
    const pdfPoints: { x: number; y: number; user_type: string }[] = [];
    if (summary) {
      for (const s of summary) {
        const lambda = Number(s.lambda_estimate);
        for (let x = 0.1; x <= 20; x += 0.2) {
          pdfPoints.push({ x, y: lambda * Math.exp(-lambda * x) * 2.5, user_type: s.user_type });
        }
      }
    }

    const plot = Plot.plot({
      width: chartWidth,
      height: chartHeight,
      marginLeft: 60,
      marginBottom: 50,
      marginTop: 20,
      marginRight: 20,
      style: {
        background: "transparent",
        color: COLORS.text,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
      },
      x: {
        domain: [0, 20],
        label: "Inter-Arrival Time (days) →",
        labelAnchor: "right",
      },
      y: { label: "↑ Density" },
      color: {
        domain: ["artifact_user", "regular_user"],
        range: [COLORS.purple, COLORS.tan],
        legend: true,
      },
      marks: [
        // Histogram — binX types are overly strict; cast to any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Plot.rectY as any)(
          data.filter((d) => d.iat_days <= 20),
          Plot.binX(
            { y: "proportion" },
            {
              x: "iat_days",
              fill: "user_type",
              fillOpacity: 0.4,
              thresholds: 40,
              tip: true,
            }
          )
        ),
        // Exponential fit curves
        ...(pdfPoints.length > 0 ? [
          Plot.line(pdfPoints, {
            x: "x",
            y: "y",
            stroke: "user_type",
            strokeWidth: 2,
            strokeOpacity: 0.9,
            curve: "catmull-rom",
          }),
        ] : []),
        // Mean lines
        ...(summary ? summary.map((s) => [
          Plot.ruleX([Number(s.mean_iat_days)], {
            stroke: s.user_type === "artifact_user" ? COLORS.purple : COLORS.tan,
            strokeWidth: 1.5,
            strokeDasharray: "4 3",
            strokeOpacity: 0.7,
          }),
        ]).flat() : []),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, summary, chartWidth, chartHeight]);

  if (isLoading) return <div className="flex items-center justify-center h-full"><LoadingSpinner message="Computing IAT distribution…" /></div>;
  if (error) return <div className="flex items-center justify-center h-full p-4 text-g-red text-xs">{error}</div>;
  if (!data) return <div className="flex items-center justify-center h-full text-g-dim text-xs">Run query to render distribution</div>;

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-2">
      {summary && (
        <div className="flex flex-wrap gap-4 text-[11px] px-1">
          {summary.map((s) => (
            <div key={s.user_type} className="flex items-center gap-1.5">
              <span
                className="w-3 h-0.5 inline-block"
                style={{ background: s.user_type === "artifact_user" ? COLORS.purple : COLORS.tan }}
              />
              <span className="text-g-muted">{s.user_type === "artifact_user" ? "Artifact Users" : "Regular Users"}</span>
              <span className="text-g-text font-bold">λ={Number(s.lambda_estimate).toFixed(3)}</span>
              <span className="text-g-dim">μ={Number(s.mean_iat_days).toFixed(1)}d</span>
              <span className="text-g-dim">n={Number(s.n)}</span>
            </div>
          ))}
        </div>
      )}
      <div ref={ref} />
    </div>
  );
}
