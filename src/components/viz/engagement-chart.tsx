"use client";

import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { COLORS } from "@/lib/utils/colors";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useContainerWidth } from "@/lib/hooks/use-container-width";

export interface EngagementRow {
  week_start:      string;
  wau:             number;
  new_users:       number;
  churned_users:   number;
  returning_users: number;
}

type ViewMode = "wau" | "growth" | "mix";

interface EngagementChartProps {
  data:      EngagementRow[] | null;
  mode?:     ViewMode;
  isLoading?: boolean;
  error?:    string | null;
  width?:    number;
  height?:   number;
}

export function EngagementChart({
  data,
  mode = "wau",
  isLoading,
  error,
  width = 640,
  height = 320,
}: EngagementChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, width);
  const chartWidth = containerWidth || width;
  const chartHeight = Math.round(Math.min(height, Math.max(200, chartWidth * 0.5)));

  useEffect(() => {
    if (!ref.current || !data || data.length === 0) return;
    ref.current.innerHTML = "";

    // Parse dates
    const rows = data.map((d) => ({
      ...d,
      date:          new Date(d.week_start),
      wau:           Number(d.wau),
      new_users:     Number(d.new_users),
      churned_users: Number(d.churned_users),
      returning_users: Number(d.returning_users),
    }));

    const baseStyle = {
      background: "transparent",
      color: COLORS.text,
      fontFamily: "var(--font-mono)",
      fontSize: "11px",
    };

    const xAxis = {
      label: "Week →",
      labelAnchor: "right" as const,
      tickFormat: (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" }),
    };

    let plot: SVGSVGElement | HTMLElement;

    if (mode === "wau") {
      // Weekly Active Users area + line
      plot = Plot.plot({
        width: chartWidth, height: chartHeight,
        marginLeft: 55, marginRight: 20, marginTop: 20, marginBottom: 50,
        style: baseStyle,
        x: xAxis,
        y: { label: "Weekly Active Users →", labelAnchor: "top", grid: true },
        marks: [
          Plot.areaY(rows, {
            x: "date", y: "wau",
            fill: COLORS.purple, fillOpacity: 0.15,
          }),
          Plot.lineY(rows, {
            x: "date", y: "wau",
            stroke: COLORS.purple, strokeWidth: 2,
          }),
          Plot.areaY(rows, {
            x: "date", y: "returning_users",
            fill: COLORS.tan, fillOpacity: 0.1,
          }),
          Plot.lineY(rows, {
            x: "date", y: "returning_users",
            stroke: COLORS.tan, strokeWidth: 1.5, strokeDasharray: "3 3",
          }),
          Plot.gridX({ stroke: COLORS.border, strokeOpacity: 0.3 }),
          Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.3 }),
          Plot.frame({ stroke: COLORS.border }),
          // Legend annotation
          Plot.text([rows[rows.length - 1]], {
            x: "date", y: "wau", dx: 6,
            text: () => "WAU",
            fill: COLORS.purple, fontSize: 10, textAnchor: "start",
          }),
          Plot.text([rows[rows.length - 1]], {
            x: "date", y: "returning_users", dx: 6,
            text: () => "Returning",
            fill: COLORS.tan, fontSize: 10, textAnchor: "start",
          }),
        ],
      });
    } else if (mode === "growth") {
      // New users (green bars up) + churned users (red bars down)
      const combined = [
        ...rows.map((d) => ({ date: d.date, value: d.new_users,     type: "New Users" })),
        ...rows.map((d) => ({ date: d.date, value: -d.churned_users, type: "Churned" })),
      ];
      plot = Plot.plot({
        width: chartWidth, height: chartHeight,
        marginLeft: 55, marginRight: 20, marginTop: 20, marginBottom: 50,
        style: baseStyle,
        x: xAxis,
        y: {
          label: "Users →",
          labelAnchor: "top",
          tickFormat: (v: number) => String(Math.abs(v)),
        },
        color: {
          domain: ["New Users", "Churned"],
          range:  [COLORS.green, COLORS.red],
        },
        marks: [
          Plot.barY(combined, {
            x: "date", y: "value", fill: "type",
            fillOpacity: 0.8,
          }),
          Plot.ruleY([0], { stroke: COLORS.border }),
          Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.3 }),
          Plot.gridX({ stroke: COLORS.border, strokeOpacity: 0.3 }),
          Plot.frame({ stroke: COLORS.border }),
        ],
      });
    } else {
      // Stacked area: returning + new
      const stacked = [
        ...rows.map((d) => ({ date: d.date, value: d.returning_users, type: "Returning" })),
        ...rows.map((d) => ({ date: d.date, value: d.new_users, type: "New" })),
      ];
      plot = Plot.plot({
        width: chartWidth, height: chartHeight,
        marginLeft: 55, marginRight: 20, marginTop: 20, marginBottom: 50,
        style: baseStyle,
        x: xAxis,
        y: { label: "Weekly Active Users →", labelAnchor: "top" },
        color: {
          domain: ["Returning", "New"],
          range:  [COLORS.purple, COLORS.green],
          legend: true,
        },
        marks: [
          (Plot.areaY as any)(stacked, Plot.stackY({
            x: "date", y: "value", fill: "type", fillOpacity: 0.8,
          })),
          Plot.gridX({ stroke: COLORS.border, strokeOpacity: 0.3 }),
          Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.3 }),
          Plot.frame({ stroke: COLORS.border }),
        ],
      });
    }

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [data, mode, chartWidth, chartHeight]);

  if (isLoading) return <div className="flex items-center justify-center h-full"><LoadingSpinner message="Computing engagement trends…" /></div>;
  if (error)     return <div className="flex items-center justify-center h-full p-4 text-g-red text-xs">{error}</div>;
  if (!data)     return <div className="flex items-center justify-center h-full text-g-dim text-xs">Run query to render chart</div>;

  return <div ref={containerRef} className="w-full"><div ref={ref} /></div>;
}
