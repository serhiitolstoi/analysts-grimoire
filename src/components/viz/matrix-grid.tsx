"use client";

import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { COLORS, MATRIX_SCALE } from "@/lib/utils/colors";
import { fmtProb } from "@/lib/utils/format";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useContainerWidth } from "@/lib/hooks/use-container-width";

interface MatrixRow {
  from_state: string;
  to_state: string;
  probability: number;
  n: number;
}

interface MatrixGridProps {
  data: MatrixRow[] | null;
  ghostData?: MatrixRow[] | null;
  ghostColor?: string;
  title?: string;
  isLoading?: boolean;
  error?: string | null;
  width?: number;
  height?: number;
}

const STATE_ORDER = ["casual", "active", "power", "churned"];
const STATE_LABELS: Record<string, string> = {
  casual:  "Casual",
  active:  "Active",
  power:   "Power",
  churned: "Churned",
};

export function MatrixGrid({
  data,
  ghostData,
  ghostColor = COLORS.purple,
  title,
  isLoading = false,
  error = null,
  width = 480,
  height = 440,
}: MatrixGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, width);
  const chartWidth = containerWidth || width;
  // Matrix is square-ish — scale height proportionally
  const chartHeight = Math.round(Math.min(height, Math.max(280, chartWidth * 0.92)));

  useEffect(() => {
    if (!ref.current || !data) return;
    ref.current.innerHTML = "";

    const plot = Plot.plot({
      width: chartWidth,
      height: chartHeight,
      marginLeft: 72,
      marginBottom: 60,
      marginTop: 40,
      marginRight: 20,
      style: {
        background: "transparent",
        color: COLORS.text,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
      },
      x: {
        domain: STATE_ORDER,
        tickFormat: (d: string) => STATE_LABELS[d] ?? d,
        label: "→ Next State",
        labelAnchor: "right",
      },
      y: {
        domain: [...STATE_ORDER].reverse(),
        tickFormat: (d: string) => STATE_LABELS[d] ?? d,
        label: "Current State ↓",
        labelAnchor: "bottom",
      },
      color: {
        type: "linear",
        domain: [0, 0.5, 1],
        range: [COLORS.elevated, COLORS.purple, COLORS.tan],
        label: "Transition Probability",
      },
      marks: [
        // Ghost overlay (previous scenario)
        ...(ghostData ? [
          Plot.cell(ghostData, {
            x: "to_state",
            y: "from_state",
            stroke: ghostColor,
            strokeWidth: 2,
            strokeOpacity: 0.5,
            fill: "none",
            rx: 2,
          }),
        ] : []),

        // Primary cells
        Plot.cell(data, {
          x: "to_state",
          y: "from_state",
          fill: "probability",
          rx: 3,
          tip: true,
          title: (d: MatrixRow) => `${STATE_LABELS[d.from_state]} → ${STATE_LABELS[d.to_state]}\nP = ${fmtProb(d.probability)}\nn = ${d.n}`,
        }),

        // Probability text labels
        Plot.text(data, {
          x: "to_state",
          y: "from_state",
          text: (d: MatrixRow) => fmtProb(d.probability),
          fill: (d: MatrixRow) => d.probability > 0.5 ? COLORS.bg : COLORS.text,
          fontSize: 10,
          fontWeight: "bold",
        }),

        // Grid frame
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, ghostData, ghostColor, chartWidth, chartHeight]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner message="Computing transition matrix…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-g-red text-xs">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-g-dim text-xs">
        Run query to render matrix
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-2">
      {title && (
        <div className="text-g-muted text-[10px] uppercase tracking-wider px-1">{title}</div>
      )}
      <div ref={ref} />
    </div>
  );
}
