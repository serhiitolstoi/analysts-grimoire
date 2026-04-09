"use client";

import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { COLORS } from "@/lib/utils/colors";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useContainerWidth } from "@/lib/hooks/use-container-width";

export interface ClusterResult {
  labels: number[];
  x: number[];
  y: number[];
  cluster_stats: Array<{
    cluster: number;
    name: string;
    size: number;
    pct: number;
    centroid_raw: Record<string, number>;
  }>;
  inertia: number;
  feature_names: string[];
  explained_variance: number[];
}

const CLUSTER_COLORS = [COLORS.tan, COLORS.purple, COLORS.green, COLORS.red];

interface ClusterScatterProps {
  result: ClusterResult | null;
  isLoading?: boolean;
  error?: string | null;
  width?: number;
  height?: number;
}

export function ClusterScatter({ result, isLoading, error, width = 600, height = 420 }: ClusterScatterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef, width);
  const chartWidth = containerWidth || width;
  const chartHeight = Math.round(Math.min(height, Math.max(240, chartWidth * 0.7)));

  useEffect(() => {
    if (!ref.current || !result) return;
    ref.current.innerHTML = "";

    // Build point data
    const points = result.x.map((x, i) => ({
      x,
      y: result.y[i],
      cluster: result.labels[i],
      name: result.cluster_stats[result.labels[i]]?.name ?? `Cluster ${result.labels[i]}`,
    }));

    // Centroids (PCA of centroid_raw — approximate centroid in 2D as cluster mean)
    const centroids = result.cluster_stats.map((cs) => ({
      x: points.filter((p) => p.cluster === cs.cluster).reduce((a, b) => a + b.x, 0) /
         Math.max(1, points.filter((p) => p.cluster === cs.cluster).length),
      y: points.filter((p) => p.cluster === cs.cluster).reduce((a, b) => a + b.y, 0) /
         Math.max(1, points.filter((p) => p.cluster === cs.cluster).length),
      cluster: cs.cluster,
      name: cs.name,
      size: cs.size,
    }));

    const clusterDomain = result.cluster_stats.map((c) => c.cluster);
    const colorRange = clusterDomain.map((c) => CLUSTER_COLORS[c % CLUSTER_COLORS.length]);

    const plot = Plot.plot({
      width: chartWidth,
      height: chartHeight,
      marginLeft: 30,
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
        label: `PC1 (${(result.explained_variance[0] * 100).toFixed(1)}% variance) →`,
        labelAnchor: "right",
        ticks: 5,
      },
      y: {
        label: `↑ PC2 (${(result.explained_variance[1] * 100).toFixed(1)}% variance)`,
        ticks: 5,
      },
      color: {
        type: "ordinal",
        domain: clusterDomain,
        range: colorRange,
        legend: true,
        label: "Archetype",
        tickFormat: (d: number) => result.cluster_stats[d]?.name ?? `Cluster ${d}`,
      },
      marks: [
        // Points
        Plot.dot(points, {
          x: "x",
          y: "y",
          fill: "cluster",
          r: 3,
          fillOpacity: 0.5,
          tip: true,
          title: (d: typeof points[0]) => `${d.name} (cluster ${d.cluster})`,
        }),
        // Centroid markers
        Plot.dot(centroids, {
          x: "x",
          y: "y",
          fill: "cluster",
          r: 10,
          stroke: COLORS.bg,
          strokeWidth: 2,
          symbol: "star",
        }),
        // Centroid labels
        Plot.text(centroids, {
          x: "x",
          y: "y",
          dy: -18,
          text: "name",
          fill: COLORS.text,
          fontSize: 10,
          fontWeight: "bold",
          textAnchor: "middle",
        }),
        Plot.gridX({ stroke: COLORS.border, strokeOpacity: 0.4 }),
        Plot.gridY({ stroke: COLORS.border, strokeOpacity: 0.4 }),
        Plot.frame({ stroke: COLORS.border }),
      ],
    });

    ref.current.appendChild(plot);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [result, chartWidth, chartHeight]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <LoadingSpinner message="Running K-Means clustering…" />
      <div className="text-g-dim text-[10px]">scikit-learn · Python runtime</div>
    </div>
  );
  if (error) return <div className="flex items-center justify-center h-full p-4 text-g-red text-xs">{error}</div>;
  if (!result) return <div className="flex items-center justify-center h-full text-g-dim text-xs">Run Python to render clusters</div>;

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-2">
      <div className="flex gap-4 flex-wrap text-[10px] px-1">
        {result.cluster_stats.map((cs, i) => (
          <div key={cs.cluster} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }} />
            <span className="font-bold" style={{ color: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}>{cs.name}</span>
            <span className="text-g-dim">n={cs.size} ({(cs.pct * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
      <div ref={ref} />
    </div>
  );
}
