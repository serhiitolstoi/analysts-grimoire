"use client";

import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { COLORS } from "@/lib/utils/colors";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export interface DropoffRow {
  seq: number;
  step: string;
  users: number;
  pct_of_top: number;
}

interface DropoffFunnelProps {
  data: DropoffRow[] | null;
  isLoading?: boolean;
  error?: string | null;
  width?: number;
  height?: number;
}

export function DropoffFunnelChart({
  data,
  isLoading,
  error,
  width = 580,
  height = 320,
}: DropoffFunnelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !data || data.length === 0) return;
    ref.current.innerHTML = "";

    // Sort by seq
    const sorted = [...data].sort((a, b) => a.seq - b.seq);
    const top = sorted[0]?.users ?? 1;

    // Compute step-over-step drop
    const rows = sorted.map((d, i) => ({
      ...d,
      drop_pct:
        i === 0
          ? 0
          : sorted[i - 1].users > 0
          ? ((sorted[i - 1].users - d.users) / sorted[i - 1].users) * 100
          : 0,
    }));

    const plot = Plot.plot({
      width,
      height,
      marginLeft: 180,
      marginRight: 90,
      marginTop: 16,
      marginBottom: 40,
      style: {
        background: "transparent",
        color: COLORS.text,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
      },
      x: {
        label: "Users →",
        labelAnchor: "right",
        domain: [0, top * 1.12],
        tickFormat: (d: number) =>
          d >= 1000 ? `${(d / 1000).toFixed(1)}k` : String(d),
      },
      y: {
        domain: rows.map((d) => d.step),
        label: null,
      },
      marks: [
        // Background track
        Plot.barX(rows, {
          x1: 0,
          x2: top,
          y: "step",
          fill: COLORS.elevated,
          inset: 4,
        }),
        // Filled bar (users remaining)
        Plot.barX(rows, {
          x1: 0,
          x2: "users",
          y: "step",
          fill: (_d: typeof rows[0], i: number) => {
            // gradient: tan for top steps, dimmer as funnel narrows
            const t = i / Math.max(rows.length - 1, 1);
            return t < 0.3
              ? COLORS.tan
              : t < 0.6
              ? COLORS.tanDim
              : COLORS.purple;
          },
          fillOpacity: 0.85,
          inset: 4,
        }),
        // % of top label (inside / end of bar)
        Plot.text(rows, {
          x: "users",
          y: "step",
          dx: 6,
          text: (d: typeof rows[0]) => `${d.pct_of_top.toFixed(1)}%`,
          fill: COLORS.muted,
          fontSize: 11,
          textAnchor: "start",
        }),
        // User count label
        Plot.text(rows, {
          x: "users",
          y: "step",
          dx: 52,
          text: (d: typeof rows[0]) =>
            d.users >= 1000 ? `${(d.users / 1000).toFixed(1)}k` : String(d.users),
          fill: COLORS.dim,
          fontSize: 10,
          textAnchor: "start",
        }),
        // Step-over-step drop arrow annotation (all except first)
        Plot.text(
          rows.filter((d) => d.seq > rows[0].seq),
          {
            x: 0,
            y: "step",
            dx: -6,
            text: (d: typeof rows[0]) =>
              d.drop_pct > 0 ? `▼${d.drop_pct.toFixed(0)}%` : "",
            fill: COLORS.red,
            fontSize: 10,
            textAnchor: "end",
          }
        ),
        Plot.gridX({ stroke: COLORS.border, strokeOpacity: 0.3 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => {
      if (ref.current) ref.current.innerHTML = "";
    };
  }, [data, width, height]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner message="Computing funnel drop-off…" />
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-full p-4 text-g-red text-xs">
        {error}
      </div>
    );
  if (!data)
    return (
      <div className="flex items-center justify-center h-full text-g-dim text-xs">
        Run query to render funnel
      </div>
    );

  return <div ref={ref} />;
}
