"use client";

import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { COLORS } from "@/lib/utils/colors";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useContainerWidth } from "@/lib/hooks/use-container-width";

export interface KMCurve {
  group: string;
  n: number;
  events: number;
  times: number[];
  survival: number[];
  ci_lower: number[];
  ci_upper: number[];
}

const GROUP_COLORS = [COLORS.tan, COLORS.purple, COLORS.green, COLORS.red, COLORS.blue, COLORS.cyan];

interface SurvivalCurveProps {
  curves: KMCurve[] | null;
  isLoading?: boolean;
  error?: string | null;
  width?: number;
  height?: number;
}

export function SurvivalCurve({ curves, isLoading, error, width = 640, height = 400 }: SurvivalCurveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, width);
  const chartWidth = containerWidth || width;
  const chartHeight = Math.round(Math.min(height, Math.max(240, chartWidth * 0.625)));
  // Reduce legend margin on narrow screens
  const marginRight = Math.min(120, Math.round(chartWidth * 0.2));

  useEffect(() => {
    if (!ref.current || !curves) return;
    ref.current.innerHTML = "";

    // Flatten curves for Plot
    const lineData: Array<{ t: number; s: number; group: string }> = [];
    const bandData: Array<{ t: number; lo: number; hi: number; group: string }> = [];

    curves.forEach((c, ci) => {
      c.times.forEach((t, i) => {
        lineData.push({ t, s: c.survival[i], group: c.group });
        bandData.push({ t, lo: c.ci_lower[i], hi: c.ci_upper[i], group: c.group });
      });
    });

    const groupDomain = curves.map((c) => c.group);
    const colorRange = curves.map((_, i) => GROUP_COLORS[i % GROUP_COLORS.length]);

    const plot = Plot.plot({
      width: chartWidth,
      height: chartHeight,
      marginLeft: 55,
      marginBottom: 50,
      marginTop: 20,
      marginRight,
      style: {
        background: "transparent",
        color: COLORS.text,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
      },
      x: {
        label: "Days Since Signup →",
        labelAnchor: "right",
      },
      y: {
        domain: [0, 1],
        label: "↑ Survival Probability",
        tickFormat: (d: number) => `${(d * 100).toFixed(0)}%`,
      },
      color: {
        domain: groupDomain,
        range: colorRange,
        legend: true,
        label: "Segment",
      },
      marks: [
        // Confidence bands
        Plot.areaY(bandData, {
          x: "t",
          y1: "lo",
          y2: "hi",
          fill: "group",
          fillOpacity: 0.12,
          curve: "step-after",
        }),
        // KM step functions
        Plot.line(lineData, {
          x: "t",
          y: "s",
          stroke: "group",
          strokeWidth: 2,
          curve: "step-after",
        }),
        // 50% survival reference
        Plot.ruleY([0.5], {
          stroke: COLORS.muted,
          strokeWidth: 1,
          strokeDasharray: "3 3",
          strokeOpacity: 0.5,
        }),
        Plot.gridX({ stroke: COLORS.border, strokeOpacity: 0.4 }),
        Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.4 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [curves, chartWidth, chartHeight, marginRight]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <LoadingSpinner message="Running Kaplan-Meier estimator…" />
      <div className="text-g-dim text-[10px]">Python runtime required</div>
    </div>
  );
  if (error) return <div className="flex items-center justify-center h-full p-4 text-g-red text-xs">{error}</div>;
  if (!curves) return <div className="flex items-center justify-center h-full text-g-dim text-xs">Run Python to render survival curves</div>;

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-2">
      {/* Stats table */}
      <div className="flex gap-4 text-[10px] px-1 flex-wrap">
        {curves.map((c, i) => (
          <div key={c.group} className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 inline-block" style={{ background: GROUP_COLORS[i % GROUP_COLORS.length] }} />
            <span className="text-g-muted">{c.group}</span>
            <span className="text-g-dim">n={c.n}</span>
            <span className="text-g-dim">events={c.events}</span>
          </div>
        ))}
      </div>
      <div ref={ref} />
    </div>
  );
}
