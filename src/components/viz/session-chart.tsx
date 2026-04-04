"use client";

import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { COLORS } from "@/lib/utils/colors";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface SessionRow {
  session_id: string;
  duration_min: number;
  event_count: number;
  total_tokens: number;
  session_type: "deep_work" | "focused" | "quick_check" | "glance";
  token_density: number;
}

const SESSION_COLORS: Record<string, string> = {
  deep_work:   COLORS.tan,
  focused:     COLORS.purple,
  quick_check: COLORS.blue,
  glance:      COLORS.muted,
};

interface SessionChartProps {
  data: SessionRow[] | null;
  isLoading?: boolean;
  error?: string | null;
  width?: number;
  height?: number;
}

export function SessionChart({ data, isLoading, error, width = 600, height = 400 }: SessionChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !data) return;
    ref.current.innerHTML = "";

    const plot = Plot.plot({
      width,
      height,
      marginLeft: 55,
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
        domain: [0, Math.min(60, Math.max(...data.map((d) => Number(d.duration_min))) * 1.05)],
        label: "Session Duration (minutes) →",
        labelAnchor: "right",
      },
      y: {
        domain: [0, Math.min(25, Math.max(...data.map((d) => Number(d.event_count))) * 1.05)],
        label: "↑ Events in Session",
      },
      color: {
        domain: ["deep_work", "focused", "quick_check", "glance"],
        range: [COLORS.tan, COLORS.purple, COLORS.blue, COLORS.muted],
        legend: true,
        label: "Session Type",
      },
      opacity: { range: [0.4, 0.9] },
      marks: [
        Plot.dot(data, {
          x: "duration_min",
          y: "event_count",
          fill: "session_type",
          r: (d: SessionRow) => Math.sqrt(d.total_tokens / 200),
          opacity: 0.5,
          tip: true,
          title: (d: SessionRow) =>
            `Type: ${d.session_type}\nDuration: ${d.duration_min.toFixed(1)} min\nEvents: ${d.event_count}\nTokens: ${d.total_tokens}`,
        }),
        // Quadrant lines
        Plot.ruleX([15], { stroke: COLORS.border, strokeDasharray: "4 3", strokeOpacity: 0.5 }),
        Plot.ruleY([8], { stroke: COLORS.border, strokeDasharray: "4 3", strokeOpacity: 0.5 }),
        // Quadrant labels
        Plot.text(
          [
            { x: 7, y: 20, label: "QUICK\nINTENSE" },
            { x: 40, y: 20, label: "DEEP\nWORK" },
            { x: 7, y: 2, label: "GLANCE" },
            { x: 40, y: 2, label: "BROWSING" },
          ],
          {
            x: "x", y: "y",
            text: "label",
            fill: COLORS.dim,
            fontSize: 9,
            textAnchor: "middle",
          }
        ),
        Plot.gridX({ stroke: COLORS.border, strokeOpacity: 0.4 }),
        Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.4 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, width, height]);

  if (isLoading) return <div className="flex items-center justify-center h-full"><LoadingSpinner message="Classifying sessions…" /></div>;
  if (error) return <div className="flex items-center justify-center h-full p-4 text-g-red text-xs">{error}</div>;
  if (!data) return <div className="flex items-center justify-center h-full text-g-dim text-xs">Run query to render scatter</div>;

  return <div ref={ref} />;
}
