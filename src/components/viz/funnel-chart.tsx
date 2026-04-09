"use client";

import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { COLORS } from "@/lib/utils/colors";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useContainerWidth } from "@/lib/hooks/use-container-width";

interface FunnelRow {
  step: string;
  n: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

const STEP_LABELS: Record<string, string> = {
  signup_to_message:   "Signup → First Message",
  message_to_artifact: "First Message → First Artifact",
  message_to_code:     "First Message → First Code Run",
};

interface FunnelChartProps {
  data: FunnelRow[] | null;
  isLoading?: boolean;
  error?: string | null;
  width?: number;
  height?: number;
}

export function FunnelChart({ data, isLoading, error, width = 640, height = 300 }: FunnelChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, width);
  const chartWidth = containerWidth || width;
  const chartHeight = Math.round(Math.min(height, Math.max(180, chartWidth * 0.47)));
  const marginLeft = Math.min(200, Math.round(chartWidth * 0.35));

  useEffect(() => {
    if (!ref.current || !data) return;
    ref.current.innerHTML = "";

    const labeled = data.map((d) => ({ ...d, label: STEP_LABELS[d.step] ?? d.step }));

    const plot = Plot.plot({
      width: chartWidth,
      height: chartHeight,
      marginLeft,
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
        label: "Hours to Complete Step →",
        labelAnchor: "right",
      },
      y: {
        domain: labeled.map((d) => d.label),
        label: null,
      },
      marks: [
        // IQR bar (p25–p75)
        Plot.barX(labeled, {
          x1: "p25",
          x2: "p75",
          y: "label",
          fill: COLORS.tan,
          fillOpacity: 0.3,
          inset: 6,
        }),
        // Median line
        Plot.tickX(labeled, {
          x: "p50",
          y: "label",
          stroke: COLORS.tan,
          strokeWidth: 3,
        }),
        // p10 whisker
        Plot.ruleY(labeled, {
          x1: "p25",
          x2: "p90",
          y: "label",
          stroke: COLORS.tan,
          strokeWidth: 1.5,
          strokeOpacity: 0.5,
        }),
        // p90 cap
        Plot.tickX(labeled, {
          x: "p90",
          y: "label",
          stroke: COLORS.tan,
          strokeWidth: 1.5,
          strokeOpacity: 0.5,
        }),
        // Median label
        Plot.text(labeled, {
          x: "p90",
          y: "label",
          dx: 8,
          text: (d: FunnelRow) => `p50: ${d.p50.toFixed(1)}h`,
          fill: COLORS.muted,
          fontSize: 10,
          textAnchor: "start",
        }),
        // n label
        Plot.text(labeled, {
          x: 0,
          y: "label",
          dx: -8,
          text: (d: FunnelRow) => `n=${d.n}`,
          fill: COLORS.muted,
          fontSize: 10,
          textAnchor: "end",
        }),
        Plot.gridX({ stroke: COLORS.border, strokeOpacity: 0.4 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, chartWidth, chartHeight, marginLeft]);

  if (isLoading) return <div className="flex items-center justify-center h-full"><LoadingSpinner message="Computing conversion latency…" /></div>;
  if (error) return <div className="flex items-center justify-center h-full p-4 text-g-red text-xs">{error}</div>;
  if (!data) return <div className="flex items-center justify-center h-full text-g-dim text-xs">Run query to render funnel</div>;

  return <div ref={containerRef} className="w-full"><div ref={ref} /></div>;
}
